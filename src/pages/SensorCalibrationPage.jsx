
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SlidersHorizontal, Save, History, AlertTriangle, CheckCircle, Loader2, FileText, Download } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const SensorCalibrationPage = () => {
  const { devices, sensorData, fetchDevices } = useData();
  const { user } = useAuth();
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [calibrationValues, setCalibrationValues] = useState({ pH_offset: '', pH_slope: '', turbidity_offset: '', turbidity_slope: '', tds_offset: '', tds_slope: '', temperature_offset: '', temperature_slope: '' });
  const [loading, setLoading] = useState(false);
  const [calibrationLogs, setCalibrationLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showGuideDialog, setShowGuideDialog] = useState(false);

  useEffect(() => {
    if (selectedDeviceId) {
      const device = devices.find(d => d.id === selectedDeviceId);
      setSelectedDevice(device);
      if (device && device.calibration_offset) { // Changed from calibration_settings to calibration_offset
        setCalibrationValues({
          pH_offset: device.calibration_offset.pH_offset || '',
          pH_slope: device.calibration_offset.pH_slope || '',
          turbidity_offset: device.calibration_offset.turbidity_offset || '',
          turbidity_slope: device.calibration_offset.turbidity_slope || '',
          tds_offset: device.calibration_offset.tds_offset || '',
          tds_slope: device.calibration_offset.tds_slope || '',
          temperature_offset: device.calibration_offset.temperature_offset || '',
          temperature_slope: device.calibration_offset.temperature_slope || '',
        });
      } else {
        setCalibrationValues({ pH_offset: '', pH_slope: '', turbidity_offset: '', turbidity_slope: '', tds_offset: '', tds_slope: '', temperature_offset: '', temperature_slope: '' });
      }
      fetchCalibrationLogs(selectedDeviceId);
    } else {
      setSelectedDevice(null);
      setCalibrationLogs([]);
    }
  }, [selectedDeviceId, devices]);

  const fetchCalibrationLogs = async (deviceId) => {
    if (!deviceId) return;
    setLoadingLogs(true);
    const { data, error } = await supabase
      .from('calibration_logs')
      .select('*, users(email)') 
      .eq('sensor_id', deviceId) 
      .order('timestamp', { ascending: false })
      .limit(5);

    if (error) {
      toast({ title: "Error fetching calibration logs", description: error.message, variant: "destructive" });
      setCalibrationLogs([]);
    } else {
      setCalibrationLogs(data || []);
    }
    setLoadingLogs(false);
  };

  const handleInputChange = (parameter, field, value) => {
    setCalibrationValues(prev => ({ ...prev, [`${parameter}_${field}`]: value }));
  };

  const handleSubmitCalibration = async () => {
    if (!selectedDevice || !user) {
      toast({ title: "Error", description: "No device selected or user not authenticated.", variant: "destructive" });
      return;
    }
    setLoading(true);

    const newCalibrationProfile = {
      pH_offset: parseFloat(calibrationValues.pH_offset) || 0,
      pH_slope: parseFloat(calibrationValues.pH_slope) || 1,
      turbidity_offset: parseFloat(calibrationValues.turbidity_offset) || 0,
      turbidity_slope: parseFloat(calibrationValues.turbidity_slope) || 1,
      tds_offset: parseFloat(calibrationValues.tds_offset) || 0,
      tds_slope: parseFloat(calibrationValues.tds_slope) || 1,
      temperature_offset: parseFloat(calibrationValues.temperature_offset) || 0,
      temperature_slope: parseFloat(calibrationValues.temperature_slope) || 1,
    };

    const { error: updateError } = await supabase
      .from('devices')
      .update({ calibration_offset: newCalibrationProfile }) // Changed from calibration_settings
      .eq('id', selectedDevice.id);

    if (updateError) {
      toast({ title: "Calibration Update Failed", description: updateError.message, variant: "destructive" });
    } else {
      const { error: logError } = await supabase
        .from('calibration_logs')
        .insert({
          sensor_id: selectedDevice.id, 
          updated_by: user.id,
          changes: newCalibrationProfile, 
          parameter: 'all_sensors' 
        });
      
      if (logError) {
        toast({ title: "Calibration Saved, Log Failed", description: logError.message, variant: "warning" });
      } else {
        toast({ title: "Calibration Successful", description: `Settings updated for ${selectedDevice.name}.`, icon: <CheckCircle className="text-green-500" /> });
      }
      fetchDevices(); 
      fetchCalibrationLogs(selectedDevice.id);
    }
    setLoading(false);
  };

  const sensorParams = [
    { name: 'pH', key: 'pH', unit: '' },
    { name: 'Turbidity', key: 'turbidity', unit: 'NTU' },
    { name: 'TDS', key: 'tds', unit: 'ppm' },
    { name: 'Temperature', key: 'temperature', unit: '°C' },
  ];

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Sensor Calibration</h1>
          <p className="text-slate-400 mt-1">Adjust sensor offsets and slopes for accurate readings.</p>
        </div>
        <Button variant="outline" onClick={() => setShowGuideDialog(true)} className="mt-3 sm:mt-0 border-slate-600 text-slate-300 hover:bg-slate-700">
          <FileText className="h-4 w-4 mr-2" /> Calibration Guide
        </Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="glass-effect border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Select Device for Calibration</CardTitle>
            <Select onValueChange={setSelectedDeviceId} value={selectedDeviceId}>
              <SelectTrigger className="w-full md:w-1/2 mt-2 bg-slate-800/50 border-slate-600 text-white">
                <SelectValue placeholder="Choose a device..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600 text-white">
                {devices.map(device => (
                  <SelectItem key={device.id} value={device.id} className="hover:bg-slate-700">
                    {device.name} ({device.serial_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          {selectedDevice && (
            <CardContent className="space-y-6 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {sensorParams.map(param => (
                  <div key={param.key} className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                    <h3 className="text-lg font-semibold text-blue-400 mb-3">{param.name} Calibration</h3>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor={`${param.key}_offset`} className="text-slate-300">Offset ({param.unit})</Label>
                        <Input
                          id={`${param.key}_offset`}
                          type="number"
                          step="0.01"
                          value={calibrationValues[`${param.key}_offset`]}
                          onChange={(e) => handleInputChange(param.key, 'offset', e.target.value)}
                          className="bg-slate-700/50 border-slate-600 text-white mt-1"
                          placeholder="e.g., 0.1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${param.key}_slope`} className="text-slate-300">Slope</Label>
                        <Input
                          id={`${param.key}_slope`}
                          type="number"
                          step="0.01"
                          value={calibrationValues[`${param.key}_slope`]}
                          onChange={(e) => handleInputChange(param.key, 'slope', e.target.value)}
                          className="bg-slate-700/50 border-slate-600 text-white mt-1"
                          placeholder="e.g., 1.0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button onClick={handleSubmitCalibration} disabled={loading} className="w-full md:w-auto gradient-bg">
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Calibration for {selectedDevice.name}
              </Button>
              <div className="mt-2 text-xs text-slate-400">
                <AlertTriangle size={14} className="inline mr-1 text-yellow-400" />
                Ensure you are using certified calibration solutions for accurate results. Incorrect calibration can lead to erroneous data.
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>

      {selectedDevice && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-effect border-slate-700">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <History className="h-6 w-6 text-blue-400" />
                <CardTitle className="text-white">Calibration Log for {selectedDevice.name}</CardTitle>
              </div>
              <CardDescription className="text-slate-400">Recent calibration changes for this device.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLogs ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                </div>
              ) : calibrationLogs.length > 0 ? (
                <div className="overflow-x-auto scrollbar-hide">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700 hover:bg-slate-800/30">
                        <TableHead className="text-slate-300">Timestamp</TableHead>
                        <TableHead className="text-slate-300">Calibrated By</TableHead>
                        <TableHead className="text-slate-300">Parameter</TableHead>
                        <TableHead className="text-slate-300">Changes (Offset / Slope)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {calibrationLogs.map(log => (
                        <TableRow key={log.id} className="border-slate-700 hover:bg-slate-800/50">
                          <TableCell className="text-slate-400">{formatDate(log.timestamp)}</TableCell>
                          <TableCell className="text-slate-300">{log.users?.email || 'System'}</TableCell>
                          <TableCell className="text-blue-400 capitalize">{log.parameter}</TableCell>
                          <TableCell className="text-slate-400 text-xs">
                            {log.changes && typeof log.changes === 'object' ? (
                              <ul className="list-disc list-inside">
                                {Object.entries(log.changes).map(([key, value]) => (
                                  <li key={key}>{`${key.replace('_', ' ')}: ${value}`}</li>
                                ))}
                              </ul>
                            ) : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-slate-500 py-8">No calibration logs found for this device.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Dialog open={showGuideDialog} onOpenChange={setShowGuideDialog}>
        <DialogContent className="glass-effect border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center"><FileText className="mr-2"/>Sensor Calibration Guide (Mock)</DialogTitle>
            <DialogDescription>Best practices for calibrating your HydroScan sensors.</DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800/50 space-y-3 pr-2">
            <h4 className="font-semibold text-blue-400">General Principles:</h4>
            <ul className="list-disc list-inside text-sm text-slate-300 pl-2 space-y-1">
              <li>Always use fresh, certified calibration solutions.</li>
              <li>Rinse sensors with distilled water between solutions.</li>
              <li>Allow sensors to stabilize in solution before recording values.</li>
              <li>Calibrate regularly, frequency depends on usage and environment.</li>
            </ul>
            <h4 className="font-semibold text-blue-400 mt-3">pH Sensor Calibration:</h4>
            <p className="text-sm text-slate-300">Typically a 2-point or 3-point calibration (e.g., pH 4, 7, 10). Adjust offset for the pH 7 reading and slope for pH 4/10 readings.</p>
            <h4 className="font-semibold text-blue-400 mt-3">TDS/EC Sensor Calibration:</h4>
            <p className="text-sm text-slate-300">Use a standard conductivity solution (e.g., 1413 µS/cm). Adjust offset or slope based on sensor type.</p>
            <h4 className="font-semibold text-blue-400 mt-3">Turbidity Sensor Calibration:</h4>
            <p className="text-sm text-slate-300">Use formazin or polymer-based turbidity standards. A zero point (distilled water) and one or more higher points are common.</p>
            <p className="text-xs text-slate-500 mt-4">This is a mock guide. Refer to specific sensor manuals for detailed instructions.</p>
          </div>
          <DialogFooter>
            <Button onClick={() => toast({title:"Mock Action", description:"Calibration Report Downloaded (Mock)"})} variant="outline" className="border-slate-600 hover:bg-slate-700"><Download className="h-4 w-4 mr-2"/>Download PDF Guide</Button>
            <Button onClick={() => setShowGuideDialog(false)} className="gradient-bg">Close Guide</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default SensorCalibrationPage;
