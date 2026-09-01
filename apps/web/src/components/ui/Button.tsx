'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const sizeStyles = {
    sm: 'text-xs px-3 py-2 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-6 py-3.5 gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-semibold shadow-lg shadow-teal-500/20 hover:from-teal-400 hover:to-cyan-400 focus:ring-teal-500/30 border border-teal-400/30',
    secondary:
      'bg-slate-800 text-slate-100 hover:bg-slate-700 focus:ring-slate-700/30 border border-slate-700',
    outline:
      'bg-transparent text-slate-200 hover:bg-slate-800/60 border border-slate-700/80 focus:ring-slate-700/30',
    ghost:
      'bg-transparent text-slate-300 hover:bg-slate-800/40 hover:text-white focus:ring-slate-700/20',
    danger:
      'bg-rose-600 text-white hover:bg-rose-500 focus:ring-rose-500/30 font-semibold',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-current" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </button>
  );
}
