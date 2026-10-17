function levenshtein(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  if (a.length === 0) {
    return b.length;
  }
  if (b.length === 0) {
    return a.length;
  }

  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[] = new Array(rows * cols);

  for (let i = 0; i < rows; i++) {
    matrix[i * cols] = i;
  }
  for (let j = 0; j < cols; j++) {
    matrix[j] = j;
  }

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const deletion = matrix[(i - 1) * cols + j] + 1;
      const insertion = matrix[i * cols + (j - 1)] + 1;
      const substitution = matrix[(i - 1) * cols + (j - 1)] + cost;
      matrix[i * cols + j] = Math.min(deletion, insertion, substitution);
    }
  }

  return matrix[(rows - 1) * cols + (cols - 1)];
}

export function normalizeSearchText(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

function matchesSubsequence(query: string, target: string): boolean {
  let queryIndex = 0;
  for (const char of target) {
    if (char === query[queryIndex]) {
      queryIndex += 1;
      if (queryIndex === query.length) {
        return true;
      }
    }
  }

  return false;
}

function prefixSimilar(query: string, target: string): boolean {
  const maxDistance = query.length <= 5 ? 1 : 2;

  for (const prefixLen of [4, 3]) {
    if (prefixLen > query.length || prefixLen > target.length) {
      continue;
    }

    if (levenshtein(query.slice(0, prefixLen), target.slice(0, prefixLen)) <= maxDistance) {
      return true;
    }
  }

  return false;
}

function matchesFuzzyWord(query: string, target: string): boolean {
  if (query.length < 3 || target.length < 3) {
    return false;
  }

  const words = target.split(/\s+/).filter(Boolean);
  const threshold = query.length <= 5 ? 2 : 3;

  for (const word of words) {
    if (levenshtein(query, word) <= threshold) {
      return true;
    }

    if (prefixSimilar(query, word)) {
      return true;
    }
  }

  if (prefixSimilar(query, target)) {
    return true;
  }

  if (target.length >= query.length && levenshtein(query, target) <= threshold) {
    return true;
  }

  return false;
}

/**
 * Keyword search: substring, ordered subsequence, and light typo tolerance (no extra deps).
 */
export function matchesSearchQuery(query: string, ...targets: string[]): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return true;
  }

  for (const target of targets) {
    const normalizedTarget = normalizeSearchText(target);
    if (!normalizedTarget) {
      continue;
    }

    if (normalizedTarget.includes(normalizedQuery)) {
      return true;
    }

    if (matchesSubsequence(normalizedQuery, normalizedTarget)) {
      return true;
    }

    if (matchesFuzzyWord(normalizedQuery, normalizedTarget)) {
      return true;
    }
  }

  return false;
}

export function filterBySearchQuery<T>(
  items: readonly T[],
  query: string,
  getSearchTexts: (item: T) => string[],
): T[] {
  if (!normalizeSearchText(query)) {
    return [...items];
  }

  return items.filter((item) => matchesSearchQuery(query, ...getSearchTexts(item)));
}
