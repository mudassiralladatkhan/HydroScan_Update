import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [devices, setDevices] = useState([]);
  const [sensorData, setSensorData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertRules, setAlertRules] = useState([]);
  const [alertTemplates, setAlertTemplates] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const fetchAllDataForOrg = async (organizationId) => {
    if (!organizationId) {
        setDevices([]); setSensorData([]); setAlerts([]); setAlertRules([]); setAlertTemplates([]); setLoadingData(false);
        return;
    }
    setLoadingData(true);
    
    // Fetch devices for the organization first
    const { data: orgDevices, error: devicesError } = await supabase
      .from('devices')
      .select('*')
      .eq('organization_id', organizationId);

    if (devicesError) toast({ title: "Error fetching devices", description: devicesError.message, variant: "destructive" });
    const currentDevices = orgDevices || [];
    setDevices(currentDevices);

    const deviceIds = currentDevices.map(d => d.id);

    // Now fetch other data related to these devices or the organization
    const [alertsRes, alertRulesRes, alertTemplatesRes, sensorReadingsRes] = await Promise.all([
      deviceIds.length > 0 ? supabase.from('alerts').select('*, devices(name, location)').in('device_id', deviceIds).order('created_at', { ascending: false }) : Promise.resolve({data:[], error:null}),
      supabase.from('alert_rules').select('*').eq('organization_id', organizationId),
      supabase.from('alert_templates').select('*').or(`organization_id.eq.${organizationId},organization_id.is.null`),
      deviceIds.length > 0 ? supabase.from('sensor_readings').select('*').in('device_id', deviceIds).order('timestamp', { ascending: false }).limit(100 * deviceIds.length) : Promise.resolve({data:[], error:null}),
    ]);

    if (alertsRes.error) toast({ title: "Error fetching alerts", description: alertsRes.error.message, variant: "destructive" });
    setAlerts(alertsRes.data || []);
    
    if (alertRulesRes.error) toast({ title: "Error fetching alert rules", description: alertRulesRes.error.message, variant: "destructive" });
    setAlertRules(alertRulesRes.data || []);

    if (alertTemplatesRes.error) toast({ title: "Error fetching alert templates", description: alertTemplatesRes.error.message, variant: "destructive" });
    setAlertTemplates(alertTemplatesRes.data || []);

    if (sensorReadingsRes.error) toast({ title: "Error fetching sensor data", description: sensorReadingsRes.error.message, variant: "destructive" });
    const processedData = (sensorReadingsRes.data || []).map(r => ({
      ...r,
      contaminationScore: r.contamination_score, // Use real score or null if not available
    }));
    setSensorData(processedData.reverse());
    
    setLoadingData(false);
  };
  
  useEffect(() => {
    if (!authLoading && user && user.organization?.id) {
      fetchAllDataForOrg(user.organization.id);
    } else if (!authLoading && !user) {
      setDevices([]); setSensorData([]); setAlerts([]); setAlertRules([]); setAlertTemplates([]); setLoadingData(false);
    }
  }, [user, authLoading]);


  useEffect(() => {
    if (!user || !user.organization?.id || devices.length === 0) return;

    const deviceIds = devices.map(d => d.id);
    if(deviceIds.length === 0) return; // Ensure deviceIds is not empty for "in" filter

    const subscriptions = [];

    const devicesChannel = supabase
      .channel('devices-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices', filter: `organization_id=eq.${user.organization.id}` }, 
        () => fetchAllDataForOrg(user.organization.id)
      ).subscribe();
    subscriptions.push(devicesChannel);
    
    const sensorReadingsChannel = supabase
      .channel('sensor-readings-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_readings', filter: `device_id=in.(${deviceIds.join(',')})` }, 
        (payload) => {
          const newReading = { ...payload.new, contaminationScore: payload.new.contamination_score };
          setSensorData(prev => [...prev, newReading].slice(-2000)); // Increased limit
        }
      ).subscribe();
    subscriptions.push(sensorReadingsChannel);

    const alertsChannel = supabase
      .channel('alerts-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' /* filter on device_id for org */ }, 
        (payload) => {
          // More granular update or refetch if device_id is in current org's devices
          if (deviceIds.includes(payload.new?.device_id) || deviceIds.includes(payload.old?.device_id)) {
            fetchAllDataForOrg(user.organization.id);
          }
        }
      ).subscribe();
    subscriptions.push(alertsChannel);
    
    const alertRulesChannel = supabase
      .channel('alert-rules-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alert_rules', filter: `organization_id=eq.${user.organization.id}` }, 
        () => fetchAllDataForOrg(user.organization.id)
      ).subscribe();
    subscriptions.push(alertRulesChannel);

    const alertTemplatesChannel = supabase
      .channel('alert-templates-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alert_templates' }, 
        () => fetchAllDataForOrg(user.organization.id)
      ).subscribe();
    subscriptions.push(alertTemplatesChannel);


    return () => {
      subscriptions.forEach(sub => supabase.removeChannel(sub).catch(console.error));
    };
  }, [user, devices]); 


  const addDevice = async (deviceData) => {
    if (!user || !user.organization?.id) {
      toast({ title: "Authentication Error", description: "User or organization not found.", variant: "destructive" });
      return null;
    }
    const newDevicePayload = {
      ...deviceData, 
      organization_id: user.organization.id,
      status: 'offline', 
      is_active: true,
    };
    const { data, error } = await supabase.from('devices').insert([newDevicePayload]).select().single();
    if (error) toast({ title: "Error adding device", description: error.message, variant: "destructive" });
    return data;
  };

  const updateDevice = async (deviceId, updates) => {
    const { data, error } = await supabase.from('devices').update(updates).eq('id', deviceId).select().single();
    if (error) toast({ title: "Error updating device", description: error.message, variant: "destructive" });
    return data;
  };
  
  const deleteDevice = async (deviceId) => {
    try {
      // First, delete all related data to avoid foreign key constraints
      await Promise.all([
        supabase.from('sensor_readings').delete().eq('device_id', deviceId),
        supabase.from('alerts').delete().eq('device_id', deviceId),
        supabase.from('device_commands').delete().eq('device_id', deviceId),
        supabase.from('device_heartbeats').delete().eq('device_id', deviceId),
        supabase.from('mqtt_message_log').delete().eq('device_id', deviceId)
      ]);
      
      // Then delete the device itself
      const { error } = await supabase.from('devices').delete().eq('id', deviceId);
      
      if (error) {
        throw error;
      }
      
      toast({ title: "Device Deleted", description: "Device and all associated data have been permanently deleted." });
      
      // Refresh the data
      if (user?.organization?.id) {
        await fetchAllDataForOrg(user.organization.id);
      }
      
      return true;
    } catch (error) {
      console.error('Device deletion error:', error);
      toast({ 
        title: "Error Deleting Device", 
        description: error.message || "Failed to delete device. Please try again.", 
        variant: "destructive" 
      });
      return false;
    }
  };

  const resolveAlert = async (alertId) => {
    const { data, error } = await supabase
      .from('alerts')
      .update({ is_resolved: true, resolved_at: new Date().toISOString(), status: 'resolved', resolved_by: user.id })
      .eq('id', alertId)
      .select()
      .single();
    if (error) toast({ title: "Error resolving alert", description: error.message, variant: "destructive" });
    return data;
  };
  
  const acknowledgeAlert = async (alertId) => {
    const { data, error } = await supabase
      .from('alerts')
      .update({ status: 'acknowledged', acknowledged_by: user.id })
      .eq('id', alertId)
      .neq('status', 'resolved') 
      .select()
      .single();
    if (error) toast({ title: "Error acknowledging alert", description: error.message, variant: "destructive" });
    return data;
  };

  const escalateAlert = async (alertId) => {
    toast({ title: "Alert Escalated (Mock)", description: `Alert ID ${alertId} has been marked for escalation.`});
  };

  const addAlertRule = async (ruleData) => {
    if (!user || !user.organization?.id) return null;
    const payload = { ...ruleData, organization_id: user.organization.id, created_by: user.id };
    const { data, error } = await supabase.from('alert_rules').insert([payload]).select().single();
    if (error) toast({ title: "Error adding alert rule", description: error.message, variant: "destructive" });
    else toast({ title: "Alert Rule Added"});
    return data;
  };

  const updateAlertRule = async (ruleId, updates) => {
    const { data, error } = await supabase.from('alert_rules').update(updates).eq('id', ruleId).select().single();
    if (error) toast({ title: "Error updating alert rule", description: error.message, variant: "destructive" });
    else toast({ title: "Alert Rule Updated"});
    return data;
  };
  
  const deleteAlertRule = async (ruleId) => {
    const { error } = await supabase.from('alert_rules').delete().eq('id', ruleId);
    if (error) toast({ title: "Error deleting alert rule", description: error.message, variant: "destructive" });
    else toast({ title: "Alert Rule Deleted"});
  };

  const addAlertTemplate = async (templateData) => {
    if (!user || !user.organization?.id) return null;
    const payload = { ...templateData, organization_id: templateData.is_global ? null : user.organization.id }; 
    const { data, error } = await supabase.from('alert_templates').insert([payload]).select().single();
    if (error) toast({ title: "Error adding alert template", description: error.message, variant: "destructive" });
    else toast({ title: "Alert Template Added"});
    return data;
  };

  const updateAlertTemplate = async (templateId, updates) => {
    const payload = { ...updates, organization_id: updates.is_global ? null : user.organization.id };
    const { data, error } = await supabase.from('alert_templates').update(payload).eq('id', templateId).select().single();
    if (error) toast({ title: "Error updating alert template", description: error.message, variant: "destructive" });
    else toast({ title: "Alert Template Updated"});
    return data;
  };
  
  const deleteAlertTemplate = async (templateId) => {
    const { error } = await supabase.from('alert_templates').delete().eq('id', templateId);
    if (error) toast({ title: "Error deleting alert template", description: error.message, variant: "destructive" });
    else toast({ title: "Alert Template Deleted"});
  };


  const value = {
    devices,
    sensorData,
    alerts,
    alertRules,
    alertTemplates,
    addDevice,
    updateDevice,
    deleteDevice,
    resolveAlert,
    acknowledgeAlert,
    escalateAlert,
    addAlertRule,
    updateAlertRule,
    deleteAlertRule,
    addAlertTemplate,
    updateAlertTemplate,
    deleteAlertTemplate,
    loadingData,
    fetchDevices: () => user?.organization?.id ? fetchAllDataForOrg(user.organization.id) : Promise.resolve(),
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};