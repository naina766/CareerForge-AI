'use client';

import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-slate-300">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full rounded-xl bg-slate-900/80 border ${
              error ? 'border-rose-500/70 focus:border-rose-500 focus:ring-rose-500/20' : 'border-slate-800 focus:border-teal-500 focus:ring-teal-500/20'
            } ${
              icon ? 'pl-10' : 'pl-3.5'
            } pr-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-all duration-200 focus:ring-4 ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-xs font-medium text-rose-400 mt-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
