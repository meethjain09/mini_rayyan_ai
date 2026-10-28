/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MINI-RAYYAN SCREENING DASHBOARD (PHASE 4)
 * High-performance 3-column systematic review screening workspace.
 * Features automated heuristic rules, inline PICO highlighting,
 * 1-click & keyboard hotkey screening (Include [I], Exclude [E], Maybe [M]),
 * zero hard deletions, and immutable audit tracking.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  HelpCircle,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ArrowUpDown,
  FileSpreadsheet,
  Layers,
  History,
  AlertTriangle,
  RotateCcw,
  Tag,
  BookOpen,
  Keyboard,
  ShieldCheck,
  Check,
  X,
  Copy,
  Info
} from 'lucide-react';
import {
  CanonicalRecord,
  ResearchBook,
  ScreeningDecision,
  ScreeningStatus,
  PicoTags,
  AuditLog,
  LiteratureSource,
} from '../../types/database';
import { LITERATURE_SOURCES_CONFIG } from '../../lib/literatureApi';
import { localStore } from '../../lib/supabase';
import {
  evaluateRecordScreening,
  STANDARD_EXCLUSION_REASONS,
  HeuristicRuleFlag,
} from '../../lib/screeningRules';
import { ThemeMode } from '../../types/theme';
import { InlinePicoAbstract } from './InlinePicoAbstract';
import { PrismaReportModal } from './PrismaReportModal';
import { AiEvidenceConclusionModal } from './AiEvidenceConclusionModal';
import { sortRecordsBySourcePriority, hasSubstantialAbstract } from '../../utils/recordSorting';

interface ScreeningDashboardProps {
  book: ResearchBook;
  onBackToFetch?: () => void;
  currentTheme?: ThemeMode;
}

