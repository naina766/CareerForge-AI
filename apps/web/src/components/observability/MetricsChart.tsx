import React from 'react';
import { BarChart3 } from 'lucide-react';

interface MetricsChartProps {
  title: string;
  data: { label: string; value: number }[];
  unit?: string;
}

export const MetricsChart: React.FC<MetricsChartProps> = ({ title, data, unit = 'ms' }) => {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-indigo-400" />
        <h3 className="text-sm font-semibold text-white tracking-wide">{title}</h3>
      </div>

      <div className="space-y-3">
        {data.map((item, index) => {
          const percentage = Math.min(100, Math.round((item.value / maxValue) * 100));
          return (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-400">{item.label}</span>
                <span className="font-mono text-slate-200">
                  {item.value} {unit}
                </span>
              </div>
              <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
