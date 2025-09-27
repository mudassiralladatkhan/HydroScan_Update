import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, ShieldQuestion } from 'lucide-react';
import { motion } from 'framer-motion';

const AcceptInvitePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, login, loading: authLoading } = useAuth(); // Assuming login might be needed if not authenticated
  const [status, setStatus] = useState('processing'); // processing, success, error, needs_auth
  const [inviteDetails, setInviteDetails] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const processInvite = async () => {
      const params = new URLSearchParams(location.search);
      const token = params.get('token');

      if (!token) {
        setErrorMsg('Invalid or missing invitation token.');
        setStatus('error');
        return;
      }

      // 1. Check if user is authenticated
      if (!user && !authLoading) {
        setStatus('needs_auth');
        // Store token to use after login/signup
        sessionStorage.setItem('invite_token', token);
        toast({ title: "Authentication Required", description: "Please log in or sign up to accept the invitation."});
        navigate('/login', { state: { from: location, inviteToken: token } }); // Pass token to login page if needed
        return;
      }
      
      if (authLoading) return; // Wait for auth to complete

      // 2. User is authenticated, try to accept invite
      // This would typically be an Edge Function call to handle securely
      // For client-side, we'll do a simplified version
      
      // Fetch invite details first
      const { data: inviteData, error: fetchError } = await supabase
        .from('organization_invitations')
        .select('*, organizations(name)')
        .eq('token', token)
        .eq('status', 'pending') // Only process pending invites
        .single();

      if (fetchError || !inviteData) {
        setErrorMsg(fetchError?.message || 'Invitation not found, already accepted, or expired.');
        setStatus('error');
        return;
      }
      
      // Check if invited email matches current user's email
      if (inviteData.email.toLowerCase() !== user.email.toLowerCase()) {
        setErrorMsg(`This invitation is for ${inviteData.email}. You are logged in as ${user.email}.`);
        setStatus('error');
        return;
      }

      setInviteDetails(inviteData);

      // Update user's organization_id and role, and mark invite as accepted
      // This should ideally be in a transaction or an Edge Function
      const { error: updateUserError } = await supabase
        .from('users')
        .update({ 
            organization_id: inviteData.organization_id, 
            role: inviteData.role,
            status: 'active' // Also update status to active if they were pending
        })
        .eq('id', user.id);

      if (updateUserError) {
        setErrorMsg(`Failed to update user profile: ${updateUserError.message}`);
        setStatus('error');
        return;
      }

      const { error: updateInviteError } = await supabase
        .from('organization_invitations')
        .update({ status: 'accepted' })
        .eq('id', inviteData.id);
      
      if (updateInviteError) {
        // Potentially rollback user update or handle inconsistency
        setErrorMsg(`Failed to update invitation status: ${updateInviteError.message}`);
        setStatus('error');
        // Consider logging this for admin review
        return;
      }
      
      setStatus('success');
      toast({ title: "Invitation Accepted!", description: `You've successfully joined ${inviteData.organizations?.name || 'the organization'}.`});
      // Force re-fetch of user profile to update context with new org and role
      // This depends on how your AuthContext handles profile refresh.
      // A simple way is to navigate to dashboard, where AuthContext might re-check.
      // Or, trigger a specific function in AuthContext if available.
      supabase.auth.refreshSession(); // This might help re-trigger onAuthStateChange with updated user claims if any.
      setTimeout(() => navigate('/'), 2000); // Redirect to dashboard
    };

    processInvite();
  }, [location, user, authLoading, navigate]);


  let content;
  switch (status) {
    case 'processing':
      content = (
        <>
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
          <CardTitle className="text-white">Processing Invitation...</CardTitle>
          <CardDescription className="text-slate-400">Please wait while we verify your invitation.</CardDescription>
        </>
      );
      break;
    case 'success':
      content = (
        <>
          <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
          <CardTitle className="text-white">Invitation Accepted!</CardTitle>
          <CardDescription className="text-slate-400">
            Welcome to {inviteDetails?.organizations?.name || 'the organization'}! You will be redirected shortly.
          </CardDescription>
        </>
      );
      break;
    case 'error':
      content = (
        <>
          <XCircle className="h-12 w-12 text-red-500 mb-4" />
          <CardTitle className="text-white">Invitation Error</CardTitle>
          <CardDescription className="text-slate-400">{errorMsg}</CardDescription>
          <Button onClick={() => navigate('/login')} className="mt-4 gradient-bg">Go to Login</Button>
        </>
      );
      break;
    case 'needs_auth':
        content = (
          <>
            <ShieldQuestion className="h-12 w-12 text-yellow-500 mb-4" />
            <CardTitle className="text-white">Authentication Required</CardTitle>
            <CardDescription className="text-slate-400">Please log in or sign up to accept this invitation. You are being redirected...</CardDescription>
          </>
        );
        break;
    default:
      content = <CardTitle>Loading...</CardTitle>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
        <Card className="w-full max-w-md glass-effect border-slate-700 text-center">
          <CardHeader>
            {/* Title and description are set by `content` */}
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-3">
            {content}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AcceptInvitePage;