
import React, { useState, useEffect } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const APISettings = () => {
  const { user, supabase } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [loadingKey, setLoadingKey] = useState(false);

  const fetchApiKey = async () => {
    if (!user || !user.organization?.id) {
      setApiKey('Organization context not available.');
      return;
    }
    setLoadingKey(true);
    // This is a mock implementation. A real app would have a dedicated table for API keys.
    // Here we just check a device for a key.
    const { data: deviceWithKey, error } = await supabase
      .from('devices')
      .select('ingest_api_key')
      .eq('organization_id', user.organization.id)
      .neq('ingest_api_key', null)
      .limit(1)
      .single();

    if (deviceWithKey && deviceWithKey.ingest_api_key) {
      setApiKey(`dk_mock_********${deviceWithKey.ingest_api_key.slice(-4)}`);
    } else if (error && error.code !== 'PGRST116') {
      setApiKey('Error fetching API key info.');
      toast({ title: "API Key Error", description: error.message, variant: "destructive" });
    } else {
      setApiKey('No Ingestion API Key found for your devices.');
    }
    setLoadingKey(false);
  };

  useEffect(() => {
    if (user && user.organization?.id) fetchApiKey();
  }, [user]);

  const generateNewKey = async () => {
    setLoadingKey(true);
    // Mock API key generation
    await new Promise(resolve => setTimeout(resolve, 1000));
    const newMockKey = `sk_mock_${Math.random().toString(36).substring(2, 15)}`;
    setApiKey(`********${newMockKey.slice(-4)}`);
    toast({ title: "Mock API Key Generated", description: "This is a mock key for demonstration purposes. Ensure to store it securely." });
    setLoadingKey(false);
  };

  const copyToClipboard = () => {
    if (apiKey && !apiKey.includes('*') && !apiKey.includes('...')) {
        navigator.clipboard.writeText(apiKey);
        toast({ title: "Copied to clipboard!" });
    } else {
        toast({ title: "Key is hidden for security", description: "Cannot copy a hidden or placeholder key." });
    }
  }

  return (
    <Card className="glass-effect border-slate-700">
        <CardHeader>
            <CardTitle className="text-white flex items-center"><KeyRound className="mr-2"/>API Key Management</CardTitle>
            <CardDescription className="text-slate-400">Manage your API access keys.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <p className="text-sm text-slate-400">
                Your API key allows programmatic access to HydroScan data. Keep it secure!
            </p>
            <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-md flex items-center justify-between">
                <span className="font-mono text-sm text-slate-300">{loadingKey ? 'Fetching key...' : apiKey}</span>
                <Button variant="ghost" size="sm" onClick={copyToClipboard} disabled={!apiKey || loadingKey}>Copy</Button>
            </div>
            <Button onClick={generateNewKey} disabled={loadingKey} className="gradient-bg">
                {loadingKey && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                {loadingKey ? 'Generating...' : 'Generate New API Key (Mock)'}
            </Button>
            <p className="text-xs text-slate-500">API Keys provide full access to your organization's data. Treat them like passwords.</p>
        </CardContent>
    </Card>
  );
};

export default APISettings;
