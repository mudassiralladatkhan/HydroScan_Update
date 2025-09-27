import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, Filter, Calendar, CheckCircle, RefreshCw, Loader2, History, BarChart2, FileArchive, DatabaseZap, Layers, Settings, Clock, MapPin, Activity } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox"; 
import { supabase } from '@/lib/supabaseClient';
import { exportToCSV, exportToPDF, exportToJSON } from '@/lib/exportUtils';
import { getSystemPerformanceMetrics, getDataQualityScore } from '@/lib/metricsUtils';
import { toast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { format, parseISO, subDays } from 'date-fns';

const DataExportPage = () => {
  const { devices } = useData();
  const { user } = useAuth();
  const [selectedDeviceId, setSelectedDeviceId] = useState('all'); // Default to 'all'
  const [exportType, setExportType] = useState('csv');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentExports, setRecentExports] = useState([]);
  const [loadingExports, setLoadingExports] = useState(false);
  const [selectedParameters, setSelectedParameters] = useState({
    ph: true, turbidity: true, tds: true, temperature: true, contamination_score: true,
  });
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [selectedTimezone, setSelectedTimezone] = useState('UTC');
  const [showArchiveRulesDialog, setShowArchiveRulesDialog] = useState(false);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [showExportDetailsDialog, setShowExportDetailsDialog] = useState(false);
  const [currentExportDetails, setCurrentExportDetails] = useState(null);
  
  const [archiveRules, setArchiveRules] = useState([]);
  const [backupPoints, setBackupPoints] = useState([]);

  const [dataQualityScore, setDataQualityScore] = useState(85);
  const [dataPerformanceData, setDataPerformanceData] = useState([
    { name: 'Ingestion Rate (rec/s)', value: 15 },
    { name: 'Query Latency (ms)', value: 75 },
    { name: 'Storage Used (GB)', value: '2.3' },
    { name: 'API Response Time (ms)', value: 120 },
    { name: 'Data Processing Errors', value: 2 },
  ]);
  const dataArchivingStatusData = [
    { name: 'Active Data', value: 75, fill: '#3B82F6' },
    { name: 'Archived Data', value: 25, fill: '#10B981' },
  ];

  const fetchRecentExports = async () => {
    if (!user) return;
    setLoadingExports(true);
    const { data, error } = await supabase
      .from('exported_files')
      .select('*')
      .eq('export_by', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      toast({ title: "Error fetching recent exports", description: error.message, variant: "destructive" });
      setRecentExports([]);
    } else {
      setRecentExports(data || []);
    }
    setLoadingExports(false);
  };

  const fetchPerformanceMetrics = async () => {
    const metrics = await getSystemPerformanceMetrics();
    const qualityScore = await getDataQualityScore();
    
    setDataPerformanceData([
      { name: 'Ingestion Rate (rec/s)', value: metrics.ingestionRate },
      { name: 'Query Latency (ms)', value: metrics.queryLatency },
      { name: 'Storage Used (GB)', value: metrics.storageUsed },
      { name: 'API Response Time (ms)', value: metrics.apiResponseTime },
      { name: 'Data Processing Errors', value: metrics.dataProcessingErrors },
    ]);
    setDataQualityScore(qualityScore);
  };

  useEffect(() => {
    fetchRecentExports();
    fetchPerformanceMetrics();
  }, [user]);

  const handleParameterChange = (param) => {
    setSelectedParameters(prev => ({ ...prev, [param]: !prev[param] }));
  };
  
  const handleExport = async () => {
    if (!user) { toast({ title: "Authentication Error", description: "Please log in.", variant: "destructive" }); return; }
    if (selectedDeviceId !== 'all' && !selectedDeviceId) { toast({ title: "Device Not Selected", description: "Please select a device or 'All Devices'.", variant: "destructive" }); return; }
    if (!dateFrom || !dateTo) { toast({ title: "Date Range Required", description: "Please select a 'Date From' and 'Date To'.", variant: "destructive" }); return; }
    if (new Date(dateFrom) > new Date(dateTo)) { toast({ title: "Invalid Date Range", description: "'Date From' cannot be after 'Date To'.", variant: "destructive" }); return; }
    if (Object.values(selectedParameters).every(v => !v)) { toast({ title: "No Parameters Selected", description: "Please select at least one parameter.", variant: "destructive" }); return; }
    
    setLoading(true);

    const deviceNameForFile = selectedDeviceId === 'all' ? 'all_devices' : devices.find(d => d.id === selectedDeviceId)?.name.replace(/\s+/g, '_') || 'device';
    const fileName = `hydroscan_${deviceNameForFile}_${dateFrom}_to_${dateTo}.${exportType}`;
    
    const exportLog = {
      file_name: fileName,
      export_by: user.id,
      export_type: exportType.toUpperCase(),
      status: 'Processing',
      filters_applied: { 
        deviceId: selectedDeviceId, 
        deviceName: selectedDeviceId === 'all' ? 'All Devices' : devices.find(d => d.id === selectedDeviceId)?.name,
        dateFrom, 
        dateTo,
        parameters: Object.entries(selectedParameters).filter(([,v]) => v).map(([k]) => k),
        includeMetadata,
        timezone: selectedTimezone,
      }
    };

    try {
      let content;
      let contentType;
      
      switch (exportType) {
        case 'csv':
          content = await exportToCSV(selectedDeviceId, dateFrom, dateTo, selectedParameters, includeMetadata);
          contentType = 'text/csv';
          break;
        case 'pdf':
          content = await exportToPDF(selectedDeviceId, dateFrom, dateTo, selectedParameters, includeMetadata);
          contentType = 'application/pdf';
          break;
        case 'json':
          content = await exportToJSON(selectedDeviceId, dateFrom, dateTo, selectedParameters, includeMetadata);
          contentType = 'application/json';
          break;
        default:
          throw new Error('Unsupported export type');
      }

      // Log the export
      const { data: newExport, error: insertError } = await supabase
        .from('exported_files')
        .insert({...exportLog, status: 'Completed'})
        .select()
        .single();

      if (insertError) {
        toast({ title: "Error logging export", description: insertError.message, variant: "destructive" });
      }

      // Download the file
      downloadFile(content, fileName, contentType);
      
      toast({ 
        title: "Export Completed!", 
        description: `${fileName} has been downloaded successfully.`, 
        action: <CheckCircle className="text-green-500" /> 
      });
      
      fetchRecentExports();
    } catch (error) {
      toast({ 
        title: "Export Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    }
    
    setLoading(false);
  };
  
  const openExportDetails = (exp) => { setCurrentExportDetails(exp); setShowExportDetailsDialog(true); };

  const handleFeatureClick = (featureName) => { toast({ title: "🚧 Mock Action", description: `${featureName} action triggered (mock).` });};

  const formatDate = (dateString) => dateString ? format(parseISO(dateString), 'PPpp') : 'N/A';
  const formatDateShort = (dateString) => dateString ? format(parseISO(dateString), 'MMM d, yyyy') : 'N/A';

  const cardVariant = { hidden: { opacity: 0, y: 20 }, visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05 } }) };

  return (
    <div className="p-6 space-y-6">
      <motion.div initial="hidden" animate="visible" variants={cardVariant} custom={0} className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-white">Data Export & Management</h1><p className="text-slate-400 mt-1">Export readings, manage archives, and view data metrics.</p></div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div className="lg:col-span-2" custom={1} variants={cardVariant} initial="hidden" animate="visible">
          <Card className="glass-effect border-slate-700">
            <CardHeader><CardTitle className="text-white">Configure Data Export</CardTitle><CardDescription className="text-slate-400">Select filters and format for your data export.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1"><Label className="text-slate-200">Select Device</Label><Select onValueChange={setSelectedDeviceId} value={selectedDeviceId}><SelectTrigger className="w-full bg-slate-800/50 border-slate-600 text-white"><SelectValue /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-600 text-white"><SelectItem value="all" className="hover:bg-slate-700">All Devices</SelectItem>{devices.map(device => (<SelectItem key={device.id} value={device.id} className="hover:bg-slate-700">{device.name} ({device.serial_number})</SelectItem>))}</SelectContent></Select></div>
                <div className="space-y-1"><Label className="text-slate-200">Export Format</Label><Select onValueChange={setExportType} value={exportType}><SelectTrigger className="w-full bg-slate-800/50 border-slate-600 text-white"><SelectValue /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-600 text-white"><SelectItem value="csv" className="hover:bg-slate-700">CSV</SelectItem><SelectItem value="pdf" className="hover:bg-slate-700">PDF Report</SelectItem><SelectItem value="json" className="hover:bg-slate-700">JSON Data</SelectItem></SelectContent></Select></div>
              </div>
              <div className="space-y-1"><Label className="text-slate-200">Select Parameters</Label><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{Object.keys(selectedParameters).map(param => (<div key={param} className="flex items-center space-x-2 p-2 bg-slate-800/30 rounded-md"><Checkbox id={`param-${param}`} checked={selectedParameters[param]} onCheckedChange={() => handleParameterChange(param)} className="border-slate-500 data-[state=checked]:bg-blue-500"/><Label htmlFor={`param-${param}`} className="text-sm text-slate-300 capitalize cursor-pointer">{param.replace(/_/g, ' ')}</Label></div>))}</div></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1"><Label htmlFor="date-from" className="text-slate-200">Date From</Label><Input id="date-from" type="datetime-local" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-slate-800/50 border-slate-600 text-white"/></div>
                <div className="space-y-1"><Label htmlFor="date-to" className="text-slate-200">Date To</Label><Input id="date-to" type="datetime-local" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-slate-800/50 border-slate-600 text-white"/></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-1"><Label className="text-slate-200">Timezone (Mock)</Label><Select onValueChange={setSelectedTimezone} value={selectedTimezone}><SelectTrigger className="w-full bg-slate-800/50 border-slate-600 text-white"><SelectValue /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-600 text-white"><SelectItem value="UTC" className="hover:bg-slate-700">UTC</SelectItem><SelectItem value="local" className="hover:bg-slate-700">Local Browser Time</SelectItem></SelectContent></Select></div>
                 <div className="flex items-center space-x-2 pt-6"><Checkbox id="include-metadata" checked={includeMetadata} onCheckedChange={setIncludeMetadata} className="border-slate-500 data-[state=checked]:bg-blue-500"/><Label htmlFor="include-metadata" className="text-sm text-slate-300">Include Device Metadata (S/N, Location - Mock)</Label></div>
              </div>
              <Button onClick={handleExport} disabled={loading || (selectedDeviceId !=='all' && !selectedDeviceId) || !dateFrom || !dateTo || Object.values(selectedParameters).every(v => !v)} className="w-full gradient-bg mt-2">
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />} Export Data
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div custom={2} variants={cardVariant} initial="hidden" animate="visible">
          <Card className="glass-effect border-slate-700">
            <CardHeader><CardTitle className="text-white flex items-center"><DatabaseZap className="mr-2 text-purple-400"/>Data Management</CardTitle><CardDescription className="text-slate-400">Quality, archiving, and recovery.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-slate-800/40 border border-slate-700 rounded-md"><p className="text-sm text-slate-300">Overall Data Quality Score (Mock)</p><p className="text-2xl font-bold text-green-400">{dataQualityScore}%</p></div>
              <div className="h-32"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={dataArchivingStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} label>{dataArchivingStatusData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}</Pie><RechartsTooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius:'0.5rem' }} itemStyle={{ color: '#e2e8f0'}}/></PieChart></ResponsiveContainer><p className="text-center text-xs text-slate-400 mt-1">Data Archiving Status (Mock)</p></div>
              <Button variant="outline" onClick={() => setShowArchiveRulesDialog(true)} className="w-full border-slate-600 text-slate-300 hover:bg-slate-800"><FileArchive className="h-4 w-4 mr-2"/> Manage Archiving Rules</Button>
              <Button variant="outline" onClick={() => setShowRecoveryDialog(true)} className="w-full border-slate-600 text-slate-300 hover:bg-slate-800"><Layers className="h-4 w-4 mr-2"/> Data Recovery Options</Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      <motion.div custom={3} variants={cardVariant} initial="hidden" animate="visible">
        <Card className="glass-effect border-slate-700">
          <CardHeader><div className="flex items-center justify-between"><div className="flex items-center space-x-2"><History className="h-6 w-6 text-blue-400" /><CardTitle className="text-white">Recent Exports</CardTitle></div><Button variant="ghost" size="icon" onClick={fetchRecentExports} disabled={loadingExports} className="text-slate-400 hover:text-white"><RefreshCw className={`h-4 w-4 ${loadingExports ? 'animate-spin' : ''}`} /></Button></div><CardDescription className="text-slate-400">Your last 5 export activities.</CardDescription></CardHeader>
          <CardContent>
            {loadingExports ? (<div className="flex justify-center items-center h-32"><Loader2 className="h-8 w-8 text-blue-500 animate-spin" /></div>) 
            : recentExports.length > 0 ? (<div className="overflow-x-auto scrollbar-hide"><Table><TableHeader><TableRow className="border-slate-700 hover:bg-slate-800/30"><TableHead className="text-slate-300">File Name</TableHead><TableHead className="text-slate-300">Device</TableHead><TableHead className="text-slate-300">Status</TableHead><TableHead className="text-slate-300">Exported At</TableHead><TableHead className="text-slate-300 text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{recentExports.map(exp => (<TableRow key={exp.id} className="border-slate-700 hover:bg-slate-800/50"><TableCell className="text-white font-medium flex items-center"><FileText size={16} className="mr-2 text-slate-400" /> {exp.file_name}</TableCell><TableCell className="text-slate-300">{exp.filters_applied?.deviceName || 'N/A'}</TableCell><TableCell><Badge variant={exp.status === 'Completed' ? 'default' : exp.status === 'Processing' ? 'secondary' : 'destructive'} className={`${exp.status === 'Completed' ? 'bg-green-500/80' : exp.status === 'Processing' ? 'bg-yellow-500/80 animate-pulse' : 'bg-red-500/80'}`}>{exp.status}</Badge></TableCell><TableCell className="text-slate-400">{formatDate(exp.created_at)}</TableCell><TableCell className="text-right space-x-2"><Button variant="ghost" size="sm" onClick={() => openExportDetails(exp)} className="text-blue-400 hover:text-blue-300 text-xs">Details</Button><Button variant="ghost" size="sm" onClick={() => handleFeatureClick(`Re-Download ${exp.file_name}`)} className="text-blue-400 hover:text-blue-300 text-xs"><Download size={14} className="mr-1" /> Re-Download</Button></TableCell></TableRow>))}</TableBody></Table></div>) 
            : (<div className="text-center py-8 text-slate-500"><FileText className="h-12 w-12 mx-auto mb-3" />No recent exports found.</div>)}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div custom={4} variants={cardVariant} initial="hidden" animate="visible">
        <Card className="glass-effect border-slate-700">
          <CardHeader><CardTitle className="text-white flex items-center"><BarChart2 className="mr-2 text-teal-400"/>Data Performance Metrics</CardTitle><CardDescription className="text-slate-400">Real-time overview of data system performance.</CardDescription></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">{dataPerformanceData.map(metric => (<div key={metric.name} className="p-3 bg-slate-800/40 border border-slate-700 rounded-md text-center sm:text-left"><p className="text-xs text-slate-300">{metric.name}</p><p className="text-xl font-bold text-teal-400">{metric.value}</p></div>))}</CardContent>
        </Card>
      </motion.div>

      {/* Dialogs */}
      <Dialog open={showArchiveRulesDialog} onOpenChange={setShowArchiveRulesDialog}>
        <DialogContent className="glass-effect border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center"><FileArchive className="mr-2"/>Manage Archiving Rules</DialogTitle>
            <DialogDescription>Set rules for automatic data archiving.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto scrollbar-thin">
                {archiveRules.map(rule => (<Card key={rule.id} className="bg-slate-800/50 border-slate-600"><CardContent className="p-3 text-sm"><div className="flex justify-between items-center"><span className="text-slate-200">{rule.name}</span><Badge className={rule.status === 'Active' ? 'bg-green-500/70' : 'bg-slate-600'}>{rule.status}</Badge></div><p className="text-xs text-slate-400">{rule.condition}</p></CardContent></Card>))}
            {archiveRules.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <FileArchive className="h-12 w-12 mx-auto mb-3" />
                No archiving rules configured.
              </div>
            )}
            <Button className="w-full gradient-bg mt-2" onClick={() => toast({title: 'Feature Coming Soon', description: 'Archiving rules configuration will be available in the next update.'})}>Add New Rule</Button>
          </div>
          <DialogFooter><Button onClick={() => setShowArchiveRulesDialog(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRecoveryDialog} onOpenChange={setShowRecoveryDialog}>
        <DialogContent className="glass-effect border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center"><DatabaseZap className="mr-2"/>Backup & Recovery</DialogTitle>
            <DialogDescription>Restore data from backups.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto scrollbar-thin">
                {backupPoints.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <DatabaseZap className="h-12 w-12 mx-auto mb-3" />
                    No backup points available.
                  </div>
                )}
                {backupPoints.map(backup => (<Card key={backup.id} className="bg-slate-800/50 border-slate-600"><CardContent className="p-3 text-sm"><div className="flex justify-between items-center"><span className="text-slate-200">{backup.type} - {formatDateShort(backup.date)}</span><span className="text-xs text-slate-400">{backup.size}</span></div><Button size="xs" variant="outline" className="mt-1 border-blue-500 text-blue-400 hover:bg-blue-500/20" onClick={() => toast({title: 'Feature Coming Soon', description: 'Data restoration will be available in the next update.'})}>Restore</Button></CardContent></Card>))}
          </div>
          <DialogFooter><Button onClick={() => setShowRecoveryDialog(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {currentExportDetails && (
        <Dialog open={showExportDetailsDialog} onOpenChange={setShowExportDetailsDialog}>
          <DialogContent className="glass-effect border-slate-700 text-white max-w-md">
            <DialogHeader><DialogTitle>Export Details: {currentExportDetails.file_name}</DialogTitle></DialogHeader>
            <div className="py-4 space-y-2 text-sm max-h-[60vh] overflow-y-auto scrollbar-thin">
              <p><strong className="text-slate-300">Device:</strong> {currentExportDetails.filters_applied?.deviceName || 'N/A'}</p>
              <p><strong className="text-slate-300">Date Range:</strong> {formatDateShort(currentExportDetails.filters_applied?.dateFrom)} to {formatDateShort(currentExportDetails.filters_applied?.dateTo)}</p>
              <p><strong className="text-slate-300">Parameters:</strong> {(currentExportDetails.filters_applied?.parameters || []).join(', ').replace(/_/g, ' ')}</p>
              <p><strong className="text-slate-300">Timezone:</strong> {currentExportDetails.filters_applied?.timezone || 'UTC'}</p>
              <p><strong className="text-slate-300">Included Metadata:</strong> {currentExportDetails.filters_applied?.includeMetadata ? 'Yes' : 'No'}</p>
              <p><strong className="text-slate-300">Status:</strong> {currentExportDetails.status}</p>
            </div>
            <DialogFooter><Button onClick={() => setShowExportDetailsDialog(false)}>Close</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default DataExportPage;
