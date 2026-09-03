import React from 'react';

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'card' | 'circle' | 'button';
}

export function Skeleton({ className = '', variant = 'text' }: SkeletonProps) {
  const variantStyles = {
    text: 'h-4 rounded',
    card: 'h-32 rounded-xl',
    circle: 'h-10 w-10 rounded-full',
    button: 'h-9 w-24 rounded-lg',
  };

  return (
    <div
      className={`skeleton-shimmer border border-gray-800/40 ${variantStyles[variant]} ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonCardGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 rounded-xl border border-gray-800 bg-[#111827] space-y-3">
          <Skeleton className="w-1/3 h-4" />
          <Skeleton className="w-2/3 h-6" />
          <Skeleton className="w-full h-12" />
        </div>
      ))}
    </div>
  );
}
