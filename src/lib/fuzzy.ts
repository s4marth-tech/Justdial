// Small Levenshtein-based typo tolerance for search "did you mean" corrections.
// Used only as a fallback when a literal `contains` match returns nothing —
// cheap edit-distance scoring against a short, known candidate list (category
// names, city names), not a general fuzzy-search engine.

export function levenshteinDistance(a: string, b: string): number {
  const s = a.toLowerCase();
  const t = b.toLowerCase();
  const rows = s.length + 1;
  const cols = t.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      dp[i][j] =
        s[i - 1] === t[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[rows - 1][cols - 1];
}

// Finds the candidate closest to `query`, tolerating a couple of typos on
// longer words while requiring a near-exact match on short ones. Returns
// null when nothing is close enough to be a plausible correction.
export function findClosestMatch(query: string, candidates: string[]): string | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  let best: string | null = null;
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    const distance = levenshteinDistance(trimmed, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }

  const threshold = Math.max(1, Math.floor(trimmed.length / 3));
  return best && bestDistance > 0 && bestDistance <= threshold ? best : null;
}
