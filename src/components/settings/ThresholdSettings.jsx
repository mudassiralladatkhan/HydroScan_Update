import React from 'react';
import { Database } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ThresholdSettings = ({ settings, onChange }) => {
  return (
    <Card className="glass-effect border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Database className="h-5 w-5 mr-2" />
          Alert Thresholds
        </CardTitle>
        <CardDescription className="text-slate-400">
          Set custom thresholds for water quality parameters
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">pH Levels</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-200">Minimum pH</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={settings.pH.min}
                  onChange={(e) => onChange('pH', 'min', e.target.value)}
                  className="bg-slate-800/50 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-200">Maximum pH</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={settings.pH.max}
                  onChange={(e) => onChange('pH', 'max', e.target.value)}
                  className="bg-slate-800/50 border-slate-600 text-white"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Temperature (°C)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-200">Minimum Temp</Label>
                <Input
                  type="number"
                  value={settings.temperature.min}
                  onChange={(e) => onChange('temperature', 'min', e.target.value)}
                  className="bg-slate-800/50 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-200">Maximum Temp</Label>
                <Input
                  type="number"
                  value={settings.temperature.max}
                  onChange={(e) => onChange('temperature', 'max', e.target.value)}
                  className="bg-slate-800/50 border-slate-600 text-white"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">TDS (ppm)</h3>
            <div className="space-y-2">
              <Label className="text-slate-200">Maximum TDS</Label>
              <Input
                type="number"
                value={settings.tds.max}
                onChange={(e) => onChange('tds', 'max', e.target.value)}
                className="bg-slate-800/50 border-slate-600 text-white"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Turbidity (NTU)</h3>
            <div className="space-y-2">
              <Label className="text-slate-200">Maximum Turbidity</Label>
              <Input
                type="number"
                step="0.1"
                value={settings.turbidity.max}
                onChange={(e) => onChange('turbidity', 'max', e.target.value)}
                className="bg-slate-800/50 border-slate-600 text-white"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ThresholdSettings;