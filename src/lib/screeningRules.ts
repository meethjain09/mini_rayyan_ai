/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MINI-RAYYAN SCREENING ENGINE & PICO HIGHLIGHTER
 * Rule-based NLP heuristics for systematic review abstract evaluation.
 * Accurately flags non-human, non-English, simulation, and review papers,
 * and extracts/highlights inline PICO spans across titles and abstracts.
 */

import { CanonicalRecord, PicoConfig, PicoTags, ScreeningStatus } from '../types/database';

export interface HeuristicRuleFlag {
  type: 'animal' | 'language' | 'simulation' | 'review' | 'pediatric' | 'rct' | 'other';
  label: string;
  matchedSnippet?: string;
  isExclusionTrigger: boolean;
}

export interface ScreeningEvaluation {
  suggestedStatus: ScreeningStatus;
  suggestedReason: string | null;
  confidence: number; // 0.0 - 1.0
  flags: HeuristicRuleFlag[];
  picoTags: PicoTags;
}

export interface AbstractSegment {
  text: string;
  isHighlight: boolean;
  category?: 'p' | 'i' | 'c' | 'o';
  label?: string;
}

// ----------------------------------------------------------------------------
// RULE HEURISTIC EVALUATION ENGINE
// ----------------------------------------------------------------------------

export function evaluateRecordScreening(
  record: CanonicalRecord,
  picoConfig?: PicoConfig
): ScreeningEvaluation {
  const title = (record.title || '').toLowerCase();
  const abstract = (record.abstract || '').toLowerCase();
  const fullText = `${title} ${abstract}`;

  const flags: HeuristicRuleFlag[] = [];

  // 1. Animal / In vitro models Check
  const animalRegex = /\b(wistar|sprague[- ]dawley|mice|mouse|rats?|murine|rodents?|porcine|swine|piglets?|rabbit|canine|dogs?|feline|cats?|zebrafish|drosophila|isolated (?:rat|mouse) islets?|cultured hepatocytes|in vitro|cell lines?|macrophages)\b/i;
  const humanMarkerRegex = /\b(human|patients?|participants?|volunteers?|adults?|men|women|subjects?)\b/i;

  const animalMatch = fullText.match(animalRegex);
  if (animalMatch) {
    // If animal terms are present and human markers are weak or absent
    const hasHumanCohort = humanMarkerRegex.test(fullText);
    const isAnimalPrimary = animalMatch[0].length > 0 && (!hasHumanCohort || title.match(animalRegex));

    if (isAnimalPrimary) {
      flags.push({
        type: 'animal',
        label: 'Non-human / Animal or In Vitro model',
        matchedSnippet: animalMatch[0],
        isExclusionTrigger: true,
      });
    }
  }

  // 2. Language Check (Non-English)
  const isBracketedTitle = record.title.trim().startsWith('[') && record.title.trim().endsWith(']');
  const nonEnglishPattern = /\[article in (german|french|spanish|chinese|japanese|russian|portuguese|italian)\]/i;
  const langMatch = fullText.match(nonEnglishPattern);
  if (isBracketedTitle || langMatch) {
    flags.push({
      type: 'language',
      label: 'Non-English Publication',
      matchedSnippet: langMatch ? langMatch[0] : '[Translated Title]',
      isExclusionTrigger: true,
    });
  }

  // 3. Simulation / In Silico Check
  const simulationRegex = /\b(in silico|mathematical model(?:ing)?|computer simulation|computational framework|pharmacokinetic model(?:ing)?|monte carlo)\b/i;
  const simMatch = fullText.match(simulationRegex);
  if (simMatch) {
    flags.push({
      type: 'simulation',
      label: 'Computational / Simulation Study',
      matchedSnippet: simMatch[0],
      isExclusionTrigger: true,
    });
  }

  // 4. Publication Type Check (Reviews, Case Reports, Editorials)
  const reviewRegex = /\b(systematic review|meta-analysis|narrative review|scoping review|literature review|case report|case series|editorial|commentary|letter to the editor)\b/i;
  const reviewMatch = fullText.match(reviewRegex);
  if (reviewMatch) {
    flags.push({
      type: 'review',
      label: 'Review / Meta-Analysis or Case Report',
      matchedSnippet: reviewMatch[0],
      isExclusionTrigger: true,
    });
  }

  // 5. Pediatric Population Check (if protocol specifies adult cohorts)
  if (picoConfig?.p.toLowerCase().includes('adult')) {
    const pediatricRegex = /\b(pediatric|paediatric|children|infants?|neonates?|adolescents?)\b/i;
    const pediatricMatch = fullText.match(pediatricRegex);
    const adultMatch = /\b(adults?|elderly|geriatric|aged 18)\b/i.test(fullText);

    if (pediatricMatch && !adultMatch) {
      flags.push({
        type: 'pediatric',
        label: 'Pediatric Population Mismatch',
        matchedSnippet: pediatricMatch[0],
        isExclusionTrigger: true,
      });
    }
  }

  // 6. RCT / Clinical Trial Positive Evidence
  const rctRegex = /\b(randomized controlled trial|randomised controlled trial|double-blind|placebo-controlled|clinical trial|phase (?:ii|iii|2|3) trial|parallel-group)\b/i;
  const rctMatch = fullText.match(rctRegex);
  if (rctMatch) {
    flags.push({
      type: 'rct',
      label: 'Human Randomized Controlled Trial',
      matchedSnippet: rctMatch[0],
      isExclusionTrigger: false,
    });
  }

  // Extract PICO terms from abstract/text
  const picoTags = extractPicoTags(fullText, picoConfig);

  // Determine suggested screening status & primary exclusion reason
  const exclusionFlag = flags.find((f) => f.isExclusionTrigger);

  let suggestedStatus: ScreeningStatus = 'unscreened';
  let suggestedReason: string | null = null;
  let confidence = 0.5;

  if (exclusionFlag) {
    suggestedStatus = 'exclude';
    suggestedReason = exclusionFlag.label;
    confidence = 0.88;
  } else if (flags.some((f) => f.type === 'rct') && (picoTags.p.length > 0 || picoTags.i.length > 0)) {
    suggestedStatus = 'include';
    suggestedReason = null;
    confidence = 0.84;
  } else if (!record.abstract || record.abstract.length < 80) {
    suggestedStatus = 'maybe';
    suggestedReason = 'Incomplete abstract text';
    confidence = 0.6;
  } else {
    suggestedStatus = 'maybe';
    suggestedReason = 'Ambiguous criteria matching';
    confidence = 0.5;
  }

  return {
    suggestedStatus,
    suggestedReason,
    confidence,
    flags,
    picoTags,
  };
}

