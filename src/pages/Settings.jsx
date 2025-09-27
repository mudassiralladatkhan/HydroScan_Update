
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Bell, 
  Shield, 
  Wifi, 
  Save, 
  KeyRound, 
  FileText, 
  Lock,
  Users2,
  BarChartBig,
  Activity
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import ProfileSettings from '@/components/settings/ProfileSettings';
import NotificationSettings from '@/components/settings/NotificationSettings';
import ThresholdSettings from '@/components/settings/ThresholdSettings';
import SystemSettings from '@/components/settings/SystemSettings';
import SecuritySettings from '@/components/settings/SecuritySettings';
import APISettings from '@/components/settings/APISettings';
import ComplianceSettings from '@/components/settings/ComplianceSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const Settings = () => {
  const { user, profile, preferences, updateUserPreferences } = useAuth(); 
  const [localSettings, setLocalSettings] = useState(null); 


  const defaultSettings = {
    notifications: { email: true, push: true, sms: false, alerts: true },
    thresholds: {
      pH: { min: 6.5, max: 8.5 },
      temperature: { min: 15, max: 25 },
      tds: { max: 300 },
      turbidity: { max: 4 }
    },
    system: { dataRetention: 365, samplingInterval: 300, autoCalibration: true, backupEnabled: true },
    theme: 'dark' 
  };
  
  useEffect(() => {
    if (preferences) {
        setLocalSettings(prev => ({
          ...defaultSettings,
          ...preferences, 
          notifications: { ...defaultSettings.notifications, ...(preferences?.notifications || {}) },
          thresholds: { 
            ...defaultSettings.thresholds, 
            ...(preferences?.thresholds || {}),
            pH: { ...defaultSettings.thresholds.pH, ...(preferences?.thresholds?.pH || {}) },
            temperature: { ...defaultSettings.thresholds.temperature, ...(preferences?.thresholds?.temperature || {}) },
            tds: { ...defaultSettings.thresholds.tds, ...(preferences?.thresholds?.tds || {}) },
            turbidity: { ...defaultSettings.thresholds.turbidity, ...(preferences?.thresholds?.turbidity || {}) },
          },
          system: { ...defaultSettings.system, ...(preferences?.system || {}) },
          theme: preferences?.theme || defaultSettings.theme
        }));
    } else {
        setLocalSettings(defaultSettings);
    }
  }, [preferences]); 

  const handleSaveSettings = async () => {
    if (!localSettings) {
        toast({ title: "Error", description: "Settings not loaded yet.", variant: "destructive" });
        return;
    }
    await updateUserPreferences(localSettings); 
  };

  const handleSettingsChange = (category, key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };
  
  const handleThresholdChange = (parameter, type, value) => {
    setLocalSettings(prev => ({
      ...prev,
      thresholds: {
        ...prev.thresholds,
        [parameter]: {
          ...(prev.thresholds ? prev.thresholds[parameter] : {}),
          [type]: parseFloat(value) || 0
        }
      }
    }));
  };
  
  const handleFeatureClick = (featureName) => {
    toast({ title: "🚧 Mock Feature", description: `${featureName} UI is for demonstration.` });
  };



  // Check if user is not authenticated
  if (!user) {
    return (
      <div className="p-6 text-white">
        <div>Please log in to access settings.</div>
      </div>
    );
  }

  // Check if settings are still loading
  if (!localSettings) {
    return (
      <div className="p-6 text-white">
        <div>Loading settings...</div>
        <div className="text-sm text-slate-400 mt-2">
          Debug: User: {user ? '✓' : '✗'}, LocalSettings: {localSettings ? '✓' : '✗'}, Profile: {profile ? '✓' : '✗'}
        </div>
      </div>
    );
  }

  // If profile is missing, create a default profile but still show settings
  const effectiveProfile = profile || {
    id: user.id,
    role: 'user', // Default role
    full_name: user.email?.split('@')[0] || 'User',
    email: user.email
  };

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-slate-400 mt-1">Configure your HydroScan platform preferences</p>
        </div>
        <Button 
          onClick={handleSaveSettings}
          className="gradient-bg mt-3 sm:mt-0"
        >
          <Save className="h-4 w-4 mr-2" />
          Save All Settings
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 bg-slate-800/50 text-xs sm:text-sm">
            <TabsTrigger value="profile" className="text-slate-300 data-[state=active]:text-white"><User className="h-4 w-4 mr-0 sm:mr-1" /> <span className="hidden sm:inline">Profile</span></TabsTrigger>
            <TabsTrigger value="notifications" className="text-slate-300 data-[state=active]:text-white"><Bell className="h-4 w-4 mr-0 sm:mr-1" /> <span className="hidden sm:inline">Notifications</span></TabsTrigger>
            <TabsTrigger value="thresholds" className="text-slate-300 data-[state=active]:text-white"><Activity className="h-4 w-4 mr-0 sm:mr-1" /> <span className="hidden sm:inline">Thresholds</span></TabsTrigger>
            <TabsTrigger value="system" className="text-slate-300 data-[state=active]:text-white"><Wifi className="h-4 w-4 mr-0 sm:mr-1" /> <span className="hidden sm:inline">System</span></TabsTrigger>
            {effectiveProfile.role === 'admin' && (
              <>
                <TabsTrigger value="security" className="text-slate-300 data-[state=active]:text-white"><Shield className="h-4 w-4 mr-0 sm:mr-1" /> <span className="hidden sm:inline">Security</span></TabsTrigger>
                <TabsTrigger value="api_keys" className="text-slate-300 data-[state=active]:text-white"><KeyRound className="h-4 w-4 mr-0 sm:mr-1" /> <span className="hidden sm:inline">API Keys</span></TabsTrigger>
                <TabsTrigger value="compliance" className="text-slate-300 data-[state=active]:text-white"><FileText className="h-4 w-4 mr-0 sm:mr-1" /> <span className="hidden sm:inline">Compliance</span></TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="profile">
            <ProfileSettings user={user} />

          </TabsContent>
          <TabsContent value="notifications">
            <NotificationSettings 
              settings={localSettings.notifications} 
              onChange={(key, value) => handleSettingsChange('notifications', key, value)} 
            />

          </TabsContent>
          <TabsContent value="thresholds">
            <ThresholdSettings 
              settings={localSettings.thresholds} 
              onChange={handleThresholdChange} 
            />
          </TabsContent>
          <TabsContent value="system">
            <SystemSettings 
              settings={localSettings.system} 
              onChange={(key, value) => handleSettingsChange('system', key, value)} 
            />
          </TabsContent>
          <TabsContent value="security">
            <SecuritySettings />

          </TabsContent>
          <TabsContent value="api_keys">
            <APISettings />
          </TabsContent>
          <TabsContent value="compliance">
            <ComplianceSettings />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default Settings;
