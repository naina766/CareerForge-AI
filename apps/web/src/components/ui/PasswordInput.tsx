'use client';

import React, { useState, forwardRef } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  showStrength?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label = 'Password', error, showStrength = false, className = '', id, value, onChange, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [internalValue, setInternalValue] = useState('');
    const inputId = id || 'password-input';

    const currentValue = typeof value === 'string' ? value : internalValue;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInternalValue(e.target.value);
      if (onChange) onChange(e);
    };

    // Calculate password strength score 0-4
    const getStrength = (pass: string) => {
      let score = 0;
      if (pass.length >= 8) score++;
      if (/[A-Z]/.test(pass)) score++;
      if (/[0-9]/.test(pass)) score++;
      if (/[^A-Za-z0-9]/.test(pass)) score++;
      return score;
    };

    const strength = getStrength(currentValue);
    const strengthLabels = ['Too weak', 'Weak', 'Fair', 'Strong', 'Excellent'];
    const strengthColors = ['bg-rose-500', 'bg-rose-400', 'bg-amber-400', 'bg-teal-400', 'bg-emerald-400'];

    return (
      <div className="w-full space-y-1.5">
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-300">
          {label}
        </label>
        <div className="relative flex items-center">
          <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
            <Lock className="w-4 h-4" />
          </div>
          <input
            id={inputId}
            ref={ref}
            type={showPassword ? 'text' : 'password'}
            value={value}
            onChange={handleChange}
            className={`w-full rounded-xl bg-slate-900/80 border ${
              error ? 'border-rose-500/70 focus:border-rose-500 focus:ring-rose-500/20' : 'border-slate-800 focus:border-teal-500 focus:ring-teal-500/20'
            } pl-10 pr-10 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-all duration-200 focus:ring-4 ${className}`}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 text-slate-400 hover:text-slate-200 transition-colors p-1"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {showStrength && currentValue.length > 0 && (
          <div className="space-y-1 pt-1">
            <div className="flex gap-1 h-1 w-full">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`h-full flex-1 rounded-full transition-all duration-300 ${
                    idx < strength ? strengthColors[strength] : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              Strength: <span className="font-medium text-slate-300">{strengthLabels[strength]}</span>
            </p>
          </div>
        )}

        {error && <p className="text-xs font-medium text-rose-400 mt-1">{error}</p>}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
