import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const SensorChart = ({ data }) => {
  // Process data for the last 24 hours
  const processedData = data
    .slice(-24)
    .map(item => ({
      time: new Date(item.timestamp).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      pH: parseFloat(item.pH.toFixed(2)),
      temperature: parseFloat(item.temperature.toFixed(1)),
      tds: parseInt(item.tds),
      turbidity: parseFloat(item.turbidity.toFixed(2)),
      contamination: parseFloat(item.contaminationScore.toFixed(1))
    }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{`Time: ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.dataKey}: ${entry.value}${
                entry.dataKey === 'temperature' ? '°C' : 
                entry.dataKey === 'tds' ? ' ppm' : 
                entry.dataKey === 'turbidity' ? ' NTU' :
                entry.dataKey === 'contamination' ? '%' : ''
              }`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={processedData}>
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
          <Legend />
          <Line 
            type="monotone" 
            dataKey="pH" 
            stroke="#3B82F6" 
            strokeWidth={2}
            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 3 }}
            name="pH Level"
          />
          <Line 
            type="monotone" 
            dataKey="temperature" 
            stroke="#F59E0B" 
            strokeWidth={2}
            dot={{ fill: '#F59E0B', strokeWidth: 2, r: 3 }}
            name="Temperature (°C)"
          />
          <Line 
            type="monotone" 
            dataKey="tds" 
            stroke="#8B5CF6" 
            strokeWidth={2}
            dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 3 }}
            name="TDS (ppm)"
          />
          <Line 
            type="monotone" 
            dataKey="contamination" 
            stroke="#EF4444" 
            strokeWidth={2}
            dot={{ fill: '#EF4444', strokeWidth: 2, r: 3 }}
            name="Contamination (%)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SensorChart;