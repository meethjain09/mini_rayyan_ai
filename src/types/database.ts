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
  source_db: 'pubmed' | 'europe_pmc';
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
        Insert: Omit<Profile, 'created_at'>;
        Update: Partial<Omit<Profile, 'id'>>;
      };
      research_books: {
        Row: ResearchBook;
        Insert: Omit<ResearchBook, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ResearchBook, 'id' | 'user_id'>>;
      };
      query_versions: {
        Row: QueryVersion;
        Insert: Omit<QueryVersion, 'id' | 'created_at'>;
        Update: Partial<Omit<QueryVersion, 'id'>>;
      };
      records: {
        Row: CanonicalRecord;
        Insert: Omit<CanonicalRecord, 'id' | 'created_at'>;
        Update: Partial<Omit<CanonicalRecord, 'id'>>;
      };
      query_record_links: {
        Row: QueryRecordLink;
        Insert: QueryRecordLink;
        Update: never;
      };
      screening_decisions: {
        Row: ScreeningDecision;
        Insert: Omit<ScreeningDecision, 'id' | 'updated_at'>;
        Update: Partial<Omit<ScreeningDecision, 'id'>>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, 'id' | 'created_at'>;
        Update: never;
      };
    };
  };
}
