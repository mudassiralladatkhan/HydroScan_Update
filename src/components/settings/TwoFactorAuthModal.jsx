
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

export const TwoFactorAuthModal = ({ setOpen }) => {
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');

  const handleEnable2FA = (e) => {
    e.preventDefault();
    if (code.length !== 6) {
        toast({ title: "Invalid Code", description: "Please enter a 6-digit code.", variant: "destructive" });
        return;
    }
    setLoading(true);
    setTimeout(() => {
        setLoading(false);
        toast({ title: "Two-Factor Authentication Enabled (Mock)", description: "Your account is now more secure." });
        setOpen(false);
    }, 1500);
  };

  return (
    <DialogContent className="glass-effect border-slate-700 text-white">
      <DialogHeader>
        <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
        <DialogDescription>Scan the QR code with your authenticator app, then enter the code to verify.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleEnable2FA}>
        <div className="space-y-4 py-4 flex flex-col items-center">
          <div className="p-4 bg-white rounded-lg">
            <img alt="Mock QR code for 2FA setup" width="160" height="160" src="https://images.unsplash.com/photo-166529251084-e8524e64f918" />
          </div>
          <div className="w-full space-y-2 pt-4">
            <Label htmlFor="2fa-code">Verification Code</Label>
            <Input id="2fa-code" type="text" placeholder="123456" maxLength="6" value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))} className="bg-slate-800/50 border-slate-600 text-center text-lg tracking-[0.3em]" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" className="border-slate-600 hover:bg-slate-700" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" className="gradient-bg" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enable 2FA
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};
