import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SensorReading {
  device_id: string;
  ph?: number;
  turbidity?: number;
  tds?: number;
  temperature?: number;
  timestamp?: string;
  battery_level?: number;
  signal_strength?: number;
}

interface DeviceHeartbeat {
  device_id: string;
  status: string;
  signal_strength?: number;
  battery_level?: number;
  memory_usage?: number;
  cpu_usage?: number;
  uptime?: number;
  firmware_version?: string;
  ip_address?: string;
  sensor_status?: any;
}

interface DeviceCommand {
  device_id: string;
  command_type: string;
  payload: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { topic, payload, device_id, message_type } = await req.json()

    // Log the MQTT message
    await supabaseAdmin.from('mqtt_message_log').insert({
      device_id,
      topic,
      message_type,
      payload: payload,
      direction: 'inbound',
      processed: false
    })

    // Route message based on topic pattern
    if (topic.includes('/data')) {
      return await handleSensorData(supabaseAdmin, payload as SensorReading)
    } else if (topic.includes('/heartbeat')) {
      return await handleHeartbeat(supabaseAdmin, payload as DeviceHeartbeat)
    } else if (topic.includes('/command/response')) {
      return await handleCommandResponse(supabaseAdmin, payload)
    } else if (topic.includes('/alert')) {
      return await handleDeviceAlert(supabaseAdmin, payload)
    } else if (topic.includes('/status')) {
      return await handleStatusUpdate(supabaseAdmin, payload)
    }

