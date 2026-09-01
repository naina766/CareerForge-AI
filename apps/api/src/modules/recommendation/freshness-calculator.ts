export class FreshnessCalculator {
  /**
   * Deterministic time-decay freshness scoring based on job publication age.
   * Total scale: 0 - 100 points.
   *
   * Thresholds:
   *   <= 3 days  -> 100
   *   <= 7 days  -> 90
   *   <= 14 days -> 80
   *   <= 30 days -> 65
   *   <= 60 days -> 40
   *   > 60 days  -> 20
   */
  static calculate(publishedAt: Date | string | null | undefined, createdAt: Date | string): number {
    const jobDate = publishedAt ? new Date(publishedAt) : new Date(createdAt);
    const now = new Date();
    const diffMs = Math.max(0, now.getTime() - jobDate.getTime());
    const ageDays = diffMs / (1000 * 60 * 60 * 24);

    if (ageDays <= 3) return 100;
    if (ageDays <= 7) return 90;
    if (ageDays <= 14) return 80;
    if (ageDays <= 30) return 65;
    if (ageDays <= 60) return 40;
    return 20;
  }
}
