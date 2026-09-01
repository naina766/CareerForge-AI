import { CareerPreference, WorkMode, EmploymentType } from '@prisma/client';


export class PreferenceMatcher {
  /**
   * Evaluates candidate's career preferences against a job posting.
   * Total scale: 0 - 100 points.
   *
   * Sub-signals:
   * 1. Work Mode Compatibility (35%): Matches candidate preferred work modes. Remote jobs never penalized.
   * 2. Location & Relocation Compatibility (35%): Matches location, remote, or willingness to relocate.
   * 3. Employment Type Compatibility (15%): Full-time, Part-time, Contract, etc.
   * 4. Compensation Compatibility (15%): Meets candidate minimum salary expectation if specified.
   *
   * Note: Missing/unspecified preferences are NOT penalized and receive full credit.
   */
  static evaluate(
    preference: CareerPreference | null | undefined,
    job: {
      location: string;
      workMode: WorkMode;
      employmentType: EmploymentType;
      salaryMin?: number | null;
      salaryMax?: number | null;
    }
  ): number {
    if (!preference) {
      return 100; // Unspecified preferences receive full credit without artificial penalty
    }

    let workModePoints = 35;
    let locationPoints = 35;
    let employmentPoints = 15;
    let salaryPoints = 15;

    // 1. Work Mode (35 pts)
    const preferredWorkModes = preference.preferredWorkModes || [];
    if (preferredWorkModes.length > 0) {
      if (preferredWorkModes.includes(job.workMode)) {
        workModePoints = 35;
      } else if (job.workMode === 'REMOTE') {
        workModePoints = 30; // Highly compatible flexibility, but slight difference if candidate specifically sought onsite/hybrid
      } else if (job.workMode === 'HYBRID' && preferredWorkModes.includes('REMOTE')) {
        workModePoints = 20; // Partial compatibility for hybrid if remote preferred
      } else {
        workModePoints = 10;
      }
    }

    // 2. Location & Relocation (35 pts)
    const preferredLocations = (preference.preferredLocations || []).map((l) => l.toLowerCase().trim());
    const jobLoc = (job.location || '').toLowerCase().trim();

    if (preferredLocations.length > 0) {
      if (job.workMode === 'REMOTE') {
        locationPoints = 35; // Location constraint waived for remote
      } else if (preferredLocations.some((loc) => jobLoc.includes(loc) || loc.includes(jobLoc))) {
        locationPoints = 35;
      } else if (preference.willingToRelocate) {
        locationPoints = 30; // Candidate willing to relocate
      } else {
        locationPoints = 5; // Onsite/Hybrid in non-preferred location without relocation
      }
    }

    // 3. Employment Type (15 pts)
    const preferredEmploymentTypes = preference.preferredEmploymentTypes || [];
    if (preferredEmploymentTypes.length > 0) {
      if (preferredEmploymentTypes.includes(job.employmentType)) {
        employmentPoints = 15;
      } else {
        employmentPoints = 5;
      }
    }

    // 4. Compensation (15 pts)
    if (preference.minimumSalary && preference.minimumSalary > 0) {
      const minSal = preference.minimumSalary;
      if (job.salaryMax && job.salaryMax >= minSal) {
        salaryPoints = 15;
      } else if (job.salaryMin && job.salaryMin >= minSal) {
        salaryPoints = 15;
      } else if (job.salaryMax && job.salaryMax < minSal) {
        // Below candidate minimum
        const ratio = job.salaryMax / minSal;
        salaryPoints = Math.max(0, Math.round(ratio * 15));
      } else {
        // Job did not post salary range - neutral full credit
        salaryPoints = 15;
      }
    }

    const total = workModePoints + locationPoints + employmentPoints + salaryPoints;
    return Math.min(100, Math.max(0, Math.round(total * 100) / 100));
  }
}
