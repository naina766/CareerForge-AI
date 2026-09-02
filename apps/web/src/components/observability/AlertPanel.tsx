import React from 'react';
import { AlertTriangle, AlertCircle, Info, Check, ShieldAlert } from 'lucide-react';
import { SystemAlert } from '@careerforge/types';

interface AlertPanelProps {
  alerts: SystemAlert[];
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
}

export const AlertPanel: React.FC<AlertPanelProps> = ({ alerts, onAcknowledge, onResolve }) => {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertCircle className="w-4 h-4 text-rose-400" />;
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white tracking-wide">Active System Alerts</h3>
        </div>
        <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-800 text-slate-300 border border-slate-700">
          {alerts.length} Active
        </span>
      </div>

      {alerts.length === 0 ? (
        <div className="p-6 text-center rounded-xl bg-slate-950/40 border border-slate-800/60">
          <p className="text-xs text-slate-400">All services operational within SLA limits. Zero active alerts.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getSeverityIcon(alert.severity)}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-200">{alert.title}</span>
                    <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-400">
                      {alert.service}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{alert.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {alert.status === 'OPEN' && onAcknowledge && (
                  <button
                    onClick={() => onAcknowledge(alert.id)}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  >
                    Ack
                  </button>
                )}
                {onResolve && (
                  <button
                    onClick={() => onResolve(alert.id)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
