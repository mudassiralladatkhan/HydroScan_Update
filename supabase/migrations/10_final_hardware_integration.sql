-- Final Hardware Integration Migration
-- This migration safely adds all the missing hardware integration features

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Add missing columns to existing tables (safe with IF NOT EXISTS)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'technician';

-- Add missing columns to devices table
ALTER TABLE devices ADD COLUMN IF NOT EXISTS battery_level NUMERIC(5,2);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS wifi_signal_strength INTEGER;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS firmware_version VARCHAR(50);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_model VARCHAR(100);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS next_maintenance_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS mqtt_client_id VARCHAR(100);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMP WITH TIME ZONE;

-- Add missing columns to alerts table
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS acknowledged_by UUID;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS escalated BOOLEAN DEFAULT false;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN DEFAULT false;

-- Add missing columns to alert_rules table
ALTER TABLE alert_rules ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Create all new tables with IF NOT EXISTS
CREATE TABLE IF NOT EXISTS device_commands (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    command_type VARCHAR(50) NOT NULL,
    command_payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    issued_by UUID,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP WITH TIME ZONE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    response JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours')
);

CREATE TABLE IF NOT EXISTS device_heartbeats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL,
    signal_strength INTEGER,
    battery_level NUMERIC(5,2),
    memory_usage NUMERIC(5,2),
    cpu_usage NUMERIC(5,2),
    uptime BIGINT,
    firmware_version VARCHAR(50),
    ip_address INET,
    location_data JSONB,
    sensor_status JSONB
);

CREATE TABLE IF NOT EXISTS firmware_versions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    version VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    release_notes TEXT,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    checksum VARCHAR(256),
    release_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_stable BOOLEAN DEFAULT false,
    is_beta BOOLEAN DEFAULT false,
    min_compatible_version VARCHAR(50),
    target_device_models TEXT[],
    created_by UUID
);

CREATE TABLE IF NOT EXISTS device_configurations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    config_version INTEGER DEFAULT 1,
    polling_interval INTEGER DEFAULT 300,
    alert_thresholds JSONB DEFAULT '{}',
    sensor_settings JSONB DEFAULT '{}',
    network_settings JSONB DEFAULT '{}',
    power_settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT false,
    applied_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sensor_calibration_data (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    sensor_type VARCHAR(50) NOT NULL,
    calibration_points JSONB NOT NULL,
    correction_formula TEXT,
    coefficients JSONB,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP WITH TIME ZONE,
    accuracy_rating NUMERIC(5,2),
    calibrated_by UUID,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS data_quality_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    metric_date DATE DEFAULT CURRENT_DATE,
    total_readings INTEGER DEFAULT 0,
    valid_readings INTEGER DEFAULT 0,
    invalid_readings INTEGER DEFAULT 0,
    duplicate_readings INTEGER DEFAULT 0,
    out_of_range_readings INTEGER DEFAULT 0,
    missing_readings INTEGER DEFAULT 0,
    data_completeness NUMERIC(5,2),
    data_accuracy NUMERIC(5,2),
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mqtt_message_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    device_id UUID,
    topic VARCHAR(255) NOT NULL,
    message_type VARCHAR(50),
    payload JSONB,
    qos INTEGER DEFAULT 0,
    retained BOOLEAN DEFAULT false,
    direction VARCHAR(10) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT false,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS device_network_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    session_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    session_end TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    connection_type VARCHAR(20),
    data_sent BIGINT DEFAULT 0,
    data_received BIGINT DEFAULT 0,
    disconnect_reason VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS maintenance_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    performed_by UUID,
    maintenance_type VARCHAR(50) NOT NULL,
    notes TEXT NOT NULL,
    date_performed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    next_scheduled_maintenance TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_device_commands_device_status ON device_commands(device_id, status);
CREATE INDEX IF NOT EXISTS idx_device_heartbeats_device_timestamp ON device_heartbeats(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_device_configurations_device_active ON device_configurations(device_id, is_active);
CREATE INDEX IF NOT EXISTS idx_mqtt_message_log_device_timestamp ON mqtt_message_log(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_data_quality_metrics_device_date ON data_quality_metrics(device_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_device ON maintenance_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_devices_organization ON devices(organization_id);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);

-- Enable Row Level Security
ALTER TABLE device_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE firmware_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_calibration_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE mqtt_message_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_network_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;

-- Insert default firmware versions
INSERT INTO firmware_versions (version, description, release_notes, file_path, is_stable) 
VALUES ('2.1.0', 'Current stable release', 'Bug fixes and performance improvements', '/firmware/v2.1.0.bin', true)
ON CONFLICT (version) DO NOTHING;

INSERT INTO firmware_versions (version, description, release_notes, file_path, is_stable) 
VALUES ('2.0.5', 'Previous stable release', 'Legacy version for older devices', '/firmware/v2.0.5.bin', true)
ON CONFLICT (version) DO NOTHING;

-- Create a simple trigger function for Gemini scoring (without vault dependency)
CREATE OR REPLACE FUNCTION public.request_gemini_scoring()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only trigger if we have the necessary sensor data
    IF NEW.ph IS NOT NULL OR NEW.turbidity IS NOT NULL OR NEW.tds IS NOT NULL OR NEW.temperature IS NOT NULL THEN
        -- Use pg_net to make HTTP request to edge function
        -- In production, you would configure the actual service role key
        PERFORM net.http_post(
            url := 'https://iyosufyraxmowvskttno.supabase.co/functions/v1/gemini-scorer',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5b3N1ZnlyYXhtb3d2c2t0dG5vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDk4NDU4NCwiZXhwIjoyMDcwNTYwNTg0fQ.5-D5Vffe7IgQO7tfygI9Yl3Vy7A4JHtpDRfr-0DzrTM'
            ),
            body := jsonb_build_object('record', to_jsonb(NEW))
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_new_sensor_reading ON sensor_readings;
CREATE TRIGGER on_new_sensor_reading
    AFTER INSERT ON sensor_readings
    FOR EACH ROW
    EXECUTE FUNCTION public.request_gemini_scoring();

-- Add some comments for documentation
COMMENT ON TABLE device_commands IS 'Queue for remote device commands (restart, calibrate, etc.)';
COMMENT ON TABLE device_heartbeats IS 'Device health and connectivity status tracking';
COMMENT ON TABLE firmware_versions IS 'Available firmware versions for OTA updates';
COMMENT ON TABLE device_configurations IS 'Device-specific configuration settings';
COMMENT ON TABLE sensor_calibration_data IS 'Calibration parameters for sensors';
COMMENT ON TABLE data_quality_metrics IS 'Data quality monitoring metrics';
COMMENT ON TABLE mqtt_message_log IS 'MQTT message logging for debugging';
COMMENT ON TABLE device_network_sessions IS 'Network connection tracking';
COMMENT ON TABLE maintenance_logs IS 'Device maintenance history and scheduling';
