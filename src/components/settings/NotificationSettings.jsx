import React from 'react';
import { Bell } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

const NotificationSettings = ({ settings, onChange }) => {
  return (
    <Card className="glass-effect border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Bell className="h-5 w-5 mr-2" />
          Notification Preferences
        </CardTitle>
        <CardDescription className="text-slate-400">
          Configure how you want to receive alerts and notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Email Notifications</p>
              <p className="text-sm text-slate-400">Receive alerts via email</p>
            </div>
            <Switch
              checked={settings.email}
              onCheckedChange={(checked) => onChange('email', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Push Notifications</p>
              <p className="text-sm text-slate-400">Browser push notifications</p>
            </div>
            <Switch
              checked={settings.push}
              onCheckedChange={(checked) => onChange('push', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">SMS Alerts</p>
              <p className="text-sm text-slate-400">Critical alerts via SMS</p>
            </div>
            <Switch
              checked={settings.sms}
              onCheckedChange={(checked) => onChange('sms', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Contamination Alerts</p>
              <p className="text-sm text-slate-400">Immediate contamination warnings</p>
            </div>
            <Switch
              checked={settings.alerts}
              onCheckedChange={(checked) => onChange('alerts', checked)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;