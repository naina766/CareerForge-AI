'use client';

import React from 'react';
import { Hero } from '../components/home/Hero';
import { JobMatchPreview } from '../components/home/JobMatchPreview';
import { SkillGapSection } from '../components/home/SkillGapSection';
import { ResumeIntelligence } from '../components/home/ResumeIntelligence';
import { AIMentorPreview } from '../components/home/AIMentorPreview';
import { TechStackStrip } from '../components/home/TechStackStrip';
import { FinalCTA } from '../components/home/FinalCTA';
import { Footer } from '../components/Footer';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#090d16] text-slate-100 selection:bg-blue-600/30 selection:text-blue-200">
      <main id="main-content" className="flex-1">
        {/* 1. Signature Hero with Interactive Career Map Workspace */}
        <Hero />

        {/* 2. Deterministic & Explainable Multi-Factor Job Matching */}
        <JobMatchPreview />

        {/* 3. Skill Dependency Graph & 4-Phase Learning Roadmap */}
        <SkillGapSection />

        {/* 4. Document-Grade Resume Intelligence & Structural Audit */}
        <ResumeIntelligence />

        {/* 5. Grounded Career Mentor with Active Profile Context & Citations */}
        <AIMentorPreview />

        {/* 6. Production Microservices Architecture & Data Foundation */}
        <TechStackStrip />

        {/* 7. Actionable Platform CTA */}
        <FinalCTA />
      </main>

      {/* 8. Professional SaaS Footer */}
      <Footer />
    </div>
  );
}
