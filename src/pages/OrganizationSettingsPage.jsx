import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Save, Edit, Users, DollarSign, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

const OrganizationSettingsPage = () => {
  const { user, fetchUserProfile } = useAuth(); // Assuming fetchUserProfile can refresh user context
  const [organization, setOrganization] = useState(user?.organization || { name: '', description: '' });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setOrganization(user?.organization || { name: '', description: '' });
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setOrganization(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveOrganization = async () => {
    if (!organization.id || !organization.name) {
      toast({ title: "Validation Error", description: "Organization name is required.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from('organizations')
      .update({ name: organization.name, description: organization.description })
      .eq('id', organization.id);

    if (error) {
      toast({ title: "Error updating organization", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Organization Updated", description: "Your organization details have been saved." });
      await fetchUserProfile(user); // Refresh user context to get updated org details
      setEditing(false);
    }
    setLoading(false);
  };
  
  const handleFeatureClick = (featureName) => {
     toast({
      title: "🚧 Mock Feature",
      description: `${featureName} UI is for demonstration. Full integration requires backend setup.`,
    });
  };

  if (!user || !organization) {
    return <div className="p-6 text-white">Loading organization settings...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center"><Briefcase className="mr-3 h-8 w-8 text-blue-400"/>Organization Settings</h1>
          <p className="text-slate-400 mt-1">Manage your organization's profile, members, and billing.</p>
        </div>
        {!editing && (
            <Button onClick={() => setEditing(true)} className="gradient-bg">
              <Edit className="h-4 w-4 mr-2" /> Edit Details
            </Button>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="glass-effect border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Organization Profile</CardTitle>
            <CardDescription className="text-slate-400">Update your organization's name and description.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="orgName" className="text-slate-200">Organization Name</Label>
              <Input id="orgName" name="name" value={organization.name} onChange={handleInputChange} className="bg-slate-800/50 border-slate-600" disabled={!editing} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="orgDescription" className="text-slate-200">Description</Label>
              <Textarea id="orgDescription" name="description" value={organization.description || ''} onChange={handleInputChange} className="bg-slate-800/50 border-slate-600 min-h-[80px]" disabled={!editing} placeholder="A brief description of your organization."/>
            </div>
            {editing && (
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => { setEditing(false); setOrganization(user.organization); }} className="border-slate-600 hover:bg-slate-700">Cancel</Button>
                <Button onClick={handleSaveOrganization} className="gradient-bg" disabled={loading}>
                  {loading ? <Save className="h-4 w-4 mr-2 animate-pulse" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Changes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-effect border-slate-700 h-full">
            <CardHeader>
              <CardTitle className="text-white flex items-center"><Users className="mr-2"/>Member Management</CardTitle>
              <CardDescription className="text-slate-400">View and manage organization members and roles.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => handleFeatureClick("Manage Members")} className="w-full gradient-bg">Manage Members (Mock)</Button>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-effect border-slate-700 h-full">
            <CardHeader>
              <CardTitle className="text-white flex items-center"><DollarSign className="mr-2"/>Billing & Subscription</CardTitle>
              <CardDescription className="text-slate-400">Manage your subscription plan and view billing history.</CardDescription>
            </CardHeader>
            <CardContent>
               <p className="text-sm text-slate-300 mb-2">Current Plan: <span className="font-semibold text-blue-400">Pro Tier (Mock)</span></p>
              <Button onClick={() => handleFeatureClick("Manage Subscription")} className="w-full gradient-bg">Manage Subscription (Mock)</Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="glass-effect border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center"><Shield className="mr-2"/>Organization Security (Mock)</CardTitle>
            <CardDescription className="text-slate-400">Configure security settings specific to your organization.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" onClick={() => handleFeatureClick("Configure SSO")} className="w-full border-slate-600 hover:bg-slate-700">Configure Single Sign-On (SSO)</Button>
            <Button variant="outline" onClick={() => handleFeatureClick("Access Policies")} className="w-full border-slate-600 hover:bg-slate-700">Set Data Access Policies</Button>
            <Button variant="outline" onClick={() => handleFeatureClick("View Org Audit Logs")} className="w-full border-slate-600 hover:bg-slate-700">View Organization Audit Logs</Button>
          </CardContent>
        </Card>
      </motion.div>

    </div>
  );
};

export default OrganizationSettingsPage;