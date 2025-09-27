
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ActivitySquare, Wifi, Thermometer, Droplets, Zap, Brain, AlertTriangle, WifiOff, Eye, EyeOff, Settings2, BarChart3, SlidersHorizontal } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const RealTimeSensorView = () => {
  const { devices, sensorData } = useData();
  const [aiMode, setAiMode] = useState(false);
  const [showDetails, setShowDetails] = useState({}); // deviceId: boolean
  const [liveData, setLiveData] = useState({});
  const [showConfigViewDialog, setShowConfigViewDialog] = useState(false);
  const [viewConfig, setViewConfig] = useState({
    showPH: true, showTurbidity: true, showTemp: true, showTDS: true, showContamination: true, autoRefresh: true
  });

  useEffect(() => {
    const latestData = {};
    devices.forEach(device => {
      const deviceReadings = sensorData
        .filter(sd => sd.device_id === device.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      if (deviceReadings.length > 0) {
        latestData[device.id] = deviceReadings[0];
      }
    });
    setLiveData(latestData);
  }, [sensorData, devices]);

  const toggleDetails = (deviceId) => {
    setShowDetails(prev => ({ ...prev, [deviceId]: !prev[deviceId] }));
  };
  
  const handleConfigViewChange = (key, value) => {
    setViewConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveViewConfig = () => {
    toast({ title: "View Configuration Saved (Mock)", description: "Your preferences for this view have been saved." });
    setShowConfigViewDialog(false);
  };

  const getParameterCard = (device, parameter, Icon, unit, value, thresholds, isVisible = true) => {
    if (!isVisible) return null;

    const val = parseFloat(value);
    let statusColor = 'text-green-400'; 
    let borderColor = 'border-green-500/20';
    let alertMessage = '';
    let riskLevel = 'Safe';

    if (thresholds) {
      if ((thresholds.min != null && val < thresholds.min) || (thresholds.max != null && val > thresholds.max)) {
        statusColor = 'text-red-400'; 
        borderColor = 'border-red-500/40 sensor-pulse-border';
        alertMessage = `${parameter} level critical! Current: ${val?.toFixed(2) || 'N/A'}${unit}. Threshold: ${thresholds.min ? `<${thresholds.min}`:''}${thresholds.max ? `>${thresholds.max}`:''}`;
        riskLevel = 'Critical';
      } else if ((thresholds.warnMin != null && val < thresholds.warnMin) || (thresholds.warnMax != null && val > thresholds.warnMax)) {
        statusColor = 'text-yellow-400'; 
        borderColor = 'border-yellow-500/30';
        alertMessage = `${parameter} level warning. Current: ${val?.toFixed(2) || 'N/A'}${unit}. Warning: ${thresholds.warnMin ? `<${thresholds.warnMin}`:''}${thresholds.warnMax ? `>${thresholds.warnMax}`:''}`;
        riskLevel = 'Warning';
      }
    }
    
    const toastKey = `toast-${device.id}-${parameter}`;
    if (alertMessage && !sessionStorage.getItem(toastKey)) {
      setTimeout(() => { 
        if(!sessionStorage.getItem(toastKey)) { 
            toast({
                title: `Alert: ${device.name} - ${parameter}`,
                description: alertMessage,
                variant: riskLevel === 'Critical' ? 'destructive' : 'default',
            });
            sessionStorage.setItem(toastKey, 'shown');
            setTimeout(() => sessionStorage.removeItem(toastKey), 60000); 
        }
      }, 500 * Math.random()); 
    }

    return (
      <motion.div 
        key={`${device.id}-${parameter}`}
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: Math.random()*0.2 }}
        className={`p-3 rounded-lg bg-slate-800/60 ${borderColor} border shadow-md`}
      >
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-md font-medium text-slate-200">{parameter}</h4>
          <Icon className={`h-5 w-5 ${statusColor}`} />
        </div>
        <p className={`text-2xl font-bold ${statusColor}`}>{value != null ? value.toFixed(2) : 'N/A'} <span className="text-sm opacity-80">{unit}</span></p>
        {aiMode && (
          <p className="text-xs text-purple-400 mt-1">
            AI Insight: {parameter} is {riskLevel === 'Safe' ? 'stable' : `trending ${riskLevel.toLowerCase()}`}. (Mock)
          </p>
        )}
      </motion.div>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Real-Time Sensor Dashboard</h1>
          <p className="text-slate-400 mt-1">Live data stream from your active HydroScan devices.</p>
        </div>
        <div className="flex items-center space-x-3 mt-3 sm:mt-0">
          <Button variant="outline" onClick={() => setShowConfigViewDialog(true)} className="text-xs border-slate-600 hover:bg-slate-700">
            <Settings2 className="h-3 w-3 mr-1.5" /> Configure View
          </Button>
          <div className="flex items-center space-x-2 p-2 rounded-md bg-slate-800/50">
            <Brain className={`h-5 w-5 ${aiMode ? 'text-purple-400 animate-pulse' : 'text-slate-500'}`} />
            <Label htmlFor="ai-mode-switch" className="text-slate-300 text-sm">AI Mode</Label>
            <Switch
              id="ai-mode-switch"
              checked={aiMode}
              onCheckedChange={setAiMode}
              className="data-[state=checked]:bg-purple-500"
            />
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {devices.filter(d => d.status === 'online').map((device, idx) => {
          const currentData = liveData[device.id];
          const contaminationScore = currentData?.contamination_score;
          let risk = {level: 'N/A', color: 'bg-gray-500', text: 'text-gray-400'};
          if (contaminationScore != null) {
            if (contaminationScore > 70) risk = {level: 'DANGEROUS', color: 'bg-red-600', text: 'text-red-400'};
            else if (contaminationScore > 30) risk = {level: 'RISKY', color: 'bg-yellow-500', text: 'text-yellow-400'};
            else risk = {level: 'SAFE', color: 'bg-green-500', text: 'text-green-400'};
          }

          return (
            <motion.div 
              key={device.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * idx }}
              layout
            >
              <Card className="glass-effect border-slate-700 overflow-hidden h-full flex flex-col">
                <CardHeader className="bg-slate-800/40 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-white truncate" title={device.name}>{device.name}</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => toggleDetails(device.id)} className="h-7 w-7 text-slate-400 hover:text-white">
                      {showDetails[device.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-400 truncate" title={device.location}>{device.location} - S/N: {device.serial_number}</p>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>Last update: {currentData?.timestamp ? format(new Date(currentData.timestamp), 'Pp') : 'N/A'}</span>
                    <Badge variant="secondary" className={`capitalize text-xs ${risk.color} text-white`}>{risk.level}</Badge>
                  </div>
                </CardHeader>
                {showDetails[device.id] && currentData ? (
                  <CardContent className="p-3 space-y-2 flex-grow">
                    {getParameterCard(device, "pH", Droplets, "", currentData.ph, { min: 6.5, max: 8.5, warnMin: 6.8, warnMax: 8.2 }, viewConfig.showPH)}
                    {getParameterCard(device, "Turbidity", ActivitySquare, "NTU", currentData.turbidity, { max: 5, warnMax: 3 }, viewConfig.showTurbidity)}
                    {getParameterCard(device, "Temperature", Thermometer, "°C", currentData.temperature, { min: 5, max: 30, warnMin:10, warnMax:28 }, viewConfig.showTemp)}
                    {getParameterCard(device, "TDS", Zap, "ppm", currentData.tds, { max: 500, warnMax: 350 }, viewConfig.showTDS)}
                    {getParameterCard(device, "Contamination Score", AlertTriangle, "%", contaminationScore, { max: 100, warnMax: 70 }, viewConfig.showContamination)}
                    
                    {aiMode && (
                        <motion.div 
                            initial={{ opacity: 0}} animate={{ opacity: 1}}
                            className="mt-2 p-2.5 rounded-lg bg-purple-600/10 border border-purple-500/30 text-sm"
                        >
                            <div className="flex items-center text-purple-300 mb-1">
                                <Brain size={16} className="mr-1.5"/>
                                <h5 className="font-semibold text-xs">AI Contamination Analysis</h5>
                            </div>
                            <p className={`${risk.text} text-xs`}>Overall Risk: {risk.level} ({contaminationScore?.toFixed(1) || 'N/A'}%)</p>
                            <p className="text-xs text-purple-400 mt-0.5">Prediction: Risk likely to remain {contaminationScore > 50 ? 'elevated' : 'stable'} in next 12 hrs. (Mock)</p>
                        </motion.div>
                    )}
                  </CardContent>
                ) : showDetails[device.id] && !currentData ? (
                    <CardContent className="p-3 flex-grow flex items-center justify-center">
                        <p className="text-slate-400">Waiting for initial data...</p>
                    </CardContent>
                ) : null }
                 {!showDetails[device.id] && (
                    <CardContent className="p-3 flex-grow flex items-center justify-center">
                         <p className="text-slate-400 text-sm">Click <Eye className="inline h-4 w-4 mx-1"/> to view sensor details.</p>
                    </CardContent>
                 )}
              </Card>
            </motion.div>
          )
        })}
      </div>
      {devices.filter(d => d.status === 'online').length === 0 && (
         <div className="text-center py-12">
            <WifiOff className="h-16 w-16 text-slate-500 mx-auto mb-4" />
            <p className="text-xl text-slate-400">No devices currently online.</p>
            <p className="text-sm text-slate-500">Check device connections or add new devices in Device Management.</p>
        </div>
      )}

      <Dialog open={showConfigViewDialog} onOpenChange={setShowConfigViewDialog}>
        <DialogContent className="glass-effect border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Configure Real-Time View</DialogTitle>
            <DialogDescription>Customize which parameters are displayed on the dashboard.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {Object.entries({
                showPH: "pH Level", showTurbidity: "Turbidity", showTemp: "Temperature", 
                showTDS: "TDS", showContamination: "Contamination Score"
              }).map(([key, label]) => (
                <div key={key} className="flex items-center space-x-2 p-2 bg-slate-800/50 rounded-md">
                  <Checkbox id={key} checked={viewConfig[key]} onCheckedChange={(checked) => handleConfigViewChange(key, checked)} />
                  <Label htmlFor={key} className="text-slate-300">{label}</Label>
                </div>
              ))}
            </div>
            <div className="flex items-center space-x-2 p-2 bg-slate-800/50 rounded-md">
              <Checkbox id="autoRefresh" checked={viewConfig.autoRefresh} onCheckedChange={(checked) => handleConfigViewChange('autoRefresh', checked)} />
              <Label htmlFor="autoRefresh" className="text-slate-300">Auto-Refresh Data (Mock)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigViewDialog(false)} className="border-slate-600 hover:bg-slate-700">Cancel</Button>
            <Button onClick={handleSaveViewConfig} className="gradient-bg">Save View Config</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default RealTimeSensorView;
