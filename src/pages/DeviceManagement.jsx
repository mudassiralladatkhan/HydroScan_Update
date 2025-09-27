import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, Search, Filter, Wifi, WifiOff, Battery, Settings2, Trash2, Edit, Download, UploadCloud, 
  Wrench, BookOpen, BarChartBig, RotateCcw, Cpu, ChevronDown, CheckSquare, Square, AlertCircle, Clock, ListFilter
} from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import AddDeviceDialog from '@/components/AddDeviceDialog';
import DeviceCommandCenter from '@/components/DeviceCommandCenter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { format, formatDistanceToNow, parseISO, isValid, differenceInDays, addMonths } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";

const DeviceManagement = () => {
  const { devices, updateDevice, deleteDevice, fetchDevices } = useData();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);
  const [maintenanceDevice, setMaintenanceDevice] = useState(null);
  const [maintenanceForm, setMaintenanceForm] = useState({ notes: '', type: 'Routine', datePerformed: new Date().toISOString().substring(0, 16), nextScheduled: '' });
  const [showTroubleshootingDialog, setShowTroubleshootingDialog] = useState(false);
  const [showOtaDialog, setShowOtaDialog] = useState(false);
  const [otaDevice, setOtaDevice] = useState(null);
  const [selectedFirmware, setSelectedFirmware] = useState('2.1.0');
  const [showHealthDetailsDialog, setShowHealthDetailsDialog] = useState(false);
  const [healthDetailsDevice, setHealthDetailsDevice] = useState(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [configDevice, setConfigDevice] = useState(null);
  const [configForm, setConfigForm] = useState({ pollingInterval: 5, sensors: { ph: true, temp: true, tds: true } });
  const [showCommandCenter, setShowCommandCenter] = useState(false);
  const [commandDevice, setCommandDevice] = useState(null);

  const [filters, setFilters] = useState({
    status: 'all',
    battery: 'all',
    lastSeen: 'all',
  });
  const [selectedDevices, setSelectedDevices] = useState([]);


  const [editForm, setEditForm] = useState({
    id: '', name: '', location: '', serialNumber: '', firmwareVersion: '', status: 'offline',
    battery_level: null, wifi_signal_strength: null, next_maintenance_at: ''
  });

  useEffect(() => {
    if (editingDevice) {
      setEditForm({
        id: editingDevice.id,
        name: editingDevice.name,
        location: editingDevice.location || '',
        serialNumber: editingDevice.serial_number,
        firmwareVersion: editingDevice.firmware_version || '',
        status: editingDevice.status || 'offline',
        battery_level: editingDevice.battery_level || null,
        wifi_signal_strength: editingDevice.wifi_signal_strength || null,
        next_maintenance_at: editingDevice.next_maintenance_at ? format(parseISO(editingDevice.next_maintenance_at), "yyyy-MM-dd'T'HH:mm") : ''
      });
      setShowEditDialog(true);
    } else {
      setShowEditDialog(false);
    }
  }, [editingDevice]);
  
  const handleEditInputChange = (e) => {
    const { name, value, type } = e.target;
    setEditForm(prev => ({ ...prev, [name]: type === 'number' ? (value === '' ? null : parseFloat(value)) : value }));
  };

  const handleEditStatusChange = (value) => {
    setEditForm(prev => ({...prev, status: value}));
  };

  const handleSaveEdit = async () => {
    if (!editForm.id) return;
    const { id, serialNumber, firmwareVersion, ...updateData } = editForm;
    const deviceUpdatePayload = {
      name: updateData.name,
      location: updateData.location,
      serial_number: serialNumber,
      firmware_version: firmwareVersion,
      status: updateData.status,
      battery_level: updateData.battery_level,
      wifi_signal_strength: updateData.wifi_signal_strength,
      next_maintenance_at: updateData.next_maintenance_at ? new Date(updateData.next_maintenance_at).toISOString() : null
    };
    const updated = await updateDevice(id, deviceUpdatePayload);
    if (updated) {
      toast({ title: "Device Updated", description: `${updated.name} details saved successfully.` });
      setEditingDevice(null);
    }
  };

  const filteredDevices = useMemo(() => {
    return devices.filter(device => {
      const searchMatch = (device.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (device.location?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (device.serial_number?.toLowerCase() || '').includes(searchTerm.toLowerCase());

      const statusMatch = filters.status === 'all' || device.status === filters.status;
      
      const batteryMatch = filters.battery === 'all' || 
                           (filters.battery === '<20' && (device.battery_level != null && device.battery_level < 20)) ||
                           (filters.battery === '20-60' && (device.battery_level != null && device.battery_level >= 20 && device.battery_level <= 60)) ||
                           (filters.battery === '>60' && (device.battery_level != null && device.battery_level > 60));

      const lastSeenMatch = filters.lastSeen === 'all' ||
                            (filters.lastSeen === 'today' && device.last_seen && differenceInDays(new Date(), parseISO(device.last_seen)) === 0) ||
                            (filters.lastSeen === '7days' && device.last_seen && differenceInDays(new Date(), parseISO(device.last_seen)) <= 7) ||
                            (filters.lastSeen === 'older' && device.last_seen && differenceInDays(new Date(), parseISO(device.last_seen)) > 7);
                            
      return searchMatch && statusMatch && batteryMatch && lastSeenMatch;
    });
  }, [devices, searchTerm, filters]);

  const handleFilterChange = (type, value) => {
    setFilters(prev => ({ ...prev, [type]: value }));
  };
  
  const handleSelectDevice = (deviceId) => {
    setSelectedDevices(prev => 
      prev.includes(deviceId) ? prev.filter(id => id !== deviceId) : [...prev, deviceId]
    );
  };

  const handleSelectAllDevices = () => {
    if (selectedDevices.length === filteredDevices.length) {
      setSelectedDevices([]);
    } else {
      setSelectedDevices(filteredDevices.map(d => d.id));
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedDevices.length === 0) {
      toast({ title: "No Devices Selected", description: "Please select devices to perform a bulk action.", variant: "destructive" });
      return;
    }

    const selectedDeviceNames = devices.filter(d => selectedDevices.includes(d.id)).map(d => d.name).join(', ');
    
    try {
      switch (action) {
        case 'Reboot Selected':
          // Send reboot commands to selected devices
          const rebootPromises = selectedDevices.map(async (deviceId) => {
            const { data, error } = await supabase.functions.invoke('device-commander', {
              body: {
                action: 'send_command',
                device_id: deviceId,
                command_type: 'reboot',
                payload: { reason: 'bulk_reboot' }
              }
            });
            if (error) throw new Error(`Failed to reboot device ${deviceId}: ${error.message}`);
            return data;
          });
          await Promise.all(rebootPromises);
          toast({ title: "Bulk Reboot Initiated", description: `Reboot commands sent to ${selectedDevices.length} devices: ${selectedDeviceNames}` });
          break;

        case 'Firmware Update Selected':
          // Update firmware for selected devices
          const firmwarePromises = selectedDevices.map(async (deviceId) => {
            const { data, error } = await supabase.functions.invoke('firmware-manager', {
              body: {
                device_id: deviceId,
                firmware_version: '2.1.0',
                update_type: 'bulk_update'
              }
            });
            if (error) throw new Error(`Failed to update firmware for device ${deviceId}: ${error.message}`);
            return data;
          });
          await Promise.all(firmwarePromises);
          toast({ title: "Bulk Firmware Update Initiated", description: `Firmware updates started for ${selectedDevices.length} devices: ${selectedDeviceNames}` });
          break;

        case 'Delete Selected':
          // Delete selected devices with confirmation
          if (!confirm(`Are you sure you want to delete ${selectedDevices.length} devices? This action cannot be undone.`)) {
            return;
          }
          const deletePromises = selectedDevices.map(async (deviceId) => {
            const success = await deleteDevice(deviceId);
            if (!success) throw new Error(`Failed to delete device ${deviceId}`);
            return success;
          });
          await Promise.all(deletePromises);
          toast({ title: "Bulk Delete Completed", description: `Successfully deleted ${selectedDevices.length} devices: ${selectedDeviceNames}` });
          break;

        default:
          toast({ title: "Unknown Action", description: `Action '${action}' is not implemented.`, variant: "destructive" });
          return;
      }
      
      setSelectedDevices([]);
      fetchDevices(); // Refresh the device list
    } catch (error) {
      toast({ title: "Bulk Action Failed", description: error.message, variant: "destructive" });
    }
  };
  
  const openMaintenanceDialog = (device) => {
    setMaintenanceDevice(device);
    setMaintenanceForm({ notes: '', type: 'Routine', datePerformed: new Date().toISOString().substring(0, 16), nextScheduled: '' });
    setShowMaintenanceDialog(true);
  };

  const handleMaintenanceFormChange = (e) => {
    const { name, value } = e.target;
    setMaintenanceForm(prev => ({ ...prev, [name]: value }));
  };

  const handleLogMaintenance = async () => {
    if (!maintenanceDevice || !maintenanceForm.notes || !user) {
      toast({ title: "Error", description: "Device, notes, and user are required.", variant: "destructive" });
      return;
    }
    const payload = {
      device_id: maintenanceDevice.id,
      performed_by: user.id,
      maintenance_type: maintenanceForm.type,
      notes: maintenanceForm.notes,
      date_performed: new Date(maintenanceForm.datePerformed).toISOString(),
      next_scheduled_maintenance: maintenanceForm.nextScheduled ? new Date(maintenanceForm.nextScheduled).toISOString() : null,
    };
    const { data, error } = await supabase.from('maintenance_logs').insert([payload]).select().single();
    if (error) {
      toast({ title: "Error Logging Maintenance", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Maintenance Logged", description: `Maintenance for ${maintenanceDevice.name} recorded successfully.` });
      if (payload.next_scheduled_maintenance) {
        await updateDevice(maintenanceDevice.id, { next_maintenance_at: payload.next_scheduled_maintenance });
      }
      fetchDevices(); // Refresh device list to show updated next_maintenance_at
      setShowMaintenanceDialog(false);
    }
  };

  const openOtaDialog = (device) => { setOtaDevice(device); setShowOtaDialog(true); };
  const handleOtaUpdate = () => { 
    toast({ title: `OTA Update Initiated (Mock)`, description: `Device ${otaDevice.name} will update to firmware ${selectedFirmware}.`});
    setShowOtaDialog(false);
  };

  const openHealthDetailsDialog = (device) => { setHealthDetailsDevice(device); setShowHealthDetailsDialog(true); };
  const openConfigDialog = (device) => { setConfigDevice(device); setShowConfigDialog(true); };
  const openCommandCenter = (device) => { setCommandDevice(device); setShowCommandCenter(true); };
  const handleSaveConfig = () => {
    toast({ title: "Configuration Saved (Mock)", description: `Polling interval for ${configDevice.name} set to ${configForm.pollingInterval} mins.` });
    setShowConfigDialog(false);
  };

  const handleExportDeviceList = () => {
    if (filteredDevices.length === 0) {
        toast({ title: "No Devices to Export", description: "There are no devices matching current filters.", variant: "default" });
        return;
    }
    const csvHeader = "Name,Serial Number,Location,Status,Firmware Version,Battery Level,Last Seen,Next Maintenance\n";
    const csvRows = filteredDevices.map(d => 
        [
            d.name || '',
            d.serial_number || '',
            d.location || '',
            d.status || '',
            d.firmware_version || 'N/A',
            d.battery_level != null ? `${d.battery_level}%` : 'N/A',
            d.last_seen ? format(parseISO(d.last_seen), 'Pp') : 'Never',
            d.next_maintenance_at ? format(parseISO(d.next_maintenance_at), 'PP') : 'Not Set'
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    
    const csvContent = csvHeader + csvRows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "hydroscan_devices.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    toast({ title: "Device List Exported", description: "The current list of devices has been exported as a CSV file." });
  };

  const getBatteryColor = (level) => {
    if (level == null) return 'text-slate-500';
    if (level > 60) return 'text-green-400';
    if (level > 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStatusIndicatorClass = (status) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-red-500';
      case 'maintenance': return 'bg-yellow-500';
      case 'error': return 'bg-orange-600';
      default: return 'bg-gray-500';
    }
  };
  
  const cardVariant = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.03 } }),
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Device Fleet Management</h1>
          <p className="text-slate-400 mt-1">Monitor, manage, and maintain your IoT sensor devices.</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gradient-bg mt-3 sm:mt-0">
          <Plus className="h-4 w-4 mr-2" /> Register New Device
        </Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Search devices by name, location, S/N..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-10" />
          </div>
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 h-10 shrink-0">
                <ListFilter className="h-4 w-4 mr-2" /> Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-slate-800 border-slate-700 text-white">
              <DropdownMenuCheckboxItem checked={filters.status === 'all'} onCheckedChange={() => handleFilterChange('status', 'all')}>All Statuses</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={filters.status === 'online'} onCheckedChange={() => handleFilterChange('status', 'online')}>Online</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={filters.status === 'offline'} onCheckedChange={() => handleFilterChange('status', 'offline')}>Offline</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={filters.status === 'maintenance'} onCheckedChange={() => handleFilterChange('status', 'maintenance')}>Maintenance</DropdownMenuCheckboxItem>
              <DropdownMenuSeparator className="bg-slate-700"/>
              <DropdownMenuCheckboxItem checked={filters.battery === 'all'} onCheckedChange={() => handleFilterChange('battery', 'all')}>All Battery Levels</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={filters.battery === '>60'} onCheckedChange={() => handleFilterChange('battery', '>60')}>Battery {'>'} 60%</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={filters.battery === '20-60'} onCheckedChange={() => handleFilterChange('battery', '20-60')}>Battery 20-60%</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={filters.battery === '<20'} onCheckedChange={() => handleFilterChange('battery', '<20')}>Battery {'<'} 20%</DropdownMenuCheckboxItem>
              <DropdownMenuSeparator className="bg-slate-700"/>
              <DropdownMenuCheckboxItem checked={filters.lastSeen === 'all'} onCheckedChange={() => handleFilterChange('lastSeen', 'all')}>Any Last Seen</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={filters.lastSeen === 'today'} onCheckedChange={() => handleFilterChange('lastSeen', 'today')}>Seen Today</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={filters.lastSeen === '7days'} onCheckedChange={() => handleFilterChange('lastSeen', '7days')}>Seen Last 7 Days</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={filters.lastSeen === 'older'} onCheckedChange={() => handleFilterChange('lastSeen', 'older')}>Seen {'>'} 7 Days Ago</DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={handleExportDeviceList} className="border-slate-600 text-slate-300 hover:bg-slate-800 h-10 shrink-0">
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
        </div>
        {filteredDevices.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={handleSelectAllDevices} className="text-slate-400 hover:text-white">
                {selectedDevices.length === filteredDevices.length && filteredDevices.length > 0 ? <CheckSquare className="h-4 w-4 mr-2 text-blue-400"/> : <Square className="h-4 w-4 mr-2"/>}
                Select All ({selectedDevices.length})
              </Button>
            </div>
            {selectedDevices.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 h-9 text-xs">
                    Bulk Actions <ChevronDown className="h-3 w-3 ml-1.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white">
                  <DropdownMenuItem onSelect={() => handleBulkAction('Reboot Selected')} className="hover:!bg-slate-700"><RotateCcw className="h-3.5 w-3.5 mr-2"/>Reboot Selected</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleBulkAction('Firmware Update Selected')} className="hover:!bg-slate-700"><UploadCloud className="h-3.5 w-3.5 mr-2"/>Firmware Update</DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-700"/>
                  <DropdownMenuItem onSelect={() => handleBulkAction('Delete Selected')} className="text-red-400 hover:!bg-red-500/20 hover:!text-red-300"><Trash2 className="h-3.5 w-3.5 mr-2"/>Delete Selected</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </motion.div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Total', value: devices.length, Icon: Cpu },
          { label: 'Online', value: devices.filter(d => d.status === 'online').length, Icon: Wifi },
          { label: 'Offline', value: devices.filter(d => d.status === 'offline').length, Icon: WifiOff },
          { label: 'Maintenance', value: devices.filter(d => d.status === 'maintenance').length, Icon: Wrench },
        ].map((stat, i) => (
          <motion.div key={stat.label} custom={i} variants={cardVariant} initial="hidden" animate="visible">
            <Card className="glass-effect border-slate-700">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-slate-400">{stat.label}</p>
                    <p className="text-lg sm:text-xl font-bold text-white">{stat.value}</p>
                  </div>
                  <stat.Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.label === 'Online' ? 'text-green-400' : stat.label === 'Offline' ? 'text-red-400' : 'text-blue-400'}`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredDevices.map((device, index) => (
            <motion.div key={device.id} custom={index} variants={cardVariant} initial="hidden" animate="visible" layout>
              <Card className={`glass-effect border-slate-700 hover:border-slate-500 transition-colors flex flex-col h-full ${selectedDevices.includes(device.id) ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}>
                <CardHeader className="pb-3 cursor-pointer" onClick={() => handleSelectDevice(device.id)}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                       {selectedDevices.includes(device.id) ? <CheckSquare className="h-5 w-5 text-blue-400 shrink-0"/> : <Square className="h-5 w-5 text-slate-500 shrink-0"/>}
                       <CardTitle className="text-lg text-white truncate" title={device.name}>{device.name}</CardTitle>
                    </div>
                    <div className="relative flex items-center shrink-0">
                       <div className={`w-3 h-3 rounded-full ${getStatusIndicatorClass(device.status)} mr-2`}></div>
                       {device.status === 'online' && (<div className={`absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${getStatusIndicatorClass(device.status)} animate-ping opacity-75`}></div>)}
                      <Badge className={`capitalize text-xs ${getStatusIndicatorClass(device.status)} text-white`}>{device.status}</Badge>
                    </div>
                  </div>
                  <CardDescription className="text-slate-400 text-xs truncate ml-7" title={device.location}>{device.location || 'N/A'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm flex-grow">
                  <div className="flex justify-between"><span className="text-slate-400">S/N:</span> <span className="font-mono text-slate-300">{device.serial_number}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Firmware:</span> <span className="text-slate-300">{device.firmware_version || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Battery:</span> <span className={getBatteryColor(device.battery_level)}>{device.battery_level != null ? `${device.battery_level}%` : 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">WiFi Signal:</span> <span className={getBatteryColor(device.wifi_signal_strength ? (100 + device.wifi_signal_strength) : 0)}>{device.wifi_signal_strength != null ? `${device.wifi_signal_strength} dBm` : 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Last Seen:</span> <span className="text-slate-300">{device.last_seen && isValid(parseISO(device.last_seen)) ? formatDistanceToNow(parseISO(device.last_seen), { addSuffix: true }) : 'Never'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Next Maint:</span> <span className="text-slate-300">{device.next_maintenance_at && isValid(parseISO(device.next_maintenance_at)) ? format(parseISO(device.next_maintenance_at), 'PP') : 'Not Set'}</span></div>
                </CardContent>
                <CardFooter className="grid grid-cols-2 gap-2 pt-3">
                  <Button variant="outline" size="sm" onClick={() => openOtaDialog(device)} className="text-xs border-slate-600 hover:bg-slate-700"><UploadCloud className="h-3 w-3 mr-1.5" /> OTA Update</Button>
                  <Button variant="outline" size="sm" onClick={() => openMaintenanceDialog(device)} className="text-xs border-slate-600 hover:bg-slate-700"><Wrench className="h-3 w-3 mr-1.5" /> Log Maint.</Button>
                  <Button variant="outline" size="sm" onClick={() => setEditingDevice(device)} className="text-xs border-slate-600 hover:bg-slate-700"><Edit className="h-3 w-3 mr-1.5" /> Edit Details</Button>
                  <Button variant="outline" size="sm" onClick={() => openHealthDetailsDialog(device)} className="text-xs border-slate-600 hover:bg-slate-700"><BarChartBig className="h-3 w-3 mr-1.5" /> Health</Button>
                  <Button variant="outline" size="sm" onClick={() => openConfigDialog(device)} className="text-xs border-slate-600 hover:bg-slate-700"><Settings2 className="h-3 w-3 mr-1.5" /> Config</Button>
                  <Button variant="outline" size="sm" onClick={() => setShowTroubleshootingDialog(true)} className="text-xs border-slate-600 hover:bg-slate-700"><BookOpen className="h-3 w-3 mr-1.5" /> Guide</Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
        {filteredDevices.length === 0 && (<div className="text-center py-8 col-span-full"><p className="text-slate-400">No devices found matching your search criteria.</p></div>)}
      </motion.div>

      <AddDeviceDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
      
      {editingDevice && showEditDialog && (
        <Dialog open={showEditDialog} onOpenChange={() => setEditingDevice(null)}>
          <DialogContent className="glass-effect border-slate-700 text-white">
            <DialogHeader><DialogTitle>Edit Device: {editingDevice.name}</DialogTitle><DialogDescription>Update device details.</DialogDescription></DialogHeader>
            <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800/50">
              <div className="space-y-1"><Label htmlFor="edit-name">Name</Label><Input id="edit-name" name="name" value={editForm.name} onChange={handleEditInputChange} className="bg-slate-800/50 border-slate-600" /></div>
              <div className="space-y-1"><Label htmlFor="edit-location">Location</Label><Input id="edit-location" name="location" value={editForm.location} onChange={handleEditInputChange} className="bg-slate-800/50 border-slate-600" /></div>
              <div className="space-y-1"><Label htmlFor="edit-serialNumber">Serial Number</Label><Input id="edit-serialNumber" name="serialNumber" value={editForm.serialNumber} onChange={handleEditInputChange} className="bg-slate-800/50 border-slate-600" /></div>
              <div className="space-y-1"><Label htmlFor="edit-firmwareVersion">Firmware Version</Label><Input id="edit-firmwareVersion" name="firmwareVersion" value={editForm.firmwareVersion} onChange={handleEditInputChange} className="bg-slate-800/50 border-slate-600" /></div>
              <div className="space-y-1"><Label htmlFor="edit-battery_level">Battery Level (%)</Label><Input id="edit-battery_level" name="battery_level" type="number" value={editForm.battery_level ?? ''} onChange={handleEditInputChange} className="bg-slate-800/50 border-slate-600" /></div>
              <div className="space-y-1"><Label htmlFor="edit-wifi_signal_strength">WiFi Signal (dBm)</Label><Input id="edit-wifi_signal_strength" name="wifi_signal_strength" type="number" value={editForm.wifi_signal_strength ?? ''} onChange={handleEditInputChange} className="bg-slate-800/50 border-slate-600" /></div>
              <div className="space-y-1"><Label htmlFor="edit-next_maintenance_at">Next Maintenance At</Label><Input id="edit-next_maintenance_at" name="next_maintenance_at" type="datetime-local" value={editForm.next_maintenance_at} onChange={handleEditInputChange} className="bg-slate-800/50 border-slate-600" /></div>
              <div className="space-y-1"><Label htmlFor="edit-status">Status</Label><Select value={editForm.status} onValueChange={handleEditStatusChange}><SelectTrigger className="bg-slate-800/50 border-slate-600"><SelectValue /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-600 text-white"><SelectItem value="online">Online</SelectItem><SelectItem value="offline">Offline</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem><SelectItem value="error">Error</SelectItem></SelectContent></Select></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setEditingDevice(null)} className="border-slate-600 hover:bg-slate-700">Cancel</Button><Button onClick={handleSaveEdit} className="gradient-bg">Save Changes</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {maintenanceDevice && (
         <Dialog open={showMaintenanceDialog} onOpenChange={setShowMaintenanceDialog}>
          <DialogContent className="glass-effect border-slate-700 text-white">
            <DialogHeader><DialogTitle>Log Maintenance for {maintenanceDevice.name}</DialogTitle><DialogDescription>Record maintenance activities performed on this device.</DialogDescription></DialogHeader>
            <div className="py-4 space-y-3">
              <div className="space-y-1"><Label htmlFor="maintenance-type">Maintenance Type</Label><Select name="type" value={maintenanceForm.type} onValueChange={(value) => setMaintenanceForm(prev => ({...prev, type: value}))}><SelectTrigger className="bg-slate-800/50 border-slate-600"><SelectValue /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-600 text-white"><SelectItem value="Routine">Routine</SelectItem><SelectItem value="Repair">Repair</SelectItem><SelectItem value="Calibration">Calibration</SelectItem><SelectItem value="Firmware Update">Firmware Update</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
              <div className="space-y-1"><Label htmlFor="maintenance-date">Date Performed</Label><Input id="maintenance-date" name="datePerformed" type="datetime-local" value={maintenanceForm.datePerformed} onChange={handleMaintenanceFormChange} className="bg-slate-800/50 border-slate-600" /></div>
              <div className="space-y-1"><Label htmlFor="maintenance-notes">Maintenance Notes</Label><Textarea id="maintenance-notes" name="notes" value={maintenanceForm.notes} onChange={handleMaintenanceFormChange} placeholder="Describe the maintenance performed..." className="bg-slate-800/50 border-slate-600 min-h-[100px]" /></div>
              <div className="space-y-1"><Label htmlFor="next-maintenance">Next Scheduled Maintenance (Optional)</Label><Input id="next-maintenance" name="nextScheduled" type="datetime-local" value={maintenanceForm.nextScheduled} onChange={handleMaintenanceFormChange} className="bg-slate-800/50 border-slate-600" /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setShowMaintenanceDialog(false)} className="border-slate-600 hover:bg-slate-700">Cancel</Button><Button onClick={handleLogMaintenance} className="gradient-bg">Log Maintenance</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {otaDevice && (
        <Dialog open={showOtaDialog} onOpenChange={setShowOtaDialog}>
          <DialogContent className="glass-effect border-slate-700 text-white">
            <DialogHeader><DialogTitle>OTA Firmware Update for {otaDevice.name}</DialogTitle><DialogDescription>Current Firmware: {otaDevice.firmware_version || 'N/A'}</DialogDescription></DialogHeader>
            <div className="py-4 space-y-3">
              <Label htmlFor="firmware-select">Select Firmware Version</Label>
              <Select value={selectedFirmware} onValueChange={setSelectedFirmware}>
                <SelectTrigger className="bg-slate-800/50 border-slate-600"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600 text-white"><SelectItem value="2.1.0">Version 2.1.0 (Latest Stable)</SelectItem><SelectItem value="2.0.5">Version 2.0.5 (Previous)</SelectItem><SelectItem value="1.9.0-beta">Version 1.9.0 (Beta)</SelectItem></SelectContent>
              </Select>
              <p className="text-xs text-slate-400">Ensure device has stable power and internet connection before starting the update.</p>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setShowOtaDialog(false)} className="border-slate-600 hover:bg-slate-700">Cancel</Button><Button onClick={handleOtaUpdate} className="gradient-bg">Start Update (Mock)</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {healthDetailsDevice && (
         <Dialog open={showHealthDetailsDialog} onOpenChange={setShowHealthDetailsDialog}>
          <DialogContent className="glass-effect border-slate-700 text-white max-w-md">
            <DialogHeader><DialogTitle>Health Details: {healthDetailsDevice.name}</DialogTitle><DialogDescription>Mock health and performance overview.</DialogDescription></DialogHeader>
            <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800/50">
              <Card className="bg-slate-800/50 border-slate-700"><CardHeader className="p-3"><CardTitle className="text-sm">Uptime History (Mock)</CardTitle></CardHeader><CardContent className="p-3 text-center text-slate-400 text-xs">Graph of uptime percentage over last 30 days.</CardContent></Card>
              <Card className="bg-slate-800/50 border-slate-700"><CardHeader className="p-3"><CardTitle className="text-sm">Recent Errors (Mock)</CardTitle></CardHeader><CardContent className="p-3 text-slate-300 text-xs"><ul className="list-disc pl-4 space-y-1"><li><AlertCircle className="inline h-3 w-3 mr-1 text-orange-400"/> Sensor Timeout - pH (2 hours ago)</li><li><Clock className="inline h-3 w-3 mr-1 text-yellow-400"/> Low Battery Warning (yesterday)</li></ul></CardContent></Card>
              <Card className="bg-slate-800/50 border-slate-700"><CardHeader className="p-3"><CardTitle className="text-sm">Sensor Status (Mock)</CardTitle></CardHeader><CardContent className="p-3 text-slate-300 text-xs grid grid-cols-2 gap-1"><span>pH Sensor: <Badge className="bg-green-500/80">Good</Badge></span><span>Temp Sensor: <Badge className="bg-green-500/80">Good</Badge></span><span>TDS Sensor: <Badge className="bg-yellow-500/80">Needs Calib.</Badge></span><span>Turbidity: <Badge className="bg-green-500/80">Good</Badge></span></CardContent></Card>
            </div>
            <DialogFooter><Button onClick={() => setShowHealthDetailsDialog(false)} className="gradient-bg">Close</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {configDevice && (
         <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
          <DialogContent className="glass-effect border-slate-700 text-white">
            <DialogHeader><DialogTitle>Configure Device: {configDevice.name}</DialogTitle><DialogDescription>Adjust device settings (Mock).</DialogDescription></DialogHeader>
            <div className="py-4 space-y-4">
              <div><Label htmlFor="polling-interval">Polling Interval (minutes)</Label><Input id="polling-interval" type="number" value={configForm.pollingInterval} onChange={(e) => setConfigForm(prev => ({...prev, pollingInterval: parseInt(e.target.value,10)}))} className="bg-slate-800/50 border-slate-600" min="1" max="60"/></div>
              <div>
                <Label>Enabled Sensors</Label>
                <div className="space-y-1 mt-1">
                  {Object.keys(configForm.sensors).map(sensorKey => (
                    <div key={sensorKey} className="flex items-center space-x-2">
                      <Checkbox id={`sensor-${sensorKey}`} checked={configForm.sensors[sensorKey]} onCheckedChange={(checked) => setConfigForm(prev => ({ ...prev, sensors: {...prev.sensors, [sensorKey]: checked }}))} />
                      <Label htmlFor={`sensor-${sensorKey}`} className="capitalize">{sensorKey}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setShowConfigDialog(false)} className="border-slate-600 hover:bg-slate-700">Cancel</Button><Button onClick={handleSaveConfig} className="gradient-bg">Save Configuration</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={showTroubleshootingDialog} onOpenChange={setShowTroubleshootingDialog}>
        <DialogContent className="glass-effect border-slate-700 text-white max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center"><BookOpen className="mr-2"/>Device Troubleshooting Guide</DialogTitle><DialogDescription>Common issues and solutions for HydroScan devices.</DialogDescription></DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800/50 space-y-4 pr-2">
            <div><h4 className="font-semibold text-blue-400">Device Offline</h4><ul className="list-disc list-inside text-sm text-slate-300 pl-2 space-y-1 mt-1"><li>Check device power supply and battery level.</li><li>Ensure device is within WiFi range and WiFi credentials are correct.</li><li>Restart the device.</li><li>Verify network connectivity at the device location.</li></ul></div>
            <div><h4 className="font-semibold text-blue-400">Inaccurate Sensor Readings</h4><ul className="list-disc list-inside text-sm text-slate-300 pl-2 space-y-1 mt-1"><li>Clean the sensor probes as per manufacturer instructions.</li><li>Perform sensor calibration via the Calibration page.</li><li>Check for physical damage to sensors or cables.</li><li>Ensure sensor is properly submerged or positioned.</li></ul></div>
            <div><h4 className="font-semibold text-blue-400">Firmware Update Failed</h4><ul className="list-disc list-inside text-sm text-slate-300 pl-2 space-y-1 mt-1"><li>Ensure stable internet connection for the device.</li><li>Verify sufficient battery level before starting OTA update.</li><li>Retry the update. If persists, contact support.</li></ul></div>
            <div><h4 className="font-semibold text-blue-400">No Data Transmitting</h4><ul className="list-disc list-inside text-sm text-slate-300 pl-2 space-y-1 mt-1"><li>Check "Last Seen" status. If old, investigate offline reasons.</li><li>Verify device configuration for data sending intervals.</li><li>Inspect device logs if accessible (mock feature).</li></ul></div>
            <div><h4 className="font-semibold text-blue-400">Alerts Not Triggering</h4><ul className="list-disc list-inside text-sm text-slate-300 pl-2 space-y-1 mt-1"><li>Verify alert rules are correctly configured and active for the device.</li><li>Check notification settings in your user profile.</li><li>Ensure sensor data is actually breaching thresholds.</li></ul></div>
            <p className="text-xs text-slate-500">For further assistance, please consult the detailed knowledge base or contact HydroScan support.</p>
          </div>
          <DialogFooter><Button onClick={() => setShowTroubleshootingDialog(false)} className="gradient-bg">Close Guide</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeviceManagement;