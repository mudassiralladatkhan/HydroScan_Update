import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Terminal, Send, RotateCcw, Settings, Upload, Download, 
  Play, Pause, RefreshCw, Wrench, AlertTriangle, Clock,
  CheckCircle, XCircle, Loader2, Activity
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabaseClient';
import { formatDistanceToNow } from 'date-fns';

const DeviceCommandCenter = ({ device, onClose }) => {
  const [activeTab, setActiveTab] = useState('commands');
  const [pendingCommands, setPendingCommands] = useState([]);
  const [commandHistory, setCommandHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState('');
  const [commandPayload, setCommandPayload] = useState('{}');
  const [firmwareVersions, setFirmwareVersions] = useState([]);
  
  // Command forms
  const [calibrationForm, setCalibrationForm] = useState({
    sensor_type: 'ph',
    calibration_points: [],
    reference_values: []
  });
  
  const [configForm, setConfigForm] = useState({
    polling_interval: 300,
    alert_thresholds: {},
    sensor_settings: {},
    network_settings: {}
  });

  const [firmwareForm, setFirmwareForm] = useState({
    version: '',
    force_update: false,
    scheduled_at: ''
  });

  useEffect(() => {
    if (device?.id) {
      fetchPendingCommands();
      fetchCommandHistory();
      fetchFirmwareVersions();
      fetchDeviceConfig();
    }
  }, [device?.id]);

  const fetchPendingCommands = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('device-commander', {
        body: { action: 'get_pending_commands', device_id: device.id }
      });

      if (error) throw error;
      setPendingCommands(data.commands || []);
    } catch (error) {
      console.error('Error fetching pending commands:', error);
    }
  };

  const fetchCommandHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('device_commands')
        .select('*')
        .eq('device_id', device.id)
        .order('issued_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setCommandHistory(data || []);
    } catch (error) {
      console.error('Error fetching command history:', error);
    }
  };

  const fetchFirmwareVersions = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('firmware-manager', {
        body: { action: 'list_firmware' }
      });

      if (error) throw error;
      setFirmwareVersions(data.firmwares || []);
    } catch (error) {
      console.error('Error fetching firmware versions:', error);
    }
  };

  const fetchDeviceConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('device_configurations')
        .select('*')
        .eq('device_id', device.id)
        .eq('is_active', true)
        .single();

      if (data) {
        setConfigForm({
          polling_interval: data.polling_interval || 300,
          alert_thresholds: data.alert_thresholds || {},
          sensor_settings: data.sensor_settings || {},
          network_settings: data.network_settings || {}
        });
      }
    } catch (error) {
      console.error('Error fetching device config:', error);
    }
  };

  const sendCommand = async (commandType, payload) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('device-commander', {
        body: {
          action: 'send_command',
          device_id: device.id,
          command_type: commandType,
          payload: payload,
          priority: 'medium'
        }
      });

      if (error) throw error;

      toast({
        title: 'Command Sent',
        description: data.message || `${commandType} command sent successfully`
      });

      fetchPendingCommands();
      fetchCommandHistory();
    } catch (error) {
      toast({
        title: 'Command Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickCommand = async (command) => {
    let payload = {};
    
    switch (command) {
      case 'restart':
        payload = { reason: 'Manual restart requested' };
        break;
      case 'diagnostics':
        payload = { full_report: true };
        break;
      case 'reset':
        payload = { reset_type: 'soft', preserve_config: true };
        break;
      default:
        break;
    }

    await sendCommand(command, payload);
  };

  const handleCalibration = async () => {
    await sendCommand('calibrate', calibrationForm);
  };

  const handleConfigUpdate = async () => {
    await sendCommand('update_config', configForm);
  };

  const handleFirmwareUpdate = async () => {
    const payload = {
      firmware_version: firmwareForm.version,
      force_update: firmwareForm.force_update
    };

    if (firmwareForm.scheduled_at) {
      payload.scheduled_at = firmwareForm.scheduled_at;
    }

    await sendCommand('firmware_update', payload);
  };

  const handleCustomCommand = async () => {
    try {
      const payload = JSON.parse(commandPayload);
      await sendCommand(selectedCommand, payload);
      setCommandPayload('{}');
      setSelectedCommand('');
    } catch (error) {
      toast({
        title: 'Invalid Payload',
        description: 'Please check your JSON syntax',
        variant: 'destructive'
      });
    }
  };

  const cancelCommand = async (commandId) => {
    try {
      const { data, error } = await supabase.functions.invoke('device-commander', {
        body: { action: 'cancel_command', payload: { command_id: commandId } }
      });

      if (error) throw error;

      toast({
        title: 'Command Cancelled',
        description: 'Command has been cancelled successfully'
      });

      fetchPendingCommands();
      fetchCommandHistory();
    } catch (error) {
      toast({
        title: 'Cancel Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getCommandStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-400" />;
      case 'sent':
        return <Send className="h-4 w-4 text-blue-400" />;
      case 'acknowledged':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-400" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getCommandStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'sent':
        return 'bg-blue-500/20 text-blue-400';
      case 'acknowledged':
        return 'bg-green-500/20 text-green-400';
      case 'completed':
        return 'bg-green-500/20 text-green-500';
      case 'failed':
        return 'bg-red-500/20 text-red-400';
      case 'cancelled':
        return 'bg-gray-500/20 text-gray-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-blue-400" />
            Device Command Center - {device?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-slate-800 p-1 rounded-lg">
            {[
              { id: 'commands', label: 'Quick Commands', icon: Terminal },
              { id: 'calibration', label: 'Calibration', icon: Settings },
              { id: 'configuration', label: 'Configuration', icon: Wrench },
              { id: 'firmware', label: 'Firmware', icon: Upload },
              { id: 'history', label: 'History', icon: Activity }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-500 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {/* Quick Commands Tab */}
            {activeTab === 'commands' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Pending Commands */}
                {pendingCommands.length > 0 && (
                  <Card className="glass-effect border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5 text-yellow-400" />
                        Pending Commands ({pendingCommands.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {pendingCommands.map((cmd) => (
                        <div key={cmd.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {getCommandStatusIcon(cmd.status)}
                            <div>
                              <p className="font-medium">{cmd.command_type}</p>
                              <p className="text-sm text-slate-400">
                                {formatDistanceToNow(new Date(cmd.issued_at))} ago
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getCommandStatusColor(cmd.status)}>
                              {cmd.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => cancelCommand(cmd.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="glass-effect border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-lg">System Control</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button
                        onClick={() => handleQuickCommand('restart')}
                        disabled={isLoading}
                        className="w-full bg-yellow-600 hover:bg-yellow-700"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restart Device
                      </Button>
                      <Button
                        onClick={() => handleQuickCommand('reset')}
                        disabled={isLoading}
                        variant="outline"
                        className="w-full border-red-500 text-red-400 hover:bg-red-500/20"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Factory Reset
                      </Button>
                      <Button
                        onClick={() => handleQuickCommand('diagnostics')}
                        disabled={isLoading}
                        variant="outline"
                        className="w-full"
                      >
                        <Activity className="h-4 w-4 mr-2" />
                        Run Diagnostics
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="glass-effect border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-lg">Sensor Control</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button
                        onClick={() => sendCommand('enable_sensors', { sensors: ['ph', 'turbidity', 'tds', 'temperature'] })}
                        disabled={isLoading}
                        variant="outline"
                        className="w-full border-green-500 text-green-400 hover:bg-green-500/20"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Enable All Sensors
                      </Button>
                      <Button
                        onClick={() => sendCommand('disable_sensors', { sensors: ['ph', 'turbidity', 'tds', 'temperature'] })}
                        disabled={isLoading}
                        variant="outline"
                        className="w-full border-red-500 text-red-400 hover:bg-red-500/20"
                      >
                        <Pause className="h-4 w-4 mr-2" />
                        Disable All Sensors
                      </Button>
                      <Button
                        onClick={() => sendCommand('set_polling_interval', { interval: 60 })}
                        disabled={isLoading}
                        variant="outline"
                        className="w-full"
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Set 1min Interval
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="glass-effect border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-lg">Custom Command</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Select value={selectedCommand} onValueChange={setSelectedCommand}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select command type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="restart">Restart</SelectItem>
                          <SelectItem value="calibrate">Calibrate</SelectItem>
                          <SelectItem value="update_config">Update Config</SelectItem>
                          <SelectItem value="diagnostics">Diagnostics</SelectItem>
                          <SelectItem value="reset">Reset</SelectItem>
                          <SelectItem value="set_polling_interval">Set Polling</SelectItem>
                        </SelectContent>
                      </Select>
                      <Textarea
                        placeholder='{"key": "value"}'
                        value={commandPayload}
                        onChange={(e) => setCommandPayload(e.target.value)}
                        className="h-20"
                      />
                      <Button
                        onClick={handleCustomCommand}
                        disabled={!selectedCommand || isLoading}
                        className="w-full"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send Command
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}

            {/* Calibration Tab */}
            {activeTab === 'calibration' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="glass-effect border-slate-700">
                  <CardHeader>
                    <CardTitle>Sensor Calibration</CardTitle>
                    <CardDescription>
                      Calibrate individual sensors for accurate readings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Sensor Type</Label>
                      <Select
                        value={calibrationForm.sensor_type}
                        onValueChange={(value) => setCalibrationForm({ ...calibrationForm, sensor_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ph">pH Sensor</SelectItem>
                          <SelectItem value="turbidity">Turbidity Sensor</SelectItem>
                          <SelectItem value="tds">TDS Sensor</SelectItem>
                          <SelectItem value="temperature">Temperature Sensor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Calibration Points (JSON)</Label>
                        <Textarea
                          placeholder='[{"raw": 100, "actual": 7.0}]'
                          className="h-24"
                          value={JSON.stringify(calibrationForm.calibration_points)}
                          onChange={(e) => {
                            try {
                              const points = JSON.parse(e.target.value);
                              setCalibrationForm({ ...calibrationForm, calibration_points: points });
                            } catch (error) {
                              // Invalid JSON, ignore
                            }
                          }}
                        />
                      </div>
                      <div>
                        <Label>Reference Values (JSON)</Label>
                        <Textarea
                          placeholder='[4.0, 7.0, 10.0]'
                          className="h-24"
                          value={JSON.stringify(calibrationForm.reference_values)}
                          onChange={(e) => {
                            try {
                              const values = JSON.parse(e.target.value);
                              setCalibrationForm({ ...calibrationForm, reference_values: values });
                            } catch (error) {
                              // Invalid JSON, ignore
                            }
                          }}
                        />
                      </div>
                    </div>

                    <Button onClick={handleCalibration} disabled={isLoading} className="w-full">
                      {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Start Calibration
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Configuration Tab */}
            {activeTab === 'configuration' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="glass-effect border-slate-700">
                  <CardHeader>
                    <CardTitle>Device Configuration</CardTitle>
                    <CardDescription>
                      Update device settings and parameters
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Polling Interval (seconds)</Label>
                      <Input
                        type="number"
                        min="30"
                        max="3600"
                        value={configForm.polling_interval}
                        onChange={(e) => setConfigForm({ ...configForm, polling_interval: parseInt(e.target.value) })}
                      />
                    </div>

                    <div>
                      <Label>Alert Thresholds (JSON)</Label>
                      <Textarea
                        placeholder='{"ph": {"min": 6.5, "max": 8.5}}'
                        className="h-24"
                        value={JSON.stringify(configForm.alert_thresholds, null, 2)}
                        onChange={(e) => {
                          try {
                            const thresholds = JSON.parse(e.target.value);
                            setConfigForm({ ...configForm, alert_thresholds: thresholds });
                          } catch (error) {
                            // Invalid JSON, ignore
                          }
                        }}
                      />
                    </div>

                    <div>
                      <Label>Sensor Settings (JSON)</Label>
                      <Textarea
                        placeholder='{"ph": {"enabled": true, "calibration_offset": 0}}'
                        className="h-24"
                        value={JSON.stringify(configForm.sensor_settings, null, 2)}
                        onChange={(e) => {
                          try {
                            const settings = JSON.parse(e.target.value);
                            setConfigForm({ ...configForm, sensor_settings: settings });
                          } catch (error) {
                            // Invalid JSON, ignore
                          }
                        }}
                      />
                    </div>

                    <Button onClick={handleConfigUpdate} disabled={isLoading} className="w-full">
                      {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Update Configuration
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Firmware Tab */}
            {activeTab === 'firmware' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="glass-effect border-slate-700">
                  <CardHeader>
                    <CardTitle>Firmware Management</CardTitle>
                    <CardDescription>
                      Update device firmware over-the-air
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Current Version: {device?.firmware_version || 'Unknown'}</Label>
                    </div>

                    <div>
                      <Label>Target Firmware Version</Label>
                      <Select
                        value={firmwareForm.version}
                        onValueChange={(value) => setFirmwareForm({ ...firmwareForm, version: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select firmware version" />
                        </SelectTrigger>
                        <SelectContent>
                          {firmwareVersions.map((fw) => (
                            <SelectItem key={fw.version} value={fw.version}>
                              {fw.version} {fw.is_stable ? '(Stable)' : fw.is_beta ? '(Beta)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="force-update"
                        checked={firmwareForm.force_update}
                        onCheckedChange={(checked) => setFirmwareForm({ ...firmwareForm, force_update: checked })}
                      />
                      <Label htmlFor="force-update">Force Update (ignore compatibility)</Label>
                    </div>

                    <div>
                      <Label>Schedule Update (Optional)</Label>
                      <Input
                        type="datetime-local"
                        value={firmwareForm.scheduled_at}
                        onChange={(e) => setFirmwareForm({ ...firmwareForm, scheduled_at: e.target.value })}
                        min={new Date().toISOString().slice(0, 16)}
                      />
                    </div>

                    <Button onClick={handleFirmwareUpdate} disabled={!firmwareForm.version || isLoading} className="w-full">
                      {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {firmwareForm.scheduled_at ? 'Schedule Update' : 'Start Update'}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="glass-effect border-slate-700">
                  <CardHeader>
                    <CardTitle>Command History</CardTitle>
                    <CardDescription>
                      Recent commands sent to this device
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {commandHistory.map((cmd) => (
                        <div key={cmd.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {getCommandStatusIcon(cmd.status)}
                            <div>
                              <p className="font-medium">{cmd.command_type}</p>
                              <p className="text-sm text-slate-400">
                                {formatDistanceToNow(new Date(cmd.issued_at))} ago
                                {cmd.completed_at && ` • Completed ${formatDistanceToNow(new Date(cmd.completed_at))} ago`}
                              </p>
                              {cmd.error_message && (
                                <p className="text-sm text-red-400">Error: {cmd.error_message}</p>
                              )}
                            </div>
                          </div>
                          <Badge className={getCommandStatusColor(cmd.status)}>
                            {cmd.status}
                          </Badge>
                        </div>
                      ))}
                      
                      {commandHistory.length === 0 && (
                        <div className="text-center text-slate-400 py-8">
                          No command history available
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeviceCommandCenter;
