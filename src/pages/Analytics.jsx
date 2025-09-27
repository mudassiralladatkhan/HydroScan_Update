
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3,
  Calendar,
  Download,
  Filter,
  FileText,
  Settings2,
  Brain
} from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import SensorChart from '@/components/SensorChart';
import ContaminationTrends from '@/components/ContaminationTrends';
import DevicePerformance from '@/components/DevicePerformance';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import Papa from 'papaparse';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const Analytics = () => {
  const { sensorData, devices } = useData();
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showTimeFilterDialog, setShowTimeFilterDialog] = useState(false);
  const [customReportFields, setCustomReportFields] = useState({
    ph: true, temperature: true, tds: true, contamination: true, deviceName: true, timestamp: true
  });

  const handleFeatureClick = (feature) => {
    // This is a placeholder for future functionality.
    console.log(`${feature} was clicked.`);
  };

    const handleExportReport = () => {
    if (!sensorData || sensorData.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There is no sensor data available to export.",
        variant: "destructive"
      });
      return;
    }

    const dataToExport = sensorData.map(row => {
        const newRow = {};
        if (customReportFields.deviceName) newRow.device_name = devices.find(d => d.id === row.device_id)?.name || row.device_id;
        if (customReportFields.timestamp) newRow.timestamp = row.created_at;
        if (customReportFields.ph) newRow.pH = row.pH;
        if (customReportFields.temperature) newRow.temperature = row.temperature;
        if (customReportFields.tds) newRow.tds = row.tds;
        if (customReportFields.contamination) newRow.contamination_score = row.contamination_score;
        return newRow;
    });

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `hydroscan_analytics_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setShowExportDialog(false);
    toast({
        title: "Export Successful",
        description: "Your data has been downloaded as a CSV file."
    });
  };

  const handleApplyTimeFilter = () => {
    handleFeatureClick(`Time Range Filter applied: ${selectedTimeRange}`);
    setShowTimeFilterDialog(false);
  };

  const calculateMetrics = () => {
    if (sensorData.length === 0) return null;

    const recent = sensorData.slice(-24); 
    const previous = sensorData.slice(-48, -24); 

    const avgPH = recent.length > 0 ? recent.reduce((acc, d) => acc + d.pH, 0) / recent.length : 0;
    const avgTemp = recent.length > 0 ? recent.reduce((acc, d) => acc + d.temperature, 0) / recent.length : 0;
    const avgTDS = recent.length > 0 ? recent.reduce((acc, d) => acc + d.tds, 0) / recent.length : 0;
    const avgContamination = recent.length > 0 ? recent.reduce((acc, d) => acc + d.contaminationScore, 0) / recent.length : 0;

    const prevAvgContamination = previous.length > 0 
      ? previous.reduce((acc, d) => acc + d.contaminationScore, 0) / previous.length 
      : avgContamination;

    const contaminationTrend = avgContamination - prevAvgContamination;

    return {
      avgPH: avgPH.toFixed(2),
      avgTemp: avgTemp.toFixed(1),
      avgTDS: avgTDS.toFixed(0),
      avgContamination: avgContamination.toFixed(1),
      contaminationTrend: contaminationTrend.toFixed(1),
      totalReadings: sensorData.length
    };
  };

  const metrics = calculateMetrics();

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics & Insights</h1>
          <p className="text-slate-400 mt-1">Advanced water quality analytics and AI predictions</p>
        </div>
        <div className="flex items-center space-x-3 mt-3 sm:mt-0">
          <Button 
            variant="outline"
            onClick={() => setShowTimeFilterDialog(true)}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            <Calendar className="h-4 w-4 mr-2" />
            {selectedTimeRange === '24h' ? 'Last 24h' : selectedTimeRange === '7d' ? 'Last 7 Days' : 'Custom Range'}
          </Button>
          <Button 
            onClick={() => setShowExportDialog(true)}
            className="gradient-bg"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </motion.div>

      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Key Metrics Cards */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="glass-effect border-slate-700"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-slate-300">Avg pH Level</CardTitle><Activity className="h-4 w-4 text-blue-400" /></CardHeader><CardContent><div className="text-2xl font-bold text-white">{metrics.avgPH}</div><p className="text-xs text-slate-400">Optimal range: 6.5-8.5</p></CardContent></Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="glass-effect border-slate-700"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-slate-300">Avg Temperature</CardTitle><Activity className="h-4 w-4 text-orange-400" /></CardHeader><CardContent><div className="text-2xl font-bold text-white">{metrics.avgTemp}°C</div><p className="text-xs text-slate-400">Normal range: 15-25°C</p></CardContent></Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="glass-effect border-slate-700"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-slate-300">Avg TDS Level</CardTitle><Activity className="h-4 w-4 text-purple-400" /></CardHeader><CardContent><div className="text-2xl font-bold text-white">{metrics.avgTDS} ppm</div><p className="text-xs text-slate-400">Acceptable: &lt;300 ppm</p></CardContent></Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="glass-effect border-slate-700"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-slate-300">Contamination Risk</CardTitle>{parseFloat(metrics.contaminationTrend) >= 0 ? (<TrendingUp className="h-4 w-4 text-red-400" />) : (<TrendingDown className="h-4 w-4 text-green-400" />)}</CardHeader><CardContent><div className="text-2xl font-bold text-white">{metrics.avgContamination}%</div><p className={`text-xs ${parseFloat(metrics.contaminationTrend) >= 0 ? 'text-red-400' : 'text-green-400'}`}>{parseFloat(metrics.contaminationTrend) >= 0 ? '+' : ''}{metrics.contaminationTrend}% from previous period</p></CardContent></Card>
          </motion.div>
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 bg-slate-800/50">
            <TabsTrigger value="overview" className="text-slate-300 data-[state=active]:text-white">Overview</TabsTrigger>
            <TabsTrigger value="contamination" className="text-slate-300 data-[state=active]:text-white">Contamination</TabsTrigger>
            <TabsTrigger value="performance" className="text-slate-300 data-[state=active]:text-white">Performance</TabsTrigger>
            
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass-effect border-slate-700"><CardHeader><CardTitle className="text-white">Sensor Data Trends</CardTitle><CardDescription className="text-slate-400">Real-time monitoring of all water quality parameters</CardDescription></CardHeader><CardContent><SensorChart data={sensorData} /></CardContent></Card>
              <Card className="glass-effect border-slate-700"><CardHeader><CardTitle className="text-white">Data Collection Summary</CardTitle><CardDescription className="text-slate-400">Overview of data collection across all devices</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex justify-between items-center"><span className="text-slate-400">Total Data Points</span><span className="text-white font-semibold">{metrics?.totalReadings || 0}</span></div><div className="flex justify-between items-center"><span className="text-slate-400">Active Devices</span><span className="text-white font-semibold">{devices.filter(d => d.status === 'online').length}</span></div></CardContent></Card>
            </div>
          </TabsContent>
          <TabsContent value="contamination" className="space-y-6"><ContaminationTrends data={sensorData} /></TabsContent>
          <TabsContent value="performance" className="space-y-6"><DevicePerformance devices={devices} sensorData={sensorData} /></TabsContent>
          
        </Tabs>
      </motion.div>

      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="glass-effect border-slate-700 text-white">
          <DialogHeader><DialogTitle>Export Analytics Report (Mock)</DialogTitle><DialogDescription>Configure and generate your analytics report.</DialogDescription></DialogHeader>
          <div className="py-4 space-y-3">
            
            <div><Label>Select Data Fields (Mock)</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {Object.entries(customReportFields).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2"><Checkbox id={`field-${key}`} checked={value} onCheckedChange={(checked) => setCustomReportFields(prev => ({...prev, [key]: checked}))} /><Label htmlFor={`field-${key}`} className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1')}</Label></div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowExportDialog(false)} className="border-slate-600 hover:bg-slate-700">Cancel</Button><Button onClick={handleExportReport} className="gradient-bg">Generate & Download</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTimeFilterDialog} onOpenChange={setShowTimeFilterDialog}>
        <DialogContent className="glass-effect border-slate-700 text-white">
          <DialogHeader><DialogTitle>Select Time Range (Mock)</DialogTitle><DialogDescription>Filter analytics data by time period.</DialogDescription></DialogHeader>
          <div className="py-4 space-y-3">
            <Button variant={selectedTimeRange === '24h' ? "default" : "outline"} onClick={() => setSelectedTimeRange('24h')} className="w-full">Last 24 Hours</Button>
            <Button variant={selectedTimeRange === '7d' ? "default" : "outline"} onClick={() => setSelectedTimeRange('7d')} className="w-full">Last 7 Days</Button>
            <Button variant={selectedTimeRange === '30d' ? "default" : "outline"} onClick={() => setSelectedTimeRange('30d')} className="w-full">Last 30 Days</Button>
            <div><Label htmlFor="customFrom">Custom Range From:</Label><Input id="customFrom" type="date" className="bg-slate-800/50 border-slate-600 mt-1" onChange={() => setSelectedTimeRange('custom')}/></div>
            <div><Label htmlFor="customTo">Custom Range To:</Label><Input id="customTo" type="date" className="bg-slate-800/50 border-slate-600 mt-1" onChange={() => setSelectedTimeRange('custom')}/></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowTimeFilterDialog(false)} className="border-slate-600 hover:bg-slate-700">Cancel</Button><Button onClick={handleApplyTimeFilter} className="gradient-bg">Apply Filter</Button></DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Analytics;
