'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { Button } from '../../components/ui/Button';
import {
  Compass,
  Mail,
  User,
  Briefcase,
  UserCheck,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [role, setRole] = useState<'CANDIDATE' | 'RECRUITER'>('CANDIDATE');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await register(email, password, role, name);
      if (role === 'CANDIDATE') {
        router.push('/onboarding');
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main id="main-content" className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 rounded-3xl border border-slate-800/90 glass-panel overflow-hidden shadow-2xl">
        {/* Left Hero / Persona Pitch */}
        <div className="lg:col-span-5 bg-[#0d121f] p-8 sm:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold">
              <Compass className="w-3.5 h-3.5" aria-hidden="true" />
              Get Started with CareerForge
            </div>

            <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
              Create your <br />
              <span className="text-blue-400">
                career profile
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Structure your verified experience, benchmark capability gaps against live engineering roles, and access transparent job matches.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>Explainable skill alignment and prioritized gap breakdown</span>
              </div>
              <div className="flex items-start gap-3 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>Structured 4-phase engineering learning roadmaps</span>
              </div>
              <div className="flex items-start gap-3 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>Grounded career mentor referencing your actual resume chunks</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800/80">
            <p className="text-xs text-slate-500">
              By registering, you agree to our Terms of Service & Privacy Policy.
            </p>
          </div>
        </div>

        {/* Right Form Area */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-center bg-slate-950/70">
          <div className="max-w-lg w-full mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Create your account</h2>
              <p className="text-xs text-slate-400 mt-1">Select your account type and enter your details</p>
            </div>

            {error && (
              <div role="alert" aria-live="assertive" className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {/* Persona / Role Selection Cards */}
            <div className="space-y-2" role="radiogroup" aria-labelledby="role-selection-label">
              <span id="role-selection-label" className="block text-xs font-semibold text-slate-300">Account Type</span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  role="radio"
                  aria-checked={role === 'CANDIDATE'}
                  onClick={() => setRole('CANDIDATE')}
                  className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between ${
                    role === 'CANDIDATE'
                      ? 'border-blue-500/80 bg-blue-500/10 shadow-md shadow-blue-500/10 ring-1 ring-blue-500/40'
                      : 'border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <User className={`w-4 h-4 ${role === 'CANDIDATE' ? 'text-blue-400' : 'text-slate-500'}`} aria-hidden="true" />
                    {role === 'CANDIDATE' && <div className="h-2 w-2 rounded-full bg-blue-400" aria-hidden="true" />}
                  </div>
                  <div className="mt-2">
                    <span className={`text-sm font-semibold block ${role === 'CANDIDATE' ? 'text-white' : 'text-slate-300'}`}>
                      Candidate
                    </span>
                    <span className="text-[11px] text-slate-400">Find & match better roles</span>
                  </div>
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={role === 'RECRUITER'}
                  onClick={() => setRole('RECRUITER')}
                  className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between ${
                    role === 'RECRUITER'
                      ? 'border-cyan-500/80 bg-cyan-500/10 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/40'
                      : 'border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Briefcase className={`w-4 h-4 ${role === 'RECRUITER' ? 'text-cyan-400' : 'text-slate-500'}`} aria-hidden="true" />
                    {role === 'RECRUITER' && <div className="h-2 w-2 rounded-full bg-cyan-400" aria-hidden="true" />}
                  </div>
                  <div className="mt-2">
                    <span className={`text-sm font-semibold block ${role === 'RECRUITER' ? 'text-white' : 'text-slate-300'}`}>
                      Recruiter
                    </span>
                    <span className="text-[11px] text-slate-400">Source & rank top talent</span>
                  </div>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <Input
                id="register-name"
                name="name"
                label="Full Name (Optional)"
                placeholder="e.g. Alex Rivera"
                value={name}
                onChange={(e) => setName(e.target.value)}
                icon={<UserCheck className="w-4 h-4" aria-hidden="true" />}
                autoComplete="name"
              />

              <Input
                id="register-email"
                name="email"
                label="Email address"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" aria-hidden="true" />}
                required
                autoComplete="email"
              />

              <PasswordInput
                id="register-password"
                name="password"
                label="Password (min 8 characters)"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                showStrength
                required
                autoComplete="new-password"
              />

              <PasswordInput
                id="register-confirm-password"
                name="confirmPassword"
                label="Confirm Password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />

              <Button type="submit" className="w-full mt-2" size="md" isLoading={isLoading} rightIcon={<ArrowRight className="w-4 h-4" aria-hidden="true" />}>
                Create {role === 'CANDIDATE' ? 'Candidate' : 'Recruiter'} Account
              </Button>
            </form>

            <div className="text-center pt-1">
              <p className="text-xs text-slate-400">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                  Sign in instead
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