export const ScreeningDashboard: React.FC<ScreeningDashboardProps> = ({
  book,
  onBackToFetch,
  currentTheme,
}) => {
  // Database State
  const [records, setRecords] = useState<CanonicalRecord[]>([]);
  const [decisions, setDecisions] = useState<ScreeningDecision[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  // Filters State
  const [statusFilter, setStatusFilter] = useState<'all' | 'include' | 'exclude' | 'maybe' | 'unscreened' | 'duplicates'>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [sourceDbFilter, setSourceDbFilter] = useState<'all' | LiteratureSource>('all');
  const [heuristicFilter, setHeuristicFilter] = useState<'all' | 'flag_animal' | 'flag_language' | 'flag_review' | 'flag_rct'>('all');

  // UI Modal State
  const [isPrismaModalOpen, setIsPrismaModalOpen] = useState(false);
  const [isConclusionModalOpen, setIsConclusionModalOpen] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [activeTabReader, setActiveTabReader] = useState<'abstract' | 'audit' | 'raw'>('abstract');

  // Load records, decisions, and audit logs
  const reloadData = useCallback(() => {
    const fetchedRecords = localStore.getRecords(book.id);
    let currentDecisions = localStore.getDecisions(book.id);

    // If records exist but some lack decisions, initialize them with heuristics
    let decisionsModified = false;
    const updatedDecisions = [...currentDecisions];

    fetchedRecords.forEach((rec) => {
      let dec = updatedDecisions.find((d) => d.record_id === rec.id);
      if (!dec) {
        // Run heuristic screening evaluation
        const evalResult = evaluateRecordScreening(rec, book.pico_config);
        dec = {
          id: 'dec-' + rec.id,
          book_id: book.id,
          record_id: rec.id,
          cluster_id: rec.cluster_id,
          status: evalResult.suggestedStatus,
          exclusion_reason: evalResult.suggestedReason,
          is_duplicate: false,
          duplicate_of_record_id: null,
          pico_tags: evalResult.picoTags,
          decision_type: 'machine_suggested',
          notes: null,
          updated_at: new Date().toISOString(),
        };
        updatedDecisions.push(dec);
        decisionsModified = true;
      }
    });

    if (decisionsModified) {
      localStore.saveDecisions(book.id, updatedDecisions);
      currentDecisions = updatedDecisions;
    }

    setRecords(fetchedRecords);
    setDecisions(currentDecisions);
    setAuditLogs(localStore.getAuditLogs(book.id));

    // If no record is selected, default to first screenable record
    if (!selectedRecordId && fetchedRecords.length > 0) {
      const firstNonDup = fetchedRecords.find((r) => {
        const d = currentDecisions.find((dec) => dec.record_id === r.id);
        return !d?.is_duplicate;
      });
      setSelectedRecordId(firstNonDup ? firstNonDup.id : fetchedRecords[0].id);
    }
  }, [book.id, book.pico_config, selectedRecordId]);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  // Map of decisions by record_id
  const decisionMap = useMemo(() => {
    const map = new Map<string, ScreeningDecision>();
    decisions.forEach((d) => map.set(d.record_id, d));
    return map;
  }, [decisions]);

  // Precompute heuristics for records
  const heuristicsMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof evaluateRecordScreening>>();
    records.forEach((r) => {
      map.set(r.id, evaluateRecordScreening(r, book.pico_config));
    });
    return map;
  }, [records, book.pico_config]);

  // Metrics for Sidebar Badges
  const metrics = useMemo(() => {
    const nonDuplicates = records.filter((r) => !decisionMap.get(r.id)?.is_duplicate);
    const duplicates = records.filter((r) => decisionMap.get(r.id)?.is_duplicate);

    const included = nonDuplicates.filter((r) => decisionMap.get(r.id)?.status === 'include');
    const excluded = nonDuplicates.filter((r) => decisionMap.get(r.id)?.status === 'exclude');
    const maybe = nonDuplicates.filter((r) => decisionMap.get(r.id)?.status === 'maybe');
    const unscreened = nonDuplicates.filter((r) => {
      const s = decisionMap.get(r.id)?.status;
      return !s || s === 'unscreened';
    });

    return {
      all: nonDuplicates.length,
      included: included.length,
      excluded: excluded.length,
      maybe: maybe.length,
      unscreened: unscreened.length,
      duplicates: duplicates.length,
    };
  }, [records, decisionMap]);

  // Filtered & Sorted Records List (PubMed & Europe PMC articles given top priority)
  const filteredRecords = useMemo(() => {
    const matched = records.filter((rec) => {
      const dec = decisionMap.get(rec.id);
      const isDup = !!dec?.is_duplicate;

      // 1. Status Filter
      if (statusFilter === 'duplicates') {
        if (!isDup) return false;
      } else {
        // By default, hide duplicates from normal screening views
        if (isDup) return false;

        if (statusFilter === 'include' && dec?.status !== 'include') return false;
        if (statusFilter === 'exclude' && dec?.status !== 'exclude') return false;
        if (statusFilter === 'maybe' && dec?.status !== 'maybe') return false;
        if (statusFilter === 'unscreened' && dec?.status !== 'unscreened') return false;
      }

      // 2. Source DB Filter
      if (sourceDbFilter !== 'all' && rec.source_db !== sourceDbFilter) return false;

      // 3. Heuristic Filter
      if (heuristicFilter !== 'all') {
        const heur = heuristicsMap.get(rec.id);
        if (!heur) return false;
        if (heuristicFilter === 'flag_animal' && !heur.flags.some((f) => f.type === 'animal')) return false;
        if (heuristicFilter === 'flag_language' && !heur.flags.some((f) => f.type === 'language')) return false;
        if (heuristicFilter === 'flag_review' && !heur.flags.some((f) => f.type === 'review')) return false;
        if (heuristicFilter === 'flag_rct' && !heur.flags.some((f) => f.type === 'rct')) return false;
      }

      // 4. Search Filter
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const inTitle = (rec.title || '').toLowerCase().includes(q);
        const inAbstract = (rec.abstract || '').toLowerCase().includes(q);
        const inAuthors = (rec.authors || []).some((a) => a.toLowerCase().includes(q));
        const inDoi = (rec.doi || '').toLowerCase().includes(q);
        const inPmid = (rec.pmid || '').toLowerCase().includes(q);
        if (!inTitle && !inAbstract && !inAuthors && !inDoi && !inPmid) return false;
      }

      return true;
    });

    return sortRecordsBySourcePriority(matched);
  }, [records, decisionMap, statusFilter, sourceDbFilter, heuristicFilter, searchFilter, heuristicsMap]);

  // Active Record
  const activeRecord = useMemo(() => {
    return records.find((r) => r.id === selectedRecordId) || filteredRecords[0] || null;
  }, [records, selectedRecordId, filteredRecords]);

  const activeDecision = useMemo(() => {
    if (!activeRecord) return null;
    return decisionMap.get(activeRecord.id) || null;
  }, [activeRecord, decisionMap]);

  const activeHeuristic = useMemo(() => {
    if (!activeRecord) return null;
    return heuristicsMap.get(activeRecord.id) || null;
  }, [activeRecord, heuristicsMap]);

  const activeAuditLogs = useMemo(() => {
    if (!activeRecord) return [];
    return auditLogs.filter((l) => l.record_id === activeRecord.id);
  }, [activeRecord, auditLogs]);

  // Reviewer Decision Action Handlers
  const handleSetDecision = (status: ScreeningStatus, reason: string | null = null) => {
    if (!activeRecord) return;

    const currentDec = activeDecision;
    const newReason = status === 'exclude' ? (reason || currentDec?.exclusion_reason || 'Protocol exclusion criteria met') : null;

    localStore.updateDecisionWithAudit(
      book.id,
      activeRecord.id,
      {
        status,
        exclusion_reason: newReason,
        decision_type: 'human_confirmed',
      },
      `Reviewer set decision to ${status.toUpperCase()}${newReason ? ` (${newReason})` : ''}`
    );

    reloadData();

    // Auto-advance to next record in list if available
    const currentIndex = filteredRecords.findIndex((r) => r.id === activeRecord.id);
    if (currentIndex >= 0 && currentIndex < filteredRecords.length - 1) {
      setSelectedRecordId(filteredRecords[currentIndex + 1].id);
    }
  };

  const handleUpdateNotes = (notes: string) => {
    if (!activeRecord) return;
    localStore.updateDecisionWithAudit(
      book.id,
      activeRecord.id,
      { notes },
      'Reviewer updated study notes'
    );
    reloadData();
  };

  const handleUpdatePicoTags = (newTags: PicoTags) => {
    if (!activeRecord) return;
    localStore.updateDecisionWithAudit(
      book.id,
      activeRecord.id,
      { pico_tags: newTags },
      'Reviewer updated PICO span tags'
    );
    reloadData();
  };

  const handleAcceptMachineSuggestion = () => {
    if (!activeRecord || !activeHeuristic) return;
    handleSetDecision(activeHeuristic.suggestedStatus, activeHeuristic.suggestedReason);
  };

  // Keyboard Hotkeys Listener: I (Include), E (Exclude), M (Maybe), U (Unscreened), ArrowDown/J, ArrowUp/K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger hotkeys if user is focused inside an input/textarea
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') {
        return;
      }

      if (!activeRecord) return;

      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        handleSetDecision('include', null);
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        handleSetDecision('exclude', activeHeuristic?.suggestedReason || 'Protocol exclusion criteria met');
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleSetDecision('maybe', null);
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        handleSetDecision('unscreened', null);
      } else if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        const idx = filteredRecords.findIndex((r) => r.id === activeRecord.id);
        if (idx >= 0 && idx < filteredRecords.length - 1) {
          setSelectedRecordId(filteredRecords[idx + 1].id);
        }
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        const idx = filteredRecords.findIndex((r) => r.id === activeRecord.id);
        if (idx > 0) {
          setSelectedRecordId(filteredRecords[idx - 1].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeRecord, filteredRecords, activeHeuristic]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl theme-glass-card">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full theme-glass-input text-[11px] font-mono tracking-wider" style={{ color: 'var(--accent-primary)' }}>
              PHASE 4 &amp; 5: RAYYAN SYSTEMATIC SCREENING &amp; PICO ENGINE
            </span>
            <span className="text-xs font-mono opacity-50" style={{ color: 'var(--text-muted)' }}>
              Book ID: {book.id.substring(0, 8)}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight font-display" style={{ color: 'var(--text-primary)' }}>
            Abstract Screening &amp; Decision Hub
          </h1>
          <p className="text-xs font-sans mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Protocol: <span className="font-semibold">{book.title}</span> · Zero hard deletions, human-in-the-loop decisions, immutable audit logs.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
            className="theme-glass-input px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-1.5 cursor-pointer opacity-80 hover:opacity-100"
            style={{ color: 'var(--text-primary)' }}
            title="View fast keyboard hotkeys"
          >
            <Keyboard className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
            <span>Hotkeys [I/E/M]</span>
          </button>

          <button
            type="button"
            onClick={() => setIsConclusionModalOpen(true)}
            className="theme-primary-btn px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white hover:brightness-110 transition"
            title="Synthesize an evidence-based conclusion answering your research query from all included papers"
          >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            <span>Conclude with AI ({metrics.included})</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPrismaModalOpen(true)}
            className="theme-primary-btn px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>PRISMA 2020 &amp; Export</span>
          </button>

          {onBackToFetch && (
            <button
              type="button"
              onClick={onBackToFetch}
              className="theme-glass-input px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-1 cursor-pointer opacity-70 hover:opacity-100"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back to Ingestion</span>
            </button>
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts Helper Drawer */}
      {showKeyboardHelp && (
        <div className="theme-glass-card rounded-2xl p-4 border flex flex-wrap items-center justify-between gap-4 text-xs font-mono" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-6 flex-wrap">
            <span className="font-bold flex items-center gap-1.5" style={{ color: 'var(--accent-primary)' }}>
              <Keyboard className="w-4 h-4" />
              <span>Quick Hotkeys:</span>
            </span>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">I</kbd>
              <span>Include Study</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40">E</kbd>
              <span>Exclude Study</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">M</kbd>
              <span>Mark Maybe</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 rounded bg-gray-500/20 text-gray-300 font-bold border border-gray-500/40">U</kbd>
              <span>Reset Unscreened</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/40">J / ↓</kbd>
              <span>Next Record</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/40">K / ↑</kbd>
              <span>Prev Record</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowKeyboardHelp(false)}
            className="p-1 opacity-60 hover:opacity-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main 3-Column Systematic Review Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ================================================================= */}
        {/* COLUMN 1: FILTERS & FACETS SIDEBAR (3 cols)                       */}
        {/* ================================================================= */}
        <div className="lg:col-span-3 space-y-4">
          <div className="theme-glass-card rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase" style={{ color: 'var(--text-primary)' }}>
                <Filter className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
                <span>Screening Facets</span>
              </div>
              <span className="text-[10px] font-mono opacity-50" style={{ color: 'var(--text-muted)' }}>
                {records.length} records
              </span>
            </div>

            {/* Decision Status Filter Radios */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Decision Status
              </span>

              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                  statusFilter === 'all' ? 'theme-primary-btn font-semibold shadow-xs' : 'theme-glass-input opacity-75 hover:opacity-100'
                }`}
              >
                <span>All Active Studies</span>
                <span className="font-mono text-[11px] tabular-nums font-bold">{metrics.all}</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('include')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                  statusFilter === 'include'
                    ? 'ring-1 ring-emerald-400 font-semibold'
                    : 'theme-glass-input opacity-75 hover:opacity-100'
                }`}
                style={statusFilter === 'include' ? { backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399' } : {}}
              >
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Included</span>
                </div>
                <span className="font-mono text-[11px] tabular-nums font-bold text-emerald-400">{metrics.included}</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('exclude')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                  statusFilter === 'exclude'
                    ? 'ring-1 ring-rose-400 font-semibold'
                    : 'theme-glass-input opacity-75 hover:opacity-100'
                }`}
                style={statusFilter === 'exclude' ? { backgroundColor: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' } : {}}
              >
                <div className="flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Excluded</span>
                </div>
                <span className="font-mono text-[11px] tabular-nums font-bold text-rose-400">{metrics.excluded}</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('maybe')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                  statusFilter === 'maybe'
                    ? 'ring-1 ring-amber-400 font-semibold'
                    : 'theme-glass-input opacity-75 hover:opacity-100'
                }`}
                style={statusFilter === 'maybe' ? { backgroundColor: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' } : {}}
              >
                <div className="flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Maybe / Unclear</span>
                </div>
                <span className="font-mono text-[11px] tabular-nums font-bold text-amber-400">{metrics.maybe}</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('unscreened')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                  statusFilter === 'unscreened' ? 'theme-primary-btn font-semibold shadow-xs' : 'theme-glass-input opacity-75 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-gray-400" />
                  <span>Unscreened</span>
                </div>
                <span className="font-mono text-[11px] tabular-nums opacity-80">{metrics.unscreened}</span>
              </button>

              {/* Duplicates Tab */}
              <button
                type="button"
                onClick={() => setStatusFilter('duplicates')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all mt-2 border border-purple-500/30 ${
                  statusFilter === 'duplicates'
                    ? 'ring-1 ring-purple-400 font-semibold bg-purple-500/20 text-purple-300'
                    : 'theme-glass-input opacity-75 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <span>Duplicates Clustered</span>
                </div>
                <span className="font-mono text-[11px] tabular-nums font-bold text-purple-400">{metrics.duplicates}</span>
              </button>
            </div>

            {/* Heuristic Rules Filter */}
            <div className="space-y-1.5 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                Rule Flags Filter
              </span>

              <select
                value={heuristicFilter}
                onChange={(e) => setHeuristicFilter(e.target.value as any)}
                className="w-full theme-glass-input px-2.5 py-1.5 rounded-xl text-xs outline-none font-mono cursor-pointer"
                style={{ color: 'var(--text-primary)' }}
              >
                <option value="all">All Automated Heuristics</option>
                <option value="flag_animal">🚩 Flagged Animal Model</option>
                <option value="flag_language">🚩 Flagged Non-English</option>
                <option value="flag_review">🚩 Flagged Review / Case Report</option>
                <option value="flag_rct">✓ Confirmed RCT Evidence</option>
              </select>
            </div>

            {/* Source Database Filter */}
            <div className="space-y-1.5 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                Source Database
              </span>
              <select
                value={sourceDbFilter}
                onChange={(e) => setSourceDbFilter(e.target.value as any)}
                className="w-full theme-glass-input px-2.5 py-1.5 rounded-xl text-xs outline-none font-mono cursor-pointer"
                style={{ color: 'var(--text-primary)' }}
              >
                <option value="all">All Catalogs ({records.length})</option>
                <option value="openalex">OpenAlex Graph</option>
                <option value="crossref">Crossref DOI Registry</option>
                <option value="semanticscholar">Semantic Scholar</option>
                <option value="pubmed">PubMed E-utilities</option>
                <option value="europe_pmc">Europe PMC</option>
                <option value="arxiv">arXiv Preprints</option>
                <option value="doaj">DOAJ Open Access</option>
                <option value="core">CORE Repositories</option>
              </select>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* COLUMN 2: RECORD LIST (4 cols)                                    */}
        {/* ================================================================= */}
        <div className="lg:col-span-4 space-y-3">
          {/* Quick Search in List */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Search in title, author, DOI, PMID..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full theme-glass-input rounded-xl pl-9 pr-3 py-2 text-xs outline-none font-sans"
              style={{ color: 'var(--text-primary)' }}
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => setSearchFilter('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 cursor-pointer text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono px-1" style={{ color: 'var(--text-muted)' }}>
            <span>Showing {filteredRecords.length} studies</span>
            <span>Click study or use J/K</span>
          </div>

          {/* List Container with Scroll */}
          <div
            className="space-y-2.5 overflow-y-auto pr-1"
            style={{ maxHeight: 'calc(100vh - 280px)', minHeight: '400px' }}
          >
            {filteredRecords.length === 0 ? (
              <div className="p-8 rounded-2xl theme-glass-card text-center space-y-2">
                <BookOpen className="w-8 h-8 mx-auto opacity-30" style={{ color: 'var(--text-muted)' }} />
                <p className="text-xs font-mono font-medium" style={{ color: 'var(--text-secondary)' }}>
                  No studies match the active filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    setSearchFilter('');
                    setSourceDbFilter('all');
                    setHeuristicFilter('all');
                  }}
                  className="theme-glass-input px-3 py-1 rounded-lg text-xs font-mono cursor-pointer mt-2"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              filteredRecords.map((rec) => {
                const dec = decisionMap.get(rec.id);
                const heur = heuristicsMap.get(rec.id);
                const isSelected = activeRecord?.id === rec.id;

                const getStatusPill = () => {
                  if (dec?.is_duplicate) {
                    return (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        DUPLICATE
                      </span>
                    );
                  }
                  switch (dec?.status) {
                    case 'include':
                      return (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          INCLUDED
                        </span>
                      );
                    case 'exclude':
                      return (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          EXCLUDED
                        </span>
                      );
                    case 'maybe':
                      return (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          MAYBE
                        </span>
                      );
                    default:
                      return (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium opacity-60 theme-glass-input">
                          UNSCREENED
                        </span>
                      );
                  }
                };

                return (
                  <div
                    key={rec.id}
                    onClick={() => setSelectedRecordId(rec.id)}
                    className={`p-3.5 rounded-2xl cursor-pointer transition-all text-left relative ${
                      isSelected
                        ? 'theme-glass-panel shadow-md border'
                        : 'theme-glass-card hover:opacity-90 opacity-80'
                    }`}
                    style={isSelected ? { borderColor: 'var(--accent-primary)', transform: 'translateY(-1px)' } : {}}
                  >
                    {/* Header Row: Decision Pill + Source Badge */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {getStatusPill()}
                        {heur?.flags?.find((f) => f.isExclusionTrigger) && (
                          <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-rose-500/10 text-rose-400">
                            🚩 {heur.flags.find((f) => f.isExclusionTrigger)?.type}
                          </span>
                        )}
                        {heur?.flags?.some((f) => f.type === 'rct') && (
                          <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-400">
                            ✓ RCT
                          </span>
                        )}
                        {hasSubstantialAbstract(rec) && (
                          <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            ABSTRACT READY
                          </span>
                        )}
                      </div>

                      <span
                        className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border shrink-0 font-bold ${
                          LITERATURE_SOURCES_CONFIG[rec.source_db]?.badgeClass || 'bg-gray-500/20 text-gray-300'
                        }`}
                      >
                        {LITERATURE_SOURCES_CONFIG[rec.source_db]?.shortName || rec.source_db.toUpperCase()}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-xs font-bold leading-snug line-clamp-2 font-display" style={{ color: 'var(--text-primary)' }}>
                      {rec.title}
                    </h3>

                    {/* Meta info: Author, Year, Journal */}
                    <div className="mt-2 flex items-center justify-between text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                      <span className="truncate max-w-[180px]">
                        {rec.authors?.[0] ? `${rec.authors[0]} et al.` : 'Unknown author'}
                      </span>
                      <span>{rec.pub_year || 'N/A'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* COLUMN 3: DEEP ABSTRACT READER & DECISION TERMINAL (5 cols)       */}
        {/* ================================================================= */}
        <div className="lg:col-span-5 space-y-4">
          {activeRecord ? (
            <div className="theme-glass-card rounded-3xl p-5 sm:p-6 space-y-5">
              {/* Active Article Metadata Header */}
              <div className="space-y-2 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md border font-bold ${
                        LITERATURE_SOURCES_CONFIG[activeRecord.source_db]?.badgeClass || 'theme-glass-input'
                      }`}
                    >
                      {LITERATURE_SOURCES_CONFIG[activeRecord.source_db]?.name || activeRecord.source_db.toUpperCase()}
                    </span>
                    {activeRecord.pub_year && (
                      <span className="text-[11px] font-mono opacity-70" style={{ color: 'var(--text-secondary)' }}>
                        {activeRecord.pub_year}
                      </span>
                    )}
                  </div>

                  {/* External links: DOI / PMID */}
                  <div className="flex items-center gap-2 text-xs font-mono">
                    {activeRecord.doi && (
                      <a
                        href={`https://doi.org/${activeRecord.doi}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 opacity-70 hover:opacity-100 hover:underline"
                        style={{ color: 'var(--accent-primary)' }}
                        title="Open DOI resolver"
                      >
                        <span>DOI</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {activeRecord.pmid && (
                      <a
                        href={`https://pubmed.ncbi.nlm.nih.gov/${activeRecord.pmid}/`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 opacity-70 hover:opacity-100 hover:underline"
                        style={{ color: 'var(--accent-secondary)' }}
                        title="View on PubMed.gov"
                      >
                        <span>PMID: {activeRecord.pmid}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                <h2 className="text-base sm:text-lg font-bold font-display leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {activeRecord.title}
                </h2>

                <div className="text-xs font-sans leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <span className="font-semibold text-primary">Authors:</span>{' '}
                  {activeRecord.authors?.join(', ') || 'Unspecified'}
                </div>

                <div className="text-xs font-sans" style={{ color: 'var(--text-muted)' }}>
                  <span className="font-semibold text-primary">Journal:</span> {activeRecord.journal}
                </div>
              </div>

              {/* AUTOMATED HEURISTIC INSIGHT PANEL */}
              {activeHeuristic && (
                <div 
                  className={`p-3.5 rounded-2xl border text-xs ${
                    activeHeuristic.suggestedStatus === 'exclude'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      : activeHeuristic.suggestedStatus === 'include'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold font-mono">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>HEURISTIC RECOMMENDATION: {activeHeuristic.suggestedStatus.toUpperCase()}</span>
                      <span className="text-[10px] opacity-75">({Math.round(activeHeuristic.confidence * 100)}% match)</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleAcceptMachineSuggestion}
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-all bg-white/10 hover:bg-white/20 text-white flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      <span>Accept</span>
                    </button>
                  </div>

                  {activeHeuristic.suggestedReason && (
                    <p className="mt-1.5 text-[11px] font-sans leading-relaxed">
                      Reason: <span className="font-semibold">{activeHeuristic.suggestedReason}</span>
                    </p>
                  )}

                  {activeHeuristic.flags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {activeHeuristic.flags.map((f, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/20"
                        >
                          {f.label} {f.matchedSnippet ? `("${f.matchedSnippet}")` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* REVIEWER DECISION CONTROL STRIP */}
              <div className="p-4 rounded-2xl theme-glass-panel space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{ color: 'var(--text-muted)' }}>
                    Reviewer Decision (Step 5 &amp; 7)
                  </span>
                  <div className="text-[11px] font-mono">
                    Status:{' '}
                    <span className="font-bold uppercase" style={{ color: 'var(--accent-primary)' }}>
                      {activeDecision?.status || 'unscreened'}
                    </span>
                  </div>
                </div>

                {/* 1-Click Action Buttons with Keyboard Shortcuts */}
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetDecision('include')}
                    className={`py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex flex-col items-center justify-center gap-0.5 ${
                      activeDecision?.status === 'include'
                        ? 'bg-emerald-500 text-white shadow-lg ring-2 ring-emerald-300'
                        : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Include</span>
                    </div>
                    <span className="text-[9px] font-mono opacity-70">[I]</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetDecision('exclude', activeDecision?.exclusion_reason || 'Non-human / Animal or In Vitro model')}
                    className={`py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex flex-col items-center justify-center gap-0.5 ${
                      activeDecision?.status === 'exclude'
                        ? 'bg-rose-500 text-white shadow-lg ring-2 ring-rose-300'
                        : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Exclude</span>
                    </div>
                    <span className="text-[9px] font-mono opacity-70">[E]</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetDecision('maybe')}
                    className={`py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex flex-col items-center justify-center gap-0.5 ${
                      activeDecision?.status === 'maybe'
                        ? 'bg-amber-500 text-white shadow-lg ring-2 ring-amber-300'
                        : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Maybe</span>
                    </div>
                    <span className="text-[9px] font-mono opacity-70">[M]</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetDecision('unscreened')}
                    className={`py-2 rounded-xl text-xs font-medium cursor-pointer transition-all flex flex-col items-center justify-center gap-0.5 ${
                      activeDecision?.status === 'unscreened'
                        ? 'bg-gray-500 text-white'
                        : 'theme-glass-input opacity-60 hover:opacity-100'
                    }`}
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <div className="flex items-center gap-1">
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </div>
                    <span className="text-[9px] font-mono opacity-70">[U]</span>
                  </button>
                </div>

                {/* Exclusion Reason Selector (Visible when Excluded) */}
                {activeDecision?.status === 'exclude' && (
                  <div className="pt-2 space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                      Exclusion Reason (Audit Required)
                    </span>
                    <select
                      value={activeDecision?.exclusion_reason || ''}
                      onChange={(e) => handleSetDecision('exclude', e.target.value)}
                      className="w-full theme-glass-input px-3 py-2 rounded-xl text-xs outline-none font-sans cursor-pointer text-rose-300 font-medium"
                    >
                      <option value="">Select exclusion justification...</option>
                      {STANDARD_EXCLUSION_REASONS.map((reason) => (
                        <option key={reason} value={reason}>
                          {reason}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Reviewer Notes Field */}
                <div className="pt-2 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                    Reviewer Clinical Notes
                  </span>
                  <input
                    type="text"
                    placeholder="Add qualitative notes or full-text retrieval notes..."
                    value={activeDecision?.notes || ''}
                    onChange={(e) => handleUpdateNotes(e.target.value)}
                    className="w-full theme-glass-input px-3 py-1.5 rounded-xl text-xs outline-none font-sans"
                    style={{ color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              {/* Reader Sub-Tabs: Abstract vs Audit Trail vs Raw */}
              <div>
                <div className="flex items-center gap-4 border-b pb-2 mb-3 text-xs font-mono" style={{ borderColor: 'var(--border-subtle)' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTabReader('abstract')}
                    className={`cursor-pointer transition-colors ${
                      activeTabReader === 'abstract'
                        ? 'font-bold'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{ color: activeTabReader === 'abstract' ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
                  >
                    Abstract &amp; PICO Spans
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTabReader('audit')}
                    className={`cursor-pointer transition-colors flex items-center gap-1 ${
                      activeTabReader === 'audit'
                        ? 'font-bold'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{ color: activeTabReader === 'audit' ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
                  >
                    <History className="w-3 h-3" />
                    <span>Audit Trail ({activeAuditLogs.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTabReader('raw')}
                    className={`cursor-pointer transition-colors ${
                      activeTabReader === 'raw'
                        ? 'font-bold'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{ color: activeTabReader === 'raw' ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
                  >
                    Provenance JSON
                  </button>
                </div>

                {activeTabReader === 'abstract' ? (
                  <InlinePicoAbstract
                    abstractText={activeRecord.abstract}
                    picoTags={activeDecision?.pico_tags || { p: [], i: [], c: [], o: [] }}
                    onUpdatePicoTags={handleUpdatePicoTags}
                  />
                ) : activeTabReader === 'audit' ? (
                  <div className="p-4 rounded-2xl theme-glass-panel space-y-2 max-h-80 overflow-y-auto">
                    {activeAuditLogs.length === 0 ? (
                      <p className="text-xs font-mono opacity-50 text-center py-4">No audit changes logged yet for this study.</p>
                    ) : (
                      activeAuditLogs.map((log) => (
                        <div key={log.id} className="p-2.5 rounded-xl theme-glass-card text-xs space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                            <span className="font-bold text-primary">{log.action}</span>
                            <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                          </div>
                          {log.new_value && (
                            <div className="text-[11px] font-mono opacity-80 truncate" style={{ color: 'var(--text-secondary)' }}>
                              Status: {(log.new_value as any).status || 'N/A'} · Reason: {(log.new_value as any).exclusion_reason || 'None'}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <pre 
                    className="p-3 rounded-2xl theme-glass-panel text-[10px] font-mono overflow-x-auto max-h-60"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {JSON.stringify(activeRecord, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-3xl theme-glass-card text-center space-y-3">
              <BookOpen className="w-10 h-10 mx-auto opacity-30" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm font-sans" style={{ color: 'var(--text-secondary)' }}>
                Select a paper from the list to screen and inspect inline PICO spans.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* PRISMA 2020 & CSV Export Modal */}
      <PrismaReportModal
        book={book}
        records={records}
        decisions={decisions}
        isOpen={isPrismaModalOpen}
        onClose={() => setIsPrismaModalOpen(false)}
      />

      {/* AI Evidence Synthesis & Clinical Conclusion Modal */}
      <AiEvidenceConclusionModal
        isOpen={isConclusionModalOpen}
        onClose={() => setIsConclusionModalOpen(false)}
        query={book.description || book.title || 'What are the clinical findings and conclusions?'}
        pico={book.pico_config}
        bookTitle={book.title}
        includedRecords={records.filter((r) => {
          const dec = decisions.find((d) => d.record_id === r.id);
          return dec?.status === 'include';
        })}
        candidateRecords={records.filter((r) => {
          const dec = decisions.find((d) => d.record_id === r.id);
          return dec?.status !== 'exclude' && !dec?.is_duplicate;
        })}
        onIncludeAllCandidates={() => {
          const candidateIds = new Set(
            records
              .filter((r) => {
                const dec = decisions.find((d) => d.record_id === r.id);
                return dec?.status !== 'exclude' && !dec?.is_duplicate;
              })
              .slice(0, 6)
              .map((r) => r.id)
          );
          const next = decisions.map((d) =>
            candidateIds.has(d.record_id) ? { ...d, status: 'include' as const } : d
          );
          setDecisions(next);
          localStore.saveDecisions(book.id, next);
        }}
        currentTheme={currentTheme}
      />
    </div>
  );
};
