import { LocationMatchDetails } from '@careerforge/types';

export interface LocationMatchInput {
  candidateLocation?: string | null;
  candidatePreferredLocation?: string | null;
  candidateWorkMode?: string | null;
  jobLocation: string;
  jobWorkMode: string;
}

export class LocationMatcher {
  /**
   * Evaluates location, geographic proximity, and work mode preferences.
   * Weight contribution: 5% of overall match score.
   */
  static evaluate(input: LocationMatchInput): LocationMatchDetails {
    const jobWorkMode = (input.jobWorkMode || 'REMOTE').toUpperCase();
    const candidateWorkMode = (input.candidateWorkMode || 'REMOTE').toUpperCase();

    const candLoc = (input.candidateLocation || '').trim().toLowerCase();
    const prefLoc = (input.candidatePreferredLocation || '').trim().toLowerCase();
    const jobLoc = (input.jobLocation || 'Remote').trim().toLowerCase();

    // 1. Remote Job: Candidate location does NOT penalize
    if (jobWorkMode === 'REMOTE') {
      return {
        score: 100,
        candidateLocation: input.candidateLocation || 'Remote',
        jobLocation: input.jobLocation || 'Remote',
        candidateWorkMode: input.candidateWorkMode || 'REMOTE',
        jobWorkMode: 'REMOTE',
        status: 'COMPATIBLE',
      };
    }

    // 2. Hybrid Job
    if (jobWorkMode === 'HYBRID') {
      // If candidate is open to hybrid or has matching location
      const isLocationMatched =
        Boolean(candLoc && jobLoc && (candLoc.includes(jobLoc) || jobLoc.includes(candLoc))) ||
        Boolean(prefLoc && jobLoc && (prefLoc.includes(jobLoc) || jobLoc.includes(prefLoc)));

      if (candidateWorkMode === 'HYBRID' || candidateWorkMode === 'ONSITE' || isLocationMatched) {
        return {
          score: 100,
          candidateLocation: input.candidateLocation || 'Not specified',
          jobLocation: input.jobLocation,
          candidateWorkMode: input.candidateWorkMode || 'HYBRID',
          jobWorkMode: 'HYBRID',
          status: 'COMPATIBLE',
        };
      }

      // Candidate is strictly remote in a different location
      return {
        score: 40,
        candidateLocation: input.candidateLocation || 'Not specified',
        jobLocation: input.jobLocation,
        candidateWorkMode: input.candidateWorkMode || 'REMOTE',
        jobWorkMode: 'HYBRID',
        status: 'PARTIAL',
      };
    }

    // 3. Onsite Job
    const isExactLocationMatched = Boolean(candLoc && jobLoc && (candLoc.includes(jobLoc) || jobLoc.includes(candLoc)));
    const isPreferredMatched = Boolean(prefLoc && jobLoc && (prefLoc.includes(jobLoc) || jobLoc.includes(prefLoc)));

    if (isExactLocationMatched) {
      return {
        score: 100,
        candidateLocation: input.candidateLocation,
        jobLocation: input.jobLocation,
        candidateWorkMode: input.candidateWorkMode || 'ONSITE',
        jobWorkMode: 'ONSITE',
        status: 'COMPATIBLE',
      };
    }

    if (isPreferredMatched) {
      return {
        score: 90,
        candidateLocation: input.candidateLocation,
        jobLocation: input.jobLocation,
        candidateWorkMode: input.candidateWorkMode || 'ONSITE',
        jobWorkMode: 'ONSITE',
        status: 'COMPATIBLE',
      };
    }

    // Onsite location mismatch
    return {
      score: 20,
      candidateLocation: input.candidateLocation || 'Not specified',
      jobLocation: input.jobLocation,
      candidateWorkMode: input.candidateWorkMode || 'REMOTE',
      jobWorkMode: 'ONSITE',
      status: 'MISMATCH',
    };
  }
}