// ----------------------------------------------------------------------------
// NLP PICO EXTRACTION
// ----------------------------------------------------------------------------

export function extractPicoTags(text: string, config?: PicoConfig): PicoTags {
  const pTags = new Set<string>();
  const iTags = new Set<string>();
  const cTags = new Set<string>();
  const oTags = new Set<string>();

  const lower = text.toLowerCase();

  // Population Patterns
  const populationPatterns = [
    /type 2 diabet(?:es|ic(?:s)?)/gi,
    /t2dm/gi,
    /type 2 diabetes mellitus/gi,
    /adult(?:s)? with diabetes/gi,
    /overweight adults/gi,
    /insulin-resistant/gi,
    /prediabetes/gi,
    /hyperglycemic patients/gi,
    /adult outpatients/gi,
  ];

  // Intervention Patterns
  const interventionPatterns = [
    /metformin/gi,
    /metformin hydrochloride/gi,
    /extended-release metformin/gi,
    /biguanide(?:s)?/gi,
    /glucophage/gi,
    /metformin monotherapy/gi,
    /500\s?mg/gi,
    /850\s?mg/gi,
    /1000\s?mg/gi,
  ];

  // Comparator Patterns
  const comparatorPatterns = [
    /placebo/gi,
    /lifestyle modification/gi,
    /diet (?:alone|and exercise)/gi,
    /standard (?:care|therapy)/gi,
    /control group/gi,
    /sulfonylurea(?:s)?/gi,
    /glimepiride/gi,
    /gliclazide/gi,
    /sitagliptin/gi,
    /active comparator/gi,
  ];

  // Outcome Patterns
  const outcomePatterns = [
    /hba1c/gi,
    /glycated h(?:a)?emoglobin/gi,
    /fasting plasma glucose/gi,
    /fpg/gi,
    /postprandial glucose/gi,
    /insulin sensitivity/gi,
    /body weight/gi,
    /bmi/gi,
    /hypoglyc(?:a)?emia/gi,
    /adverse events/gi,
    /cardiovascular mortality/gi,
    /all-cause mortality/gi,
    /gastrointestinal symptoms/gi,
  ];

  populationPatterns.forEach((rx) => {
    const matches = lower.match(rx);
    if (matches) matches.forEach((m) => pTags.add(m.trim()));
  });

  interventionPatterns.forEach((rx) => {
    const matches = lower.match(rx);
    if (matches) matches.forEach((m) => iTags.add(m.trim()));
  });

  comparatorPatterns.forEach((rx) => {
    const matches = lower.match(rx);
    if (matches) matches.forEach((m) => cTags.add(m.trim()));
  });

  outcomePatterns.forEach((rx) => {
    const matches = lower.match(rx);
    if (matches) matches.forEach((m) => oTags.add(m.trim()));
  });

  // If user provided custom keywords in PicoConfig, include matches
  if (config) {
    const extractWords = (str: string) => str.toLowerCase().split(/[,;]+/).map((s) => s.trim()).filter((s) => s.length > 2);
    
    extractWords(config.p).forEach((kw) => {
      if (lower.includes(kw)) pTags.add(kw);
    });
    extractWords(config.i).forEach((kw) => {
      if (lower.includes(kw)) iTags.add(kw);
    });
    extractWords(config.c).forEach((kw) => {
      if (lower.includes(kw)) cTags.add(kw);
    });
    extractWords(config.o).forEach((kw) => {
      if (lower.includes(kw)) oTags.add(kw);
    });
  }

  return {
    p: Array.from(pTags).slice(0, 5),
    i: Array.from(iTags).slice(0, 5),
    c: Array.from(cTags).slice(0, 5),
    o: Array.from(oTags).slice(0, 6),
  };
}

