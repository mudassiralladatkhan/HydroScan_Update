
import React from 'react';
import { Button } from '@/components/ui/button';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Download, Upload, RefreshCw } from 'lucide-react';

export const ExportDataModal = ({ setOpen }) => {
  const handleExport = () => {
    toast({ title: "Export Started (Mock)", description: "Your data export will be available shortly." });
    setOpen(false);
  };
  return (
    <DialogContent className="glass-effect border-slate-700 text-white">
      <DialogHeader>
        <DialogTitle className="flex items-center"><Download className="mr-2"/>Export All Data</DialogTitle>
        <DialogDescription>This will generate a CSV export of all your sensor data. This is a mock action.</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button type="button" variant="outline" className="border-slate-600 hover:bg-slate-700" onClick={() => setOpen(false)}>Cancel</Button>
        <Button type="button" className="gradient-bg" onClick={handleExport}>Confirm Export</Button>
      </DialogFooter>
    </DialogContent>
  );
};

export const ImportDataModal = ({ setOpen }) => {
   const handleImport = () => {
    toast({ title: "Import Successful (Mock)", description: "Your data has been imported." });
    setOpen(false);
  };
  return (
    <DialogContent className="glass-effect border-slate-700 text-white">
      <DialogHeader>
        <DialogTitle className="flex items-center"><Upload className="mr-2"/>Import Data</DialogTitle>
        <DialogDescription>Upload a CSV file to import historical data. This is a mock action.</DialogDescription>
      </DialogHeader>
       <div className="py-4">
            <input type="file" className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500/10 file:text-blue-300 hover:file:bg-blue-500/20"/>
        </div>
      <DialogFooter>
        <Button type="button" variant="outline" className="border-slate-600 hover:bg-slate-700" onClick={() => setOpen(false)}>Cancel</Button>
        <Button type="button" className="gradient-bg" onClick={handleImport}>Start Import</Button>
      </DialogFooter>
    </DialogContent>
  );
};

export const SyncDataModal = ({ setOpen }) => {
   const handleSync = () => {
    toast({ title: "Cloud Sync Started (Mock)", description: "Your data is now syncing." });
    setOpen(false);
  };
  return (
    <DialogContent className="glass-effect border-slate-700 text-white">
      <DialogHeader>
        <DialogTitle className="flex items-center"><RefreshCw className="mr-2"/>Sync with Cloud</DialogTitle>
        <DialogDescription>Force a synchronization of your data with the cloud backup service. This is a mock action.</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button type="button" variant="outline" className="border-slate-600 hover:bg-slate-700" onClick={() => setOpen(false)}>Cancel</Button>
        <Button type="button" className="gradient-bg" onClick={handleSync}>Confirm Sync</Button>
      </DialogFooter>
    </DialogContent>
  );
};
