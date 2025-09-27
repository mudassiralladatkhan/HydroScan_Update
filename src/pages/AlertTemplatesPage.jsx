import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, Edit, Trash2, Filter, Eye } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

const AlertTemplatesPage = () => {
  const { alertTemplates, addAlertTemplate, updateAlertTemplate, deleteAlertTemplate } = useData();
  const { user } = useAuth();
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject_template: '',
    body_template: '',
    type: 'email',
    is_default: false,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState(null);

  useEffect(() => {
    if (editingTemplate) {
      setTemplateForm({
        name: editingTemplate.name,
        subject_template: editingTemplate.subject_template || '',
        body_template: editingTemplate.body_template,
        type: editingTemplate.type,
        is_default: editingTemplate.is_default || false,
      });
    } else {
      setTemplateForm({ name: '', subject_template: '', body_template: '', type: 'email', is_default: false });
    }
  }, [editingTemplate]);

  const handleSubmitTemplate = async (e) => {
    e.preventDefault();
    const payload = { ...templateForm };
    if (editingTemplate) {
      await updateAlertTemplate(editingTemplate.id, payload);
    } else {
      await addAlertTemplate(payload);
    }
    setShowTemplateDialog(false);
    setEditingTemplate(null);
  };

  const openEditDialog = (template) => {
    setEditingTemplate(template);
    setShowTemplateDialog(true);
  };

  const openNewTemplateDialog = () => {
    setEditingTemplate(null);
    setShowTemplateDialog(true);
  };
  
  const renderPreview = (template) => {
    const mockData = {
      deviceName: "Lake Sensor Alpha",
      parameter: "pH",
      value: "5.8",
      threshold: "6.5 (Low)",
      timestamp: new Date().toLocaleString(),
      deviceLocation: "North Intake Tower" 
    };
    let body = template.body_template;
    Object.keys(mockData).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      body = body.replace(regex, mockData[key]);
    });
    body = body.replace(new RegExp(`{{location}}`, 'g'), mockData.deviceLocation);


    let subject = template.subject_template || "Alert: {{deviceName}} - {{parameter}}";
    Object.keys(mockData).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, mockData[key]);
    });
    subject = subject.replace(new RegExp(`{{location}}`, 'g'), mockData.deviceLocation);
    
    return {subject, body};
  }

  const filteredTemplates = alertTemplates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center"><FileText className="mr-3 h-8 w-8 text-green-400"/>Alert Templates</h1>
          <p className="text-slate-400 mt-1">Manage templates for email, SMS, and push notifications.</p>
        </div>
        {user?.role === 'admin' && (
          <Button onClick={openNewTemplateDialog} className="gradient-bg">
            <Plus className="h-4 w-4 mr-2" /> Create New Template
          </Button>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search templates by name or type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
        />
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template, index) => (
          <motion.div key={template.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + index * 0.05 }} layout>
            <Card className="glass-effect border-slate-700 hover:border-slate-500 transition-all duration-200 h-full flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-white truncate" title={template.name}>{template.name}</CardTitle>
                  <Badge variant="outline" className="capitalize border-blue-500 text-blue-400">{template.type}</Badge>
                </div>
                {template.is_default && <Badge className="text-xs bg-yellow-500/80 mt-1">Default Template</Badge>}
              </CardHeader>
              <CardContent className="text-sm text-slate-300 flex-grow">
                <p className="line-clamp-3" title={template.body_template}>{template.body_template}</p>
              </CardContent>
              <CardFooter className="pt-3 flex justify-end space-x-2">
                <Button variant="ghost" size="icon" onClick={() => setPreviewTemplate(template)} className="text-slate-400 hover:text-green-400 h-7 w-7">
                  <Eye className="h-4 w-4"/>
                </Button>
                {user?.role === 'admin' && (<>
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(template)} className="text-slate-400 hover:text-blue-400 h-7 w-7">
                    <Edit className="h-4 w-4"/>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteAlertTemplate(template.id)} className="text-slate-400 hover:text-red-400 h-7 w-7">
                    <Trash2 className="h-4 w-4"/>
                  </Button>
                </>)}
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>
      {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-slate-500 mx-auto mb-4" />
            <p className="text-xl text-slate-400">No alert templates found.</p>
             {user?.role === 'admin' && <p className="text-sm text-slate-500">Click "Create New Template" to get started.</p>}
        </div>
      )}

      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="glass-effect border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">{editingTemplate ? 'Edit Alert Template' : 'Create New Alert Template'}</DialogTitle>
            <DialogDescription className="text-slate-400">Define the content for alerts.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitTemplate} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto scrollbar-hide pr-2">
            <div className="space-y-1">
              <Label htmlFor="templateName">Template Name</Label>
              <Input id="templateName" value={templateForm.name} onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})} placeholder="e.g., Critical pH Email" className="bg-slate-800/50 border-slate-600" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="templateType">Type</Label>
              <Select value={templateForm.type} onValueChange={(val) => setTemplateForm({...templateForm, type: val})}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-600"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600 text-white">
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS (Mock)</SelectItem>
                    <SelectItem value="push">Push Notification (Mock)</SelectItem>
                  </SelectContent>
              </Select>
            </div>
            {templateForm.type === 'email' && (
              <div className="space-y-1">
                <Label htmlFor="templateSubject">Subject Template</Label>
                <Input id="templateSubject" value={templateForm.subject_template} onChange={(e) => setTemplateForm({...templateForm, subject_template: e.target.value})} placeholder="Alert: {{deviceName}} - {{parameter}}" className="bg-slate-800/50 border-slate-600" />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="templateBody">Body Template</Label>
              <Textarea id="templateBody" value={templateForm.body_template} onChange={(e) => setTemplateForm({...templateForm, body_template: e.target.value})} placeholder="Enter the main content of your alert template here." rows={5} className="bg-slate-800/50 border-slate-600 min-h-[120px]" required />
              <p className="text-xs text-slate-400">
                Use placeholders like <code className="bg-slate-700 p-0.5 rounded text-purple-300">{"{{deviceName}}"}</code>, 
                <code className="bg-slate-700 p-0.5 rounded text-purple-300 ml-1">{"{{parameter}}"}</code>, 
                <code className="bg-slate-700 p-0.5 rounded text-purple-300 ml-1">{"{{value}}"}</code>, 
                <code className="bg-slate-700 p-0.5 rounded text-purple-300 ml-1">{"{{timestamp}}"}</code>, 
                <code className="bg-slate-700 p-0.5 rounded text-purple-300 ml-1">{"{{deviceLocation}}"}</code>, 
                <code className="bg-slate-700 p-0.5 rounded text-purple-300 ml-1">{"{{threshold}}"}</code>.
              </p>
            </div>
             <div className="flex items-center space-x-2">
                <Switch id="templateIsDefault" checked={templateForm.is_default} onCheckedChange={(checked) => setTemplateForm({...templateForm, is_default:checked})} />
                <Label htmlFor="templateIsDefault" className="text-slate-300">Set as Default for Type</Label>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowTemplateDialog(false)} className="border-slate-600 hover:bg-slate-700">Cancel</Button>
              <Button type="submit" className="gradient-bg">{editingTemplate ? 'Save Changes' : 'Create Template'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {previewTemplate && (
         <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
            <DialogContent className="glass-effect border-slate-700 text-white max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-white">Preview: {previewTemplate.name}</DialogTitle>
                     <DialogDescription className="text-slate-400">This is how the alert might look with mock data.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-3 text-sm max-h-[60vh] overflow-y-auto scrollbar-hide">
                    {previewTemplate.type === 'email' && <p><span className="font-semibold text-slate-400">Subject:</span> {renderPreview(previewTemplate).subject}</p>}
                    <p className="font-semibold text-slate-400">Body:</p>
                    <div className="p-3 rounded-md bg-slate-800/50 border border-slate-600 whitespace-pre-wrap">{renderPreview(previewTemplate).body}</div>
                </div>
                 <DialogFooter>
                    <Button onClick={() => setPreviewTemplate(null)} className="gradient-bg">Close Preview</Button>
                </DialogFooter>
            </DialogContent>
         </Dialog>
      )}

    </div>
  );
};

export default AlertTemplatesPage;