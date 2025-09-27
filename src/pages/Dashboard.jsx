
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Droplets, Thermometer, AlertTriangle, TrendingUp, Wifi, WifiOff, Battery, Users, Cpu, ActivitySquare as ActivitySquareIcon, Settings, Edit3, BarChart3, Eye } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import SensorChart from '@/components/SensorChart';
import AlertsPanel from '@/components/AlertsPanel';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { devices, sensorData, alerts } = useData();
  const { user, preferences } = useAuth();
  const navigate = useNavigate();
  const [showCustomizeDialog, setShowCustomizeDialog] = useState(false);
  const [dashboardSections, setDashboardSections] = useState({
    keyMetrics: { visible: true, order: 1, name: "Key Metrics" },
    sensorDataChart: { visible: true, order: 2, name: "Sensor Data Chart" },
    alertsPanel: { visible: true, order: 3, name: "Alerts Panel" },
    deviceStatus: { visible: true, order: 4, name: "Device Status Overview" },
    adminOverview: { visible: user?.role === 'admin', order: 5, name: "Admin Overview" }
  });

  const onlineDevicesCount = devices.filter(d => d.status === 'online').length;
  const totalDevicesCount = devices.length;
  const activeAlertsCount = alerts.filter(a => !a.resolved && a.status !== 'resolved').length;

  const latestReadingsPerDevice = devices.map(device => {
    const deviceSensorData = sensorData
      .filter(d => d.device_id === device.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return {
      device,
      latestData: deviceSensorData[0] || null
    };
  });

  const getContaminationDetails = (score) => {
    if (score == null || isNaN(score)) return { level: 'N/A', color: 'bg-gray-500', textColor: 'text-gray-400' };
    if (score < 30) return { level: 'Low', color: 'bg-green-500', textColor: 'text-green-400' };
    if (score < 70) return { level: 'Medium', color: 'bg-yellow-500', textColor: 'text-yellow-400' };
    return { level: 'High', color: 'bg-red-500', textColor: 'text-red-400' };
  };
  
  const overallWaterQuality = () => {
    const validScores = sensorData.filter(sd => sd.contamination_score != null).map(sd => sd.contamination_score);
    if (validScores.length === 0) return { score: 'N/A', trend: 0 };
    const avgScore = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
    
    // Calculate real trend from last 24 hours vs previous 24 hours
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const dayBeforeYesterday = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    
    const recentScores = sensorData.filter(sd => 
      sd.contamination_score != null && 
      new Date(sd.timestamp) >= yesterday
    ).map(sd => sd.contamination_score);
    
    const previousScores = sensorData.filter(sd => 
      sd.contamination_score != null && 
      new Date(sd.timestamp) >= dayBeforeYesterday && 
      new Date(sd.timestamp) < yesterday
    ).map(sd => sd.contamination_score);
    
    let trend = 0;
    if (recentScores.length > 0 && previousScores.length > 0) {
      const recentAvg = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
      const previousAvg = previousScores.reduce((sum, score) => sum + score, 0) / previousScores.length;
      // For water quality: lower contamination score = better quality = positive trend
      trend = ((previousAvg - recentAvg) / previousAvg * 100); // Percentage improvement
    }
    
    return { score: (100 - avgScore).toFixed(1), trend: trend.toFixed(1) };
  };
  const quality = overallWaterQuality();


  const handleNavigate = (path) => {
    navigate(path);
  };

  const handleToggleSection = (sectionKey) => {
    setDashboardSections(prev => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], visible: !prev[sectionKey].visible }
    }));
    toast({ title: "Dashboard Customization", description: `${dashboardSections[sectionKey].name} visibility ${!dashboardSections[sectionKey].visible ? 'enabled' : 'disabled'}.`});
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.07 }
    })
  };
  
  const orderedSections = Object.entries(dashboardSections)
    .filter(([, section]) => section.visible)
    .sort(([, a], [, b]) => a.order - b.order);


  return (
    <div className={`p-4 sm:p-6 space-y-6 ${preferences.theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        custom={0}
        className="flex flex-col sm:flex-row items-center justify-between"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Welcome to T_P_P 's</h1>
          <p className={`${preferences.theme === 'dark' ? 'text-slate-400' : 'text-gray-600'} mt-1`}>Real-time water quality monitoring overview</p>
        </div>
        <Button 
          onClick={() => setShowCustomizeDialog(true)}
          className="gradient-bg mt-3 sm:mt-0"
        >
          <Edit3 className="h-4 w-4 mr-2" />
          Customize Dashboard
        </Button>
      </motion.div>

      {orderedSections.map(([key, sectionConfig], sectionIndex) => {
        if (key === 'keyMetrics' && sectionConfig.visible) {
          return (
          <div key={key} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { title: 'Active Devices', value: `${onlineDevicesCount}/${totalDevicesCount}`, change: `${totalDevicesCount > 0 ? Math.round((onlineDevicesCount / totalDevicesCount) * 100) : 0}% online`, Icon: Cpu, color: 'text-green-400', path: '/devices' },
              { title: 'Active Alerts', value: activeAlertsCount, change: 'Require attention', Icon: AlertTriangle, color: 'text-red-400', path: '/alert-rules' }, // Assuming alerts panel is on dashboard, or link to rules
              { title: 'Avg Water Quality', value: `${quality.score}%`, change: `${quality.trend >= 0 ? '+' : ''}${quality.trend}% from last period`, Icon: Droplets, color: quality.trend >=0 ? 'text-green-400' : 'text-red-400', path: '/analytics' },
              { title: 'Data Points Today', value: sensorData.filter(sd => new Date(sd.timestamp) > new Date(Date.now() - 24*60*60*1000)).length.toLocaleString(), change: `${sensorData.length.toLocaleString()} total`, Icon: BarChart3, color: 'text-purple-400', path: '/export-data' }
            ].map((item, i) => (
              <motion.div key={item.title} custom={sectionIndex * 4 + i + 1} initial="hidden" animate="visible" variants={cardVariants}>
                <Card className={`glass-effect ${preferences.theme === 'dark' ? 'border-slate-700' : 'border-gray-200 bg-white'} hover:shadow-lg transition-shadow cursor-pointer`} onClick={() => handleNavigate(item.path)}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className={`text-sm font-medium ${preferences.theme === 'dark' ? 'text-slate-300' : 'text-gray-500'}`}>
                      {item.title}
                    </CardTitle>
                    <item.Icon className={`h-4 w-4 ${item.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{item.value}</div>
                    <p className={`text-xs ${item.color.includes('red') || item.color.includes('green') ? item.color : (preferences.theme === 'dark' ? 'text-slate-400' : 'text-gray-600')}`}>
                      {item.change}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          );
        }
        if (key === 'sensorDataChart' && sectionConfig.visible) {
            return (
            <motion.div key={key} custom={sectionIndex + 1} initial="hidden" animate="visible" variants={cardVariants} className="lg:col-span-2">
              <Card className={`glass-effect ${preferences.theme === 'dark' ? 'border-slate-700' : 'border-gray-200 bg-white'}`}>
                <CardHeader>
                  <CardTitle>Real-time Sensor Data</CardTitle>
                  <CardDescription className={`${preferences.theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                    Live monitoring of key water quality parameters
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[350px] sm:h-[400px]">
                  <SensorChart data={sensorData} theme={preferences.theme || 'dark'} />
                </CardContent>
              </Card>
            </motion.div>
            );
        }
        if (key === 'alertsPanel' && sectionConfig.visible) {
            return (
            <motion.div key={key} custom={sectionIndex + 1} initial="hidden" animate="visible" variants={cardVariants}>
                <AlertsPanel alerts={alerts} />
            </motion.div>
            );
        }
        if (key === 'deviceStatus' && sectionConfig.visible) {
            return (
            <motion.div key={key} custom={sectionIndex + 1} initial="hidden" animate="visible" variants={cardVariants}>
              <Card className={`glass-effect ${preferences.theme === 'dark' ? 'border-slate-700' : 'border-gray-200 bg-white'}`}>
                <CardHeader>
                  <CardTitle>Device Status Overview</CardTitle>
                  <CardDescription className={`${preferences.theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                    Current status and latest readings from monitoring stations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {latestReadingsPerDevice.map(({ device, latestData }, i) => {
                      const contamination = getContaminationDetails(latestData?.contamination_score);
                      return (
                        <motion.div
                          key={device.id}
                          custom={i} initial="hidden" animate="visible" variants={cardVariants}
                          whileHover={{ scale: 1.02 }}
                          className={`p-4 rounded-lg ${preferences.theme === 'dark' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-200'} border cursor-pointer`}
                          onClick={() => handleNavigate(`/devices?deviceId=${device.id}`)}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold truncate" title={device.name}>{device.name}</h3>
                            <div className="flex items-center space-x-2">
                              {device.status === 'online' ? (
                                <Wifi className="h-4 w-4 text-green-400" />
                              ) : (
                                <WifiOff className="h-4 w-4 text-red-400" />
                              )}
                              <Badge 
                                 className={`capitalize text-xs ${device.status === 'online' ? 'bg-green-500/80' : 'bg-red-500/80'} text-white`}
                              >
                                {device.status}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between">
                              <span className={`${preferences.theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Location:</span>
                              <span className="font-medium truncate" title={device.location}>{device.location}</span>
                            </div>
                            
                            {latestData ? (
                              <>
                                <div className="flex justify-between">
                                  <span className={`${preferences.theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>pH:</span>
                                  <span className="font-medium">{latestData.ph?.toFixed(1) || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className={`${preferences.theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Temp:</span>
                                  <span className="font-medium">{latestData.temperature?.toFixed(1) || 'N/A'}°C</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className={`${preferences.theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Contam:</span>
                                  <span className={`${contamination.textColor} font-medium`}>
                                    {contamination.level} ({latestData.contamination_score != null ? latestData.contamination_score.toFixed(0) + '%' : 'N/A'})
                                  </span>
                                </div>
                              </>
                            ) : <p className={`text-xs ${preferences.theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>No recent data</p>}
                            
                            <div className="flex justify-between items-center pt-1">
                              <div className="flex items-center space-x-1">
                                <Battery className={`h-3 w-3 ${preferences.theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`} />
                                <span className={`text-xs ${preferences.theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>{device.battery_level || 'N/A'}%</span>
                              </div>
                              <span className={`text-xs ${preferences.theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
                                {device.last_seen ? formatDistanceToNow(new Date(device.last_seen), { addSuffix: true }) : 'Never'}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                    {latestReadingsPerDevice.length === 0 && <p className={`text-center col-span-full py-4 ${preferences.theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>No devices registered yet.</p>}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            );
        }
         if (key === 'adminOverview' && sectionConfig.visible && user?.role === 'admin') {
            return (
                <motion.div key={key} custom={sectionIndex + 1} initial="hidden" animate="visible" variants={cardVariants}>
                    <Card className={`glass-effect ${preferences.theme === 'dark' ? 'border-slate-700' : 'border-gray-200 bg-white'}`}>
                    <CardHeader>
                        <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-blue-400"/>Admin Overview</CardTitle>
                        <CardDescription className={`${preferences.theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                        Quick stats for administrators.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className={`p-4 rounded-lg ${preferences.theme === 'dark' ? 'bg-slate-800/50' : 'bg-gray-50'} border ${preferences.theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
                        <h4 className={`text-sm font-medium ${preferences.theme === 'dark' ? 'text-slate-300' : 'text-gray-500'}`}>Total Users</h4>
                        <p className="text-xl font-bold">5 (Mock)</p> 
                        <Button size="xs" variant="link" onClick={() => handleNavigate('/user-management')} className="p-0 h-auto text-blue-400">View Users</Button>
                        </div>
                        <div className={`p-4 rounded-lg ${preferences.theme === 'dark' ? 'bg-slate-800/50' : 'bg-gray-50'} border ${preferences.theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
                        <h4 className={`text-sm font-medium ${preferences.theme === 'dark' ? 'text-slate-300' : 'text-gray-500'}`}>Pending Invites</h4>
                        <p className="text-xl font-bold">2 (Mock)</p>
                            <Button size="xs" variant="link" onClick={() => handleNavigate('/organization-invites')} className="p-0 h-auto text-blue-400">Manage Invites</Button>
                        </div>
                        <div className={`p-4 rounded-lg ${preferences.theme === 'dark' ? 'bg-slate-800/50' : 'bg-gray-50'} border ${preferences.theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
                        <h4 className={`text-sm font-medium ${preferences.theme === 'dark' ? 'text-slate-300' : 'text-gray-500'}`}>System Health</h4>
                        <p className="text-xl font-bold text-green-400">Normal</p>
                            <Button size="xs" variant="link" onClick={() => handleNavigate('/system-admin')} className="p-0 h-auto text-blue-400">System Status</Button>
                        </div>
                    </CardContent>
                    </Card>
                </motion.div>
            );
         }
        return null; 
      })}
      

      <Dialog open={showCustomizeDialog} onOpenChange={setShowCustomizeDialog}>
        <DialogContent className="glass-effect border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Customize Dashboard</DialogTitle>
            <DialogDescription>Toggle visibility of dashboard sections. </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {Object.entries(dashboardSections).map(([key, section]) => (
              (user?.role === 'admin' || key !== 'adminOverview') && (
                <div key={key} className="flex items-center justify-between p-2 rounded-md bg-slate-800/50">
                  <Label htmlFor={`toggle-${key}`} className="text-slate-300">{section.name}</Label>
                  <Switch
                    id={`toggle-${key}`}
                    checked={section.visible}
                    onCheckedChange={() => handleToggleSection(key)}
                  />
                </div>
              )
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowCustomizeDialog(false)} className="gradient-bg">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Dashboard;
