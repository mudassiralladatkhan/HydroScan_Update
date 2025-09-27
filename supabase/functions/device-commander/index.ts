import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { publishMqtt } from '../_shared/mqtt-client.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeviceCommand {
  device_id: string;
  command_type: 'restart' | 'calibrate' | 'update_config' | 'firmware_update' | 'reset' | 'diagnostics' | 'set_polling_interval' | 'enable_sensors' | 'disable_sensors';
  payload: any;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get authenticated user
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const { action, device_id, command_type, payload, priority } = await req.json()

    if (action === 'send_command') {
      return await sendDeviceCommand(supabaseAdmin, {
        device_id,
        command_type,
        payload,
        priority
      }, user.id)
    } else if (action === 'get_pending_commands') {
      return await getPendingCommands(supabaseAdmin, device_id)
    } else if (action === 'get_command_status') {
      return await getCommandStatus(supabaseAdmin, payload.command_id)
    } else if (action === 'cancel_command') {
      return await cancelCommand(supabaseAdmin, payload.command_id, user.id)
    } else if (action === 'retry_command') {
      return await retryCommand(supabaseAdmin, payload.command_id, user.id)
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Device Commander Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

async function sendDeviceCommand(supabase: any, command: DeviceCommand, userId: string) {
  try {
    // Validate device exists and user has access
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('id, name, status, organization_id')
      .eq('id', command.device_id)
      .single()

    if (deviceError || !device) {
      throw new Error('Device not found or access denied')
    }

    // Validate command type and payload
    const validatedPayload = await validateCommandPayload(command.command_type, command.payload)

    // Create command record
    const { data: commandRecord, error: commandError } = await supabase
      .from('device_commands')
      .insert({
        device_id: command.device_id,
        command_type: command.command_type,
        command_payload: validatedPayload,
        status: 'pending',
        issued_by: userId,
        issued_at: new Date().toISOString(),
        expires_at: getCommandExpiryTime(command.command_type)
      })
      .select()
      .single()

    if (commandError) {
      throw commandError
    }

    // Send command to device via MQTT (simulated)
    const mqttSuccess = await sendMqttCommand(device, commandRecord)
    
    if (mqttSuccess) {
      await supabase
        .from('device_commands')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', commandRecord.id)

      // Log the command
      await supabase.from('mqtt_message_log').insert({
        device_id: command.device_id,
        topic: `hydroscan/devices/${command.device_id}/commands`,
        message_type: 'command',
        payload: {
          command_id: commandRecord.id,
          command_type: command.command_type,
          payload: validatedPayload
        },
        direction: 'outbound',
        processed: true
      })
    }

    return new Response(JSON.stringify({ 
      success: true, 
      command_id: commandRecord.id,
      status: mqttSuccess ? 'sent' : 'pending',
      message: `Command ${command.command_type} ${mqttSuccess ? 'sent to' : 'queued for'} device ${device.name}`
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Send command error:', error)
    throw error
  }
}

async function getPendingCommands(supabase: any, deviceId: string) {
  try {
    const { data: commands, error } = await supabase
      .from('device_commands')
      .select('*')
      .eq('device_id', deviceId)
      .in('status', ['pending', 'sent'])
      .order('issued_at', { ascending: true })

    if (error) throw error

    return new Response(JSON.stringify({ 
      success: true, 
      commands: commands || []
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Get pending commands error:', error)
    throw error
  }
}

async function getCommandStatus(supabase: any, commandId: string) {
  try {
    const { data: command, error } = await supabase
      .from('device_commands')
      .select('*, devices(name)')
      .eq('id', commandId)
      .single()

    if (error) throw error

    return new Response(JSON.stringify({ 
      success: true, 
      command
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Get command status error:', error)
    throw error
  }
}

async function cancelCommand(supabase: any, commandId: string, userId: string) {
  try {
    const { data: command, error: updateError } = await supabase
      .from('device_commands')
      .update({ 
        status: 'cancelled',
        error_message: `Cancelled by user ${userId}`,
        completed_at: new Date().toISOString()
      })
      .eq('id', commandId)
      .in('status', ['pending', 'sent'])
      .select()
      .single()

    if (updateError) throw updateError

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Command cancelled successfully'
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Cancel command error:', error)
    throw error
  }
}

async function retryCommand(supabase: any, commandId: string, userId: string) {
  try {
    // Get the failed command
    const { data: command, error: fetchError } = await supabase
      .from('device_commands')
      .select('*, devices(name, status)')
      .eq('id', commandId)
      .eq('status', 'failed')
      .single()

    if (fetchError || !command) {
      throw new Error('Command not found or cannot be retried')
    }

    if (command.retry_count >= command.max_retries) {
      throw new Error('Maximum retry attempts reached')
    }

    // Reset command status
    await supabase
      .from('device_commands')
      .update({ 
        status: 'pending',
        retry_count: command.retry_count + 1,
        error_message: null,
        sent_at: null,
        acknowledged_at: null,
        issued_at: new Date().toISOString()
      })
      .eq('id', commandId)

    // Try to send again
    const mqttSuccess = await sendMqttCommand(command.devices, command)
    
    if (mqttSuccess) {
      await supabase
        .from('device_commands')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', commandId)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Command retry initiated (attempt ${command.retry_count + 1}/${command.max_retries})`
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Retry command error:', error)
    throw error
  }
}

async function validateCommandPayload(commandType: string, payload: any): Promise<any> {
  switch (commandType) {
    case 'restart':
      return { reason: payload?.reason || 'User requested restart' }
    
    case 'calibrate':
      if (!payload.sensor_type || !['ph', 'turbidity', 'tds', 'temperature'].includes(payload.sensor_type)) {
        throw new Error('Valid sensor_type required for calibration')
      }
      return {
        sensor_type: payload.sensor_type,
        calibration_points: payload.calibration_points || [],
        reference_values: payload.reference_values || []
      }
    
    case 'update_config':
      return {
        polling_interval: payload.polling_interval || 300,
        alert_thresholds: payload.alert_thresholds || {},
        sensor_settings: payload.sensor_settings || {},
        network_settings: payload.network_settings || {}
      }
    
    case 'firmware_update':
      if (!payload.firmware_version) {
        throw new Error('firmware_version required for firmware update')
      }
      return {
        firmware_version: payload.firmware_version,
        download_url: payload.download_url,
        checksum: payload.checksum,
        force_update: payload.force_update || false
      }
    
    case 'reset':
      return {
        reset_type: payload.reset_type || 'soft',
        preserve_config: payload.preserve_config !== false
      }
    
    case 'diagnostics':
      return {
        test_sensors: payload.test_sensors !== false,
        test_connectivity: payload.test_connectivity !== false,
        test_memory: payload.test_memory !== false,
        full_report: payload.full_report || false
      }
    
    case 'set_polling_interval':
      if (!payload.interval || payload.interval < 30 || payload.interval > 3600) {
        throw new Error('Interval must be between 30 and 3600 seconds')
      }
      return { interval: payload.interval }
    
    case 'enable_sensors':
    case 'disable_sensors':
      if (!Array.isArray(payload.sensors)) {
        throw new Error('sensors array required')
      }
      return { sensors: payload.sensors }
    
    default:
      throw new Error(`Unknown command type: ${commandType}`)
  }
}

function getCommandExpiryTime(commandType: string): string {
  const now = new Date()
  let expiryHours = 24 // default

  switch (commandType) {
    case 'restart':
    case 'reset':
      expiryHours = 1
      break
    case 'calibrate':
    case 'diagnostics':
      expiryHours = 4
      break
    case 'firmware_update':
      expiryHours = 48
      break
    case 'update_config':
    case 'set_polling_interval':
    case 'enable_sensors':
    case 'disable_sensors':
      expiryHours = 12
      break
  }

  return new Date(now.getTime() + expiryHours * 60 * 60 * 1000).toISOString()
}

async function sendMqttCommand(device: any, command: any): Promise<boolean> {
  try {
    const mqttPayload = {
      command_id: command.id,
      command_type: command.command_type,
      payload: command.command_payload,
      timestamp: new Date().toISOString(),
      expires_at: command.expires_at
    }

    const topic = `hydroscan/devices/${device.id}/commands`
    
    // Use real MQTT client
    const success = await publishMqtt(topic, mqttPayload, { qos: 1, retain: false })
    
    if (!success) {
      console.warn(`[MQTT] Failed to send command to device ${device.id}`)
    }
    
    return success
  } catch (error) {
    console.error('MQTT send error:', error)
    return false
  }
}

// Background task to cleanup expired commands
async function cleanupExpiredCommands() {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    await supabaseAdmin
      .from('device_commands')
      .update({ 
        status: 'expired',
        error_message: 'Command expired',
        completed_at: new Date().toISOString()
      })
      .lt('expires_at', new Date().toISOString())
      .in('status', ['pending', 'sent'])

    console.log('[CLEANUP] Expired commands cleaned up')
  } catch (error) {
    console.error('Cleanup error:', error)
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredCommands, 5 * 60 * 1000)
