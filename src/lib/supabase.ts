import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database, ResearchBook, Profile, QueryVersion, CanonicalRecord, ScreeningDecision, AuditLog, RunLogEntry, QueryRecordLink, LiteratureSource } from '../types/database';

// Persistent storage keys
export const STORAGE_KEYS = {
  USER: 'mini_rayyan_current_user',
  REMEMBERED_EMAIL: 'mini_rayyan_remembered_email',
  REMEMBER_ME: 'mini_rayyan_remember_me',
  BOOKS: 'mini_rayyan_books',
  ACTIVE_BOOK: 'mini_rayyan_active_book_id',
  QUERY_VERSIONS: 'mini_rayyan_query_versions',
  ACCOUNTS: 'mini_rayyan_accounts',
  RECORDS: 'mini_rayyan_records',
  LINKS: 'mini_rayyan_query_links',
  DECISIONS: 'mini_rayyan_screening_decisions',
  AUDIT_LOGS: 'mini_rayyan_audit_logs',
  RUN_LOGS: 'mini_rayyan_run_logs',
};

const env = (typeof import.meta !== 'undefined' && import.meta?.env) ? import.meta.env : ((typeof process !== 'undefined' && process?.env) ? process.env : {}) as any;
const getStoredSupabaseUrl = () => typeof window !== 'undefined' ? localStorage.getItem('mini_rayyan_supabase_url') || '' : '';
const getStoredSupabaseKey = () => typeof window !== 'undefined' ? localStorage.getItem('mini_rayyan_supabase_key') || '' : '';

export const supabaseUrl = env.VITE_SUPABASE_URL || getStoredSupabaseUrl() || '';
export const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || getStoredSupabaseKey() || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http') && 
  !supabaseUrl.includes('YOUR_SUPABASE')
);

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;

// Supabase PostgreSQL Client & Local Cache Layer
class SupabaseStore {
  private userKey = STORAGE_KEYS.USER;
  private booksKey = STORAGE_KEYS.BOOKS;
  private activeBookKey = STORAGE_KEYS.ACTIVE_BOOK;
  private queryVersionsKey = STORAGE_KEYS.QUERY_VERSIONS;

  private syncBookToSupabase(book: ResearchBook) {
    if (isSupabaseConfigured && supabase) {
      (supabase as any)
        .from('research_books')
        .upsert({
          id: book.id,
          user_id: book.user_id,
          title: book.title,
          description: book.description,
          pico_config: book.pico_config,
          created_at: book.created_at,
          updated_at: book.updated_at,
        })
        .then(({ error }: any) => {
          if (error) console.warn('Supabase book sync notice:', error.message);
        });
    }
  }

  private deleteBookFromSupabase(id: string) {
    if (isSupabaseConfigured && supabase) {
      (supabase as any).from('research_books').delete().eq('id', id).then(({ error }: any) => {
        if (error) console.warn('Supabase book deletion notice:', error.message);
      });
    }
  }

  private syncQueryVersionToSupabase(qv: QueryVersion) {
    if (isSupabaseConfigured && supabase) {
      (supabase as any).from('query_versions').upsert({
        id: qv.id,
        book_id: qv.book_id,
        version_number: qv.version_number,
        raw_user_query: qv.raw_user_query,
        boolean_query: qv.boolean_query,
        date_start: qv.date_start,
        date_end: qv.date_end,
        total_hits: qv.total_hits,
        created_at: qv.created_at,
      }).then(({ error }: any) => {
        if (error) console.warn('Supabase query version sync notice:', error.message);
      });
    }
  }

  private syncRecordsToSupabase(records: CanonicalRecord[], queryVersionId: string) {
    if (isSupabaseConfigured && supabase && records.length > 0) {
      const dbRecords = records.map((r) => ({
        id: r.id,
        book_id: r.book_id,
        cluster_id: r.cluster_id,
        title: r.title,
        abstract: r.abstract,
        authors: r.authors,
        journal: r.journal,
        pub_year: r.pub_year,
        doi: r.doi,
        pmid: r.pmid,
        source_db: r.source_db,
        raw_metadata: r.raw_metadata,
        created_at: r.created_at,
      }));
      (supabase as any).from('canonical_records').upsert(dbRecords).then(({ error }: any) => {
        if (error) console.warn('Supabase records sync notice:', error.message);
      });

      const links = records.map((r) => ({
        query_version_id: queryVersionId,
        record_id: r.id,
      }));
      (supabase as any).from('query_record_links').upsert(links).then(({ error }: any) => {
        if (error) console.warn('Supabase record links sync notice:', error.message);
      });
    }
  }

