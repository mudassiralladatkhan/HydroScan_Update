
import React, { useState } from 'react';
import { Shield, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { UpdatePasswordModal } from '@/components/settings/UpdatePasswordModal';
import { TwoFactorAuthModal } from '@/components/settings/TwoFactorAuthModal';

const SecuritySettings = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [twoFAModalOpen, setTwoFAModalOpen] = useState(false);

  return (
    <>
      <Card className="glass-effect border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Shield className="h-5 w-5 mr-2" />
          Security Settings
        </CardTitle>
        <CardDescription className="text-slate-400">
          Manage your account security and access controls
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
          <DialogTrigger asChild>
            <Button className="w-full gradient-bg">
              Change Password
            </Button>
          </DialogTrigger>
          <UpdatePasswordModal setOpen={setPasswordModalOpen} />
        </Dialog>
        
        <Dialog open={twoFAModalOpen} onOpenChange={setTwoFAModalOpen}>
            <DialogTrigger asChild>
                <Button 
                    variant="outline"
                    className="w-full border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                    Enable Two-Factor Authentication
                </Button>
            </DialogTrigger>
            <TwoFactorAuthModal setOpen={setTwoFAModalOpen} />
        </Dialog>
        
        <Button 
          onClick={() => navigate('/api-docs')}
          variant="outline"
          className="w-full border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          Manage API Keys
        </Button>
        
        <Button 
          onClick={() => navigate('/audit-logs')}
          variant="outline"
          className="w-full border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          View Audit Logs
        </Button>
      </CardContent>
    </Card>

    {profile?.role === 'admin' && (
      <Card className="glass-effect border-slate-700 mt-6">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Project Security Policies
          </CardTitle>
          <CardDescription className="text-slate-400">
            These settings are managed in the Supabase dashboard and apply to all users.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold text-slate-200">Password Policy:</h4>
            <ul className="list-disc list-inside text-slate-300 pl-4">
              <li>Minimum Length: 8 characters</li>
              <li>Password requires a number, a symbol, and an uppercase letter.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-200">Session Policy:</h4>
            <p className="text-slate-300">Session Timeout: 1 hour of inactivity.</p>
            <p className="text-slate-300">Time-boxed Sessions: Users must re-authenticate every 24 hours.</p>
          </div>
          <Button 
            asChild
            variant="outline"
            className="w-full border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <a href={`https://supabase.com/dashboard/project/${import.meta.env.VITE_SUPABASE_PROJECT_ID}/auth/settings`} target="_blank" rel="noopener noreferrer">
              Manage Policies in Supabase
              <ExternalLink className="h-4 w-4 ml-2" />
            </a>
          </Button>
        </CardContent>
      </Card>
    )}
    </>
  );
};

export default SecuritySettings;
