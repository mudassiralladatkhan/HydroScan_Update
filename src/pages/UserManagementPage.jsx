import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Edit, Trash2, ToggleLeft, ToggleRight, Search, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

const UserManagementPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUserForm, setNewUserForm] = useState({ email: '', fullName: '', role: 'technician', password: '' });
  const [editUserForm, setEditUserForm] = useState({ id: '', email: '', fullName: '', role: '', status: '' });


  const fetchUsers = async () => {
    if (!currentUser || !currentUser.organization?.id) {
        setUsers([]);
        setLoading(false);
        return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('organization_id', currentUser.organization.id);

    if (error) {
      toast({ title: "Error fetching users", description: error.message, variant: "destructive" });
      setUsers([]);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };
  
  useEffect(() => {
    fetchUsers();
  }, [currentUser]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!currentUser || !currentUser.organization?.id) {
      toast({ title: "Error", description: "Organization context not found.", variant: "destructive" });
      return;
    }
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: newUserForm.email,
        password: newUserForm.password,
        options: {
            data: { 
                full_name: newUserForm.fullName,
            }
        }
    });

    if (signUpError) {
        toast({ title: "Error creating user", description: signUpError.message, variant: "destructive" });
        return;
    }

    if (signUpData.user) {
        const { error: updateUserError } = await supabase
            .from('users')
            .update({ 
                organization_id: currentUser.organization.id,
                role: newUserForm.role,
                status: 'active' 
            })
            .eq('id', signUpData.user.id);
        
        if(updateUserError){
            toast({ title: "User created in auth, but error updating profile", description: updateUserError.message, variant: "destructive" });
        } else {
            toast({ title: "User added successfully", description: `${newUserForm.email} has been invited.` });
            fetchUsers(); 
            setShowAddUserDialog(false);
            setNewUserForm({ email: '', fullName: '', role: 'technician', password: '' });
        }
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from('users')
      .update({ 
        full_name: editUserForm.fullName, 
        role: editUserForm.role,
        status: editUserForm.status 
      })
      .eq('id', editUserForm.id);

    if (error) {
      toast({ title: "Error updating user", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "User updated successfully" });
      fetchUsers();
      setShowEditUserDialog(false);
    }
  };

  const openEditDialog = (userToEdit) => {
    setEditingUser(userToEdit);
    setEditUserForm({ 
        id: userToEdit.id, 
        email: userToEdit.email, 
        fullName: userToEdit.full_name, 
        role: userToEdit.role,
        status: userToEdit.status || 'active' 
    });
    setShowEditUserDialog(true);
  };
  
  const handleDeleteUser = async (userId) => {
     toast({
      title: "🚧 Feature Info",
      description: "Deleting users directly via client-side Supabase is complex and requires admin privileges. This should typically be handled by a backend function or with extreme caution.",
    });
  };

  const toggleUserStatus = async (userToToggle) => {
    const newStatus = userToToggle.status === 'active' ? 'inactive' : 'active';
    const { error } = await supabase
      .from('users')
      .update({ status: newStatus })
      .eq('id', userToToggle.id);

    if (error) {
      toast({ title: "Error updating status", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `User ${newStatus === 'active' ? 'activated' : 'deactivated'}` });
      fetchUsers();
    }
  };

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.full_name && u.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <p className="text-slate-400 mt-1">Manage users, roles, and permissions within your organization.</p>
        </div>
        <Button onClick={() => setShowAddUserDialog(true)} className="gradient-bg">
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search users by email or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
        />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="glass-effect border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">User List</CardTitle>
            <CardDescription className="text-slate-400">
              Showing {filteredUsers.length} users in {currentUser?.organization?.name}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="overflow-x-auto scrollbar-hide">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700 hover:bg-slate-800/30">
                      <TableHead className="text-slate-300">Full Name</TableHead>
                      <TableHead className="text-slate-300">Email</TableHead>
                      <TableHead className="text-slate-300">Role</TableHead>
                      <TableHead className="text-slate-300">Status</TableHead>
                      <TableHead className="text-slate-300 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map(u => (
                      <TableRow key={u.id} className="border-slate-700 hover:bg-slate-800/50">
                        <TableCell className="text-white">{u.full_name || 'N/A'}</TableCell>
                        <TableCell className="text-slate-400">{u.email}</TableCell>
                        <TableCell className="text-blue-400 capitalize">{u.role}</TableCell>
                        <TableCell>
                          <Badge variant={u.status === 'active' ? 'default' : 'destructive'} className={u.status === 'active' ? 'bg-green-500/80' : 'bg-red-500/80'}>
                            {u.status || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => toggleUserStatus(u)} className="text-slate-400 hover:text-white">
                            {u.status === 'active' ? <ToggleRight className="h-4 w-4 text-green-400"/> : <ToggleLeft className="h-4 w-4 text-red-400"/>}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(u)} className="text-slate-400 hover:text-white">
                            <Edit className="h-4 w-4" />
                          </Button>
                           <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(u.id)} className="text-slate-400 hover:text-red-400">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-slate-400 py-8">No users found.</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
        <DialogContent className="glass-effect border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Add New User</DialogTitle>
            <DialogDescription className="text-slate-400">Invite a new user to your organization.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4 pt-4">
            <div className="space-y-1">
              <Label htmlFor="newUserFullName" className="text-slate-200">Full Name</Label>
              <Input id="newUserFullName" value={newUserForm.fullName} onChange={(e) => setNewUserForm({...newUserForm, fullName: e.target.value})} className="bg-slate-800/50 border-slate-600" placeholder="John Doe" required/>
            </div>
            <div className="space-y-1">
              <Label htmlFor="newUserEmail" className="text-slate-200">Email</Label>
              <Input id="newUserEmail" type="email" value={newUserForm.email} onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})} className="bg-slate-800/50 border-slate-600" placeholder="user@example.com" required/>
            </div>
            <div className="space-y-1">
              <Label htmlFor="newUserPassword" className="text-slate-200">Temporary Password</Label>
              <Input id="newUserPassword" type="password" value={newUserForm.password} onChange={(e) => setNewUserForm({...newUserForm, password: e.target.value})} className="bg-slate-800/50 border-slate-600" placeholder="••••••••" required/>
            </div>
            <div className="space-y-1">
              <Label htmlFor="newUserRole" className="text-slate-200">Role</Label>
              <Select value={newUserForm.role} onValueChange={(value) => setNewUserForm({...newUserForm, role: value})}>
                <SelectTrigger className="w-full bg-slate-800/50 border-slate-600"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600 text-white">
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="technician">Technician</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAddUserDialog(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancel</Button>
                <Button type="submit" className="gradient-bg">Add User</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
        <DialogContent className="glass-effect border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Edit User: {editingUser?.email}</DialogTitle>
            <DialogDescription className="text-slate-400">Update user details and permissions.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4 pt-4">
            <div className="space-y-1">
              <Label htmlFor="editUserFullName" className="text-slate-200">Full Name</Label>
              <Input id="editUserFullName" value={editUserForm.fullName} onChange={(e) => setEditUserForm({...editUserForm, fullName: e.target.value})} className="bg-slate-800/50 border-slate-600" required/>
            </div>
             <div className="space-y-1">
              <Label htmlFor="editUserEmail" className="text-slate-200">Email (cannot be changed)</Label>
              <Input id="editUserEmail" type="email" value={editUserForm.email} className="bg-slate-800/50 border-slate-600 opacity-70" disabled/>
            </div>
            <div className="space-y-1">
              <Label htmlFor="editUserRole" className="text-slate-200">Role</Label>
              <Select value={editUserForm.role} onValueChange={(value) => setEditUserForm({...editUserForm, role: value})}>
                <SelectTrigger className="w-full bg-slate-800/50 border-slate-600"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600 text-white">
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="technician">Technician</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="editUserStatus" className="text-slate-200">Status</Label>
              <Select value={editUserForm.status} onValueChange={(value) => setEditUserForm({...editUserForm, status: value})}>
                <SelectTrigger className="w-full bg-slate-800/50 border-slate-600"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600 text-white">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowEditUserDialog(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancel</Button>
                <Button type="submit" className="gradient-bg">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default UserManagementPage;