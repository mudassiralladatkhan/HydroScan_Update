-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'technician',
    status VARCHAR(20) DEFAULT 'active',
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Devices table
CREATE TABLE devices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'offline',
    location JSONB,
    api_key VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    calibration_profile JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP WITH TIME ZONE
);

-- Sensor readings table
CREATE TABLE sensor_readings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ph NUMERIC(5,2),
    turbidity NUMERIC(5,2),
    tds NUMERIC(5,2),
    temperature NUMERIC(5,2),
    contamination_score NUMERIC(5,2),
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Calibration logs table
CREATE TABLE calibration_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sensor_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    parameter VARCHAR(50) NOT NULL,
    changes JSONB NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Alert rules table
CREATE TABLE alert_rules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    parameter VARCHAR(50) NOT NULL,
    condition VARCHAR(20) NOT NULL,
    threshold_value_1 NUMERIC(10,2),
    threshold_value_2 NUMERIC(10,2),
    severity VARCHAR(20) DEFAULT 'medium',
    notification_channels JSONB DEFAULT '{"email": true, "push": false, "sms": false}',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Alert templates table
CREATE TABLE alert_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'email',
    is_default BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Alerts table
CREATE TABLE alerts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES alert_rules(id) ON DELETE SET NULL,
    severity VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Exported files table
CREATE TABLE exported_files (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    export_by UUID REFERENCES users(id) ON DELETE SET NULL,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    file_type VARCHAR(10) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT,
    export_parameters JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_sensor_readings_device ON sensor_readings(device_id);
CREATE INDEX idx_sensor_readings_timestamp ON sensor_readings(timestamp);
CREATE INDEX idx_alerts_device ON alerts(device_id);
CREATE INDEX idx_alerts_rule ON alerts(rule_id);
CREATE INDEX idx_alert_rules_device ON alert_rules(device_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_exported_files_user ON exported_files(export_by);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE exported_files ENABLE ROW LEVEL SECURITY;

-- RLS policies for users
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT
    USING (auth.uid() = id);

-- RLS policies for devices
CREATE POLICY "Users can view organization devices" ON devices
    FOR SELECT
    USING (auth.uid() IN (
        SELECT id FROM users WHERE organization_id = (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    ));

-- RLS policies for sensor readings
CREATE POLICY "Users can view organization sensor readings" ON sensor_readings
    FOR SELECT
    USING (device_id IN (
        SELECT id FROM devices WHERE organization_id = (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    ));

-- RLS policies for calibration logs
CREATE POLICY "Users can view organization calibration logs" ON calibration_logs
    FOR SELECT
    USING (sensor_id IN (
        SELECT id FROM devices WHERE organization_id = (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    ));

-- RLS policies for alert rules
CREATE POLICY "Users can view organization alert rules" ON alert_rules
    FOR SELECT
    USING (device_id IN (
        SELECT id FROM devices WHERE organization_id = (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    ));

-- RLS policies for alerts
CREATE POLICY "Users can view organization alerts" ON alerts
    FOR SELECT
    USING (device_id IN (
        SELECT id FROM devices WHERE organization_id = (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    ));

-- RLS policies for audit logs
CREATE POLICY "Users can view their own audit logs" ON audit_logs
    FOR SELECT
    USING (user_id = auth.uid());

-- RLS policies for exported files
CREATE POLICY "Users can view their own exports" ON exported_files
    FOR SELECT
    USING (export_by = auth.uid());
