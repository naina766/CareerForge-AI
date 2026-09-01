/**
 * Normalizes raw skill text into a deterministic, comparable search string.
 * Strips unnecessary punctuation and whitespace while strictly preserving meaningful distinctions
 * like 'C++', 'C#', '.NET', and versioning tokens.
 */
export function normalizeSkillName(input: string): string {
  if (!input) return '';

  return input
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    // Replace dots in common framework prefixes like .net -> dotnet
    .replace(/^\.net\b/g, 'dotnet')
    // Remove dots, slashes, dashes, commas, parentheses
    .replace(/[.\-/,()_]/g, '')
    // Replace multiple spaces with empty string for alias lookup
    .replace(/\s+/g, '');
}

/**
 * Computes Levenshtein edit distance between two normalized strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Computes normalized similarity score (0.0 to 1.0).
 */
export function stringSimilarity(a: string, b: string): number {
  const normA = normalizeSkillName(a);
  const normB = normalizeSkillName(b);

  if (normA === normB) return 1.0;
  if (!normA || !normB) return 0.0;

  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1.0;

  const dist = levenshteinDistance(normA, normB);
  return Math.max(0, 1.0 - dist / maxLen);
}
