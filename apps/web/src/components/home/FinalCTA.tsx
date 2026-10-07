'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Briefcase } from 'lucide-react';
import { Button } from '../ui/Button';

export function FinalCTA() {
  return (
    <section className="py-20 border-t border-slate-800 bg-[#090d16]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Your next opportunity begins with knowing where you stand.
        </h2>

        <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
          Create a verified profile, benchmark your skills against market standards, and take control of your engineering career trajectory.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/register" className="w-full sm:w-auto">
            <Button
              size="lg"
              variant="primary"
              className="w-full sm:w-auto"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Create Career Profile
            </Button>
          </Link>

          <Link href="/jobs" className="w-full sm:w-auto">
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto text-slate-200"
              leftIcon={<Briefcase className="w-4 h-4 text-blue-400" />}
            >
              Explore Open Roles
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
