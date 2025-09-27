
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { generatePostmanCollection, downloadPostmanCollection } from '@/lib/postmanUtils';
import { getApiUsageAnalytics } from '@/lib/metricsUtils';
import { motion } from 'framer-motion';
import { BookOpen, Terminal, BarChart2, KeyRound, PlayCircle, Trash2, Copy, ShieldCheck, Download, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const apiDocsContent = `
# HydroScan API Documentation (v1)
Welcome to the HydroScan API! This API allows you to interact with your water quality monitoring data programmatically.
## Authentication
API requests are authenticated using your generated API keys. You must include two headers in your request: <code>apikey</code> (using your generated key) and <code>Authorization</code> (using the same key, prefixed with 'Bearer ').
<pre className="bg-slate-900/70 p-3 rounded-md mt-2 text-sm overflow-x-auto"><code>apikey: YOUR_API_KEY
Authorization: Bearer YOUR_API_KEY</code></pre>
## Rate Limiting
- Standard Tier: 100 requests per minute.
- Pro Tier: 500 requests per minute.
## Endpoints
### 1. List Devices
  - **GET** '/api/v1/devices'
  - Returns a list of all devices associated with your account.
### 2. Get Device Details
  - **GET** '/api/v1/devices/:deviceId'
  - Returns details for a specific device.
### 3. Get Sensor Readings
  - **GET** '/api/v1/devices/:deviceId/readings'
  - Returns sensor readings for a specific device.
### 4. List Alerts
  - **GET** '/api/v1/alerts'
  - Returns a list of alerts.
---
*This is a mock API documentation for demonstration purposes.*
`;

const APIDocumentationPage = () => {
  const [apiAnalytics, setApiAnalytics] = useState([
    { name: '7 days ago', calls: 0, errors: 0 },
    { name: '6 days ago', calls: 0, errors: 0 },
    { name: '5 days ago', calls: 0, errors: 0 },
    { name: '4 days ago', calls: 0, errors: 0 },
    { name: '3 days ago', calls: 0, errors: 0 },
    { name: '2 days ago', calls: 0, errors: 0 },
    { name: 'Yesterday', calls: 0, errors: 0 },
    { name: 'Today', calls: 0, errors: 0 },
  ]);
  const [playgroundRequest, setPlaygroundRequest] = useState({
    endpoint: 'sensor_readings?limit=5',
    method: 'GET',
    body: ''
  });
  const [selectedApiKey, setSelectedApiKey] = useState('');
  const [playgroundResponse, setPlaygroundResponse] = useState('{\n  "message": "Click \'Send Request\' to see a mock API response."\n}');
  const [isSending, setIsSending] = useState(false);

  const [apiKeys, setApiKeys] = useState([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState(null);
  const [keyNameToGenerate, setKeyNameToGenerate] = useState('');
  const [keyToRevoke, setKeyToRevoke] = useState(null);

  const fetchApiKeys = async () => {
    setLoadingKeys(true);
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .is('revoked_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: "Error fetching API keys", description: error.message, variant: "destructive" });
      setApiKeys([]);
    } else {
      setApiKeys(data);
    }
    setLoadingKeys(false);
  };

  const fetchApiAnalytics = async () => {
    const analytics = await getApiUsageAnalytics(8);
    setApiAnalytics(analytics);
  };

  useEffect(() => {
    fetchApiKeys();
    fetchApiAnalytics();
  }, []);

  const handleSendRequest = async () => {
    if (!selectedApiKey) {
      toast({ title: "API Key Required", description: "Please select an API key to use for the request.", variant: "destructive" });
      return;
    }

    setIsSending(true);
    const url = `${supabaseUrl}/functions/v1/api-proxy/${playgroundRequest.endpoint}`;

    try {
      const response = await fetch(url, {
        method: playgroundRequest.method,
        headers: {
          'Authorization': `Bearer ${selectedApiKey}`,
          'Content-Type': 'application/json',
        },
        body: playgroundRequest.method !== 'GET' ? playgroundRequest.body : null,
      });

      const responseData = await response.json();
      setPlaygroundResponse(JSON.stringify(responseData, null, 2));

      if (!response.ok) {
        toast({ title: `Error: ${response.status}`, description: responseData.message || 'An error occurred.', variant: "destructive" });
      } else {
        toast({ title: "Request Successful", description: `Received a ${response.status} response from the API.` });
      }

    } catch (error) {
      setPlaygroundResponse(JSON.stringify({ error: error.message }, null, 2));
      toast({ title: "Network Error", description: "Could not connect to the API.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleGenerateKey = async () => {
    if (!keyNameToGenerate.trim()) {
      toast({ title: "Key name required", description: "Please provide a name for your new key.", variant: "destructive" });
      return;
    }
    
    const { data, error } = await supabase.functions.invoke('api-key-manager', {
      body: { key_name: keyNameToGenerate },
    });

    if (error) {
      toast({ title: "Failed to generate key", description: error.message, variant: "destructive" });
    } else {
      // The edge function returns the new DB record and the full_key at the top level
      const newKeyObject = { ...data, full_key: data.full_key };
      setNewlyGeneratedKey(data.full_key);
      setApiKeys(prev => [newKeyObject, ...prev]);
      setKeyNameToGenerate('');
    }
  };
  
  const handleRevokeKey = async () => {
    if (!keyToRevoke) return;

    const { error } = await supabase
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', keyToRevoke.id);

    if (error) {
      toast({ title: "Failed to revoke key", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "API Key Revoked", description: `Key '${keyToRevoke.key_name}' has been revoked.` });
      fetchApiKeys(); // Refetch the list
    }
    setKeyToRevoke(null);
  };
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard!" });
  };

  const timeAgo = (date) => {
    if (!date) return 'Never';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
  };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center"><BookOpen className="mr-3 h-8 w-8 text-blue-400"/>API Documentation & Tools</h1>
          <p className="text-slate-400">Your API Base URL: <code>{supabaseUrl}/rest/v1/</code></p>
        </div>
        <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 mt-3 sm:mt-0" onClick={() => {
          const collection = generatePostmanCollection(supabaseUrl, selectedApiKey);
          downloadPostmanCollection(collection);
          toast({title: "Download Complete", description: "Postman collection has been downloaded successfully."});
        }}>
          <Download className="h-4 w-4 mr-2" /> Download Postman Collection
        </Button>
      </motion.div>

      <Tabs defaultValue="documentation" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-slate-800/50">
            <TabsTrigger value="documentation" className="text-slate-300 data-[state=active]:text-white"><BookOpen className="h-4 w-4 mr-0 sm:mr-2" /> Docs</TabsTrigger>
            <TabsTrigger value="playground" className="text-slate-300 data-[state=active]:text-white"><PlayCircle className="h-4 w-4 mr-0 sm:mr-2" /> Playground</TabsTrigger>
            <TabsTrigger value="analytics" className="text-slate-300 data-[state=active]:text-white"><BarChart2 className="h-4 w-4 mr-0 sm:mr-2" /> Analytics</TabsTrigger>
            <TabsTrigger value="keys" className="text-slate-300 data-[state=active]:text-white"><KeyRound className="h-4 w-4 mr-0 sm:mr-2" /> API Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="documentation">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                <Card className="glass-effect border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white">API Reference (REST v1)</CardTitle>
                    <CardDescription className="text-slate-400">Explore available endpoints and data structures.</CardDescription>
                </CardHeader>
                <CardContent className="prose prose-sm prose-invert max-w-none max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800/50 p-4 rounded-md bg-slate-800/30 border border-slate-700">
                    <h4 className="text-lg font-semibold text-white mt-6 mb-2">Authentication</h4>
                    <p className="text-slate-400">API requests are authenticated using your generated API keys. You must include two headers in your request: <code>apikey</code> (using your generated key) and <code>Authorization</code> (using the same key, prefixed with 'Bearer ').</p>
                    <pre className="bg-slate-900/70 p-3 rounded-md mt-2 text-sm overflow-x-auto"><code>apikey: YOUR_API_KEY
Authorization: Bearer YOUR_API_KEY</code></pre>
                    <h4 className="text-lg font-semibold text-white mt-6 mb-2">Available Tables (Endpoints)</h4>
                    <p className="text-slate-400">You can perform RESTful operations on the following database tables. Use the table name as the endpoint.</p>
                    <div className="space-y-4 mt-4">
                      <div>
                        <p className="font-mono text-green-400">GET /sensor_readings</p>
                        <p className="text-slate-400 pl-4">Retrieve a list of all sensor readings. You can use query parameters like <code>?limit=10</code> or <code>?device_id=eq.your-device-id</code>.</p>
                      </div>
                      <div>
                        <p className="font-mono text-green-400">GET /devices</p>
                        <p className="text-slate-400 pl-4">Get a list of all registered devices.</p>
                      </div>
                      <div>
                        <p className="font-mono text-green-400">GET /alerts</p>
                        <p className="text-slate-400 pl-4">Get a list of all triggered alerts.</p>
                      </div>
                    </div>
                </CardContent>
                </Card>
            </motion.div>
        </TabsContent>

        <TabsContent value="playground">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                <Card className="glass-effect border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center"><Terminal className="mr-2"/>API Playground</CardTitle>
                        <CardDescription className="text-slate-400">Test API endpoints directly from your browser.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="w-full md:w-64">
                                                  <Select onValueChange={setSelectedApiKey} disabled={apiKeys.length === 0}>
                              <SelectTrigger className="bg-slate-800/50 border-slate-600">
                                                        <SelectValue placeholder={loadingKeys ? "Loading keys..." : "Select API Key..."} />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-900 text-white border-slate-700">
                                {apiKeys.map(key => (
                                  <SelectItem key={key.id} value={key.full_key}>{key.key_name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Select value={playgroundRequest.method} onValueChange={(val) => setPlaygroundRequest(p => ({...p, method: val}))}>
                            <SelectTrigger className="w-[120px] bg-slate-800/50 border-slate-600"><SelectValue/></SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-600 text-white"><SelectItem value="GET">GET</SelectItem><SelectItem value="POST">POST</SelectItem><SelectItem value="PUT">PUT</SelectItem><SelectItem value="DELETE">DELETE</SelectItem></SelectContent>
                          </Select>
                          <div className="flex-grow">
                            <Input 
                              className="font-mono bg-slate-800/50 border-slate-600"
                              placeholder="e.g., sensor_readings?limit=5"
                              value={playgroundRequest.endpoint}
                              onChange={(e) => setPlaygroundRequest(prev => ({ ...prev, endpoint: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div>
                            <Label className="text-slate-300 text-xs">Headers (JSON)</Label>
                            <Textarea value={playgroundRequest.headers} onChange={e => setPlaygroundRequest(p => ({...p, headers: e.target.value}))} rows={3} className="font-mono text-xs bg-slate-800/50 border-slate-600 placeholder:text-slate-500"/>
                        </div>
                         <div>
                            <Label className="text-slate-300 text-xs">Body (JSON - for POST/PUT)</Label>
                            <Textarea value={playgroundRequest.body} onChange={e => setPlaygroundRequest(p => ({...p, body: e.target.value}))} rows={3} className="font-mono text-xs bg-slate-800/50 border-slate-600 placeholder:text-slate-500"/>
                        </div>
                        <Button onClick={handleSendRequest} disabled={isSending} className="w-full gradient-bg">
                            {isSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <PlayCircle className="h-4 w-4 mr-2"/>}
                            {isSending ? 'Sending...' : 'Send Request'}
                        </Button>
                        <div>
                            <Label className="text-slate-300 text-xs">Response</Label>
                            <Textarea readOnly value={playgroundResponse} rows={8} className="font-mono text-xs bg-slate-800/50 border-slate-600 text-slate-400"/>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </TabsContent>
        
        <TabsContent value="analytics">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                <Card className="glass-effect border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center">
                            <BarChart2 className="mr-2 text-blue-400" />
                            API Usage Analytics
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            Real-time API calls and performance metrics over time.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                            <div className="p-4 rounded-lg bg-slate-800/50"><h4 className="text-sm text-slate-400">Total Requests</h4><p className="text-2xl font-bold text-white">2,515</p></div>
                            <div className="p-4 rounded-lg bg-slate-800/50"><h4 className="text-sm text-slate-400">Error Rate</h4><p className="text-2xl font-bold text-red-400">5.5%</p></div>
                            <div className="p-4 rounded-lg bg-slate-800/50"><h4 className="text-sm text-slate-400">Avg. Latency</h4><p className="text-2xl font-bold text-green-400">120ms</p></div>
                        </div>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={apiAnalytics}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} />
                                <Legend wrapperStyle={{fontSize: "14px"}}/>
                                <Line type="monotone" dataKey="calls" stroke="#3b82f6" strokeWidth={2} name="Total Calls" />
                                <Line type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={2} name="Errors" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </TabsContent>

        <TabsContent value="keys">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                <Card className="glass-effect border-slate-700">
                    <CardHeader className="flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-white flex items-center"><KeyRound className="mr-2"/>Manage API Keys</CardTitle>
                            <CardDescription className="text-slate-400">Generate, manage, and revoke your API access keys.</CardDescription>
                        </div>
                                                <Dialog>
                          <DialogTrigger asChild><Button className="gradient-bg">Generate New Key</Button></DialogTrigger>
                          <DialogContent className="glass-effect border-slate-700 text-white">
                            <DialogHeader><DialogTitle>Generate New API Key</DialogTitle><DialogDescription>Give your new key a descriptive name to help you identify it later.</DialogDescription></DialogHeader>
                            <div className="py-4 space-y-2">
                              <Label htmlFor="key-name">Key Name</Label>
                              <Input id="key-name" placeholder="e.g., 'My Reporting App'" value={keyNameToGenerate} onChange={(e) => setKeyNameToGenerate(e.target.value)} className="bg-slate-800/50 border-slate-600" />
                            </div>
                            <DialogFooter><DialogTrigger asChild><Button onClick={handleGenerateKey}>Generate Key</Button></DialogTrigger></DialogFooter>
                          </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {apiKeys.map(k => (
                        <div key={k.id} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex-grow">
                                                        <p className="font-mono text-sm text-slate-300">{k.key_name}</p>
                            <p className="text-xs text-slate-500 font-mono">{k.key_prefix}...</p>
                            <p className="text-xs text-slate-500">
                              Created: {new Date(k.created_at).toLocaleDateString()} | Last used: {timeAgo(k.last_used_at)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Dialog>
                                <DialogTrigger asChild><Button variant="ghost" size="sm" className="text-slate-400 hover:text-white"><ShieldCheck className="h-4 w-4 mr-1.5"/>Permissions</Button></DialogTrigger>
                                <DialogContent className="glass-effect border-slate-700 text-white">
                                    <DialogHeader><DialogTitle>Permissions for key '{k.key_name}'</DialogTitle></DialogHeader>
                                    <div className="py-4 space-y-2">
                                        {['devices:read', 'devices:write', 'alerts:read', 'alerts:write'].map(p => (
                                          <div key={p} className="flex items-center">
                                            <input type="checkbox" readOnly checked={k.permissions.includes(p)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                            <label className="ml-3 block text-sm text-slate-300">{p}</label>
                                          </div>
                                        ))}
                                    </div>
                                    <DialogFooter><Button onClick={(e) => e.currentTarget.closest('[role="dialog"]').click()}>Close</Button></DialogFooter>
                                </DialogContent>
                            </Dialog>
                            
                            <Dialog>
                                <DialogTrigger asChild><Button variant="destructive" size="sm" onClick={() => setKeyToRevoke(k)}><Trash2 className="h-4 w-4 mr-1.5"/>Revoke</Button></DialogTrigger>
                                {keyToRevoke && keyToRevoke.id === k.id && (
                                <DialogContent className="glass-effect border-slate-700 text-white">
                                    <DialogHeader><DialogTitle>Revoke API Key?</DialogTitle><DialogDescription>Are you sure you want to revoke the key named '{keyToRevoke.key_name}'? This action is permanent and cannot be undone.</DialogDescription></DialogHeader>
                                    <DialogFooter><DialogTrigger asChild><Button variant="outline" className="border-slate-600 hover:bg-slate-700">Cancel</Button></DialogTrigger><DialogTrigger asChild><Button variant="destructive" onClick={handleRevokeKey}>Yes, Revoke Key</Button></DialogTrigger></DialogFooter>
                                </DialogContent>
                                )}
                            </Dialog>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                </Card>
            </motion.div>
        </TabsContent>

      </Tabs>

      {/* Dialog to show newly generated key */}
      <Dialog open={!!newlyGeneratedKey} onOpenChange={() => setNewlyGeneratedKey(null)}>
        <DialogContent className="glass-effect border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>API Key Generated Successfully</DialogTitle>
            <DialogDescription>Please copy this key and store it securely. You will not be able to see it again.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-3 rounded-md bg-slate-900 border border-slate-600 font-mono text-sm text-green-400 break-all relative">
              {newlyGeneratedKey}
              <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-7 w-7" onClick={() => copyToClipboard(newlyGeneratedKey)}>
                <Copy className="h-4 w-4"/>
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewlyGeneratedKey(null)}>I have copied my key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default APIDocumentationPage;
