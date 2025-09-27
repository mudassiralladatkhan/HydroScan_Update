import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ContaminationTrends = ({ data }) => {
  // Process contamination data
  const contaminationData = data
    .slice(-24)
    .map(item => ({
      time: new Date(item.timestamp).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      contamination: parseFloat(item.contaminationScore.toFixed(1)),
      pH: parseFloat(item.pH.toFixed(2)),
      tds: parseInt(item.tds),
      turbidity: parseFloat(item.turbidity.toFixed(2))
    }));

  // Calculate risk levels
  const riskLevels = contaminationData.reduce((acc, item) => {
    if (item.contamination < 30) acc.low++;
    else if (item.contamination < 70) acc.medium++;
    else acc.high++;
    return acc;
  }, { low: 0, medium: 0, high: 0 });

  const riskData = [
    { name: 'Low Risk', value: riskLevels.low, color: '#10B981' },
    { name: 'Medium Risk', value: riskLevels.medium, color: '#F59E0B' },
    { name: 'High Risk', value: riskLevels.high, color: '#EF4444' }
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{`Time: ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.dataKey}: ${entry.value}${entry.dataKey === 'contamination' ? '%' : ''}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="glass-effect border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Contamination Risk Trends</CardTitle>
          <CardDescription className="text-slate-400">
            AI-powered contamination risk analysis over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={contaminationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="contamination"
                  stroke="#EF4444"
                  fill="url(#contaminationGradient)"
                  strokeWidth={2}
                />
                <defs>
                  <linearGradient id="contaminationGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-effect border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Risk Level Distribution</CardTitle>
          <CardDescription className="text-slate-400">
            Breakdown of contamination risk levels in the last 24 hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="name" 
                  stroke="#9CA3AF"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #475569',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 space-y-2">
            {riskData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-slate-300 text-sm">{item.name}</span>
                </div>
                <span className="text-white font-medium">{item.value} readings</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContaminationTrends;