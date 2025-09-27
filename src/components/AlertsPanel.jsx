import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Clock, X, Filter, ExternalLink, Settings2 } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AlertsPanel = ({ alerts }) => {
  const { resolveAlert, acknowledgeAlert, escalateAlert } = useData();
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active'); // active, acknowledged, resolved

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-700';
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
      case 'high': return <AlertTriangle className="h-4 w-4 text-white" />;
      case 'medium': return <Clock className="h-4 w-4 text-white" />;
      case 'low': return <AlertTriangle className="h-4 w-4 text-white" />; // Could be Info icon
      default: return <AlertTriangle className="h-4 w-4 text-white" />;
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    const severityMatch = filterSeverity === 'all' || alert.severity === filterSeverity;
    let statusMatch = false;
    if (filterStatus === 'active') statusMatch = !alert.resolved && alert.status === 'active';
    if (filterStatus === 'acknowledged') statusMatch = !alert.resolved && alert.status === 'acknowledged';
    if (filterStatus === 'resolved') statusMatch = alert.resolved;
    if (filterStatus === 'all') statusMatch = true;
    return severityMatch && statusMatch;
  });
  
  const handleFeatureClick = (featureName) => {
    // Removed toast notification
  };


  return (
    <Card className="glass-effect border-slate-700 flex flex-col h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-red-400" />
            Alerts Center
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => handleFeatureClick('Custom Alert Rules')} className="text-slate-400 hover:text-white">
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription className="text-slate-400">
          {filteredAlerts.length} alerts matching criteria.
        </CardDescription>
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-full sm:w-[180px] bg-slate-800/50 border-slate-600 text-white">
              <SelectValue placeholder="Filter by severity" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600 text-white">
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[180px] bg-slate-800/50 border-slate-600 text-white">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600 text-white">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto scrollbar-hide">
        <div className="space-y-3">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
              <p className="text-slate-400">No alerts match your filters.</p>
              <p className="text-sm text-slate-500">All systems operating normally within this view.</p>
            </div>
          ) : (
            filteredAlerts.map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-3 rounded-lg bg-slate-800/60 border ${alert.resolved ? 'border-green-500/30 opacity-70' : 'border-slate-600 hover:border-slate-500'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className={`p-1.5 mt-0.5 rounded-full ${getSeverityColor(alert.severity)}`}>
                      {getSeverityIcon(alert.severity)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge 
                          className={`text-xs capitalize ${getSeverityColor(alert.severity)} text-white`}
                        >
                          {alert.severity}
                        </Badge>
                        <span className="text-xs text-slate-400">
                          {new Date(alert.created_at).toLocaleString()}
                        </span>
                        {alert.status && <Badge variant="secondary" className="capitalize text-xs">{alert.status}</Badge>}
                      </div>
                      <p className="text-sm text-white font-medium mb-1">
                        {alert.type ? alert.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'System Alert'} ({alert.device_id.substring(0,8)})
                      </p>
                      <p className="text-xs text-slate-300">
                        {alert.message}
                      </p>
                    </div>
                  </div>
                  {!alert.resolved && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => resolveAlert(alert.id)}
                      className="text-slate-400 hover:text-green-400 h-7 w-7"
                      title="Resolve Alert"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {!alert.resolved && (
                  <div className="mt-2 pt-2 border-t border-slate-700 flex items-center space-x-2">
                    <Button size="xs" variant="outline" onClick={() => acknowledgeAlert(alert.id)} className="text-xs border-slate-500 hover:bg-slate-700">
                      {alert.status === 'acknowledged' ? 'Acknowledged' : 'Acknowledge'}
                    </Button>
                     <Button size="xs" variant="outline" onClick={() => escalateAlert(alert.id)} className="text-xs border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20">Escalate</Button>
                    <Button size="xs" variant="ghost" onClick={() => handleFeatureClick(`View Device ${alert.device_id}`)} className="text-xs text-blue-400 hover:text-blue-300">
                      View Device <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                )}
                 {alert.resolved && (
                    <p className="text-xs text-green-400 mt-1">Resolved at {new Date(alert.resolved_at).toLocaleString()}</p>
                  )}
              </motion.div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AlertsPanel;