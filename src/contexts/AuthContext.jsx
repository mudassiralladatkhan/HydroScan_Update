
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/use-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState(null); 

  const fetchUserProfile = async (authUser) => {
    console.log('AuthContext: fetchUserProfile called with:', authUser);
    
    if (!authUser) {
        console.log('AuthContext: No authUser, setting states to null');
        setUser(null);
        setProfile(null);
        setPreferences(null);
        setLoading(false);
        return;
    }

    try {
      console.log('AuthContext: Fetching profile for user ID:', authUser.id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      console.log('AuthContext: Profile query result:', { data, error });

      if (error && error.code !== 'PGRST116') { // PGRST116: 0 rows
        console.error('AuthContext: Error fetching profile:', error);
        throw error;
      }

      if (data) {
        console.log('AuthContext: Profile found, setting user and profile');
        setUser(authUser);
        setProfile(data);
        setPreferences(data.preferences || { theme: 'dark', notifications: { email: true, push: false, sms: false } }); // Set default theme if no prefs
        console.log('AuthContext: Profile and preferences set:', { profile: data, preferences: data.preferences });
      } else {
        console.log('AuthContext: No profile found, creating default');
        // This case might happen if the trigger failed. We still set the user.
        setUser(authUser);
        setProfile(null); // No profile found
        setPreferences({ theme: 'dark', notifications: { email: true, push: false, sms: false } });
      }
    } catch (error) {
      toast({ title: "Error loading profile", description: "Could not load user profile data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const getSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        await fetchUserProfile(session?.user ?? null);
    }
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      fetchUserProfile(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const updateUserPreferences = async (newPreferences) => {
    if (!user) {
      toast({ title: "Not signed in", description: "You must be signed in to save preferences.", variant: "destructive" });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ preferences: newPreferences, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating preferences:', error);
        throw error;
      }

      if (data) {
        setPreferences(data.preferences);
        toast({ title: "Settings Saved", description: "Your preferences have been updated successfully." });
      }
    } catch (error) {
      toast({ title: "Error Saving", description: "Could not save your preferences.", variant: "destructive" });
    }
  };

  const value = {
    user,
    profile,
    preferences,
    loading,
    updateUserPreferences,
    signIn: (options) => supabase.auth.signInWithOAuth(options),
    signOut: () => supabase.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
