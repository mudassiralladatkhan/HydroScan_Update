import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Droplets, Mail, Lock, Eye, EyeOff, Key, CheckCircle, UserPlus, ShieldAlert, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient'; 

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordlessEmail, setPasswordlessEmail] = useState('');
  const [passwordlessSent, setPasswordlessSent] = useState(false);
  const { user, login } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await login(email, password);
    setLoading(false);
  };

  const handleSocialLogin = async (provider) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      toast({ title: "Social Login Error", description: error.message, variant: "destructive" });
      setLoading(false);
    }
  };

  const handlePasswordlessLogin = async (e) => {
    e.preventDefault();
    if (!passwordlessEmail) {
      toast({title: "Email Required", description:"Please enter your email for magic link login.", variant: "destructive"});
      return;
    }
    setLoading(true);
    setPasswordlessSent(false);
    const { error } = await supabase.auth.signInWithOtp({
      email: passwordlessEmail,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      toast({ title: "Passwordless Login Error", description: error.message, variant: "destructive" });
    } else {
      setPasswordlessSent(true);
      toast({ title: "Magic Link Sent", description: "Check your email for the login link." });
    }
    setLoading(false);
  };
  
  const handleFeatureClick = (featureName) => {
     toast({
      title: "🚧 Mock Feature",
      description: `${featureName} UI is for demonstration. Full integration may require backend setup.`,
    });
  };


  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Bubbles are now handled by App.jsx global background */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="glass-effect border-slate-700">
          <CardHeader className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="flex justify-center mb-4"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                <Droplets className="h-8 w-8 text-white" />
              </div>
            </motion.div>
            <CardTitle className="text-2xl font-bold text-white">
              Welcome to HydroScan
            </CardTitle>
            <CardDescription className="text-slate-300">
              AI-Powered Water Quality Monitoring
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="email" className="text-slate-200">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input id="email" type="email" placeholder="admin@hydroscan.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400" required />
                </div>
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="password" className="text-slate-200">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400" required />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-white" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <Button type="button" variant="link" className="p-0 h-auto text-blue-400 hover:text-blue-300" onClick={() => handleFeatureClick("Two-Factor Authentication (2FA)")}>
                  <ShieldAlert className="h-3 w-3 mr-1"/> Use 2FA (Mock)
                </Button>
                <Link to="/forgot-password" className="text-blue-400 hover:text-blue-300">Forgot Password?</Link>
              </div>

              <Button type="submit" className="w-full gradient-bg hover:opacity-90 transition-opacity" disabled={loading}>
                {loading && !passwordlessSent ? (<div className="flex items-center space-x-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Signing in...</span></div>) : ('Sign In')}
              </Button>
            </form>
            
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-600"></span></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-800/80 px-2 text-slate-400 rounded-md">Or continue with</span></div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => handleSocialLogin('google')} disabled={loading} className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">
                  <img  alt="Google logo" className="mr-2 h-4 w-4" src="https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg" /> Google
                </Button>
                <Button variant="outline" onClick={() => handleSocialLogin('github')} disabled={loading} className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">
                   <img  alt="GitHub logo" className="mr-2 h-4 w-4" src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" /> GitHub
                </Button>
              </div>
              
              {passwordlessSent ? (
                 <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-md text-center">
                    <CheckCircle className="h-5 w-5 text-green-400 inline mr-2"/>
                    <span className="text-sm text-green-300">Magic link sent to {passwordlessEmail}!</span>
                 </div>
              ) : (
                <form onSubmit={handlePasswordlessLogin} className="space-y-2">
                  <Label htmlFor="passwordlessEmail" className="text-xs text-slate-300 sr-only">Email for Magic Link</Label>
                  <div className="flex space-x-2">
                    <Input id="passwordlessEmail" type="email" placeholder="Email for Magic Link" value={passwordlessEmail} onChange={(e) => setPasswordlessEmail(e.target.value)} className="flex-grow bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 text-sm h-9" />
                    <Button type="submit" variant="outline" disabled={loading || !passwordlessEmail} className="h-9 border-slate-600 text-slate-300 hover:bg-slate-700 text-sm">
                      <Key className="h-3 w-3 mr-1.5" /> Send Link
                    </Button>
                  </div>
                </form>
              )}
               <Button variant="outline" onClick={() => handleFeatureClick("SSO Integration")} disabled={loading} className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">
                  <Zap className="h-4 w-4 mr-2" /> Sign in with SSO (Mock)
                </Button>
            </div>

            <div className="mt-6 text-center text-sm">
              <span className="text-slate-400">Don't have an account? </span>
              <Link to="/signup" className="font-medium text-blue-400 hover:text-blue-300 flex items-center justify-center">
                <UserPlus className="h-4 w-4 mr-1"/> Create Account
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default LoginPage;