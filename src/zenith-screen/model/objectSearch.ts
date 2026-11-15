/**
 * objectSearch.ts
 *
 * Pure, library-free ranking for the type-ahead sky-object search. Kept separate
 * from the view so the heuristics can be unit-tested without pulling in Scenery.
 *
 * Matching is case- and accent-insensitive. Ranking favours names that start
 * with the query, then word-boundary / substring matches, then the stable id
 * (so typing "cas" finds "Gamma Cas", and "gammaCas" does too).
 */

export type ObjectSearchEntry = {
  /** Stable identifier matching a {@link SelectedSkyObject} id. */
  readonly id: string;
  /** Localized display name. */
  readonly name: string;
};

/**
 * Lowercase and strip combining diacritics for forgiving matching.
 * @internal Exported for unit tests; not part of the application API.
 */
export const normalizeSearchText = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/**
 * Scores a single normalized candidate against a normalized query.
 * Higher is better. Negative means "no match".
 */
const scoreCandidate = (query: string, name: string, id: string): number => {
  if (query.length === 0) {
    return 0;
  }
  const nameIndex = name.indexOf(query);
  if (nameIndex === 0) {
    // Exact prefix — all such names tie at the top and break alphabetically.
    return 1000;
  }
  if (nameIndex > 0) {
    // Substring: still strong, earlier wins. Word-boundary matches beat mid-word.
    const wordBoundary = name[nameIndex - 1] === " ";
    return (wordBoundary ? 600 : 450) - nameIndex * 2;
  }
  if (id.includes(query)) {
    return 150;
  }
  return -1;
};

/**
 * Returns the best `limit` entries for `query`, best first. With an empty query
 * the full set is returned in alphabetical (display-name) order — handy as a
 * browsable list when the field is focused but nothing is typed yet.
 */
export const rankObjects = (
  query: string,
  entries: readonly ObjectSearchEntry[],
  limit: number,
): ObjectSearchEntry[] => {
  const q = normalizeSearchText(query.trim());
  const annotated = entries.map((entry) => ({
    entry,
    name: normalizeSearchText(entry.name),
    id: normalizeSearchText(entry.id),
  }));

  const scored = annotated.map((x) => ({ ...x, score: scoreCandidate(q, x.name, x.id) })).filter((x) => x.score >= 0);

  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return scored.slice(0, Math.max(0, limit)).map((x) => x.entry);
};
