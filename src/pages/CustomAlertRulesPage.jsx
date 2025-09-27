import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Plus, Edit, Trash2, Filter, Settings2, Eye, EyeOff } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

const CustomAlertRulesPage = () => {
  const { devices, alertRules, addAlertRule, updateAlertRule, deleteAlertRule, loadingData } = useData(); // Added loadingData
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleForm, setRuleForm] = useState({
    name: '',
    device_id: '',
    parameter: '',
    condition: '>',
    threshold_value_1: '',
    threshold_value_2: '', // For 'between'
    severity: 'medium',
    notification_channels: { email: true, push: false, sms: false },
    is_active: true,
  });
  const [searchTerm, setSearchTerm] = useState('');

  const parameters = ['ph', 'turbidity', 'tds', 'temperature', 'contamination_score'];
  const conditions = ['>', '<', '=', '>=', '<=', 'between', 'outside'];
  const severities = ['low', 'medium', 'high', 'critical'];

  useEffect(() => {
    if (editingRule) {
      setRuleForm({
        ...editingRule,
        device_id: editingRule.device_id || '', 
        notification_channels: editingRule.notification_channels || { email: true, push: false, sms: false }
      });
    } else {
      setRuleForm({
        name: '', device_id: '', parameter: '', condition: '>', threshold_value_1: '', threshold_value_2: '',
        severity: 'medium', notification_channels: { email: true, push: false, sms: false }, is_active: true,
      });
    }
  }, [editingRule]);

  const handleInputChange = (field, value) => {
    setRuleForm(prev => ({ ...prev, [field]: value }));
  };

  const handleNotificationChannelChange = (channel, checked) => {
    setRuleForm(prev => ({
      ...prev,
      notification_channels: { ...prev.notification_channels, [channel]: checked },
    }));
  };

  const handleSubmitRule = async (e) => {
    e.preventDefault();
    const payload = {
      ...ruleForm,
      threshold_value_1: parseFloat(ruleForm.threshold_value_1),
      threshold_value_2: ruleForm.condition === 'between' || ruleForm.condition === 'outside' ? parseFloat(ruleForm.threshold_value_2) : null,
      device_id: ruleForm.device_id === 'all' || ruleForm.device_id === '' ? null : ruleForm.device_id,
    };

    if (editingRule) {
      await updateAlertRule(editingRule.id, payload);
    } else {
      await addAlertRule(payload);
    }
    setShowRuleDialog(false);
    setEditingRule(null);
  };

  const openEditDialog = (rule) => {
    setEditingRule(rule);
    setShowRuleDialog(true);
  };
  
  const openNewRuleDialog = () => {
    setEditingRule(null); 
    setShowRuleDialog(true);
  };

  const filteredRules = alertRules.filter(rule => 
    rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (devices.find(d => d.id === rule.device_id)?.name || 'All Devices').toLowerCase().includes(searchTerm.toLowerCase()) ||
    rule.parameter.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center"><AlertCircle className="mr-3 h-8 w-8 text-orange-400"/>Custom Alert Rules</h1>
          <p className="text-slate-400 mt-1">Define specific conditions for triggering alerts.</p>
        </div>
        <Button onClick={openNewRuleDialog} className="gradient-bg">
          <Plus className="h-4 w-4 mr-2" /> Create New Rule
        </Button>
      </motion.div>
      
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search rules by name, device, or parameter..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
        />
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRules.map((rule, index) => (
          <motion.div key={rule.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + index * 0.05 }} layout>
            <Card className={`glass-effect border-slate-700 hover:border-slate-500 transition-all duration-200 ${!rule.is_active ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-white truncate" title={rule.name}>{rule.name}</CardTitle>
                   <Badge variant={rule.is_active ? 'default' : 'secondary'} className={`${rule.is_active ? 'bg-green-500/80' : 'bg-slate-600'} text-xs`}>
                        {rule.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                </div>
                <CardDescription className="text-xs text-slate-400">
                  {devices.find(d => d.id === rule.device_id)?.name || 'All Devices'} - {rule.parameter.replace('_', ' ')}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p><span className="text-slate-400">Condition:</span> <span className="font-semibold">{rule.condition} {rule.threshold_value_1} {rule.condition === 'between' || rule.condition === 'outside' ? `and ${rule.threshold_value_2}` : ''}</span></p>
                <p><span className="text-slate-400">Severity:</span> <Badge variant="outline" className={`capitalize border-${rule.severity === 'critical' ? 'red' : rule.severity === 'high' ? 'orange' : rule.severity === 'medium' ? 'yellow' : 'blue'}-500 text-${rule.severity === 'critical' ? 'red' : rule.severity === 'high' ? 'orange' : rule.severity === 'medium' ? 'yellow' : 'blue'}-400`}>{rule.severity}</Badge></p>
                <p className="text-slate-400 text-xs">Notifications: {Object.entries(rule.notification_channels || {}).filter(([, val]) => val).map(([key]) => key).join(', ') || 'None'}</p>
              </CardContent>
              <CardFooter className="pt-3 flex justify-end space-x-2">
                <Button variant="ghost" size="icon" onClick={() => openEditDialog(rule)} className="text-slate-400 hover:text-blue-400 h-7 w-7">
                  <Edit className="h-4 w-4"/>
                </Button>
                 <Button variant="ghost" size="icon" onClick={() => deleteAlertRule(rule.id)} className="text-slate-400 hover:text-red-400 h-7 w-7">
                  <Trash2 className="h-4 w-4"/>
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>
       {filteredRules.length === 0 && !loadingData && (
          <div className="text-center py-12">
            <AlertCircle className="h-16 w-16 text-slate-500 mx-auto mb-4" />
            <p className="text-xl text-slate-400">No custom alert rules found.</p>
            <p className="text-sm text-slate-500">Click "Create New Rule" to get started.</p>
        </div>
      )}


      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <DialogContent className="glass-effect border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">{editingRule ? 'Edit Alert Rule' : 'Create New Alert Rule'}</DialogTitle>
            <DialogDescription className="text-slate-400">Define the conditions for this alert.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitRule} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto scrollbar-hide pr-2">
            <div className="space-y-1">
              <Label htmlFor="ruleName">Rule Name</Label>
              <Input id="ruleName" value={ruleForm.name} onChange={(e) => handleInputChange('name', e.target.value)} placeholder="e.g., High pH Warning" className="bg-slate-800/50 border-slate-600" required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="ruleDevice">Device</Label>
                <Select value={ruleForm.device_id || 'all'} onValueChange={(val) => handleInputChange('device_id', val === 'all' ? '' : val)}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-600"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600 text-white">
                    <SelectItem value="all">All Devices</SelectItem>
                    {devices.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="ruleParameter">Parameter</Label>
                <Select value={ruleForm.parameter} onValueChange={(val) => handleInputChange('parameter', val)} required>
                  <SelectTrigger className="bg-slate-800/50 border-slate-600"><SelectValue placeholder="Select parameter..."/></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600 text-white">
                    {parameters.map(p => <SelectItem key={p} value={p}>{p.replace('_',' ').toUpperCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1 sm:col-span-1">
                    <Label htmlFor="ruleCondition">Condition</Label>
                    <Select value={ruleForm.condition} onValueChange={(val) => handleInputChange('condition', val)} required>
                        <SelectTrigger className="bg-slate-800/50 border-slate-600"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600 text-white">
                            {conditions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1 sm:col-span-1">
                    <Label htmlFor="ruleThreshold1">Threshold Value 1</Label>
                    <Input id="ruleThreshold1" type="number" step="any" value={ruleForm.threshold_value_1} onChange={(e) => handleInputChange('threshold_value_1', e.target.value)} className="bg-slate-800/50 border-slate-600" required />
                </div>
                {(ruleForm.condition === 'between' || ruleForm.condition === 'outside') && (
                    <div className="space-y-1 sm:col-span-1">
                        <Label htmlFor="ruleThreshold2">Threshold Value 2</Label>
                        <Input id="ruleThreshold2" type="number" step="any" value={ruleForm.threshold_value_2} onChange={(e) => handleInputChange('threshold_value_2', e.target.value)} className="bg-slate-800/50 border-slate-600" required />
                    </div>
                )}
            </div>
             <div className="space-y-1">
                <Label htmlFor="ruleSeverity">Severity</Label>
                <Select value={ruleForm.severity} onValueChange={(val) => handleInputChange('severity', val)} required>
                    <SelectTrigger className="bg-slate-800/50 border-slate-600"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600 text-white">
                        {severities.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>Notification Channels</Label>
                <div className="flex items-center space-x-4">
                    {['email', 'push', 'sms'].map(channel => (
                        <div key={channel} className="flex items-center space-x-1.5">
                            <Switch id={`notify-${channel}`} checked={ruleForm.notification_channels[channel]} onCheckedChange={(checked) => handleNotificationChannelChange(channel, checked)} />
                            <Label htmlFor={`notify-${channel}`} className="text-sm text-slate-300 capitalize">{channel}</Label>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex items-center space-x-2">
                <Switch id="ruleIsActive" checked={ruleForm.is_active} onCheckedChange={(checked) => handleInputChange('is_active', checked)} />
                <Label htmlFor="ruleIsActive" className="text-slate-300">Rule is Active</Label>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowRuleDialog(false)} className="border-slate-600 hover:bg-slate-700">Cancel</Button>
              <Button type="submit" className="gradient-bg">{editingRule ? 'Save Changes' : 'Create Rule'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomAlertRulesPage;