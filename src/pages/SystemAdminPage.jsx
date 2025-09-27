import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Server, Activity, Settings2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

const SystemAdminPage = () => {
  const handleFeatureClick = (featureName) => {
    toast({
      title: "🚧 Feature In Progress",
      description: `${featureName} is currently under development. Stay tuned! 🚀`,
    });
  };

  const adminSections = [
    { title: "Live System Monitoring", icon: Activity, description: "Real-time health metrics and performance KPIs.", featureKey: "liveMonitoring" },
    { title: "Scheduled Maintenance", icon: Settings2, description: "Manage system updates and maintenance windows.", featureKey: "scheduledMaintenance" },
    { title: "System Backup & Recovery", icon: Server, description: "Oversee backups, logs, and system restoration.", featureKey: "backupRecovery" },
    { title: "Security & Compliance", icon: ShieldCheck, description: "Manage security policies and access logs.", featureKey: "securityCompliance" },
  ];

  return (
    <div className="p-6 space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="flex flex-col sm:flex-row items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white">System Administration</h1>
          <p className="text-slate-400 mt-1">Oversee and manage the HydroScan platform.</p>
        </div>
        <Button onClick={() => handleFeatureClick("System-Wide Alert Configuration")} className="mt-4 sm:mt-0 gradient-bg">
          Configure System Alerts
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {adminSections.map((section, index) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
          >
            <Card className="glass-effect border-slate-700 h-full flex flex-col">
              <CardHeader className="flex flex-row items-center space-x-3 pb-3">
                <div className="p-3 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
                  <section.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl text-white">{section.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <CardDescription className="text-slate-300 mb-4">{section.description}</CardDescription>
                <Button 
                  variant="outline" 
                  className="w-full border-blue-500 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300"
                  onClick={() => handleFeatureClick(section.title)}
                >
                  Manage {section.title.split(' ')[0]}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * adminSections.length }}>
        <Card className="glass-effect border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Admin Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700" onClick={() => handleFeatureClick("View System Logs")}>View System Logs</Button>
            <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700" onClick={() => handleFeatureClick("Manage API Keys")}>Manage API Keys</Button>
            <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700" onClick={() => handleFeatureClick("Generate System Report")}>Generate System Report</Button>
            <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700" onClick={() => handleFeatureClick("Optimization Assistant")}>Optimization Assistant</Button>
          </CardContent>
        </Card>
      </motion.div>

    </div>
  );
};

export default SystemAdminPage;