// ----------------------------------------------------------------------------
// INLINE PICO TOKENIZER & SPAN SEGMENTER
// ----------------------------------------------------------------------------

interface TagSpan {
  start: number;
  end: number;
  category: 'p' | 'i' | 'c' | 'o';
  term: string;
}

export function segmentAbstractWithPico(
  abstractText: string,
  picoTags: PicoTags
): AbstractSegment[] {
  if (!abstractText) return [];

  // Collect all spans
  const spans: TagSpan[] = [];
  const lower = abstractText.toLowerCase();

  const addSpansForCategory = (category: 'p' | 'i' | 'c' | 'o', terms: string[]) => {
    terms.forEach((term) => {
      if (!term || term.length < 2) return;
      let startIdx = 0;
      const lowerTerm = term.toLowerCase();
      while ((startIdx = lower.indexOf(lowerTerm, startIdx)) !== -1) {
        // Verify word boundaries
        const prevChar = startIdx > 0 ? lower[startIdx - 1] : ' ';
        const nextChar = startIdx + lowerTerm.length < lower.length ? lower[startIdx + lowerTerm.length] : ' ';
        const isWordBoundary = /[^a-z0-9]/i.test(prevChar) && /[^a-z0-9]/i.test(nextChar);

        if (isWordBoundary) {
          spans.push({
            start: startIdx,
            end: startIdx + lowerTerm.length,
            category,
            term,
          });
        }
        startIdx += lowerTerm.length;
      }
    });
  };

  addSpansForCategory('p', picoTags.p);
  addSpansForCategory('i', picoTags.i);
  addSpansForCategory('c', picoTags.c);
  addSpansForCategory('o', picoTags.o);

  if (spans.length === 0) {
    return [{ text: abstractText, isHighlight: false }];
  }

  // Sort spans by start index, prioritizing longer terms on conflict
  spans.sort((a, b) => a.start - b.start || b.end - a.end);

  // Filter overlapping spans
  const nonOverlapping: TagSpan[] = [];
  let lastEnd = 0;

  for (const span of nonOverlapping) {
    if (span.start >= lastEnd) {
      nonOverlapping.push(span);
      lastEnd = span.end;
    }
  }

  // Build sequential segments
  const segments: AbstractSegment[] = [];
  let cursor = 0;

  for (const span of nonOverlapping) {
    if (span.start > cursor) {
      segments.push({
        text: abstractText.substring(cursor, span.start),
        isHighlight: false,
      });
    }

    segments.push({
      text: abstractText.substring(span.start, span.end),
      isHighlight: true,
      category: span.category,
      label:
        span.category === 'p'
          ? 'Population'
          : span.category === 'i'
          ? 'Intervention'
          : span.category === 'c'
          ? 'Comparator'
          : 'Outcome',
    });

    cursor = span.end;
  }

  if (cursor < abstractText.length) {
    segments.push({
      text: abstractText.substring(cursor),
      isHighlight: false,
    });
  }

  return segments;
}

// ----------------------------------------------------------------------------
// EXCLUSION REASONS VOCABULARY
// ----------------------------------------------------------------------------

export const STANDARD_EXCLUSION_REASONS = [
  'Non-human / Animal or In Vitro model',
  'Non-English Publication',
  'Computational / Simulation Study',
  'Review / Meta-Analysis or Case Report',
  'Pediatric Population Mismatch',
  'Wrong Intervention (Non-Metformin)',
  'Wrong Comparator (Lacks Placebo/Control)',
  'Outcome Missing (HbA1c / Glycemic parameters not evaluated)',
  'Conference Abstract / Full text unavailable',
  'Duplicate Study Record',
  'Other (Specified in reviewer notes)',
];
