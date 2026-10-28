/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SUPABASE CONFIGURATION & CONNECTION MODAL
 * Empowers researchers to connect the application directly to their Supabase PostgreSQL instance.
 * Supports direct URL and anon key validation, connection health testing,
 * and 1-click copying of the complete `supabase-schema.sql` database script.
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  RotateCw,
  X,
  ShieldCheck,
  Server,
  KeyRound,
  FileCode,
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUrl?: string;
  currentKey?: string;
  isConfigured: boolean;
  onSaved: (url: string, key: string) => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  currentUrl = '',
  currentKey = '',
  isConfigured,
  onSaved,
}) => {
  const [url, setUrl] = useState(
    currentUrl || (typeof window !== 'undefined' ? localStorage.getItem('mini_rayyan_supabase_url') || '' : '')
  );
  const [anonKey, setAnonKey] = useState(
    currentKey || (typeof window !== 'undefined' ? localStorage.getItem('mini_rayyan_supabase_key') || '' : '')
  );
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();

    if (!cleanUrl || !cleanKey) {
      setTestStatus('error');
      setStatusMessage('Please enter both your Supabase URL and anon public key.');
      return;
    }

    if (!cleanUrl.startsWith('http')) {
      setTestStatus('error');
      setStatusMessage('Supabase URL must start with https://');
      return;
    }

    setIsTesting(true);
    setStatusMessage(null);

    try {
      const testClient = createClient(cleanUrl, cleanKey);
      // Attempt a lightweight query
      const { data, error } = await testClient.from('research_books').select('id').limit(1);

      if (error && error.code !== 'PGRST116') {
        // Table might not exist yet, or auth error
        if (error.message.includes('relation "public.research_books" does not exist')) {
          setTestStatus('success');
          setStatusMessage('Connected to Supabase! (Note: Run the SQL schema script below to create required tables).');
        } else {
          throw error;
        }
      } else {
        setTestStatus('success');
        setStatusMessage('Connection verified successfully! Your Supabase PostgreSQL database is online.');
      }
    } catch (err: any) {
      setTestStatus('error');
      setStatusMessage(err.message || 'Unable to connect to Supabase with provided credentials.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndApply = () => {
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();

    if (typeof window !== 'undefined') {
      localStorage.setItem('mini_rayyan_supabase_url', cleanUrl);
      localStorage.setItem('mini_rayyan_supabase_key', cleanKey);
    }

    onSaved(cleanUrl, cleanKey);
    onClose();
    window.location.reload();
  };

  const handleCopySqlSchema = () => {
    const schemaSql = `-- MINI-RAYYAN MEDICAL SCREENING PLATFORM
-- SUPABASE POSTGRESQL SCHEMA WITH ROW-LEVEL SECURITY (RLS)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.research_books (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  pico_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

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
  source_db TEXT NOT NULL,
  raw_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.query_record_links (
  query_version_id TEXT NOT NULL REFERENCES public.query_versions(id) ON DELETE CASCADE,
  record_id TEXT NOT NULL REFERENCES public.canonical_records(id) ON DELETE CASCADE,
  PRIMARY KEY (query_version_id, record_id)
);

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

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES public.research_books(id) ON DELETE CASCADE,
  record_id TEXT,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.run_logs (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES public.research_books(id) ON DELETE CASCADE,
  query_version_id TEXT NOT NULL,
  pipeline_step TEXT NOT NULL,
  status TEXT NOT NULL,
  records_processed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_record_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screening_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own research books" ON public.research_books FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own query versions" ON public.query_versions FOR ALL USING (EXISTS (SELECT 1 FROM public.research_books WHERE id = query_versions.book_id AND user_id = auth.uid()));
CREATE POLICY "Users manage own records" ON public.canonical_records FOR ALL USING (EXISTS (SELECT 1 FROM public.research_books WHERE id = canonical_records.book_id AND user_id = auth.uid()));
CREATE POLICY "Users manage own decisions" ON public.screening_decisions FOR ALL USING (EXISTS (SELECT 1 FROM public.research_books WHERE id = screening_decisions.book_id AND user_id = auth.uid()));
CREATE POLICY "Users manage own links" ON public.query_record_links FOR ALL USING (TRUE);
CREATE POLICY "Users manage own audit logs" ON public.audit_logs FOR ALL USING (TRUE);
CREATE POLICY "Users manage own run logs" ON public.run_logs FOR ALL USING (TRUE);
`;

    navigator.clipboard.writeText(schemaSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const modalNode = (
    <div 
      className="fixed inset-0 z-[9999] flex items-start justify-center p-3 sm:p-5 pt-3 sm:pt-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Supabase Database Connection"
    >
      <div 
        className="relative w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-3xl theme-glass-card shadow-2xl overflow-hidden border border-[var(--border-card)]"
        style={{ backgroundColor: 'var(--bg-canvas)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--glass-card-bg)] shrink-0">
          <div className="flex items-center gap-3">
            <div 
              className="p-2.5 rounded-2xl flex items-center justify-center shadow-md"
              style={{ backgroundColor: 'var(--pico-p-bg)', color: 'var(--accent-primary)' }}
            >
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-display" style={{ color: 'var(--text-primary)' }}>
                Supabase Database Connection
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                All review data, PICO versions, and screening decisions reside directly in Supabase.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1.5 rounded-xl theme-glass-input hover:brightness-110 transition cursor-pointer flex items-center gap-1.5"
            style={{ color: 'var(--text-muted)' }}
            title="Close modal (Esc)"
            aria-label="Close modal"
          >
            <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded border border-[var(--border-subtle)] text-[var(--text-muted)] bg-[var(--bg-canvas)]">ESC</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Status Alert */}
          <div 
            className="p-4 rounded-2xl border flex items-start gap-3"
            style={{ 
              backgroundColor: isConfigured ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              borderColor: isConfigured ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)',
              color: isConfigured ? '#10b981' : '#f59e0b'
            }}
          >
            {isConfigured ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-0.5">
              <span className="font-bold">
                {isConfigured ? 'Supabase Database Connected' : 'Supabase Connection Required'}
              </span>
              <p className="opacity-90 leading-relaxed text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                {isConfigured
                  ? 'Your workspace is syncing directly to your remote Supabase PostgreSQL database.'
                  : 'The local database mock has been disabled. Connect your Supabase project below to save your systematic review data.'}
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Supabase Project URL
              </label>
              <div className="relative flex items-center">
                <Server className="w-4 h-4 absolute left-3.5 opacity-40 pointer-events-none" />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://your-project-ref.supabase.co"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl theme-glass-input text-xs font-mono outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
              <span className="text-[10px] font-mono opacity-60 mt-1 block" style={{ color: 'var(--text-muted)' }}>
                Found in Supabase Dashboard &gt; Project Settings &gt; API
              </span>
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Supabase Anon (Public) Key
              </label>
              <div className="relative flex items-center">
                <KeyRound className="w-4 h-4 absolute left-3.5 opacity-40 pointer-events-none" />
                <input
                  type="password"
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl theme-glass-input text-xs font-mono outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
              <span className="text-[10px] font-mono opacity-60 mt-1 block" style={{ color: 'var(--text-muted)' }}>
                Safe to use in frontend. Grants access according to Row Level Security (RLS) policies.
              </span>
            </div>

            {/* Test Status Message */}
            {statusMessage && (
              <div className={`p-3 rounded-xl text-xs border ${
                testStatus === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                {statusMessage}
              </div>
            )}

            {/* Test Connection Button */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="theme-glass-input hover:brightness-110 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition"
                style={{ color: 'var(--text-primary)' }}
              >
                <RotateCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'Testing Connection...' : 'Test Connection'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopySqlSchema}
                className="theme-glass-input hover:brightness-110 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition text-cyan-400"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Schema Copied!' : 'Copy Supabase SQL Schema'}</span>
              </button>
            </div>
          </div>

          {/* Setup Hint */}
          <div className="p-4 rounded-2xl theme-glass-panel border border-[var(--border-subtle)] space-y-2 text-xs">
            <span className="font-bold flex items-center gap-1.5" style={{ color: 'var(--accent-primary)' }}>
              <ShieldCheck className="w-4 h-4" />
              <span>How to setup your Supabase project in 60 seconds:</span>
            </span>
            <ol className="list-decimal list-inside space-y-1 opacity-80 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              <li>Create a free database at <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline">supabase.com</a>.</li>
              <li>Open <strong>SQL Editor</strong> &gt; click <strong>"Copy Supabase SQL Schema"</strong> above &gt; paste and click <strong>Run</strong>.</li>
              <li>Copy your Project URL and anon key from <strong>Project Settings &gt; API</strong> into the fields above or <code className="font-mono">.env.local</code>.</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--glass-card-bg)] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono opacity-60 hover:opacity-100 cursor-pointer flex items-center gap-1.5"
            style={{ color: 'var(--text-muted)' }}
          >
            <span>Cancel</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">ESC</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAndApply}
            className="theme-primary-btn px-6 py-2.5 text-xs font-bold rounded-xl cursor-pointer shadow-lg flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Save &amp; Connect to Supabase</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
};
