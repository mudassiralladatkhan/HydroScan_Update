import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Droplets, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';

const UpdatePasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1)); // remove #
      const accessToken = params.get('access_token');
      const error = params.get('error');
      const errorCode = params.get('error_code');
      const errorDescription = params.get('error_description');

      if (error) {
        toast({
          title: `Error (${errorCode || 'Unknown'})`,
          description: errorDescription || "Failed to process password reset link.",
          variant: "destructive",
        });
        navigate('/login');
      } else if (accessToken) {
        // The user is logged in via the recovery link.
        // We don't need to explicitly set session here for password update.
        // Supabase client handles this.
      }
    }
  }, [location, navigate]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }
    if (password.length < 6) {
        toast({
            title: "Password Too Short",
            description: "Password must be at least 6 characters long.",
            variant: "destructive",
        });
        return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password: password });

    setLoading(false);
    if (error) {
      toast({
        title: "Error Updating Password",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Password Updated Successfully!",
        description: "You can now log in with your new password.",
      });
      setUpdateSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 water-animation opacity-20"></div>
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
              Update Your Password
            </CardTitle>
            <CardDescription className="text-slate-300">
              Enter and confirm your new password.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {updateSuccess ? (
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4 animate-pulse" />
                <p className="text-white text-xl">Password Updated!</p>
                <p className="text-slate-300 mt-2">Redirecting to login page...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="password" className="text-slate-200">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-white"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="confirmPassword" className="text-slate-200">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-white"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full gradient-bg hover:opacity-90 transition-opacity mt-2"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Updating Password...</span>
                    </div>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default UpdatePasswordPage;