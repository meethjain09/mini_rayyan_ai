-- ============================================================================
-- MINI-RAYYAN MEDICAL SCREENING PLATFORM
-- SUPABASE POSTGRESQL SCHEMA WITH ROW-LEVEL SECURITY (RLS)
-- ============================================================================
-- Run this script in your Supabase Project:
-- Dashboard > SQL Editor > New Query > Paste & Run.
-- ============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. User Profiles Table (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Auto-create profile trigger on new Supabase signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at)
  VALUES (new.id, new.email, NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Research Books Table (Workspaces)
CREATE TABLE IF NOT EXISTS public.research_books (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  pico_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 4. Query Versions Table (Level 2 Loop tracking)
CREATE TABLE IF NOT EXISTS public.query_versions (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES public.research_books(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  raw_user_query TEXT NOT NULL,
  boolean_query TEXT NOT NULL,
  date_start TEXT,
  date_end TEXT,
  total_hits INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 5. Canonical Records Table (All Literature Records from PubMed & Europe PMC)
-- Non-negotiable rule: NO HARD DELETIONS
CREATE TABLE IF NOT EXISTS public.canonical_records (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES public.research_books(id) ON DELETE CASCADE,
  cluster_id TEXT,
  title TEXT NOT NULL,
  abstract TEXT,
  authors TEXT[] DEFAULT '{}',
  journal TEXT,
  pub_year INTEGER,
  doi TEXT,
  pmid TEXT,
  source_db TEXT NOT NULL CHECK (source_db IN ('pubmed', 'europe_pmc')),
  raw_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Indexes for lightning fast deduplication
CREATE INDEX IF NOT EXISTS idx_records_doi ON public.canonical_records(doi);
CREATE INDEX IF NOT EXISTS idx_records_pmid ON public.canonical_records(pmid);
CREATE INDEX IF NOT EXISTS idx_records_cluster ON public.canonical_records(cluster_id);
CREATE INDEX IF NOT EXISTS idx_records_book ON public.canonical_records(book_id);

-- 6. Query Record Links (Junction table linking searches to papers)
CREATE TABLE IF NOT EXISTS public.query_record_links (
  query_version_id TEXT NOT NULL REFERENCES public.query_versions(id) ON DELETE CASCADE,
  record_id TEXT NOT NULL REFERENCES public.canonical_records(id) ON DELETE CASCADE,
  PRIMARY KEY (query_version_id, record_id)
);

-- 7. Screening Decisions Table (Include, Exclude, Maybe + Reviewer Notes)
CREATE TABLE IF NOT EXISTS public.screening_decisions (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES public.research_books(id) ON DELETE CASCADE,
  record_id TEXT NOT NULL REFERENCES public.canonical_records(id) ON DELETE CASCADE,
  cluster_id TEXT,
  status TEXT NOT NULL DEFAULT 'unscreened' CHECK (status IN ('include', 'exclude', 'maybe', 'unscreened')),
  exclusion_reason TEXT,
  is_duplicate BOOLEAN DEFAULT FALSE NOT NULL,
  duplicate_of_record_id TEXT,
  pico_tags JSONB DEFAULT '{"p":[], "i":[], "c":[], "o":[]}'::jsonb,
  decision_type TEXT DEFAULT 'unscreened' CHECK (decision_type IN ('machine_suggested', 'human_confirmed', 'human_override', 'unscreened')),
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 8. Immutable Audit Log Table (Every Reviewer Override is Logged)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES public.research_books(id) ON DELETE CASCADE,
  record_id TEXT,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 9. Run Logs Table
CREATE TABLE IF NOT EXISTS public.run_logs (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES public.research_books(id) ON DELETE CASCADE,
  query_version_id TEXT NOT NULL,
  pipeline_step TEXT NOT NULL,
  status TEXT NOT NULL,
  records_processed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures each authenticated user only accesses their own research data
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_record_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screening_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read and update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Research Books: Users have full CRUD on their own books
CREATE POLICY "Users manage own research books" ON public.research_books
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Query Versions: Users manage query versions belonging to their books
CREATE POLICY "Users manage query versions" ON public.query_versions
  FOR ALL USING (
    book_id IN (SELECT id FROM public.research_books WHERE user_id = auth.uid())
  );

-- Canonical Records: Users manage records belonging to their books
CREATE POLICY "Users manage canonical records" ON public.canonical_records
  FOR ALL USING (
    book_id IN (SELECT id FROM public.research_books WHERE user_id = auth.uid())
  );

-- Query Record Links: Access controlled via book ownership
CREATE POLICY "Users manage query record links" ON public.query_record_links
  FOR ALL USING (
    record_id IN (
      SELECT id FROM public.canonical_records WHERE book_id IN (
        SELECT id FROM public.research_books WHERE user_id = auth.uid()
      )
    )
  );

-- Screening Decisions: Users manage decisions for their books
CREATE POLICY "Users manage screening decisions" ON public.screening_decisions
  FOR ALL USING (
    book_id IN (SELECT id FROM public.research_books WHERE user_id = auth.uid())
  );

-- Audit Logs: Users can view and insert audit logs for their books
CREATE POLICY "Users manage audit logs" ON public.audit_logs
  FOR ALL USING (
    book_id IN (SELECT id FROM public.research_books WHERE user_id = auth.uid())
  );

-- Run Logs: Users manage run logs for their books
CREATE POLICY "Users manage run logs" ON public.run_logs
  FOR ALL USING (
    book_id IN (SELECT id FROM public.research_books WHERE user_id = auth.uid())
  );
