import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Mail, Send, Filter, Trash2, RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

const OrganizationInvitesPage = () => {
  const { user } = useAuth();
  const [invites, setInvites] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'viewer' });
  const [sendingInvite, setSendingInvite] = useState(false);

  const fetchInvites = async () => {
    if (!user?.organization?.id) return;
    setLoadingInvites(true);
    const { data, error } = await supabase
      .from('organization_invitations')
      .select('*')
      .eq('organization_id', user.organization.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: "Error fetching invites", description: error.message, variant: "destructive" });
      setInvites([]);
    } else {
      setInvites(data || []);
    }
    setLoadingInvites(false);
  };

  useEffect(() => {
    fetchInvites();
  }, [user]);

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!user?.organization?.id) {
      toast({ title: "Error", description: "Organization context not found.", variant: "destructive" });
      return;
    }
    setSendingInvite(true);
    const { error } = await supabase
      .from('organization_invitations')
      .insert({
        organization_id: user.organization.id,
        email: inviteForm.email,
        role: inviteForm.role,
        invited_by: user.id,
      });

    if (error) {
      toast({ title: "Error sending invite", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Invite Sent!", description: `Invitation sent to ${inviteForm.email}.`, icon: <Send className="text-green-500" /> });
      setInviteForm({ email: '', role: 'viewer' });
      fetchInvites();
    }
    setSendingInvite(false);
  };
  
  const handleDeleteInvite = async (inviteId) => {
    const { error } = await supabase
      .from('organization_invitations')
      .delete()
      .eq('id', inviteId);

    if (error) {
      toast({ title: "Error deleting invite", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Invite Deleted", description: "The pending invitation has been removed." });
      fetchInvites();
    }
  };
  
  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return <Badge className="bg-yellow-500/80 text-yellow-foreground hover:bg-yellow-500"><Clock className="h-3 w-3 mr-1"/>Pending</Badge>;
      case 'accepted': return <Badge className="bg-green-500/80 text-green-foreground hover:bg-green-500"><CheckCircle className="h-3 w-3 mr-1"/>Accepted</Badge>;
      case 'expired': return <Badge className="bg-red-500/80 text-red-foreground hover:bg-red-500"><XCircle className="h-3 w-3 mr-1"/>Expired</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center"><UserPlus className="mr-3 h-8 w-8 text-blue-400"/>Organization Invites</h1>
          <p className="text-slate-400 mt-1">Manage invitations for users to join your organization.</p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="glass-effect border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Send New Invitation</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendInvite} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="space-y-1">
                <Label htmlFor="inviteEmail" className="text-slate-200">Email Address</Label>
                <Input id="inviteEmail" type="email" value={inviteForm.email} onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})} placeholder="user@example.com" className="bg-slate-800/50 border-slate-600" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="inviteRole" className="text-slate-200">Role</Label>
                <Select value={inviteForm.role} onValueChange={(value) => setInviteForm({...inviteForm, role: value})}>
                  <SelectTrigger className="w-full bg-slate-800/50 border-slate-600"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600 text-white">
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="technician">Technician</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="gradient-bg h-10" disabled={sendingInvite}>
                {sendingInvite ? <Mail className="h-4 w-4 mr-2 animate-pulse" /> : <Send className="h-4 w-4 mr-2" />}
                {sendingInvite ? 'Sending...' : 'Send Invite'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="glass-effect border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
                <CardTitle className="text-white">Pending & Recent Invitations</CardTitle>
                <Button variant="ghost" size="icon" onClick={fetchInvites} disabled={loadingInvites} className="text-slate-400 hover:text-white">
                    <RefreshCw className={`h-4 w-4 ${loadingInvites ? 'animate-spin' : ''}`} />
                </Button>
            </div>
            <CardDescription className="text-slate-400">Overview of sent invitations.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingInvites ? (
              <div className="flex justify-center items-center h-32"><Mail className="h-8 w-8 text-blue-500 animate-ping" /></div>
            ) : invites.length > 0 ? (
              <div className="overflow-x-auto scrollbar-hide">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700 hover:bg-slate-800/30">
                      <TableHead className="text-slate-300">Email</TableHead>
                      <TableHead className="text-slate-300">Role</TableHead>
                      <TableHead className="text-slate-300">Status</TableHead>
                      <TableHead className="text-slate-300">Expires In</TableHead>
                      <TableHead className="text-slate-300 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map(invite => (
                      <TableRow key={invite.id} className="border-slate-700 hover:bg-slate-800/50">
                        <TableCell className="text-white">{invite.email}</TableCell>
                        <TableCell className="text-blue-400 capitalize">{invite.role}</TableCell>
                        <TableCell>{getStatusBadge(invite.status)}</TableCell>
                        <TableCell className="text-slate-400">{invite.status === 'pending' ? formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true }) : '-'}</TableCell>
                        <TableCell className="text-right">
                          {invite.status === 'pending' && (
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteInvite(invite.id)} className="text-slate-400 hover:text-red-400">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">No invitations found.</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default OrganizationInvitesPage;