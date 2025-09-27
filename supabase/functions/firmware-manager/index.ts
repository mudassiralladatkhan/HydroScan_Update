import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FirmwareUpdate {
  device_id?: string;
  firmware_version: string;
  force_update?: boolean;
  scheduled_at?: string;
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

    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'list_firmware':
        return await listFirmwareVersions(supabaseAdmin)
      case 'upload_firmware':
        return await uploadFirmware(supabaseAdmin, body, user.id)
      case 'initiate_update':
        return await initiateFirmwareUpdate(supabaseAdmin, body, user.id)
      case 'check_compatibility':
        return await checkFirmwareCompatibility(supabaseAdmin, body)
      case 'get_update_status':
        return await getUpdateStatus(supabaseAdmin, body.device_id)
      case 'rollback_firmware':
        return await rollbackFirmware(supabaseAdmin, body, user.id)
      case 'schedule_update':
        return await scheduleFirmwareUpdate(supabaseAdmin, body, user.id)
      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('Firmware Manager Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

async function listFirmwareVersions(supabase: any) {
  try {
    const { data: firmwares, error } = await supabase
      .from('firmware_versions')
      .select('*')
      .order('release_date', { ascending: false })

    if (error) throw error

    return new Response(JSON.stringify({ 
      success: true, 
      firmwares: firmwares || []
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('List firmware versions error:', error)
    throw error
  }
}

async function uploadFirmware(supabase: any, data: any, userId: string) {
  try {
    const { 
      version, 
      description, 
      release_notes, 
      file_data, 
      file_size, 
      checksum,
      is_stable,
      is_beta,
      min_compatible_version,
      target_device_models
    } = data

    // Validate version format (e.g., "2.1.0")
    if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$/.test(version)) {
      throw new Error('Invalid version format. Use semantic versioning (e.g., 2.1.0)')
    }

    // Check if version already exists
    const { data: existingFirmware } = await supabase
      .from('firmware_versions')
      .select('id')
      .eq('version', version)
      .single()

    if (existingFirmware) {
      throw new Error(`Firmware version ${version} already exists`)
    }

    // In a real implementation, you would upload the file to storage
    // For now, we'll simulate the file storage
    const file_path = `/firmware/v${version}.bin`

    // Insert firmware version record
    const { data: firmware, error: insertError } = await supabase
      .from('firmware_versions')
      .insert({
        version,
        description,
        release_notes,
        file_path,
        file_size: file_size || 0,
        checksum,
        is_stable: is_stable || false,
        is_beta: is_beta || false,
        min_compatible_version,
        target_device_models: target_device_models || [],
        created_by: userId
      })
      .select()
      .single()

    if (insertError) throw insertError

    return new Response(JSON.stringify({ 
      success: true, 
      firmware,
      message: `Firmware version ${version} uploaded successfully`
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Upload firmware error:', error)
    throw error
  }
}

async function initiateFirmwareUpdate(supabase: any, data: FirmwareUpdate, userId: string) {
  try {
    const { device_id, firmware_version, force_update, scheduled_at } = data

    // Get firmware details
    const { data: firmware, error: firmwareError } = await supabase
      .from('firmware_versions')
      .select('*')
      .eq('version', firmware_version)
      .single()

    if (firmwareError || !firmware) {
      throw new Error(`Firmware version ${firmware_version} not found`)
    }

    let devices = []

    if (device_id) {
      // Update specific device
      const { data: device, error: deviceError } = await supabase
        .from('devices')
        .select('*')
        .eq('id', device_id)
        .single()

      if (deviceError || !device) {
        throw new Error('Device not found')
      }

      devices = [device]
    } else {
      // Update all compatible devices
      const { data: allDevices, error: devicesError } = await supabase
        .from('devices')
        .select('*')
        .eq('is_active', true)

      if (devicesError) throw devicesError
      devices = allDevices || []
    }

    const updateResults = []

    for (const device of devices) {
      try {
        // Check compatibility
        const compatible = await isCompatible(device, firmware)
        if (!compatible && !force_update) {
          updateResults.push({
            device_id: device.id,
            device_name: device.name,
            status: 'skipped',
            reason: 'Incompatible firmware version'
          })
          continue
        }

        // Check if device already has this version
        if (device.firmware_version === firmware_version && !force_update) {
          updateResults.push({
            device_id: device.id,
            device_name: device.name,
            status: 'skipped',
            reason: 'Device already has this firmware version'
          })
          continue
        }

        // Create update command
        const command_payload = {
          firmware_version: firmware.version,
          download_url: generateDownloadUrl(firmware.file_path),
          checksum: firmware.checksum,
          force_update: force_update || false,
          current_version: device.firmware_version
        }

        const { data: command, error: commandError } = await supabase
          .from('device_commands')
          .insert({
            device_id: device.id,
            command_type: 'firmware_update',
            command_payload,
            status: scheduled_at ? 'scheduled' : 'pending',
            issued_by: userId,
            issued_at: scheduled_at || new Date().toISOString(),
            expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48 hours
          })
          .select()
          .single()

        if (commandError) {
          updateResults.push({
            device_id: device.id,
            device_name: device.name,
            status: 'failed',
            reason: commandError.message
          })
          continue
        }

        updateResults.push({
          device_id: device.id,
          device_name: device.name,
          status: scheduled_at ? 'scheduled' : 'initiated',
          command_id: command.id
        })

        // Send MQTT command if not scheduled
        if (!scheduled_at) {
          await sendFirmwareUpdateCommand(device, command)
        }

      } catch (error) {
        updateResults.push({
          device_id: device.id,
          device_name: device.name,
          status: 'error',
          reason: error.message
        })
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Firmware update initiated for ${updateResults.length} devices`,
      results: updateResults
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Initiate firmware update error:', error)
    throw error
  }
}

async function checkFirmwareCompatibility(supabase: any, data: any) {
  try {
    const { device_id, firmware_version } = data

    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('*')
      .eq('id', device_id)
      .single()

    if (deviceError || !device) {
      throw new Error('Device not found')
    }

    const { data: firmware, error: firmwareError } = await supabase
      .from('firmware_versions')
      .select('*')
      .eq('version', firmware_version)
      .single()

    if (firmwareError || !firmware) {
      throw new Error('Firmware version not found')
    }

    const compatible = await isCompatible(device, firmware)
    const reasons = []

    if (!compatible) {
      if (firmware.min_compatible_version && 
          compareVersions(device.firmware_version || '1.0.0', firmware.min_compatible_version) < 0) {
        reasons.push(`Device firmware ${device.firmware_version} is below minimum required ${firmware.min_compatible_version}`)
      }

      if (firmware.target_device_models && 
          firmware.target_device_models.length > 0 && 
          !firmware.target_device_models.includes(device.device_model || 'unknown')) {
        reasons.push(`Device model ${device.device_model} is not in target models: ${firmware.target_device_models.join(', ')}`)
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      compatible,
      reasons,
      current_version: device.firmware_version,
      target_version: firmware.version
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Check compatibility error:', error)
    throw error
  }
}

async function getUpdateStatus(supabase: any, deviceId: string) {
  try {
    const { data: commands, error } = await supabase
      .from('device_commands')
      .select('*, firmware_versions(version, description)')
      .eq('device_id', deviceId)
      .eq('command_type', 'firmware_update')
      .order('issued_at', { ascending: false })
      .limit(10)

    if (error) throw error

    return new Response(JSON.stringify({ 
      success: true, 
      update_history: commands || []
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Get update status error:', error)
    throw error
  }
}

async function rollbackFirmware(supabase: any, data: any, userId: string) {
  try {
    const { device_id, target_version } = data

    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('*')
      .eq('id', device_id)
      .single()

    if (deviceError || !device) {
      throw new Error('Device not found')
    }

    // Find the target firmware version
    const { data: firmware, error: firmwareError } = await supabase
      .from('firmware_versions')
      .select('*')
      .eq('version', target_version)
      .single()

    if (firmwareError || !firmware) {
      throw new Error(`Firmware version ${target_version} not found`)
    }

    // Create rollback command
    const command_payload = {
      firmware_version: firmware.version,
      download_url: generateDownloadUrl(firmware.file_path),
      checksum: firmware.checksum,
      is_rollback: true,
      previous_version: device.firmware_version
    }

    const { data: command, error: commandError } = await supabase
      .from('device_commands')
      .insert({
        device_id: device_id,
        command_type: 'firmware_update',
        command_payload,
        status: 'pending',
        issued_by: userId,
        issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      })
      .select()
      .single()

    if (commandError) throw commandError

    // Send MQTT command
    await sendFirmwareUpdateCommand(device, command)

    return new Response(JSON.stringify({ 
      success: true, 
      command_id: command.id,
      message: `Firmware rollback to ${target_version} initiated for device ${device.name}`
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Rollback firmware error:', error)
    throw error
  }
}

async function scheduleFirmwareUpdate(supabase: any, data: any, userId: string) {
  try {
    const { device_ids, firmware_version, scheduled_at } = data

    if (!scheduled_at || new Date(scheduled_at) <= new Date()) {
      throw new Error('Scheduled time must be in the future')
    }

    const results = []

    for (const device_id of device_ids) {
      try {
        const updateResult = await initiateFirmwareUpdate(
          supabase, 
          { device_id, firmware_version, scheduled_at },
          userId
        )
        
        results.push({
          device_id,
          status: 'scheduled',
          scheduled_at
        })
      } catch (error) {
        results.push({
          device_id,
          status: 'failed',
          error: error.message
        })
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Firmware update scheduled for ${results.length} devices`,
      results
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Schedule firmware update error:', error)
    throw error
  }
}

async function isCompatible(device: any, firmware: any): Promise<boolean> {
  // Check minimum version requirement
  if (firmware.min_compatible_version) {
    const currentVersion = device.firmware_version || '1.0.0'
    if (compareVersions(currentVersion, firmware.min_compatible_version) < 0) {
      return false
    }
  }

  // Check device model compatibility
  if (firmware.target_device_models && firmware.target_device_models.length > 0) {
    const deviceModel = device.device_model || 'unknown'
    if (!firmware.target_device_models.includes(deviceModel)) {
      return false
    }
  }

  return true
}

function compareVersions(version1: string, version2: string): number {
  const v1parts = version1.split('.').map(Number)
  const v2parts = version2.split('.').map(Number)
  const maxLength = Math.max(v1parts.length, v2parts.length)
  
  for (let i = 0; i < maxLength; i++) {
    const v1part = v1parts[i] || 0
    const v2part = v2parts[i] || 0
    
    if (v1part < v2part) return -1
    if (v1part > v2part) return 1
  }
  
  return 0
}

function generateDownloadUrl(filePath: string): string {
  // In a real implementation, this would generate a signed URL for secure download
  const baseUrl = Deno.env.get('SUPABASE_URL') || 'https://your-project.supabase.co'
  return `${baseUrl}/storage/v1/object/public/firmware${filePath}`
}

async function sendFirmwareUpdateCommand(device: any, command: any) {
  try {
    // In a real implementation, this would send via MQTT
    const topic = `hydroscan/devices/${device.id}/firmware/update`
    const payload = {
      command_id: command.id,
      firmware_version: command.command_payload.firmware_version,
      download_url: command.command_payload.download_url,
      checksum: command.command_payload.checksum,
      timestamp: new Date().toISOString()
    }

    console.log(`[MQTT] Firmware update command sent to ${topic}:`, payload)
    
    // Simulate MQTT publish
    // In production: await mqttClient.publish(topic, JSON.stringify(payload), { qos: 1 })
    
    return true
  } catch (error) {
    console.error('Send firmware update command error:', error)
    return false
  }
}

// Background task to process scheduled updates
setInterval(async () => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get scheduled commands that should be executed now
    const { data: scheduledCommands } = await supabaseAdmin
      .from('device_commands')
      .select('*, devices(name)')
      .eq('command_type', 'firmware_update')
      .eq('status', 'scheduled')
      .lte('issued_at', new Date().toISOString())

    for (const command of scheduledCommands || []) {
      try {
        // Update command status to pending
        await supabaseAdmin
          .from('device_commands')
          .update({ status: 'pending' })
          .eq('id', command.id)

        // Send the firmware update command
        await sendFirmwareUpdateCommand(command.devices, command)

        console.log(`[SCHEDULER] Firmware update command sent to device ${command.devices.name}`)
      } catch (error) {
        console.error(`[SCHEDULER] Failed to send scheduled firmware update:`, error)
        
        // Mark command as failed
        await supabaseAdmin
          .from('device_commands')
          .update({ 
            status: 'failed',
            error_message: error.message,
            completed_at: new Date().toISOString()
          })
          .eq('id', command.id)
      }
    }
  } catch (error) {
    console.error('[SCHEDULER] Error processing scheduled updates:', error)
  }
}, 60 * 1000) // Check every minute
