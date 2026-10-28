import { PicoConfig } from '../types/database';

export interface ExtractedPicoResult {
  p: string;
  i: string;
  c: string;
  o: string;
  suggestedExclusions: string[];
  confidence: {
    p: number;
    i: number;
    c: number;
    o: number;
  };
  compiledQueries: {
    pubmed: string;
    europePmc: string;
    genericBoolean: string;
    openalex: string;
    crossref: string;
    arxiv: string;
  };
}

/**
 * Intelligent Rule & Regex based NLP Clinical PICO parser
 * Extracts Population, Intervention, Comparator, and Outcome from plain-English clinical queries.
 */
export function extractPicoFromClinicalQuery(
  rawQuery: string,
  dateStart?: string,
  dateEnd?: string
): ExtractedPicoResult {
  const query = rawQuery.trim();

  let population = '';
  let intervention = '';
  let comparator = '';
  let outcome = '';

  let pConf = 0.5;
  let iConf = 0.5;
  let cConf = 0.5;
  let oConf = 0.5;

  // 1. EXTRACT POPULATION (P)
  // Pattern A: "In [population], does..." or "Among [population], does..."
  const pMatchA = query.match(/(?:in|among|for)\s+([a-z0-9\s-]{4,60}?)(?:,|\s+(?:does|do|can|is|are|will|would|evaluated|treated|comparing|compared))/i);
  if (pMatchA && pMatchA[1]) {
    population = cleanExtractedTerm(pMatchA[1]);
    pConf = 0.92;
  } else {
    // Pattern B: Look for clinical condition cohorts (adults with..., patients with..., children with...)
    const pMatchB = query.match(/(?:adults?|patients?|elderly|children|adolescents?|individuals?|cohorts?|subjects?)(?:\s+with|\s+having|\s+diagnosed with)?\s+([a-z0-9\s-]{3,40})/i);
    if (pMatchB) {
      population = cleanExtractedTerm(pMatchB[0]);
      pConf = 0.85;
    } else {
      // Pattern C: Common clinical terms (type 2 diabetes, heart failure, asthma, hypertension)
      const pMatchC = query.match(/(?:type [12] diabetes|heart failure|hypertension|breast cancer|depression|alzheimer|covid-19|obesity|copd|chronic kidney disease)/i);
      if (pMatchC) {
        population = `Patients with ${cleanExtractedTerm(pMatchC[0])}`;
        pConf = 0.78;
      }
    }
  }

  // 2. EXTRACT INTERVENTION (I)
  // Pattern A: "does/do [intervention] compared to..."
  const iMatchA = query.match(/(?:does|do|can|will|effect of|efficacy of|evaluating|use of|administration of)\s+([a-z0-9\s-]{3,40}?)(?:\s+(?:compared|versus|vs\.?|relative to|against|reduce|lower|improve|prevent|lead to))/i);
  if (iMatchA && iMatchA[1]) {
    intervention = cleanExtractedTerm(iMatchA[1]);
    iConf = 0.94;
  } else {
    // Pattern B: "...with [drug/intervention] compared to..."
    const iMatchB = query.match(/(?:treated with|treatment with|receiving|taking)\s+([a-z0-9\s-]{3,40}?)(?:\s+(?:compared|versus|vs|or|\?|$))/i);
    if (iMatchB && iMatchB[1]) {
      intervention = cleanExtractedTerm(iMatchB[1]);
      iConf = 0.88;
    } else {
      // Pattern C: common medical drug patterns
      const iMatchC = query.match(/\b(metformin|semaglutide|tirzepatide|empagliflozin|dapagliflozin|aspirin|statin|atorvastatin|lisinopril|pembrolizumab|immunotherapy|chemotherapy|lifestyle modification|aerobic exercise|cognitive behavioral therapy)\b/i);
      if (iMatchC) {
        intervention = cleanExtractedTerm(iMatchC[0]);
        iConf = 0.86;
      }
    }
  }

  // 3. EXTRACT COMPARATOR (C)
  // Pattern A: "compared to [comparator]" or "vs [comparator]"
  const cMatchA = query.match(/(?:compared to|compared with|versus|vs\.?|relative to|against)\s+([a-z0-9\s-]{3,40}?)(?:\s+(?:reduce|lower|decrease|improve|prevent|affect|increase|lead|result|on|\?|$))/i);
  if (cMatchA && cMatchA[1]) {
    comparator = cleanExtractedTerm(cMatchA[1]);
    cConf = 0.91;
  } else if (/placebo/i.test(query)) {
    comparator = 'Placebo';
    cConf = 0.95;
  } else if (/standard of care|usual care|control/i.test(query)) {
    comparator = 'Standard of care';
    cConf = 0.89;
  } else {
    comparator = 'Placebo or standard care';
    cConf = 0.6;
  }

  // 4. EXTRACT OUTCOME (O)
  // Pattern A: "reduce/lower/improve [outcome]"
  const oMatchA = query.match(/(?:reduce|lower|decrease|improve|prevent|affect|impact|increase|lead to)\s+([a-z0-9\s-]{3,50}?)(?:\s+(?:in|among|for|\?|$))/i);
  if (oMatchA && oMatchA[1]) {
    outcome = cleanExtractedTerm(oMatchA[1]);
    oConf = 0.93;
  } else {
    // Pattern B: Look for known outcome metrics (HbA1c, mortality, MACE, hospitalizations)
    const oMatchB = query.match(/\b(hba1c|glycated hemoglobin|mortality|all-cause mortality|cardiovascular death|mace|major adverse cardiovascular events|hospitalization|blood pressure|weight loss|adverse events|overall survival|progression-free survival)\b/i);
    if (oMatchB) {
      outcome = cleanExtractedTerm(oMatchB[0]);
      oConf = 0.87;
    } else {
      outcome = 'Primary clinical efficacy and adverse endpoints';
      oConf = 0.55;
    }
  }

  // Clean and fall back if empty
  population = population || 'Adult patients with target clinical condition';
  intervention = intervention || 'Primary therapeutic intervention';
  comparator = comparator || 'Placebo or standard care';
  outcome = outcome || 'Clinical efficacy and mortality outcomes';

  // 5. SUGGEST EXCLUSION CRITERIA BASED ON QUERY CONTEXT
  const suggestedExclusions: string[] = [
    'Animal studies and preclinical non-human models',
    'Non-English publications (language restriction)',
    'In vitro, in silico or simulation studies',
    'Single-case reports, editorials, or conference abstracts',
  ];

  if (/adult/i.test(population)) {
    suggestedExclusions.push('Pediatric populations (age < 18)');
  }
  if (/type 2 diabetes/i.test(population)) {
    suggestedExclusions.push('Type 1 diabetes or gestational diabetes cohorts');
  }
  if (/randomized|rct|trial/i.test(query)) {
    suggestedExclusions.push('Observational non-randomized cohort studies');
  }

  // Compile boolean queries
  const compiledQueries = compileBooleanQueries(
    { p: population, i: intervention, c: comparator, o: outcome },
    dateStart,
    dateEnd
  );

  return {
    p: population,
    i: intervention,
    c: comparator,
    o: outcome,
    suggestedExclusions,
    confidence: {
      p: Math.round(pConf * 100),
      i: Math.round(iConf * 100),
      c: Math.round(cConf * 100),
      o: Math.round(oConf * 100),
    },
    compiledQueries,
  };
}

