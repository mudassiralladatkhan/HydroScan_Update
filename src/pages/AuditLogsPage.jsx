import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Filter, Calendar, Download } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const AuditLogsPage = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    setLoading(true);
    // For now, fetch all as user_id is auth.uid() and audit_logs not directly linked to users table for RLS
    // In a real app, this would be more complex or use a secure function.
    // This example assumes an admin can view all logs, potentially via a service role or specific RLS.
    // If using service role, it must be done in a Supabase Edge Function.
    // For client-side, this is simplified:
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*, users(email)') // Assuming 'user_id' in audit_logs maps to 'id' in users
      .order('timestamp', { ascending: false })
      .limit(100); // Limit for performance

    if (error) {
      toast({ title: "Error fetching audit logs", description: error.message, variant: "destructive" });
      setAuditLogs([]);
    } else {
      setAuditLogs(data || []);
    }
    setLoading(false);
  };

  const handleFeatureClick = (featureName) => {
    alert("This is a placeholder for the export functionality.")
  };

  const filteredLogs = auditLogs.filter(log => {
    const userEmail = log.users?.email || '';
    const action = log.action || '';
    const target = log.target_resource || '';
    const search = searchTerm.toLowerCase();
    return userEmail.toLowerCase().includes(search) || 
           action.toLowerCase().includes(search) || 
           target.toLowerCase().includes(search);
  });


  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Audit Logs</h1>
          <p className="text-slate-400 mt-1">Track user actions and system events.</p>
        </div>
        <Button onClick={() => handleFeatureClick('Export Audit Logs')} className="gradient-bg">
          <Download className="h-4 w-4 mr-2" />
          Export Logs
        </Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search logs by user, action, or target..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
        />
        <Button variant="outline" onClick={() => handleFeatureClick('Filter by Date')} className="border-slate-600 text-slate-300 hover:bg-slate-800">
          <Calendar className="h-4 w-4 mr-2" />
          Filter by Date
        </Button>
        <Button variant="outline" onClick={() => handleFeatureClick('Advanced Filters')} className="border-slate-600 text-slate-300 hover:bg-slate-800">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="glass-effect border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Activity Log</CardTitle>
            <CardDescription className="text-slate-400">
              Showing the last {filteredLogs.length} relevant log entries.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredLogs.length > 0 ? (
              <div className="overflow-x-auto scrollbar-hide">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700 hover:bg-slate-800/30">
                      <TableHead className="text-slate-300">Timestamp</TableHead>
                      <TableHead className="text-slate-300">User</TableHead>
                      <TableHead className="text-slate-300">Action</TableHead>
                      <TableHead className="text-slate-300">Target Resource</TableHead>
                      <TableHead className="text-slate-300">Outcome</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map(log => (
                      <TableRow key={log.id} className="border-slate-700 hover:bg-slate-800/50">
                        <TableCell className="text-slate-400 text-xs">{new Date(log.timestamp).toLocaleString()}</TableCell>
                        <TableCell className="text-white">{log.users?.email || log.user_id}</TableCell>
                        <TableCell className="text-blue-400">{log.action}</TableCell>
                        <TableCell className="text-slate-300">{log.target_resource || 'N/A'}</TableCell>
                        <TableCell className={log.outcome === 'success' ? 'text-green-400' : 'text-red-400'}>
                          {log.outcome || 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-slate-400 py-8">No audit logs found matching your criteria.</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AuditLogsPage;