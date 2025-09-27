import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

const DevicePerformance = ({ devices, sensorData }) => {
  const deviceMetrics = devices.map(device => {
    const deviceReadings = sensorData.filter(d => d.deviceId === device.id);
    const totalReadings = deviceReadings.length;
    // Assuming readings are every hour for 24 hours for uptime calc
    const expectedReadingsLast24h = 24; 
    const readingsLast24h = deviceReadings.filter(
      r => new Date(r.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length;
    
    const uptimePercentage = totalReadings > 0 
      ? Math.min((readingsLast24h / expectedReadingsLast24h) * 100, 100) 
      : 0;

    return {
      name: device.name,
      uptime: uptimePercentage,
      dataPoints: totalReadings, // Total historical data points for this device
      batteryLevel: device.batteryLevel || 0,
      wifiSignal: device.wifi_signal_strength || -100, // Assuming dBm, -100 is very weak
      status: device.status,
      lastSeen: device.last_seen ? formatDistanceToNow(new Date(device.last_seen), { addSuffix: true }) : 'Never',
      firmware: device.firmware_version || 'N/A'
    };
  });

  const statusData = Object.entries(
    devices.reduce((acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const statusColors = {
    online: '#10B981', // green
    offline: '#EF4444', // red
    maintenance: '#F59E0B', // yellow/orange
    error: '#DC2626' // darker red
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color || entry.fill }} className="text-sm capitalize">
              {`${entry.name.replace('_', ' ')}: ${entry.value}${entry.name === 'uptime' ? '%' : entry.name === 'batteryLevel' ? '%' : entry.name === 'wifiSignal' ? ' dBm' : ''}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const RADIAN = Math.PI / 180;
  const renderCustomizedPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent * 100 < 5) return null; // Hide label if too small

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={10}
        fontWeight="bold"
      >
        {`${name} (${(percent * 100).toFixed(0)}%)`}
      </text>
    );
  };


  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-effect border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Device Health Overview</CardTitle>
            <CardDescription className="text-slate-400">
              Uptime, battery, and WiFi signal strength
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deviceMetrics} margin={{ top: 5, right: 0, left: -25, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#9CA3AF"
                    fontSize={10}
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis yAxisId="left" orientation="left" stroke="#9CA3AF" fontSize={10} />
                  <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" fontSize={10} domain={[-100, 0]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}/>
                  <Bar yAxisId="left" dataKey="uptime" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Uptime (%)" />
                  <Bar yAxisId="left" dataKey="batteryLevel" fill="#10B981" radius={[4, 4, 0, 0]} name="Battery (%)" />
                  <Bar yAxisId="right" dataKey="wifiSignal" fill="#A855F7" radius={[4, 4, 0, 0]} name="WiFi (dBm)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Device Status Distribution</CardTitle>
            <CardDescription className="text-slate-400">
              Current operational status of all devices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedPieLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={statusColors[entry.name.toLowerCase()] || '#8884d8'} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                   <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-effect border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Device Performance Summary</CardTitle>
          <CardDescription className="text-slate-400">
            Detailed metrics for each monitoring device
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="p-2 text-left text-slate-400">Name</th>
                  <th className="p-2 text-left text-slate-400">Status</th>
                  <th className="p-2 text-right text-slate-400">Uptime</th>
                  <th className="p-2 text-right text-slate-400">Battery</th>
                  <th className="p-2 text-right text-slate-400">WiFi</th>
                  <th className="p-2 text-right text-slate-400">Data Points</th>
                  <th className="p-2 text-left text-slate-400">Last Seen</th>
                  <th className="p-2 text-left text-slate-400">Firmware</th>
                </tr>
              </thead>
              <tbody>
                {deviceMetrics.map((device, index) => (
                  <tr key={index} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="p-2 text-white font-medium">{device.name}</td>
                    <td className="p-2">
                      <Badge className={`capitalize text-xs ${statusColors[device.status.toLowerCase()] || 'bg-gray-500'} text-white`}>{device.status}</Badge>
                    </td>
                    <td className={`p-2 text-right font-semibold ${device.uptime > 95 ? 'text-green-400' : device.uptime > 80 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {device.uptime.toFixed(1)}%
                    </td>
                    <td className={`p-2 text-right font-semibold ${device.batteryLevel > 60 ? 'text-green-400' : device.batteryLevel > 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {device.batteryLevel}%
                    </td>
                    <td className={`p-2 text-right font-semibold ${device.wifiSignal > -67 ? 'text-green-400' : device.wifiSignal > -80 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {device.wifiSignal} dBm
                    </td>
                    <td className="p-2 text-right text-white">{device.dataPoints}</td>
                    <td className="p-2 text-slate-400">{device.lastSeen}</td>
                    <td className="p-2 text-slate-400">{device.firmware}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
           {deviceMetrics.length === 0 && <p className="text-center text-slate-400 py-4">No device data to display.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default DevicePerformance;