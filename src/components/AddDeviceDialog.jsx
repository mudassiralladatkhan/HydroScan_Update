import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Wifi } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';

const AddDeviceDialog = ({ open, onOpenChange }) => {
  const { addDevice } = useData();
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    serialNumber: '',
    firmwareVersion: '1.2.3'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.location || !formData.serialNumber) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const newDevice = addDevice(formData);
    
    toast({
      title: "Device Added Successfully",
      description: `${newDevice.name} has been added to your monitoring network.`,
    });

    setFormData({
      name: '',
      location: '',
      serialNumber: '',
      firmwareVersion: '1.2.3'
    });
    
    onOpenChange(false);
  };

  const generateSerialNumber = () => {
    const prefix = 'HS';
    const number = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const year = new Date().getFullYear();
    return `${prefix}-${number}-${year}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center text-white">
            <Plus className="h-5 w-5 mr-2" />
            Add New Device
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Register a new water quality monitoring device to your network
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="device-name" className="text-slate-200">Device Name *</Label>
            <Input
              id="device-name"
              placeholder="e.g., Water Station Delta"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="device-location" className="text-slate-200">Location *</Label>
            <Input
              id="device-location"
              placeholder="e.g., North Treatment Facility"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serial-number" className="text-slate-200">Serial Number *</Label>
            <div className="flex space-x-2">
              <Input
                id="serial-number"
                placeholder="e.g., HS-004-2024"
                value={formData.serialNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
                required
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormData(prev => ({ ...prev, serialNumber: generateSerialNumber() }))}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                Generate
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="firmware-version" className="text-slate-200">Firmware Version</Label>
            <Input
              id="firmware-version"
              value={formData.firmwareVersion}
              onChange={(e) => setFormData(prev => ({ ...prev, firmwareVersion: e.target.value }))}
              className="bg-slate-800/50 border-slate-600 text-white"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="gradient-bg"
            >
              <Wifi className="h-4 w-4 mr-2" />
              Add Device
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddDeviceDialog;