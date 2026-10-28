import { CanonicalRecord } from '../types/database';

/**
 * Checks if a record has a substantial, study-ready abstract text.
 */
export const hasSubstantialAbstract = (record: CanonicalRecord): boolean => {
  if (!record.abstract) return false;
  const cleaned = record.abstract.trim().toLowerCase();
  if (cleaned.length < 60) return false;
  if (
    cleaned.startsWith('no abstract') ||
    cleaned.startsWith('abstract not available') ||
    cleaned.startsWith('no abstract available') ||
    cleaned.startsWith('abstract unavailable') ||
    cleaned === 'n/a'
  ) {
    return false;
  }
  return true;
};

/**
 * Multi-tier priority score for sorting articles during screening:
 * Tier 0 (Highest): PubMed / Europe PMC article WITH a substantial abstract
 * Tier 1: PubMed / Europe PMC article WITHOUT abstract
 * Tier 2: Other database article WITH a substantial abstract
 * Tier 3: Other database article WITHOUT abstract
 */
export const getRecordPriorityScore = (record: CanonicalRecord): number => {
  const db = record.source_db?.toLowerCase();
  const isPubMedOrEuropePmc = db === 'pubmed' || db === 'europe_pmc' || Boolean(record.pmid);
  const hasAbstract = hasSubstantialAbstract(record);

  if (isPubMedOrEuropePmc && hasAbstract) {
    return 0; // Tier 0: PubMed / Europe PMC + Proper Abstract
  }
  if (isPubMedOrEuropePmc && !hasAbstract) {
    return 1; // Tier 1: PubMed / Europe PMC (no abstract)
  }
  if (!isPubMedOrEuropePmc && hasAbstract) {
    return 2; // Tier 2: Other database + Proper Abstract
  }
  return 3; // Tier 3: Other database without abstract
};

/**
 * Legacy alias for backwards compatibility
 */
export const getSourcePriority = (record: CanonicalRecord): number => {
  return getRecordPriorityScore(record);
};

/**
 * Sorts canonical records prioritizing PubMed & Europe PMC articles and papers with complete abstract text.
 * Secondary sorting maintains publication year descending (newest first), abstract length, and title order.
 */
export const sortRecordsBySourcePriority = <T extends CanonicalRecord>(records: T[]): T[] => {
  return [...records].sort((a, b) => {
    const scoreA = getRecordPriorityScore(a);
    const scoreB = getRecordPriorityScore(b);

    if (scoreA !== scoreB) {
      return scoreA - scoreB; // Lower score = higher priority
    }

    // Secondary sort: Year descending (newest first)
    const yearA = a.pub_year || 0;
    const yearB = b.pub_year || 0;
    if (yearB !== yearA) {
      return yearB - yearA;
    }

    // Tertiary sort: Abstract length (more informative text first)
    const lenA = (a.abstract || '').length;
    const lenB = (b.abstract || '').length;
    if (lenB !== lenA) {
      return lenB - lenA;
    }

    // Quaternary sort: Alphabetical title
    return (a.title || '').localeCompare(b.title || '');
  });
};