/**
 * Strips punctuation and trailing prepositions from extracted text terms
 */
function cleanExtractedTerm(term: string): string {
  return term
    .replace(/[?,.:;!]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b(does|do|can|will|and|or|in|of|to|for|with)$/i, '')
    .trim();
}

/**
 * Compiles PICO into standardized PubMed E-utilities and Europe PMC Boolean syntax
 */
export function compileBooleanQueries(
  pico: PicoConfig,
  dateStart?: string,
  dateEnd?: string
): {
  pubmed: string;
  europePmc: string;
  genericBoolean: string;
  openalex: string;
  crossref: string;
  arxiv: string;
} {
  const pTerm = sanitizeSearchTerm(pico.p);
  const iTerm = sanitizeSearchTerm(pico.i);
  const cTerm = sanitizeSearchTerm(pico.c);

  // Generic Boolean string
  let genericBoolean = `("${pTerm}") AND ("${iTerm}")`;
  if (cTerm && !cTerm.toLowerCase().includes('none')) {
    if (cTerm.toLowerCase().includes('placebo')) {
      genericBoolean += ` AND ("${cTerm}" OR "placebo" OR "control")`;
    } else {
      genericBoolean += ` AND ("${cTerm}")`;
    }
  }

  // PubMed E-utilities Compliant Query
  let pubmed = `("${pTerm}"[Title/Abstract]) AND ("${iTerm}"[Title/Abstract])`;
  if (cTerm && !cTerm.toLowerCase().includes('none')) {
    if (cTerm.toLowerCase().includes('placebo')) {
      pubmed += ` AND ("${cTerm}"[Title/Abstract] OR "placebo"[Title/Abstract] OR "control"[Title/Abstract])`;
    } else {
      pubmed += ` AND ("${cTerm}"[Title/Abstract])`;
    }
  }
  // Human studies filter
  pubmed += ` AND ("humans"[MeSH Terms] OR "human"[Title/Abstract])`;

  // Date range filter for PubMed
  if (dateStart || dateEnd) {
    const start = dateStart || '1990';
    const end = dateEnd || new Date().getFullYear().toString();
    pubmed += ` AND (${start}[Date - Publication] : ${end}[Date - Publication])`;
  }

  // Europe PMC REST API Syntax
  let europePmc = `(TITLE_ABS:"${pTerm}") AND (TITLE_ABS:"${iTerm}")`;
  if (cTerm && !cTerm.toLowerCase().includes('none')) {
    if (cTerm.toLowerCase().includes('placebo')) {
      europePmc += ` AND (TITLE_ABS:"${cTerm}" OR TITLE_ABS:"placebo")`;
    } else {
      europePmc += ` AND (TITLE_ABS:"${cTerm}")`;
    }
  }
  if (dateStart || dateEnd) {
    const start = dateStart || '1990';
    const end = dateEnd || new Date().getFullYear().toString();
    europePmc += ` AND (PUB_YEAR:[${start} TO ${end}])`;
  }

  // OpenAlex Search Query Format
  const openalex = `default.search:"${pTerm} ${iTerm}"${dateStart || dateEnd ? `,from_publication_date:${dateStart || '1990'}-01-01` : ''}`;

  // Crossref REST Query Format
  const crossref = `${pTerm} ${iTerm}${cTerm ? ' ' + cTerm : ''}`;

  // arXiv Search Syntax
  const arxiv = `all:${pTerm.replace(/\s+/g, '+')} AND all:${iTerm.replace(/\s+/g, '+')}`;

  return {
    pubmed,
    europePmc,
    genericBoolean,
    openalex,
    crossref,
    arxiv,
  };
}

function sanitizeSearchTerm(term: string): string {
  return term
    .replace(/["\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
