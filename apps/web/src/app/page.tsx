'use client';

import React from 'react';
import { Hero } from '../components/home/Hero';
import { FeatureStrip } from '../components/home/FeatureStrip';
import { HowItWorks } from '../components/home/HowItWorks';
import { JobMatchPreview } from '../components/home/JobMatchPreview';
import { AIMentorPreview } from '../components/home/AIMentorPreview';
import { SkillGapSection } from '../components/home/SkillGapSection';
import { ResumeIntelligence } from '../components/home/ResumeIntelligence';
import { ProductCapabilities } from '../components/home/ProductCapabilities';
import { TechStackStrip } from '../components/home/TechStackStrip';
import { FinalCTA } from '../components/home/FinalCTA';
import { Footer } from '../components/Footer';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#090d16] text-slate-100 selection:bg-teal-500/30 selection:text-teal-200">
      <main className="flex-1">
        {/* 1. Value-First Hero with Interactive Match Preview */}
        <Hero />

        {/* 2. Platform Value Strip */}
        <FeatureStrip />

        {/* 3. 4-Step Intelligent Workflow */}
        <HowItWorks />

        {/* 4. Explainable Multi-Factor Job Matching */}
        <JobMatchPreview />

        {/* 5. Grounded AI Career Mentor */}
        <AIMentorPreview />

        {/* 6. Actionable Skill Gap Discovery & Learning Roadmap */}
        <SkillGapSection />

        {/* 7. Deep Resume Intelligence & ATS Optimization */}
        <ResumeIntelligence />

        {/* 8. Verified Platform Capabilities */}
        <ProductCapabilities />

        {/* 9. Architectural Integrity & Subtle Tech Badges */}
        <TechStackStrip />

        {/* 10. Final Call to Action */}
        <FinalCTA />
      </main>

      {/* 11. SaaS Footer */}
      <Footer />
    </div>
  );
}
