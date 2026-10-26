import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database, ResearchBook, Profile, QueryVersion, CanonicalRecord, ScreeningDecision, AuditLog, RunLogEntry, QueryRecordLink } from '../types/database';

// Default mock user for testing without remote database
const DEMO_USER: Profile = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'researcher@rayyan-screening.org',
  created_at: new Date().toISOString(),
};

// Seed sample systematic review project if none exists in local demo state
const INITIAL_DEMO_BOOKS: ResearchBook[] = [
  {
    id: 'b1-demo-t2d-metformin',
    user_id: DEMO_USER.id,
    title: 'Metformin vs Placebo in Adults with Type 2 Diabetes',
    description: 'Systematic review evaluating the efficacy and safety of Metformin monotherapy in lowering HbA1c levels compared to placebo or standard care in adult populations.',
    pico_config: {
      p: 'Adults with type 2 diabetes mellitus (age >= 18)',
      i: 'Metformin (immediate or extended release)',
      c: 'Placebo or lifestyle modification alone',
      o: 'HbA1c reduction (%), fasting plasma glucose, adverse events',
      inclusionCriteria: [
        'Human randomized controlled trials (RCTs)',
        'Adult participants (≥18 years) with confirmed T2DM',
        'Intervention duration ≥12 weeks',
      ],
      exclusionCriteria: [
        'Animal or in vitro models',
        'Type 1 diabetes or gestational diabetes',
        'Review articles, conference abstracts, or editorials',
        'Non-English publications',
      ],
    },
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'b2-demo-sglt2-hf',
    user_id: DEMO_USER.id,
    title: 'SGLT2 Inhibitors in Heart Failure with Preserved Ejection Fraction',
    description: 'Investigating cardiovascular mortality and heart failure hospitalization outcomes with Empagliflozin/Dapagliflozin in HFpEF patients.',
    pico_config: {
      p: 'Adult patients with HFpEF (LVEF > 40-50%)',
      i: 'SGLT2 inhibitors (Empagliflozin, Dapagliflozin)',
      c: 'Placebo or standard background HF therapy',
      o: 'Composite CV death and HF hospitalizations',
      inclusionCriteria: [
        'Phase III Double-blind RCTs',
        'Baseline LVEF > 40%',
      ],
      exclusionCriteria: [
        'End-stage kidney disease (eGFR < 20)',
        'Post-hoc observational subgroup analyses',
      ],
    },
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

const INITIAL_DEMO_QUERY_VERSIONS: QueryVersion[] = [
  {
    id: 'qv-demo-01',
    book_id: 'b1-demo-t2d-metformin',
    version_number: 1,
    raw_user_query: 'In adults with type 2 diabetes, does metformin compared to placebo reduce HbA1c?',
    boolean_query: '("Adults with type 2 diabetes mellitus"[Title/Abstract]) AND ("Metformin"[Title/Abstract]) AND ("Placebo"[Title/Abstract] OR "control"[Title/Abstract]) AND ("humans"[MeSH Terms]) AND (2015[Date - Publication] : 2026[Date - Publication])',
    date_start: '2015',
    date_end: '2026',
    total_hits: 142,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

// Environment configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http') && 
  !supabaseUrl.includes('YOUR_SUPABASE')
);

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;

// Local persistent mock store for instant testing & offline readiness
class LocalStorageStore {
  private userKey = 'mini_rayyan_current_user';
  private booksKey = 'mini_rayyan_books';
  private activeBookKey = 'mini_rayyan_active_book_id';
  private queryVersionsKey = 'mini_rayyan_query_versions';

  constructor() {
    if (typeof window !== 'undefined') {
      if (!localStorage.getItem(this.booksKey)) {
        localStorage.setItem(this.booksKey, JSON.stringify(INITIAL_DEMO_BOOKS));
      }
      if (!localStorage.getItem(this.activeBookKey)) {
        localStorage.setItem(this.activeBookKey, INITIAL_DEMO_BOOKS[0].id);
      }
      if (!localStorage.getItem(this.userKey)) {
        localStorage.setItem(this.userKey, JSON.stringify(DEMO_USER));
      }
      if (!localStorage.getItem(this.queryVersionsKey)) {
        localStorage.setItem(this.queryVersionsKey, JSON.stringify(INITIAL_DEMO_QUERY_VERSIONS));
      }
    }
  }

  getCurrentUser(): Profile | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(this.userKey);
    return raw ? JSON.parse(raw) : null;
  }

  setCurrentUser(user: Profile | null): void {
    if (typeof window === 'undefined') return;
    if (user) {
      localStorage.setItem(this.userKey, JSON.stringify(user));
    } else {
      localStorage.removeItem(this.userKey);
    }
  }

  getBooks(userId?: string): ResearchBook[] {
    if (typeof window === 'undefined') return INITIAL_DEMO_BOOKS;
    const raw = localStorage.getItem(this.booksKey);
    const allBooks: ResearchBook[] = raw ? JSON.parse(raw) : INITIAL_DEMO_BOOKS;
    if (!userId) return allBooks;
    const userBooks = allBooks.filter((b) => b.user_id === userId);
    return userBooks.length > 0 ? userBooks : allBooks;
  }

  saveBooks(books: ResearchBook[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.booksKey, JSON.stringify(books));
  }

  getActiveBookId(): string | null {
    if (typeof window === 'undefined') return INITIAL_DEMO_BOOKS[0].id;
    return localStorage.getItem(this.activeBookKey);
  }

  setActiveBookId(id: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.activeBookKey, id);
  }

  createBook(title: string, description: string, pico: ResearchBook['pico_config'], userId?: string): ResearchBook {
    const user = this.getCurrentUser() || DEMO_USER;
    const effectiveUserId = userId || user.id;
    const newBook: ResearchBook = {
      id: 'book-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36),
      user_id: effectiveUserId,
      title,
      description,
      pico_config: pico,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const books = this.getBooks();
    books.unshift(newBook);
    this.saveBooks(books);
    this.setActiveBookId(newBook.id);
    return newBook;
  }

  deleteBook(id: string): void {
    const books = this.getBooks().filter((b) => b.id !== id);
    this.saveBooks(books);
    if (this.getActiveBookId() === id) {
      this.setActiveBookId(books[0]?.id || '');
    }
  }

  getQueryVersions(bookId: string): QueryVersion[] {
    if (typeof window === 'undefined') return INITIAL_DEMO_QUERY_VERSIONS.filter(q => q.book_id === bookId);
    const raw = localStorage.getItem(this.queryVersionsKey);
    const list: QueryVersion[] = raw ? JSON.parse(raw) : INITIAL_DEMO_QUERY_VERSIONS;
    return list.filter(q => q.book_id === bookId).sort((a, b) => b.version_number - a.version_number);
  }

  saveQueryVersion(queryData: Omit<QueryVersion, 'id' | 'created_at'>): QueryVersion {
    const raw = localStorage.getItem(this.queryVersionsKey);
    const list: QueryVersion[] = raw ? JSON.parse(raw) : INITIAL_DEMO_QUERY_VERSIONS;
    
    // Auto-calculate next incremental version number
    const existingVersions = list.filter(q => q.book_id === queryData.book_id);
    const nextVersionNum = existingVersions.length > 0 
      ? Math.max(...existingVersions.map(v => v.version_number)) + 1 
      : 1;

    const newVersion: QueryVersion = {
      id: 'qv-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36),
      book_id: queryData.book_id,
      version_number: queryData.version_number || nextVersionNum,
      raw_user_query: queryData.raw_user_query,
      boolean_query: queryData.boolean_query,
      date_start: queryData.date_start,
      date_end: queryData.date_end,
      total_hits: queryData.total_hits,
      created_at: new Date().toISOString(),
    };

    list.unshift(newVersion);
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.queryVersionsKey, JSON.stringify(list));
    }
    return newVersion;
  }

  // --------------------------------------------------------------------------
  // CANONICAL RECORDS & QUERY LINKS
  // --------------------------------------------------------------------------
  private recordsKey = 'mini_rayyan_records';
  private linksKey = 'mini_rayyan_query_links';
  private decisionsKey = 'mini_rayyan_screening_decisions';

  getRecords(bookId: string): CanonicalRecord[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(this.recordsKey);
    const all: CanonicalRecord[] = raw ? JSON.parse(raw) : [];
    return all.filter((r) => r.book_id === bookId);
  }

  saveRecords(
    bookId: string,
    newRecords: CanonicalRecord[],
    queryVersionId: string
  ): void {
    if (typeof window === 'undefined') return;
    const existingRaw = localStorage.getItem(this.recordsKey);
    let all: CanonicalRecord[] = existingRaw ? JSON.parse(existingRaw) : [];

    // Filter out existing from this book and append updated/deduplicated records
    all = all.filter((r) => r.book_id !== bookId).concat(newRecords);
    localStorage.setItem(this.recordsKey, JSON.stringify(all));

    // Save query_record_links
    const linksRaw = localStorage.getItem(this.linksKey);
    const links: { query_version_id: string; record_id: string }[] = linksRaw ? JSON.parse(linksRaw) : [];
    newRecords.forEach((r) => {
      if (!links.some((l) => l.query_version_id === queryVersionId && l.record_id === r.id)) {
        links.push({ query_version_id: queryVersionId, record_id: r.id });
      }
    });
    localStorage.setItem(this.linksKey, JSON.stringify(links));
  }

  getQueryRecordLinks(): QueryRecordLink[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(this.linksKey);
    return raw ? JSON.parse(raw) : [];
  }

  getDecisions(bookId: string): ScreeningDecision[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(this.decisionsKey);
    const all: ScreeningDecision[] = raw ? JSON.parse(raw) : [];
    return all.filter((d) => d.book_id === bookId);
  }

  saveDecisions(bookId: string, decisions: ScreeningDecision[]): void {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(this.decisionsKey);
    let all: ScreeningDecision[] = raw ? JSON.parse(raw) : [];
    all = all.filter((d) => d.book_id !== bookId).concat(decisions);
    localStorage.setItem(this.decisionsKey, JSON.stringify(all));
  }

  // Manual Reviewer Override: Uncluster a record (mark false duplicate as unique study)
  unclusterRecord(bookId: string, recordId: string): void {
    const records = this.getRecords(bookId);
    const rec = records.find((r) => r.id === recordId);
    if (!rec) return;

    // Create a new independent cluster for this record
    rec.cluster_id = 'cluster-' + recordId;

    const decisions = this.getDecisions(bookId);
    const dec = decisions.find((d) => d.record_id === recordId);
    if (dec) {
      dec.cluster_id = rec.cluster_id;
      dec.is_duplicate = false;
      dec.duplicate_of_record_id = null;
      dec.status = 'unscreened';
      dec.decision_type = 'human_override';
      dec.notes = 'Manual reviewer override: un-clustered from duplicate group (unique study).';
      dec.updated_at = new Date().toISOString();
    }

    this.saveRecords(bookId, records, 'manual-override');
    this.saveDecisions(bookId, decisions);
  }

  // Manual Reviewer Override: Merge two records into the same duplicate cluster
  mergeRecordsIntoCluster(bookId: string, primaryId: string, duplicateId: string): void {
    const records = this.getRecords(bookId);
    const primary = records.find((r) => r.id === primaryId);
    const duplicate = records.find((r) => r.id === duplicateId);
    if (!primary || !duplicate) return;

    const sharedCluster = primary.cluster_id || primary.id;
    primary.cluster_id = sharedCluster;
    duplicate.cluster_id = sharedCluster;

    const decisions = this.getDecisions(bookId);
    const dupDec = decisions.find((d) => d.record_id === duplicateId);
    if (dupDec) {
      dupDec.cluster_id = sharedCluster;
      dupDec.is_duplicate = true;
      dupDec.duplicate_of_record_id = primary.id;
      dupDec.status = 'exclude';
      dupDec.exclusion_reason = 'Duplicate study (manually clustered by reviewer)';
      dupDec.decision_type = 'human_override';
      dupDec.notes = `Manually merged with primary study ID ${primary.id.substring(0, 8)}`;
      dupDec.updated_at = new Date().toISOString();
    }

    this.saveRecords(bookId, records, 'manual-override');
    this.saveDecisions(bookId, decisions);
  }

  // --------------------------------------------------------------------------
  // AUDIT LOGS & SCREENING DECISION MUTATIONS
  // --------------------------------------------------------------------------
  private auditLogsKey = 'mini_rayyan_audit_logs';

  getAuditLogs(bookId: string, recordId?: string): AuditLog[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(this.auditLogsKey);
    const all: AuditLog[] = raw ? JSON.parse(raw) : [];
    return all.filter((l) => l.book_id === bookId && (!recordId || l.record_id === recordId));
  }

  addAuditLog(entry: Omit<AuditLog, 'id' | 'created_at'>): AuditLog {
    const newLog: AuditLog = {
      ...entry,
      id: 'log-' + Math.random().toString(36).substring(2, 10),
      created_at: new Date().toISOString(),
    };
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(this.auditLogsKey);
      const all: AuditLog[] = raw ? JSON.parse(raw) : [];
      all.unshift(newLog); // latest first
      localStorage.setItem(this.auditLogsKey, JSON.stringify(all));
    }
    return newLog;
  }

  // --------------------------------------------------------------------------
  // RUN LOGS (PHASE 5: LEVEL 2 PROVENANCE)
  // --------------------------------------------------------------------------
  private runLogsKey = 'mini_rayyan_run_logs';

  getRunLogs(bookId: string): RunLogEntry[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(this.runLogsKey);
    const all: RunLogEntry[] = raw ? JSON.parse(raw) : [];
    return all.filter((l) => l.book_id === bookId);
  }

  addRunLog(log: Omit<RunLogEntry, 'id' | 'timestamp'>): RunLogEntry {
    const entry: RunLogEntry = {
      ...log,
      id: 'run-' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
    };
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(this.runLogsKey);
      const all: RunLogEntry[] = raw ? JSON.parse(raw) : [];
      all.unshift(entry);
      localStorage.setItem(this.runLogsKey, JSON.stringify(all));
    }
    return entry;
  }

  updateDecisionWithAudit(
    bookId: string,
    recordId: string,
    updates: Partial<ScreeningDecision>,
    actionDescription: string = 'Reviewer modified screening status'
  ): ScreeningDecision | null {
    const decisions = this.getDecisions(bookId);
    let target = decisions.find((d) => d.record_id === recordId);

    const oldStatus = target ? { ...target } : null;

    if (!target) {
      target = {
        id: 'dec-' + recordId,
        book_id: bookId,
        record_id: recordId,
        cluster_id: null,
        status: updates.status || 'unscreened',
        exclusion_reason: updates.exclusion_reason || null,
        is_duplicate: updates.is_duplicate || false,
        duplicate_of_record_id: updates.duplicate_of_record_id || null,
        pico_tags: updates.pico_tags || { p: [], i: [], c: [], o: [] },
        decision_type: updates.decision_type || 'human_confirmed',
        notes: updates.notes || null,
        updated_at: new Date().toISOString(),
      };
      decisions.push(target);
    } else {
      Object.assign(target, updates, { updated_at: new Date().toISOString() });
    }

    this.saveDecisions(bookId, decisions);

    // Record immutable audit entry
    this.addAuditLog({
      book_id: bookId,
      record_id: recordId,
      action: actionDescription,
      old_value: oldStatus as any,
      new_value: target as any,
    });

    return target;
  }
}

export const localStore = new LocalStorageStore();
