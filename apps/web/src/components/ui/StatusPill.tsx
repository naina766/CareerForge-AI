import React from 'react';

export interface StatusPillProps {
  status: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'ai';
  dot?: boolean;
  className?: string;
}

export function StatusPill({
  status,
  variant = 'neutral',
  dot = true,
  className = '',
}: StatusPillProps) {
  const variantStyles = {
    success: {
      pill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      dot: 'bg-emerald-400',
    },
    warning: {
      pill: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      dot: 'bg-amber-400',
    },
    error: {
      pill: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      dot: 'bg-rose-400',
    },
    info: {
      pill: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      dot: 'bg-blue-400',
    },
    ai: {
      pill: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      dot: 'bg-purple-400',
    },
    neutral: {
      pill: 'bg-gray-800/80 text-gray-300 border-gray-700',
      dot: 'bg-gray-400',
    },
  };

  const current = variantStyles[variant] || variantStyles.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${current.pill} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${current.dot}`} />}
      <span className="capitalize">{status.replace(/_/g, ' ').toLowerCase()}</span>
    </span>
  );
}