    return new Response(JSON.stringify({ success: true, message: 'Message processed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('MQTT Handler Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

async function handleSensorData(supabase: any, data: SensorReading) {
  try {
    // Validate device exists and is active
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('id, organization_id')
      .eq('id', data.device_id)
      .eq('is_active', true)
      .single()

    if (deviceError || !device) {
      throw new Error(`Invalid or inactive device: ${data.device_id}`)
    }

    // Validate sensor data
    const validatedData = await validateSensorData(data)
    
    // Insert sensor reading
    const { data: reading, error: insertError } = await supabase
      .from('sensor_readings')
      .insert({
        device_id: data.device_id,
        timestamp: data.timestamp || new Date().toISOString(),
        ph: validatedData.ph,
        turbidity: validatedData.turbidity,
        tds: validatedData.tds,
        temperature: validatedData.temperature,
        raw_data: data
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    // Update device last seen and status
    await supabase
      .from('devices')
      .update({
        status: 'online',
        last_seen: new Date().toISOString(),
        battery_level: data.battery_level,
        wifi_signal_strength: data.signal_strength
      })
      .eq('id', data.device_id)

    // Check alert rules
    await checkAlertRules(supabase, device.organization_id, data.device_id, validatedData)

    // Update data quality metrics
    await updateDataQualityMetrics(supabase, data.device_id, validatedData)

    return new Response(JSON.stringify({ 
      success: true, 
      reading_id: reading.id,
      message: 'Sensor data processed successfully' 
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Sensor data processing error:', error)
    throw error
  }
}

async function handleHeartbeat(supabase: any, data: DeviceHeartbeat) {
  try {
    // Insert heartbeat record
    await supabase.from('device_heartbeats').insert({
      device_id: data.device_id,
      status: data.status,
      signal_strength: data.signal_strength,
      battery_level: data.battery_level,
      memory_usage: data.memory_usage,
      cpu_usage: data.cpu_usage,
      uptime: data.uptime,
      firmware_version: data.firmware_version,
      ip_address: data.ip_address,
      sensor_status: data.sensor_status
    })

    // Update device status
    await supabase
      .from('devices')
      .update({
        status: data.status,
        last_heartbeat: new Date().toISOString(),
        battery_level: data.battery_level,
        wifi_signal_strength: data.signal_strength,
        firmware_version: data.firmware_version
      })
      .eq('id', data.device_id)

    // Check for low battery or other health issues
    await checkDeviceHealth(supabase, data)

    return new Response(JSON.stringify({ success: true, message: 'Heartbeat processed' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Heartbeat processing error:', error)
    throw error
  }
}

async function handleCommandResponse(supabase: any, data: any) {
  try {
    const { command_id, status, response, error_message } = data

    // Update command status
    const updateData: any = {
      status,
      response,
      acknowledged_at: new Date().toISOString()
    }

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    } else if (status === 'failed') {
      updateData.error_message = error_message
    }

    await supabase
      .from('device_commands')
      .update(updateData)
      .eq('id', command_id)

    return new Response(JSON.stringify({ success: true, message: 'Command response processed' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Command response processing error:', error)
    throw error
  }
}

async function handleDeviceAlert(supabase: any, data: any) {
  try {
    const { device_id, severity, message, alert_type, sensor_data } = data

    // Create alert
    await supabase.from('alerts').insert({
      device_id,
      severity,
      message,
      triggered_at: new Date().toISOString(),
      resolved: false
    })

    // Log as high-priority message
    await supabase.from('mqtt_message_log').insert({
      device_id,
      topic: 'device/alert',
      message_type: 'alert',
      payload: data,
      direction: 'inbound',
      processed: true
    })

    return new Response(JSON.stringify({ success: true, message: 'Alert processed' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Alert processing error:', error)
    throw error
  }
}

async function handleStatusUpdate(supabase: any, data: any) {
  try {
    const { device_id, status, metadata } = data

    await supabase
      .from('devices')
      .update({
        status,
        last_seen: new Date().toISOString(),
        ...metadata
      })
      .eq('id', device_id)

    return new Response(JSON.stringify({ success: true, message: 'Status updated' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Status update processing error:', error)
    throw error
  }
}

async function validateSensorData(data: SensorReading): Promise<SensorReading> {
  const validated: SensorReading = { device_id: data.device_id }

  // pH validation (0-14 range)
  if (data.ph !== undefined) {
    if (data.ph >= 0 && data.ph <= 14) {
      validated.ph = Number(data.ph.toFixed(2))
    }
  }

  // Turbidity validation (0-4000 NTU)
  if (data.turbidity !== undefined) {
    if (data.turbidity >= 0 && data.turbidity <= 4000) {
      validated.turbidity = Number(data.turbidity.toFixed(2))
    }
  }

  // TDS validation (0-2000 ppm)
  if (data.tds !== undefined) {
    if (data.tds >= 0 && data.tds <= 2000) {
      validated.tds = Number(data.tds.toFixed(2))
    }
  }

  // Temperature validation (-10 to 60°C)
  if (data.temperature !== undefined) {
    if (data.temperature >= -10 && data.temperature <= 60) {
      validated.temperature = Number(data.temperature.toFixed(2))
    }
  }

  return validated
}

async function checkAlertRules(supabase: any, organizationId: string, deviceId: string, data: SensorReading) {
  try {
    // Get active alert rules for this device or organization
    const { data: rules } = await supabase
      .from('alert_rules')
      .select('*')
      .or(`device_id.eq.${deviceId},device_id.is.null`)
      .eq('is_active', true)

    if (!rules) return

    for (const rule of rules) {
      const parameterValue = data[rule.parameter as keyof SensorReading] as number
      if (parameterValue === undefined) continue

      let triggered = false
      const { condition, threshold_value_1, threshold_value_2 } = rule

      switch (condition) {
        case 'greater_than':
          triggered = parameterValue > threshold_value_1
          break
        case 'less_than':
          triggered = parameterValue < threshold_value_1
          break
        case 'between':
          triggered = parameterValue >= threshold_value_1 && parameterValue <= threshold_value_2
          break
        case 'outside_range':
          triggered = parameterValue < threshold_value_1 || parameterValue > threshold_value_2
          break
      }

      if (triggered) {
        await supabase.from('alerts').insert({
          device_id: deviceId,
          rule_id: rule.id,
          severity: rule.severity,
          message: `${rule.name}: ${rule.parameter} value ${parameterValue} triggered alert`,
          triggered_at: new Date().toISOString(),
          resolved: false
        })
      }
    }
  } catch (error) {
    console.error('Alert rules check error:', error)
  }
}

async function updateDataQualityMetrics(supabase: any, deviceId: string, data: SensorReading) {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    // Get or create today's metrics
    let { data: metrics } = await supabase
      .from('data_quality_metrics')
      .select('*')
      .eq('device_id', deviceId)
      .eq('metric_date', today)
      .single()

    if (!metrics) {
      const { data: newMetrics } = await supabase
        .from('data_quality_metrics')
        .insert({
          device_id: deviceId,
          metric_date: today,
          total_readings: 0,
          valid_readings: 0,
          invalid_readings: 0
        })
        .select()
        .single()
      metrics = newMetrics
    }

    // Count valid parameters
    const validParams = [data.ph, data.turbidity, data.tds, data.temperature]
      .filter(value => value !== undefined).length
    
    const totalParams = 4
    const isValidReading = validParams >= totalParams * 0.5 // At least 50% of parameters

    // Update metrics
    await supabase
      .from('data_quality_metrics')
      .update({
        total_readings: metrics.total_readings + 1,
        valid_readings: metrics.valid_readings + (isValidReading ? 1 : 0),
        invalid_readings: metrics.invalid_readings + (isValidReading ? 0 : 1),
        data_completeness: ((metrics.valid_readings + (isValidReading ? 1 : 0)) / (metrics.total_readings + 1)) * 100,
        calculated_at: new Date().toISOString()
      })
      .eq('id', metrics.id)
  } catch (error) {
    console.error('Data quality metrics update error:', error)
  }
}

async function checkDeviceHealth(supabase: any, data: DeviceHeartbeat) {
  try {
    const alerts = []

    // Check battery level
    if (data.battery_level && data.battery_level < 20) {
      alerts.push({
        device_id: data.device_id,
        severity: 'medium',
        message: `Low battery warning: ${data.battery_level}%`,
        triggered_at: new Date().toISOString(),
        resolved: false
      })
    }

    // Check memory usage
    if (data.memory_usage && data.memory_usage > 85) {
      alerts.push({
        device_id: data.device_id,
        severity: 'medium',
        message: `High memory usage: ${data.memory_usage}%`,
        triggered_at: new Date().toISOString(),
        resolved: false
      })
    }

    // Check CPU usage
    if (data.cpu_usage && data.cpu_usage > 90) {
      alerts.push({
        device_id: data.device_id,
        severity: 'high',
        message: `High CPU usage: ${data.cpu_usage}%`,
        triggered_at: new Date().toISOString(),
        resolved: false
      })
    }

    // Insert alerts if any
    if (alerts.length > 0) {
      await supabase.from('alerts').insert(alerts)
    }
  } catch (error) {
    console.error('Device health check error:', error)
  }
}
