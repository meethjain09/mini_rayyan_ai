export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Profile {
  id: string;
  email: string;
  created_at: string;
}

export interface PicoConfig {
  p: string; // Population
  i: string; // Intervention
  c: string; // Comparator
  o: string; // Outcome
  inclusionCriteria?: string[];
  exclusionCriteria?: string[];
}

export interface ResearchBook {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  pico_config: PicoConfig;
  default_sources?: LiteratureSource[];
  created_at: string;
  updated_at: string;
}

export interface QueryVersion {
  id: string;
  book_id: string;
  version_number: number;
  raw_user_query: string;
  boolean_query: string;
  date_start: string | null;
  date_end: string | null;
  total_hits: number;
  created_at: string;
}

export type LiteratureSource =
  | 'pubmed'
  | 'europe_pmc'
  | 'openalex'
  | 'crossref'
  | 'semanticscholar'
  | 'arxiv'
  | 'doaj'
  | 'core';

export interface CanonicalRecord {
  id: string;
  book_id: string;
  cluster_id: string | null;
  title: string;
  abstract: string | null;
  authors: string[];
  journal: string | null;
  pub_year: number | null;
  doi: string | null;
  pmid: string | null;
  source_db: LiteratureSource;
  raw_metadata: Record<string, unknown>;
  created_at: string;
}

export interface QueryRecordLink {
  query_version_id: string;
  record_id: string;
}

export type ScreeningStatus = 'include' | 'exclude' | 'maybe' | 'unscreened';
export type DecisionType = 'machine_suggested' | 'human_confirmed' | 'human_override';

export interface PicoTags {
  p: string[];
  i: string[];
  c: string[];
  o: string[];
}

export interface ScreeningDecision {
  id: string;
  book_id: string;
  record_id: string;
  cluster_id: string | null;
  status: ScreeningStatus;
  exclusion_reason: string | null;
  is_duplicate: boolean;
  duplicate_of_record_id: string | null;
  pico_tags: PicoTags;
  decision_type: DecisionType;
  notes: string | null;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  book_id: string;
  record_id: string | null;
  action: string;
  old_value: Json | null;
  new_value: Json | null;
  created_at: string;
}

export interface RunLogEntry {
  id: string;
  book_id: string;
  query_version_id: string;
  version_number: number;
  step_executed: string;
  timestamp: string;
  records_retrieved: number;
  new_unique_records: number;
  duplicates_clustered: number;
  decisions_retained: number;
  status: 'success' | 'warning' | 'error';
  message: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { email: string };
        Update: Partial<Omit<Profile, 'id'>>;
      };
      research_books: {
        Row: ResearchBook;
        Insert: Partial<ResearchBook> & { title: string };
        Update: Partial<Omit<ResearchBook, 'id' | 'user_id'>>;
      };
      query_versions: {
        Row: QueryVersion;
        Insert: Partial<QueryVersion> & { book_id: string; raw_user_query: string };
        Update: Partial<Omit<QueryVersion, 'id'>>;
      };
      canonical_records: {
        Row: CanonicalRecord;
        Insert: Partial<CanonicalRecord> & { id: string; book_id: string; title: string };
        Update: Partial<CanonicalRecord>;
      };
      query_record_links: {
        Row: QueryRecordLink;
        Insert: QueryRecordLink;
        Update: never;
      };
      screening_decisions: {
        Row: ScreeningDecision;
        Insert: Partial<ScreeningDecision> & { book_id: string; record_id: string };
        Update: Partial<ScreeningDecision>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Partial<AuditLog> & { book_id: string; action: string };
        Update: never;
      };
    };
  };
}

export type VerdictType =
  | 'Affirmative / Beneficial'
  | 'Partially Supported / Nuanced'
  | 'No Effect / Ineffective'
  | 'Harmful / Adverse'
  | 'Inconclusive / Insufficient Evidence';

export type EvidenceCertainty = 'High' | 'Moderate' | 'Low' | 'Very Low';

export interface PerStudyEvidenceContribution {
  recordId?: string;
  paperTitle: string;
  citation: string;
  direction: 'Supports' | 'Neutral' | 'Opposes' | 'Contextual';
  keyEvidenceContribution: string;
  reportedEffectiveness: string;
  studyDesign?: string;
}

export interface EvidenceSynthesisResult {
  query: string;
  executiveAnswer: string;
  overallVerdict: VerdictType;
  evidenceStrength: EvidenceCertainty;
  evidenceStrengthRationale: string;
  detailedReasoning: {
    stepByStepSynthesis: string[];
    keyMechanisms: string;
    evidenceConsistency: string;
    limitationsAndGaps: string[];
  };
  perStudyBreakdown: PerStudyEvidenceContribution[];
  clinicalRecommendations: string[];
  plainLanguageSummary: string;
  totalPapersAnalyzed: number;
  synthesizedAt: string;
}
