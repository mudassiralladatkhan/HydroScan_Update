
import React, { useState } from 'react';
import { Wifi, Database, Download, Upload, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { ExportDataModal, ImportDataModal, SyncDataModal } from '@/components/settings/DataManagementModals';

const SystemSettings = ({ settings, onChange }) => {
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="glass-effect border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Wifi className="h-5 w-5 mr-2" />
            System Configuration
          </CardTitle>
          <CardDescription className="text-slate-400">
            Configure system-wide settings and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-200">Data Retention (days)</Label>
            <Input
              type="number"
              value={settings.dataRetention}
              onChange={(e) => onChange('dataRetention', parseInt(e.target.value) || 365)}
              className="bg-slate-800/50 border-slate-600 text-white"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-slate-200">Sampling Interval (seconds)</Label>
            <Input
              type="number"
              value={settings.samplingInterval}
              onChange={(e) => onChange('samplingInterval', parseInt(e.target.value) || 300)}
              className="bg-slate-800/50 border-slate-600 text-white"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Auto Calibration</p>
              <p className="text-sm text-slate-400">Automatic sensor calibration</p>
            </div>
            <Switch
              checked={settings.autoCalibration}
              onCheckedChange={(checked) => onChange('autoCalibration', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Automatic Backup</p>
              <p className="text-sm text-slate-400">Daily data backups</p>
            </div>
            <Switch
              checked={settings.backupEnabled}
              onCheckedChange={(checked) => onChange('backupEnabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-effect border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Data Management
          </CardTitle>
          <CardDescription className="text-slate-400">
            Import, export, and manage your data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
            <DialogTrigger asChild>
              <Button className="w-full gradient-bg"><Download className="h-4 w-4 mr-2" />Export All Data</Button>
            </DialogTrigger>
            <ExportDataModal setOpen={setExportModalOpen}/>
          </Dialog>

          <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"><Upload className="h-4 w-4 mr-2" />Import Data</Button>
            </DialogTrigger>
            <ImportDataModal setOpen={setImportModalOpen}/>
          </Dialog>

          <Dialog open={syncModalOpen} onOpenChange={setSyncModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"><RefreshCw className="h-4 w-4 mr-2" />Sync with Cloud</Button>
            </DialogTrigger>
            <SyncDataModal setOpen={setSyncModalOpen}/>
          </Dialog>

        </CardContent>
      </Card>
    </div>
  );
};

export default SystemSettings;
