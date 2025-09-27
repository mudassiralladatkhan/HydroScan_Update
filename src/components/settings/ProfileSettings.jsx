
import React, { useState, useEffect } from 'react';
import { User, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const ProfileSettings = ({ user }) => {
  const { updateUserName, loading } = useAuth();
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setFullName(user.user_metadata.full_name);
    } else if (user?.email) {
      setFullName(user.email.split('@')[0]);
    }
  }, [user]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast({ title: "Name cannot be empty", variant: "destructive" });
      return;
    }
    await updateUserName(fullName);
  };

  return (
    <Card className="glass-effect border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <User className="h-5 w-5 mr-2" />
          Profile Information
        </CardTitle>
        <CardDescription className="text-slate-400">
          Update your personal information and organization details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-200">Full Name</Label>
              <Input
                id="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-slate-800/50 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-slate-800/50 border-slate-600 text-white opacity-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="text-slate-200">Role</Label>
              <Input
                id="role"
                value={user?.role || 'User'}
                disabled
                className="bg-slate-800/50 border-slate-600 text-white opacity-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organization" className="text-slate-200">Organization</Label>
              <Input
                id="organization"
                value={user?.organization?.name || 'N/A'}
                disabled
                className="bg-slate-800/50 border-slate-600 text-white opacity-50"
              />
            </div>
          </div>
          <Button 
            type="submit"
            className="gradient-bg"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Update Profile
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProfileSettings;
