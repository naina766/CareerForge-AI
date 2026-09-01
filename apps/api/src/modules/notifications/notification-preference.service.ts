import { prisma } from '@careerforge/database';
import { NotificationPreference, NotificationPreferenceUpdate } from '@careerforge/types';

export class NotificationPreferenceService {
  /**
   * Retrieves or creates default notification preferences for a candidate.
   */
  static async getPreferences(candidateId: string): Promise<NotificationPreference> {
    let pref = await prisma.notificationPreference.findUnique({
      where: { candidateId },
    });

    if (!pref) {
      pref = await prisma.notificationPreference.create({
        data: {
          candidateId,
          matchNotifications: true,
          skillGapNotifications: true,
          learningNotifications: true,
          applicationNotifications: true,
          recommendationNotifications: true,
          emailNotifications: false,
          inAppNotifications: true,
        },
      });
    }

    return {
      id: pref.id,
      candidateId: pref.candidateId,
      matchNotifications: pref.matchNotifications,
      skillGapNotifications: pref.skillGapNotifications,
      learningNotifications: pref.learningNotifications,
      applicationNotifications: pref.applicationNotifications,
      recommendationNotifications: pref.recommendationNotifications,
      emailNotifications: pref.emailNotifications,
      inAppNotifications: pref.inAppNotifications,
      createdAt: pref.createdAt.toISOString(),
      updatedAt: pref.updatedAt.toISOString(),
    };
  }

  /**
   * Updates notification preferences for a candidate.
   */
  static async updatePreferences(
    candidateId: string,
    updates: NotificationPreferenceUpdate
  ): Promise<NotificationPreference> {
    const updated = await prisma.notificationPreference.upsert({
      where: { candidateId },
      create: {
        candidateId,
        matchNotifications: updates.matchNotifications ?? true,
        skillGapNotifications: updates.skillGapNotifications ?? true,
        learningNotifications: updates.learningNotifications ?? true,
        applicationNotifications: updates.applicationNotifications ?? true,
        recommendationNotifications: updates.recommendationNotifications ?? true,
        emailNotifications: updates.emailNotifications ?? false,
        inAppNotifications: updates.inAppNotifications ?? true,
      },
      update: {
        ...(updates.matchNotifications !== undefined && { matchNotifications: updates.matchNotifications }),
        ...(updates.skillGapNotifications !== undefined && { skillGapNotifications: updates.skillGapNotifications }),
        ...(updates.learningNotifications !== undefined && { learningNotifications: updates.learningNotifications }),
        ...(updates.applicationNotifications !== undefined && { applicationNotifications: updates.applicationNotifications }),
        ...(updates.recommendationNotifications !== undefined && { recommendationNotifications: updates.recommendationNotifications }),
        ...(updates.emailNotifications !== undefined && { emailNotifications: updates.emailNotifications }),
        ...(updates.inAppNotifications !== undefined && { inAppNotifications: updates.inAppNotifications }),
      },
    });

    return {
      id: updated.id,
      candidateId: updated.candidateId,
      matchNotifications: updated.matchNotifications,
      skillGapNotifications: updated.skillGapNotifications,
      learningNotifications: updated.learningNotifications,
      applicationNotifications: updated.applicationNotifications,
      recommendationNotifications: updated.recommendationNotifications,
      emailNotifications: updated.emailNotifications,
      inAppNotifications: updated.inAppNotifications,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
