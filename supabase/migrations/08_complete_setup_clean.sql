-- Complete Setup Migration - Clean Version
-- This migration completes the HydroScan setup without vault dependencies

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Add missing columns to existing tables (safe with IF NOT EXISTS)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'technician';

-- Add missing columns to alert_rules table
ALTER TABLE alert_rules ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Ensure organizations table has proper constraints
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organizations_name_check') THEN
        ALTER TABLE organizations ADD CONSTRAINT organizations_name_check CHECK (char_length(name) >= 2);
    END IF;
END $$;

-- Update alert_rules RLS policy to include organization filter
DROP POLICY IF EXISTS "Users can view organization alert rules" ON alert_rules;
CREATE POLICY "Users can view organization alert rules" ON alert_rules
    FOR SELECT
    USING (organization_id = (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

-- Create indexes for better performance on new columns
CREATE INDEX IF NOT EXISTS idx_alert_rules_organization ON alert_rules(organization_id);

-- Function to automatically create an organization for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_organization()
RETURNS trigger AS $$
DECLARE
    org_id UUID;
BEGIN
    -- Check if user already has an organization via profiles
    SELECT organization_id INTO org_id 
    FROM profiles 
    WHERE id = NEW.id;

    -- If no organization, create one for individual users
    IF org_id IS NULL THEN
        -- Create a personal organization for the user
        INSERT INTO organizations (name, description)
        VALUES (
            COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Organization',
            'Personal organization for ' || NEW.email
        )
        RETURNING id INTO org_id;

        -- Update the profile with the organization
        UPDATE profiles 
        SET organization_id = org_id 
        WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user organization assignment
DROP TRIGGER IF EXISTS on_auth_user_created_org ON auth.users;
CREATE TRIGGER on_auth_user_created_org
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_organization();

-- Update the existing user profile trigger to work with organizations
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
    org_id UUID;
BEGIN
    -- Create personal organization first
    INSERT INTO organizations (name, description)
    VALUES (
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Organization',
        'Personal organization for ' || NEW.email
    )
    RETURNING id INTO org_id;

    -- Create profile with organization
    INSERT INTO public.profiles (id, full_name, avatar_url, role, organization_id)
    VALUES (
        NEW.id, 
        NEW.raw_user_meta_data->>'full_name', 
        NEW.raw_user_meta_data->>'avatar_url', 
        'admin',  -- First user in their organization is admin
        org_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add some default alert templates (using DO block to avoid conflicts)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM alert_templates WHERE name = 'High pH Alert') THEN
        INSERT INTO alert_templates (name, subject_template, body_template, type, is_default)
        VALUES ('High pH Alert', 'Water Quality Alert: High pH Detected', 'Device {{device_name}} at {{location}} has detected high pH levels: {{ph_value}}. Immediate attention may be required.', 'email', true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM alert_templates WHERE name = 'Low Battery Warning') THEN
        INSERT INTO alert_templates (name, subject_template, body_template, type, is_default)
        VALUES ('Low Battery Warning', 'Device Battery Warning', 'Device {{device_name}} battery level is critically low ({{battery_level}}%). Please replace or recharge the battery soon.', 'email', true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM alert_templates WHERE name = 'Device Offline Alert') THEN
        INSERT INTO alert_templates (name, subject_template, body_template, type, is_default)
        VALUES ('Device Offline Alert', 'Device Communication Lost', 'Device {{device_name}} at {{location}} has been offline for more than {{offline_duration}}. Please check device status.', 'email', true);
    END IF;
END $$;

-- Create function to update device status based on last heartbeat
CREATE OR REPLACE FUNCTION update_device_status()
RETURNS void AS $$
BEGIN
    -- Mark devices as offline if no heartbeat in last 10 minutes
    UPDATE devices 
    SET status = 'offline'
    WHERE status != 'maintenance' 
    AND (last_heartbeat IS NULL OR last_heartbeat < NOW() - INTERVAL '10 minutes');
    
    -- Mark devices as online if recent heartbeat
    UPDATE devices 
    SET status = 'online'
    WHERE last_heartbeat > NOW() - INTERVAL '5 minutes'
    AND status = 'offline';
END;
$$ LANGUAGE plpgsql;

-- Create a function to clean up old data (optional)
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- Delete sensor readings older than 1 year
    DELETE FROM sensor_readings 
    WHERE timestamp < NOW() - INTERVAL '1 year';
    
    -- Delete resolved alerts older than 6 months
    DELETE FROM alerts 
    WHERE resolved = true 
    AND resolved_at < NOW() - INTERVAL '6 months';
    
    -- Delete expired device commands
    DELETE FROM device_commands 
    WHERE status IN ('expired', 'completed', 'failed')
    AND created_at < NOW() - INTERVAL '30 days';
    
    -- Delete old MQTT message logs
    DELETE FROM mqtt_message_log 
    WHERE timestamp < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Add comments to document the schema
COMMENT ON DATABASE postgres IS 'HydroScan - AI-Powered Water Quality Monitoring Platform';
COMMENT ON TABLE organizations IS 'Multi-tenant organizations for user and device management';
COMMENT ON TABLE devices IS 'IoT water quality monitoring devices';
COMMENT ON TABLE sensor_readings IS 'Time-series sensor data from devices';
COMMENT ON TABLE alerts IS 'System and user-defined alerts for water quality issues';
COMMENT ON TABLE alert_rules IS 'Configurable rules for automated alert generation';
COMMENT ON TABLE profiles IS 'Extended user profiles with organization association';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT INSERT ON maintenance_logs TO authenticated;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
