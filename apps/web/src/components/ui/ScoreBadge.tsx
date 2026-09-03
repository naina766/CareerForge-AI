import React from 'react';

export interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function ScoreBadge({
  score,
  size = 'md',
  showLabel = true,
  className = '',
}: ScoreBadgeProps) {
  const rounded = Math.round(score);

  let variantClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  let label = 'Strong match';

  if (rounded < 60) {
    variantClass = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    label = 'Low match';
  } else if (rounded < 75) {
    variantClass = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    label = 'Moderate';
  } else if (rounded < 90) {
    variantClass = 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
    label = 'Good match';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
    lg: 'text-sm px-3 py-1.5 gap-2 font-bold',
  };

  return (
    <span
      className={`inline-flex items-center rounded-lg border ${variantClass} ${sizeClasses[size]} ${className}`}
    >
      <span className="font-mono">{rounded}%</span>
      {showLabel && <span className="opacity-90 font-normal">{label}</span>}
    </span>
  );
}
