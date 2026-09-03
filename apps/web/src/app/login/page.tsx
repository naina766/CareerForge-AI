'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { Button } from '../../components/ui/Button';
import {
  Sparkles,
  Mail,
  ShieldCheck,
  BrainCircuit,
  Bot,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || 'Unable to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 rounded-3xl border border-slate-800/90 glass-panel overflow-hidden shadow-2xl">
        {/* Left / Hero Side */}
        <div className="lg:col-span-6 bg-gradient-to-br from-slate-900 via-slate-950 to-[#070b12] p-8 sm:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800/80">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Career Intelligence Platform
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Match smarter. <br />
              <span className="bg-gradient-to-r from-teal-300 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
                Apply with confidence.
              </span>
            </h1>

            <p className="text-sm text-slate-400 leading-relaxed">
              Sign in to access your explainable job match reports, candidate-scoped RAG career assistant, and application pipeline.
            </p>

            <div className="space-y-3.5 pt-2">
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <div className="h-6 w-6 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20">
                  <BrainCircuit className="w-3.5 h-3.5" />
                </div>
                <span>Explainable matching across skills, experience, and semantics</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <div className="h-6 w-6 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <span>Grounded AI Career Mentor tailored to your verified trajectory</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <div className="h-6 w-6 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span>Skill gap discovery & actionable learning path roadmaps</span>
              </div>
            </div>
          </div>

          {/* Quick Demo Fill Buttons */}
          <div className="pt-8 border-t border-slate-800/80 mt-8 space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Instant Demo Login:
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setEmail('candidate.alex@careerforge.ai');
                  setPassword('Password123!');
                  setError(null);
                }}
                className="text-xs px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-teal-300 border border-slate-700 transition-colors min-h-[38px] flex items-center"
                aria-label="Fill demo credentials for Candidate Alex Rivera"
              >
                Candidate Demo
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('recruiter.techcorp@careerforge.ai');
                  setPassword('Password123!');
                  setError(null);
                }}
                className="text-xs px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors min-h-[38px] flex items-center"
                aria-label="Fill demo credentials for Recruiter"
              >
                Recruiter Demo
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@careerforge.ai');
                  setPassword('Password123!');
                  setError(null);
                }}
                className="text-xs px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition-colors min-h-[38px] flex items-center"
                aria-label="Fill demo credentials for Administrator"
              >
                Admin Demo
              </button>
            </div>
          </div>
        </div>

        {/* Right / Form Side */}
        <div className="lg:col-span-6 p-6 sm:p-12 flex flex-col justify-center bg-slate-950/70">
          <div className="max-w-md w-full mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Sign in to your account</h2>
              <p className="text-xs text-slate-400 mt-1">Enter your credentials to access your workspace</p>
            </div>

            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="flex items-center gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs animate-shake"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email address"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
                required
                autoComplete="email"
              />

              <PasswordInput
                label="Password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded bg-slate-900 border-slate-800 text-teal-500 focus:ring-teal-500/20"
                  />
                  <span>Keep me signed in</span>
                </label>
                <span className="text-slate-500 cursor-not-allowed">Forgot password?</span>
              </div>

              <Button type="submit" className="w-full" size="md" isLoading={isLoading} rightIcon={<ArrowRight className="w-4 h-4" />}>
                Sign In
              </Button>
            </form>

            <div className="text-center pt-2">
              <p className="text-xs text-slate-400">
                Don't have an account?{' '}
                <Link href="/register" className="font-semibold text-teal-400 hover:text-teal-300 transition-colors">
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
