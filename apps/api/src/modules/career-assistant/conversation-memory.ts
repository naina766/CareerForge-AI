export class ConversationMemory {
  /**
   * Builds a concise memory summary from recent conversation messages.
   */
  static summarizeRecentMessages(
    messages: Array<{ role: string; content: string }>
  ): string {
    if (!messages || messages.length === 0) return '';

    const recent = messages.slice(-4);
    return recent
      .map((m) => `${m.role === 'USER' ? 'Candidate' : 'Assistant'}: ${m.content.slice(0, 150)}`)
      .join('\n');
  }
}
