import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const RealTimeSensorView_Fixed = () => {
  const [readings, setReadings] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInitialReadings = async () => {
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching initial data:', error);
        setError('Failed to fetch initial sensor data.');
      } else {
        setReadings(data.reverse());
      }
    };

    fetchInitialReadings();

    const subscription = supabase
      .channel('sensor_readings')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_readings' }, (payload) => {
        setReadings((currentReadings) => [...currentReadings, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  if (error) {
    return <div className="text-red-500 text-center p-4">{error}</div>;
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6">Real-Time Sensor View</h1>
      <Card>
        <CardHeader>
          <CardTitle>Live Sensor Readings</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={readings}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" tickFormatter={(time) => new Date(time).toLocaleTimeString()} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="ph" stroke="#8884d8" name="pH" />
              <Line type="monotone" dataKey="turbidity" stroke="#82ca9d" name="Turbidity" />
              <Line type="monotone" dataKey="tds" stroke="#ffc658" name="TDS" />
              <Line type="monotone" dataKey="temperature" stroke="#ff7300" name="Temperature" />
              <Line type="monotone" dataKey="contamination_score" stroke="#e60000" name="AI Score" yAxisId="right" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealTimeSensorView_Fixed;
