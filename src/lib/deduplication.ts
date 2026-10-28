import { CanonicalRecord, ScreeningDecision } from '../types/database';

export interface DeduplicationResult {
  records: CanonicalRecord[];
  decisions: ScreeningDecision[];
  stats: {
    totalProcessed: number;
    uniqueClusters: number;
    duplicatesIdentified: number;
    matchByDoi: number;
    matchByPmid: number;
    matchByFuzzyTitle: number;
  };
}

/**
 * Normalizes DOI strings (strips prefixes, lowercase, trims)
 */
export function normalizeDoi(doi: string | null | undefined): string | null {
  if (!doi) return null;
  return doi
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
    .trim();
}

/**
 * Normalizes Title string for tertiary fuzzy matching
 */
export function normalizeTitle(title: string | null | undefined): string {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts first author surname for tertiary matching
 */
export function getFirstAuthorSurname(authors: string[] = []): string {
  if (!authors || authors.length === 0) return '';
  const first = authors[0].trim();
  // If format is "Surname Forename" or "Surname, Forename" or "Forename Surname"
  if (first.includes(',')) {
    return first.split(',')[0].trim().toLowerCase();
  }
  const parts = first.split(/\s+/);
  return parts[parts.length - 1].toLowerCase();
}

/**
 * Computes record metadata completeness score to pick the cluster representative
 */
function calculateCompletenessScore(record: CanonicalRecord): number {
  let score = 0;
  if (record.abstract && record.abstract.length > 50) score += 40;
  if (record.doi) score += 20;
  if (record.pmid) score += 20;
  if (record.authors && record.authors.length > 0) score += 10;
  if (record.journal) score += 5;
  if (record.pub_year) score += 5;
  return score;
}

/**
 * 3-Tier Deterministic Deduplication Pipeline:
 * 1. Primary: Exact match on normalized DOI
 * 2. Secondary: Exact match on PMID
 * 3. Tertiary: Exact match on normalized Title + Pub Year + First Author Surname
 */
export function runDeduplicationPipeline(
  incomingRecords: CanonicalRecord[],
  existingRecords: CanonicalRecord[] = [],
  bookId: string,
  existingDecisions: ScreeningDecision[] = []
): DeduplicationResult {
  const combined = [...existingRecords];
  let matchByDoi = 0;
  let matchByPmid = 0;
  let matchByFuzzyTitle = 0;

  // Track clusters: clusterId -> array of records in that cluster
  const clusters = new Map<string, CanonicalRecord[]>();

  // Index existing records
  existingRecords.forEach((rec) => {
    const cId = rec.cluster_id || rec.id;
    rec.cluster_id = cId;
    if (!clusters.has(cId)) {
      clusters.set(cId, []);
    }
    clusters.get(cId)!.push(rec);
  });

  incomingRecords.forEach((newRec) => {
    // Avoid re-processing if ID already exists
    if (combined.some((r) => r.id === newRec.id)) {
      return;
    }

    const normNewDoi = normalizeDoi(newRec.doi);
    const normNewTitle = normalizeTitle(newRec.title);
    const newYear = newRec.pub_year;
    const newAuthor = getFirstAuthorSurname(newRec.authors);

    let matchedExisting: CanonicalRecord | null = null;
    let matchReason: 'doi' | 'pmid' | 'title' | null = null;

    // Check against all currently grouped records
    for (const candidate of combined) {
      // 1. Primary: DOI exact match
      const candidateDoi = normalizeDoi(candidate.doi);
      if (normNewDoi && candidateDoi && normNewDoi === candidateDoi) {
        matchedExisting = candidate;
        matchReason = 'doi';
        matchByDoi++;
        break;
      }

      // 2. Secondary: PMID exact match
      if (newRec.pmid && candidate.pmid && newRec.pmid === candidate.pmid) {
        matchedExisting = candidate;
        matchReason = 'pmid';
        matchByPmid++;
        break;
      }

      // 3. Tertiary: Title + Year + Author fuzzy match
      const candidateTitle = normalizeTitle(candidate.title);
      if (normNewTitle && candidateTitle && normNewTitle === candidateTitle) {
        // If titles match exactly, verify year and/or author
        const yearMatches = !newYear || !candidate.pub_year || Math.abs(newYear - candidate.pub_year) <= 1;
        const candidateAuthor = getFirstAuthorSurname(candidate.authors);
        const authorMatches = !newAuthor || !candidateAuthor || newAuthor === candidateAuthor;

        if (yearMatches && authorMatches) {
          matchedExisting = candidate;
          matchReason = 'title';
          matchByFuzzyTitle++;
          break;
        }
      }
    }

    if (matchedExisting) {
      // Assign matched cluster ID
      const clusterId = matchedExisting.cluster_id || matchedExisting.id;
      newRec.cluster_id = clusterId;
      if (!clusters.has(clusterId)) {
        clusters.set(clusterId, [matchedExisting]);
      }
      clusters.get(clusterId)!.push(newRec);
    } else {
      // Create new unique cluster
      const newClusterId = newRec.id || 'cluster-' + Math.random().toString(36).substring(2, 9);
      newRec.cluster_id = newClusterId;
      clusters.set(newClusterId, [newRec]);
    }

    combined.push(newRec);
  });

  // Index prior screening decisions so reviewer effort is never erased
  const existingDecisionMap = new Map<string, ScreeningDecision>();
  existingDecisions.forEach((d) => existingDecisionMap.set(d.record_id, d));

  // Now generate screening decisions & designate representatives
  const decisions: ScreeningDecision[] = [];
  let duplicatesIdentified = 0;

  clusters.forEach((recordsInCluster, clusterId) => {
    // Sort records in cluster by completeness score descending
    recordsInCluster.sort((a, b) => calculateCompletenessScore(b) - calculateCompletenessScore(a));

    const representative = recordsInCluster[0];

    recordsInCluster.forEach((rec, index) => {
      const isDuplicate = index > 0;
      if (isDuplicate) {
        duplicatesIdentified++;
      }

      const existingDec = existingDecisionMap.get(rec.id);
      if (existingDec && existingDec.status !== 'unscreened') {
        // 100% PRESERVE PRIOR SCREENING DECISION ACROSS QUERY LOOPS
        decisions.push({
          ...existingDec,
          cluster_id: clusterId,
          is_duplicate: isDuplicate,
          duplicate_of_record_id: isDuplicate ? representative.id : null,
          updated_at: existingDec.updated_at || new Date().toISOString(),
        });
      } else {
        decisions.push({
          id: existingDec?.id || ('dec-' + rec.id),
          book_id: bookId,
          record_id: rec.id,
          cluster_id: clusterId,
          status: isDuplicate ? 'exclude' : (existingDec?.status || 'unscreened'),
          exclusion_reason: isDuplicate
            ? 'Duplicate record (clustered with representative study)'
            : (existingDec?.exclusion_reason || null),
          is_duplicate: isDuplicate,
          duplicate_of_record_id: isDuplicate ? representative.id : null,
          pico_tags: existingDec?.pico_tags || { p: [], i: [], c: [], o: [] },
          decision_type: isDuplicate ? 'machine_suggested' : (existingDec?.decision_type || 'machine_suggested'),
          notes: isDuplicate
            ? `Automatically clustered with representative ID: ${representative.id.substring(0, 8)}`
            : (existingDec?.notes || null),
          updated_at: new Date().toISOString(),
        });
      }
    });
  });

  return {
    records: combined,
    decisions,
    stats: {
      totalProcessed: combined.length,
      uniqueClusters: clusters.size,
      duplicatesIdentified,
      matchByDoi,
      matchByPmid,
      matchByFuzzyTitle,
    },
  };
}
