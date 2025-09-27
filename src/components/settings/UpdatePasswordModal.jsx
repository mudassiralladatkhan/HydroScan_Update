
import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

export const UpdatePasswordModal = ({ setOpen }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
        toast({ title: "Password too short", description: "Password must be at least 8 characters.", variant: "destructive" });
        return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) {
      toast({ title: "Password update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated successfully" });
      setNewPassword('');
      setConfirmPassword('');
      setOpen(false);
    }
  };

  return (
    <DialogContent className="glass-effect border-slate-700 text-white">
      <DialogHeader>
        <DialogTitle>Change Your Password</DialogTitle>
        <DialogDescription>Enter a new password for your account. You will be logged out from other sessions.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handlePasswordUpdate}>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-slate-800/50 border-slate-600"/>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-slate-800/50 border-slate-600"/>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" className="border-slate-600 hover:bg-slate-700" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" className="gradient-bg" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Password
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};
