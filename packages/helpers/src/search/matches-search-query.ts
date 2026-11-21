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
  const matrix: number[] = Array.from({ length: rows * cols }, () => 0);
  // Every index read below lies inside the rows * cols matrix, so the fallback never applies.
  const cell = (row: number, col: number): number => matrix[row * cols + col] ?? 0;

  for (let i = 0; i < rows; i++) {
    matrix[i * cols] = i;
  }
  for (let j = 0; j < cols; j++) {
    matrix[j] = j;
  }

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const deletion = cell(i - 1, j) + 1;
      const insertion = cell(i, j - 1) + 1;
      const substitution = cell(i - 1, j - 1) + cost;
      matrix[i * cols + j] = Math.min(deletion, insertion, substitution);
    }
  }

  return cell(rows - 1, cols - 1);
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

/** A query this short or shorter is "short": it gets the stricter edit distances. */
const SHORT_QUERY_MAX_LENGTH = 5;
/** Prefix lengths compared for typo tolerance, longest first. */
const LONG_PREFIX_LENGTH = 4;
const SHORT_PREFIX_LENGTH = 3;
/** Fuzzy word matching ignores a query or target shorter than this. */
const MIN_FUZZY_LENGTH = 3;
/** Edit distance allowed against a whole word, for a short query and for a longer one. */
const SHORT_QUERY_WORD_DISTANCE = 2;
const LONG_QUERY_WORD_DISTANCE = 3;

function prefixSimilar(query: string, target: string): boolean {
  const maxDistance = query.length <= SHORT_QUERY_MAX_LENGTH ? 1 : 2;

  for (const prefixLen of [LONG_PREFIX_LENGTH, SHORT_PREFIX_LENGTH]) {
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
  if (query.length < MIN_FUZZY_LENGTH || target.length < MIN_FUZZY_LENGTH) {
    return false;
  }

  const words = target.split(/\s+/).filter(Boolean);
  const threshold =
    query.length <= SHORT_QUERY_MAX_LENGTH ? SHORT_QUERY_WORD_DISTANCE : LONG_QUERY_WORD_DISTANCE;

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