  private syncDecisionToSupabase(decision: ScreeningDecision) {
    if (isSupabaseConfigured && supabase) {
      (supabase as any).from('screening_decisions').upsert({
        id: decision.id,
        book_id: decision.book_id,
        record_id: decision.record_id,
        cluster_id: decision.cluster_id,
        status: decision.status,
        exclusion_reason: decision.exclusion_reason,
        is_duplicate: decision.is_duplicate,
        duplicate_of_record_id: decision.duplicate_of_record_id,
        pico_tags: decision.pico_tags,
        decision_type: decision.decision_type,
        notes: decision.notes,
        updated_at: decision.updated_at,
      }).then(({ error }: any) => {
        if (error) console.warn('Supabase decision sync notice:', error.message);
      });
    }
  }

  constructor() {
    if (typeof window !== 'undefined') {
      // Clean up legacy hardcoded demo books / demo user if found from previous sessions
      try {
        const storedUser = localStorage.getItem(this.userKey);
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (
            parsed.id === '00000000-0000-0000-0000-000000000001' ||
            parsed.id === 'usr-offline-researcher' ||
            parsed.email === 'researcher@rayyan-screening.org' ||
            parsed.email === 'lead.investigator@rayyan-screening.org'
          ) {
            localStorage.removeItem(this.userKey);
          }
        }

        const storedBooks = localStorage.getItem(this.booksKey);
        if (storedBooks) {
          const parsedBooks: ResearchBook[] = JSON.parse(storedBooks);
          // Remove default sample books (Metformin / SGLT2)
          const cleanedBooks = parsedBooks.filter(
            (b) => b.id !== 'b1-demo-t2d-metformin' && b.id !== 'b2-demo-sglt2-hf'
          );
          if (cleanedBooks.length !== parsedBooks.length) {
            localStorage.setItem(this.booksKey, JSON.stringify(cleanedBooks));
            const activeId = localStorage.getItem(this.activeBookKey);
            if (activeId === 'b1-demo-t2d-metformin' || activeId === 'b2-demo-sglt2-hf') {
              localStorage.setItem(this.activeBookKey, cleanedBooks[0]?.id || '');
            }
          }
        }

        const storedQVs = localStorage.getItem(this.queryVersionsKey);
        if (storedQVs) {
          const parsedQVs: QueryVersion[] = JSON.parse(storedQVs);
          const cleanedQVs = parsedQVs.filter((qv) => qv.id !== 'qv-demo-01');
          if (cleanedQVs.length !== parsedQVs.length) {
            localStorage.setItem(this.queryVersionsKey, JSON.stringify(cleanedQVs));
          }
        }
      } catch (err) {
        console.warn('LocalStorage cleanup warning:', err);
      }
    }
  }

  getCurrentUser(): Profile | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(this.userKey);
    if (!raw) return null;
    try {
      const parsed: Profile = JSON.parse(raw);
      if (
        !parsed ||
        !parsed.email ||
        parsed.id === '00000000-0000-0000-0000-000000000001' ||
        parsed.id === 'usr-offline-researcher' ||
        parsed.email === 'researcher@rayyan-screening.org' ||
        parsed.email === 'lead.investigator@rayyan-screening.org'
      ) {
        localStorage.removeItem(this.userKey);
        return null;
      }
      return parsed;
    } catch {
      localStorage.removeItem(this.userKey);
      return null;
    }
  }

  setCurrentUser(user: Profile | null, remember: boolean = true): void {
    if (typeof window === 'undefined') return;
    if (user) {
      localStorage.setItem(this.userKey, JSON.stringify(user));
      if (remember && user.email) {
        localStorage.setItem(STORAGE_KEYS.REMEMBERED_EMAIL, user.email);
        localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
      }
    } else {
      localStorage.removeItem(this.userKey);
    }
  }

  getRememberedEmail(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(STORAGE_KEYS.REMEMBERED_EMAIL) || '';
  }

  isRememberMeEnabled(): boolean {
    if (typeof window === 'undefined') return true;
    const val = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
    return val === null ? true : val === 'true';
  }

  getBooks(userId?: string): ResearchBook[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(this.booksKey);
    const allBooks: ResearchBook[] = raw ? JSON.parse(raw) : [];
    if (!userId) return allBooks;
    const userBooks = allBooks.filter((b) => b.user_id === userId);
    return userBooks;
  }

  saveBooks(books: ResearchBook[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.booksKey, JSON.stringify(books));
  }

  getActiveBookId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.activeBookKey);
  }

  setActiveBookId(id: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.activeBookKey, id);
  }

  createBook(
    title: string,
    description: string,
    pico: ResearchBook['pico_config'],
    userId?: string,
    defaultSources?: LiteratureSource[]
  ): ResearchBook {
    const user = this.getCurrentUser();
    const effectiveUserId = userId || user?.id || 'guest-' + Date.now().toString(36);
    const newBook: ResearchBook = {
      id: 'book-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36),
      user_id: effectiveUserId,
      title,
      description,
      pico_config: pico,
      default_sources: defaultSources || ['openalex', 'crossref', 'semanticscholar'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const books = this.getBooks();
    books.unshift(newBook);
    this.saveBooks(books);
    this.setActiveBookId(newBook.id);
    this.syncBookToSupabase(newBook);
    return newBook;
  }

  deleteBook(id: string): void {
    const books = this.getBooks().filter((b) => b.id !== id);
    this.saveBooks(books);
    if (this.getActiveBookId() === id) {
      this.setActiveBookId(books[0]?.id || '');
    }
    this.deleteBookFromSupabase(id);
  }

  getQueryVersions(bookId: string): QueryVersion[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(this.queryVersionsKey);
    const list: QueryVersion[] = raw ? JSON.parse(raw) : [];
    return list.filter(q => q.book_id === bookId).sort((a, b) => b.version_number - a.version_number);
  }

  saveQueryVersion(queryData: Omit<QueryVersion, 'id' | 'created_at'>): QueryVersion {
    const raw = localStorage.getItem(this.queryVersionsKey);
    const list: QueryVersion[] = raw ? JSON.parse(raw) : [];
    
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
    this.syncQueryVersionToSupabase(newVersion);
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
    this.syncRecordsToSupabase(newRecords, queryVersionId);
  }

  addRecords(records: CanonicalRecord[]): void {
    if (typeof window === 'undefined' || !records.length) return;
    const existingRaw = localStorage.getItem(this.recordsKey);
    const all: CanonicalRecord[] = existingRaw ? JSON.parse(existingRaw) : [];
    for (const rec of records) {
      if (!all.some((r) => r.id === rec.id)) {
        all.push(rec);
      }
    }
    localStorage.setItem(this.recordsKey, JSON.stringify(all));

    // Also initialize default unscreened decisions for each record
    const decRaw = localStorage.getItem(this.decisionsKey);
    const decisions: ScreeningDecision[] = decRaw ? JSON.parse(decRaw) : [];
    for (const rec of records) {
      if (!decisions.some((d) => d.record_id === rec.id && d.book_id === rec.book_id)) {
        decisions.push({
          id: 'dec-' + Math.random().toString(36).substring(2, 9),
          book_id: rec.book_id,
          record_id: rec.id,
          cluster_id: rec.cluster_id || 'cluster-' + rec.id,
          status: 'unscreened',
          decision_type: 'machine_suggested',
          exclusion_reason: null,
          notes: `Ingested from ${rec.source_db.toUpperCase()} Search Service Adapter`,
          is_duplicate: false,
          duplicate_of_record_id: null,
          pico_tags: { p: [], i: [], c: [], o: [] },
          updated_at: new Date().toISOString(),
        });
      }
    }
    localStorage.setItem(this.decisionsKey, JSON.stringify(decisions));
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
    if (target) {
      this.syncDecisionToSupabase(target);
    }

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

  // --------------------------------------------------------------------------
  // HACKATHON OFFLINE BENCHMARK SEEDER
  // Populates full protocol, versions v1 & v2, canonical clustered records,
  // decisions, and audit trail for instant offline judge presentation!
  // --------------------------------------------------------------------------
  seedDemoDataset(userId?: string): ResearchBook {
    const effectiveUserId = userId || this.getCurrentUser()?.id || 'reviewer-local-demo';
    const bookId = 'book-hackathon-demo-t2d';

    const demoBook: ResearchBook = {
      id: bookId,
      user_id: effectiveUserId,
      title: 'GLP-1 Receptor Agonists & SGLT2 Inhibitors for Cardiorenal Protection in Type 2 Diabetes',
      description: 'Systematic review evaluating 3-point MACE, cardiovascular mortality, and renal progression across landmark multicenter double-blind randomized controlled trials.',
      pico_config: {
        p: 'Adult patients (age >= 18) with type 2 diabetes mellitus and established cardiovascular or renal risk',
        i: 'GLP-1 receptor agonists (Semaglutide, Liraglutide) or SGLT2 inhibitors (Empagliflozin, Dapagliflozin)',
        c: 'Placebo or standard background glycemic control',
        o: 'Composite 3-point MACE (cardiovascular death, nonfatal MI, nonfatal stroke), heart failure hospitalization, eGFR decline',
        inclusionCriteria: [
          'Phase III/IV double-blind randomized controlled trials',
          'Follow-up duration >= 52 weeks',
          'Confirmed baseline type 2 diabetes mellitus diagnosis',
        ],
        exclusionCriteria: [
          'Animal or non-human experimental models',
          'Observational, retrospective, or non-randomized cohorts',
          'Pediatric populations (< 18 years)',
        ],
      },
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Save or update book in list
    const books = this.getBooks().filter((b) => b.id !== bookId);
    books.unshift(demoBook);
    this.saveBooks(books);
    this.setActiveBookId(bookId);

    // Seed Query Versions v1 and v2 for Level 2 Diff demonstration
    const qv1: QueryVersion = {
      id: 'qv-demo-v1',
      book_id: bookId,
      version_number: 1,
      raw_user_query: 'In adults with type 2 diabetes, does metformin or SGLT2 inhibitors reduce cardiovascular death?',
      boolean_query: '("Type 2 Diabetes"[Title/Abstract]) AND ("Metformin"[Title/Abstract] OR "SGLT2"[Title/Abstract]) AND ("Cardiovascular Death"[Title/Abstract])',
      date_start: '2015',
      date_end: '2026',
      total_hits: 6,
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    };

    const qv2: QueryVersion = {
      id: 'qv-demo-v2',
      book_id: bookId,
      version_number: 2,
      raw_user_query: 'In adults with type 2 diabetes, do SGLT2 inhibitors or GLP-1 receptor agonists reduce 3-point MACE?',
      boolean_query: '("Type 2 Diabetes"[Title/Abstract]) AND ("SGLT2 inhibitor"[Title/Abstract] OR "GLP-1 RA"[Title/Abstract]) AND ("MACE"[Title/Abstract] OR "Mortality"[Title/Abstract])',
      date_start: '2015',
      date_end: '2026',
      total_hits: 8,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    };

    // Update query versions
    const rawQVs = localStorage.getItem(this.queryVersionsKey);
    let qvs: QueryVersion[] = rawQVs ? JSON.parse(rawQVs) : [];
    qvs = qvs.filter((q) => q.book_id !== bookId).concat([qv2, qv1]);
    localStorage.setItem(this.queryVersionsKey, JSON.stringify(qvs));

    // Seed 8 Canonical Records with intentional duplicates
    const records: CanonicalRecord[] = [
      {
        id: 'rec-demo-empa-reg',
        book_id: bookId,
        cluster_id: 'cluster-empa',
        title: 'Empagliflozin, Cardiovascular Outcomes, and Mortality in Type 2 Diabetes (EMPA-REG OUTCOME)',
        abstract: 'BACKGROUND: The effects of empagliflozin, an SGLT2 inhibitor, in patients with type 2 diabetes at high cardiovascular risk are evaluated. Over median 3.1 years, empagliflozin significantly reduced 3-point MACE and all-cause mortality.',
        authors: ['Zinman B', 'Wanner C', 'Lachin JM', 'Fitchett D'],
        journal: 'The New England Journal of Medicine',
        pub_year: 2015,
        doi: '10.1056/NEJMoa1504720',
        pmid: '26378288',
        source_db: 'pubmed',
        raw_metadata: { trial: 'EMPA-REG' },
        created_at: new Date().toISOString(),
      },
      {
        id: 'rec-demo-empa-dup',
        book_id: bookId,
        cluster_id: 'cluster-empa',
        title: 'Empagliflozin, Cardiovascular Outcomes, and Mortality in Type 2 Diabetes.',
        abstract: 'Cardiovascular outcomes trial with empagliflozin in patients with type 2 diabetes and established cardiovascular disease.',
        authors: ['Zinman B', 'Wanner C'],
        journal: 'N Engl J Med',
        pub_year: 2015,
        doi: '10.1056/nejmoa1504720',
        pmid: '26378288',
        source_db: 'europe_pmc',
        raw_metadata: { duplicateOf: 'rec-demo-empa-reg' },
        created_at: new Date().toISOString(),
      },
      {
        id: 'rec-demo-sustain-6',
        book_id: bookId,
        cluster_id: 'cluster-sustain',
        title: 'Semaglutide and Cardiovascular Outcomes in Patients with Type 2 Diabetes (SUSTAIN-6)',
        abstract: 'Patients with type 2 diabetes were randomly assigned to once-weekly semaglutide or placebo. The rate of first occurrence of death from cardiovascular causes, nonfatal MI, or nonfatal stroke was significantly lower with semaglutide.',
        authors: ['Marso SP', 'Bain SC', 'Consoli A', 'Eliaschewitz FG'],
        journal: 'The New England Journal of Medicine',
        pub_year: 2016,
        doi: '10.1056/NEJMoa1607141',
        pmid: '27633186',
        source_db: 'pubmed',
        raw_metadata: { trial: 'SUSTAIN-6' },
        created_at: new Date().toISOString(),
      },
      {
        id: 'rec-demo-sustain-dup',
        book_id: bookId,
        cluster_id: 'cluster-sustain',
        title: 'Semaglutide and Cardiovascular Outcomes in Patients with Type 2 Diabetes.',
        abstract: 'Clinical trial evaluating cardiovascular endpoints with once-weekly subcutaneous semaglutide.',
        authors: ['Marso SP', 'Bain SC'],
        journal: 'New England Journal of Medicine',
        pub_year: 2016,
        doi: '10.1056/nejmoa1607141',
        pmid: '27633186',
        source_db: 'europe_pmc',
        raw_metadata: { duplicateOf: 'rec-demo-sustain-6' },
        created_at: new Date().toISOString(),
      },
      {
        id: 'rec-demo-ukpds-34',
        book_id: bookId,
        cluster_id: 'cluster-ukpds',
        title: 'Effect of intensive blood-glucose control with metformin on complications in overweight patients with type 2 diabetes (UKPDS 34)',
        abstract: 'Over 10 years, in overweight patients assigned intensive control with metformin compared with conventional therapy, metformin showed a 32% reduction for any diabetes-related endpoint and 36% for all-cause mortality.',
        authors: ['UKPDS Group', 'Turner RC', 'Holman RR'],
        journal: 'The Lancet',
        pub_year: 1998,
        doi: '10.1016/S0140-6736(98)07019-6',
        pmid: '9742977',
        source_db: 'pubmed',
        raw_metadata: { trial: 'UKPDS 34' },
        created_at: new Date().toISOString(),
      },
      {
        id: 'rec-demo-dpp',
        book_id: bookId,
        cluster_id: 'cluster-dpp',
        title: 'Reduction in the incidence of type 2 diabetes with lifestyle intervention or metformin (Diabetes Prevention Program)',
        abstract: 'Randomized trial of 3234 nondiabetic persons with elevated fasting glucose. Lifestyle intervention reduced diabetes incidence by 58% and metformin by 31% compared with placebo.',
        authors: ['Knowler WC', 'Barrett-Connor E', 'Fowler SE'],
        journal: 'The New England Journal of Medicine',
        pub_year: 2002,
        doi: '10.1056/NEJMoa012512',
        pmid: '11856794',
        source_db: 'pubmed',
        raw_metadata: { trial: 'DPP' },
        created_at: new Date().toISOString(),
      },
      {
        id: 'rec-demo-deliver',
        book_id: bookId,
        cluster_id: 'cluster-deliver',
        title: 'Dapagliflozin in Heart Failure with Mildly Reduced or Preserved Ejection Fraction (DELIVER Trial)',
        abstract: '6263 patients with HF and LVEF > 40% received dapagliflozin 10 mg or placebo. Dapagliflozin reduced worsening HF and cardiovascular death across diabetic and nondiabetic subgroups.',
        authors: ['Solomon SD', 'McMurray JJV', 'Claggett B'],
        journal: 'The New England Journal of Medicine',
        pub_year: 2022,
        doi: '10.1056/NEJMoa2206286',
        pmid: '36027564',
        source_db: 'pubmed',
        raw_metadata: { trial: 'DELIVER' },
        created_at: new Date().toISOString(),
      },
      {
        id: 'rec-demo-leader',
        book_id: bookId,
        cluster_id: 'cluster-leader',
        title: 'Liraglutide and Cardiovascular Outcomes in Type 2 Diabetes (LEADER Trial)',
        abstract: 'Patients with type 2 diabetes at high risk for cardiovascular disease had significantly lower rates of cardiovascular death and 3-point MACE with liraglutide than with placebo.',
        authors: ['Marso SP', 'Daniels GH', 'Brown-Frandsen K'],
        journal: 'The New England Journal of Medicine',
        pub_year: 2016,
        doi: '10.1056/NEJMoa1603827',
        pmid: '27295427',
        source_db: 'pubmed',
        raw_metadata: { trial: 'LEADER' },
        created_at: new Date().toISOString(),
      },
    ];

    // Save records to book
    this.saveRecords(bookId, records, 'qv-demo-v2');

    // Explicitly seed query_record_links so v1 and v2 have their distinct + shared records
    const v1RecordIds = [
      'rec-demo-empa-reg',
      'rec-demo-empa-dup',
      'rec-demo-ukpds-34',
      'rec-demo-dpp',
    ];
    const v2RecordIds = [
      'rec-demo-empa-reg',
      'rec-demo-empa-dup',
      'rec-demo-sustain-6',
      'rec-demo-sustain-dup',
      'rec-demo-deliver',
      'rec-demo-leader',
    ];

    const seededLinks: QueryRecordLink[] = [
      ...v1RecordIds.map((id) => ({ query_version_id: 'qv-demo-v1', record_id: id })),
      ...v2RecordIds.map((id) => ({ query_version_id: 'qv-demo-v2', record_id: id })),
    ];
    localStorage.setItem(this.linksKey, JSON.stringify(seededLinks));

    // Seed Decisions (Include, Exclude with reasons, Maybe, and Duplicates)
    const decisions: ScreeningDecision[] = [
      {
        id: 'dec-empa',
        book_id: bookId,
        record_id: 'rec-demo-empa-reg',
        cluster_id: 'cluster-empa',
        status: 'include',
        exclusion_reason: null,
        is_duplicate: false,
        duplicate_of_record_id: null,
        pico_tags: { p: ['type 2 diabetes'], i: ['empagliflozin'], c: ['placebo'], o: ['MACE', 'mortality'] },
        decision_type: 'human_confirmed',
        notes: 'Pivotal SGLT2 cardiovascular outcomes trial meeting all inclusion criteria.',
        updated_at: new Date().toISOString(),
      },
      {
        id: 'dec-empa-dup',
        book_id: bookId,
        record_id: 'rec-demo-empa-dup',
        cluster_id: 'cluster-empa',
        status: 'unscreened',
        exclusion_reason: null,
        is_duplicate: true,
        duplicate_of_record_id: 'rec-demo-empa-reg',
        pico_tags: { p: [], i: [], c: [], o: [] },
        decision_type: 'machine_suggested',
        notes: 'Auto-clustered via Tier 1 normalized DOI match (10.1056/nejmoa1504720).',
        updated_at: new Date().toISOString(),
      },
      {
        id: 'dec-sustain',
        book_id: bookId,
        record_id: 'rec-demo-sustain-6',
        cluster_id: 'cluster-sustain',
        status: 'include',
        exclusion_reason: null,
        is_duplicate: false,
        duplicate_of_record_id: null,
        pico_tags: { p: ['type 2 diabetes'], i: ['semaglutide'], c: ['placebo'], o: ['MACE'] },
        decision_type: 'human_confirmed',
        notes: 'Landmark GLP-1 RA trial demonstrating statistically significant 26% MACE risk reduction.',
        updated_at: new Date().toISOString(),
      },
      {
        id: 'dec-sustain-dup',
        book_id: bookId,
        record_id: 'rec-demo-sustain-dup',
        cluster_id: 'cluster-sustain',
        status: 'unscreened',
        exclusion_reason: null,
        is_duplicate: true,
        duplicate_of_record_id: 'rec-demo-sustain-6',
        pico_tags: { p: [], i: [], c: [], o: [] },
        decision_type: 'machine_suggested',
        notes: 'Auto-clustered via Tier 1 DOI match.',
        updated_at: new Date().toISOString(),
      },
      {
        id: 'dec-ukpds',
        book_id: bookId,
        record_id: 'rec-demo-ukpds-34',
        cluster_id: 'cluster-ukpds',
        status: 'include',
        exclusion_reason: null,
        is_duplicate: false,
        duplicate_of_record_id: null,
        pico_tags: { p: ['overweight type 2 diabetes'], i: ['metformin'], c: ['conventional diet'], o: ['complications', 'mortality'] },
        decision_type: 'human_confirmed',
        notes: 'Landmark historical trial establishing metformin as frontline glycemic therapy.',
        updated_at: new Date().toISOString(),
      },
      {
        id: 'dec-dpp',
        book_id: bookId,
        record_id: 'rec-demo-dpp',
        cluster_id: 'cluster-dpp',
        status: 'exclude',
        exclusion_reason: 'Population: Evaluated pre-diabetic impaired glucose tolerance cohorts, not established T2D with primary cardiorenal endpoints.',
        is_duplicate: false,
        duplicate_of_record_id: null,
        pico_tags: { p: ['pre-diabetes'], i: ['metformin'], c: ['placebo'], o: ['incidence'] },
        decision_type: 'human_confirmed',
        notes: 'Excluded on protocol Population criteria (impaired glucose tolerance vs confirmed diabetes).',
        updated_at: new Date().toISOString(),
      },
      {
        id: 'dec-deliver',
        book_id: bookId,
        record_id: 'rec-demo-deliver',
        cluster_id: 'cluster-deliver',
        status: 'maybe',
        exclusion_reason: null,
        is_duplicate: false,
        duplicate_of_record_id: null,
        pico_tags: { p: ['heart failure LVEF > 40%'], i: ['dapagliflozin'], c: ['placebo'], o: ['cardiovascular death'] },
        decision_type: 'human_confirmed',
        notes: 'Includes both diabetic and non-diabetic HFpEF cohorts. Requires full-text review for stratified subgroup analysis.',
        updated_at: new Date().toISOString(),
      },
      {
        id: 'dec-leader',
        book_id: bookId,
        record_id: 'rec-demo-leader',
        cluster_id: 'cluster-leader',
        status: 'include',
        exclusion_reason: null,
        is_duplicate: false,
        duplicate_of_record_id: null,
        pico_tags: { p: ['type 2 diabetes'], i: ['liraglutide'], c: ['placebo'], o: ['MACE', 'CV death'] },
        decision_type: 'human_confirmed',
        notes: 'Meets all PICO inclusion criteria for GLP-1 RA arm.',
        updated_at: new Date().toISOString(),
      },
    ];

    this.saveDecisions(bookId, decisions);

    // Seed Audit Logs
    this.addAuditLog({
      book_id: bookId,
      record_id: 'rec-demo-empa-reg',
      action: 'Initial screening decision recorded: INCLUDE (PICO criteria validated)',
      old_value: null,
      new_value: { status: 'include' },
    });
    this.addAuditLog({
      book_id: bookId,
      record_id: 'rec-demo-dpp',
      action: 'Screening decision: EXCLUDE (Population: Pre-diabetes cohort)',
      old_value: null,
      new_value: { status: 'exclude', reason: 'Population mismatch' },
    });

    return demoBook;
  }
}

export const localStore = new SupabaseStore();
