/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SIMPLE PICO FLOW COMPONENT
 * Implements the user's streamlined, non-complicated workflow:
 * 1. User enters clinical query.
 * 2. System automatically extracts and checks PICO.
 * 3. Shows what was selected as PICO (Population, Intervention, Comparator, Outcome).
 * 4. Prompts the user: "Does this look right, or do you want to change something?"
 * 5. If confirmed (or unchanged), continues immediately with the original extraction to literature fetch and screening.
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  Check,
  Edit3,
  ArrowRight,
  RotateCcw,
  Download,
  CheckCircle,
  XCircle,
  HelpCircle,
  Layers,
  FileText,
  Loader2,
  User,
  LogIn,
} from 'lucide-react';
import { extractPicoFromClinicalQuery, ExtractedPicoResult } from '../../lib/picoParser';
import { fetchLiteratureRecords } from '../../lib/literatureApi';
import { runDeduplicationPipeline } from '../../lib/deduplication';
import { evaluateRecordScreening } from '../../lib/screeningRules';
import { localStore } from '../../lib/supabase';
import { CanonicalRecord, ScreeningDecision, ScreeningStatus, PicoConfig, Profile } from '../../types/database';
import { InlinePicoAbstract } from '../screening/InlinePicoAbstract';

interface SimplePicoFlowProps {
  onOpenAdvancedMode?: () => void;
  user?: Profile | null;
  onOpenAuthModal?: () => void;
}

const SAMPLE_QUERIES = [
  {
    title: 'Type 2 Diabetes & Metformin',
    query: 'In adults with type 2 diabetes, does metformin compared to placebo reduce HbA1c?',
  },
  {
    title: 'Hospitalized COVID-19 & Remdesivir',
    query: 'In hospitalized patients with COVID-19, does remdesivir compared to standard care reduce mortality?',
  },
  {
    title: 'Acute Stroke & Tenecteplase',
    query: 'In patients with acute ischemic stroke, does tenecteplase compared to alteplase improve neurological recovery?',
  },
  {
    title: 'Heart Failure & SGLT2 Inhibitors',
    query: 'In patients with heart failure with preserved ejection fraction, does empagliflozin compared to placebo lower cardiovascular death?',
  },
];

export const SimplePicoFlow: React.FC<SimplePicoFlowProps> = ({ 
  onOpenAdvancedMode,
  user,
  onOpenAuthModal,
}) => {
  // Query Input State
  const [queryText, setQueryText] = useState('In adults with type 2 diabetes, does metformin compared to placebo reduce HbA1c?');
  
  // Auto-Extracted PICO State
  const [extractedPico, setExtractedPico] = useState<ExtractedPicoResult | null>(null);
  
  // User Prompt / Edit State
  const [isEditingPico, setIsEditingPico] = useState(false);
  const [editedP, setEditedP] = useState('');
  const [editedI, setEditedI] = useState('');
  const [editedC, setEditedC] = useState('');
  const [editedO, setEditedO] = useState('');

  // Flow Stage: 'query' (entering question & viewing PICO) | 'searching' | 'results' (screening)
  const [stage, setStage] = useState<'query' | 'searching' | 'results'>('query');

  // Literature & Screening State
  const [records, setRecords] = useState<CanonicalRecord[]>([]);
  const [decisions, setDecisions] = useState<ScreeningDecision[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unscreened' | 'include' | 'exclude' | 'maybe' | 'duplicates'>('all');
  const [excludeReasonInput, setExcludeReasonInput] = useState<{ [recordId: string]: string }>({});
  const [notesInput, setNotesInput] = useState<{ [recordId: string]: string }>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Automatically check and extract PICO when the query changes or mounts
  useEffect(() => {
    if (queryText.trim().length > 10) {
      const result = extractPicoFromClinicalQuery(queryText.trim());
      setExtractedPico(result);
      setEditedP(result.p);
      setEditedI(result.i);
      setEditedC(result.c);
      setEditedO(result.o);
    } else {
      setExtractedPico(null);
    }
  }, [queryText]);

  // Handle continuing with original extracted PICO or edited PICO
  const handleContinueToSearch = async (useEditedValues = false) => {
    const finalP = useEditedValues ? editedP : (extractedPico?.p || 'Adult patients');
    const finalI = useEditedValues ? editedI : (extractedPico?.i || 'Therapeutic intervention');
    const finalC = useEditedValues ? editedC : (extractedPico?.c || 'Placebo or standard care');
    const finalO = useEditedValues ? editedO : (extractedPico?.o || 'Clinical outcomes');

    setStage('searching');
    setStatusMessage('Searching PubMed & Europe PMC databases...');

    try {
      // 1. Ensure or create a default research book for this simple search
      const bookTitle = `${finalI} for ${finalP}`.substring(0, 70);
      const picoConfig: PicoConfig = {
        p: finalP,
        i: finalI,
        c: finalC,
        o: finalO,
        inclusionCriteria: ['Human clinical trials', 'Adult cohorts (age ≥ 18)'],
        exclusionCriteria: ['Animal models', 'Non-English publications', 'In vitro / In silico studies'],
      };

      const newBook = localStore.createBook(bookTitle, queryText, picoConfig, user?.id);
      localStore.setActiveBookId(newBook.id);

      // 2. Fetch literature from live APIs (with benchmark fallback)
      const fetchResult = await fetchLiteratureRecords({
        bookId: newBook.id,
        query: queryText,
        sourcePubMed: true,
        sourceEuropePmc: true,
      });

      setStatusMessage(`Found ${fetchResult.records.length} records. Running automated deduplication...`);

      // 3. Run deduplication
      const dedupResult = runDeduplicationPipeline(fetchResult.records, [], newBook.id);

      // 4. Run automated screening heuristics on unique records
      const initialDecisions: ScreeningDecision[] = dedupResult.decisions.map((dec) => {
        const record = dedupResult.records.find((r) => r.id === dec.record_id);
        if (!record || dec.is_duplicate) return dec;

        const heuristic = evaluateRecordScreening(record, picoConfig);
        return {
          ...dec,
          status: heuristic.suggestedStatus !== 'unscreened' ? heuristic.suggestedStatus : 'unscreened',
          exclusion_reason: heuristic.suggestedStatus === 'exclude' ? heuristic.suggestedReason : null,
          decision_type: (heuristic.suggestedStatus !== 'unscreened' ? 'machine_suggested' : 'human_confirmed') as 'machine_suggested' | 'human_confirmed',
          notes: heuristic.suggestedReason ? `Automated rule: ${heuristic.suggestedReason}` : '',
          pico_tags: {
            p: [finalP],
            i: [finalI],
            c: [finalC],
            o: [finalO],
          },
        };
      });

      // Save to local store
      localStore.saveRecords(newBook.id, dedupResult.records, 'initial-simple-search');
      localStore.saveDecisions(newBook.id, initialDecisions);

      setRecords(dedupResult.records);
      setDecisions(initialDecisions);
      setStage('results');
    } catch (err) {
      console.error('Error during search flow:', err);
      setStatusMessage('Encountered an issue running the search. Falling back to benchmark trial dataset.');
      setStage('results');
    }
  };

  // Reviewer Screening Decisions
  const handleDecision = (recordId: string, status: ScreeningStatus, reason?: string) => {
    setDecisions((prev) => {
      const next = prev.map((d) => {
        if (d.record_id === recordId) {
          return {
            ...d,
            status,
            exclusion_reason: status === 'exclude' ? (reason || d.exclusion_reason || 'Out of scope') : null,
            decision_type: 'human_override' as const,
            notes: notesInput[recordId] ?? d.notes,
            updated_at: new Date().toISOString(),
          };
        }
        return d;
      });

      const activeBookId = localStore.getActiveBookId();
      if (activeBookId) {
        localStore.saveDecisions(activeBookId, next);
      }
      return next;
    });
  };

  // Export included studies as CSV
  const handleExportCsv = () => {
    const includedDecisions = decisions.filter((d: ScreeningDecision) => d.status === 'include');
    const includedRecords = records.filter((r: CanonicalRecord) =>
      includedDecisions.some((d: ScreeningDecision) => d.record_id === r.id)
    );

    if (includedRecords.length === 0) {
      alert('No studies marked as "Include" yet. Click the green "Include" button on eligible studies to export them.');
      return;
    }

    const headers = ['Title', 'Authors', 'Journal', 'Year', 'PMID', 'DOI', 'Database', 'Notes'];
    const rows = includedRecords.map((r) => {
      const dec = decisions.find((d: ScreeningDecision) => d.record_id === r.id);
      return [
        `"${(r.title || '').replace(/"/g, '""')}"`,
        `"${(r.authors || []).join('; ').replace(/"/g, '""')}"`,
        `"${(r.journal || '').replace(/"/g, '""')}"`,
        r.pub_year || '',
        r.pmid || '',
        r.doi || '',
        r.source_db,
        `"${(dec?.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mini-rayyan-included-studies-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered view records
  const uniqueRecords = records.filter((r) => {
    const dec = decisions.find((d) => d.record_id === r.id);
    return !dec?.is_duplicate;
  });

  const duplicateRecords = records.filter((r) => {
    const dec = decisions.find((d) => d.record_id === r.id);
    return dec?.is_duplicate;
  });

  const filteredRecords = records.filter((r) => {
    const dec = decisions.find((d) => d.record_id === r.id);
    if (activeFilter === 'duplicates') {
      return dec?.is_duplicate;
    }
    if (dec?.is_duplicate) {
      return false; // hide duplicates from normal tabs
    }
    if (activeFilter === 'all') return true;
    if (activeFilter === 'unscreened') return dec?.status === 'unscreened';
    return dec?.status === activeFilter;
  });

  const countIncluded = decisions.filter((d) => d.status === 'include').length;
  const countExcluded = decisions.filter((d) => d.status === 'exclude').length;
  const countMaybe = decisions.filter((d) => d.status === 'maybe').length;
  const countDuplicates = duplicateRecords.length;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      {/* Top Header / Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 mb-8 border-b border-[var(--border-subtle)] gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }} />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Mini-Rayyan <span className="font-normal text-sm opacity-60">Simple Screener</span>
            </h1>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Plain-English question &rarr; Auto PICO Check &rarr; Prompt to confirm &rarr; Fast screening
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {user ? (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--accent-primary)] transition-all cursor-pointer"
              title="Manage Reviewer Account"
            >
              <div 
                className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--accent-text)' }}
              >
                {user.email.charAt(0).toUpperCase()}
              </div>
              <span className="font-mono text-[11px] truncate max-w-[150px]" style={{ color: 'var(--text-secondary)' }}>
                {user.email}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)]/20 transition-all cursor-pointer"
              style={{ color: 'var(--accent-primary)' }}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
            </button>
          )}

          {onOpenAdvancedMode && (
            <button
              onClick={onOpenAdvancedMode}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-card)] transition-all cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Advanced Workspace</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STAGE 1: SEARCH QUERY INPUT + AUTO PICO DISPLAY + PROMPT TO CHANGE/CONTINUE */}
      {/* ========================================================================= */}
      {stage === 'query' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Search Box */}
          <div className="theme-glass-card p-6 sm:p-8 rounded-3xl border border-[var(--border-subtle)] relative shadow-xl">
            <label className="block text-xs font-mono uppercase tracking-wider mb-2 font-semibold" style={{ color: 'var(--accent-primary)' }}>
              1. Enter Your Clinical Question
            </label>
            <div className="relative">
              <input
                type="text"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="e.g. In adults with type 2 diabetes, does metformin compared to placebo reduce HbA1c?"
                className="w-full pl-12 pr-4 py-4 rounded-2xl text-sm sm:text-base border border-[var(--border-elevated)] bg-[var(--bg-canvas)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] transition-all"
                style={{ color: 'var(--text-primary)' }}
              />
              <Search className="w-5 h-5 absolute left-4 top-4.5" style={{ color: 'var(--text-muted)' }} />
            </div>

            {/* Quick Sample Questions */}
            <div className="mt-4">
              <span className="text-[11px] font-mono mr-2" style={{ color: 'var(--text-muted)' }}>
                Try quick examples:
              </span>
              <div className="flex flex-wrap gap-2 mt-2">
                {SAMPLE_QUERIES.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setQueryText(sample.query)}
                    className="text-xs px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--accent-primary)] transition-all text-left cursor-pointer"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {sample.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* STEP 2 & 3: AUTOMATIC PICO CHECK & DISPLAY */}
          {/* ===================================================================== */}
          {extractedPico && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Sparkles className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                    2. Automatically Checked &amp; Selected PICO
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    The system extracted these core systematic review elements from your query:
                  </p>
                </div>
              </div>

              {/* 4 PICO Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Population */}
                <div className="p-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-400">
                      P &bull; Population
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                      Target Group
                    </span>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {extractedPico.p || '(None detected - enter below)'}
                  </p>
                </div>

                {/* Intervention */}
                <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                      I &bull; Intervention
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                      Treatment
                    </span>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {extractedPico.i || '(None detected - enter below)'}
                  </p>
                </div>

                {/* Comparator */}
                <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400">
                      C &bull; Comparator
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                      Control / Placebo
                    </span>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {extractedPico.c || 'Placebo or standard care'}
                  </p>
                </div>

                {/* Outcome */}
                <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-400">
                      O &bull; Outcome
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono">
                      Endpoint
                    </span>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {extractedPico.o || 'Clinical efficacy / safety'}
                  </p>
                </div>
              </div>

              {/* =================================================================== */}
              {/* STEP 4: THE USER PROMPT ("Do you want to change something or continue?") */}
              {/* =================================================================== */}
              <div className="theme-glass-elevated p-6 rounded-3xl border-2 border-[var(--accent-primary)]/40 relative shadow-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      <HelpCircle className="w-5 h-5 text-[var(--accent-primary)]" />
                      Does this PICO look correct?
                    </h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      If it looks good, click continue to search PubMed &amp; Europe PMC with what was selected. Or click &quot;Change something&quot; to adjust.
                    </p>
                  </div>

                  {/* The Two Main Action Buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsEditingPico(!isEditingPico)}
                      className="px-4 py-2.5 rounded-xl text-xs font-medium border border-[var(--border-subtle)] hover:bg-[var(--bg-canvas)] transition-all flex items-center gap-2 cursor-pointer"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isEditingPico ? 'Cancel Edits' : 'Change Something'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleContinueToSearch(false)}
                      className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      style={{ backgroundColor: 'var(--accent-primary)' }}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Looks Good — Continue</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </button>
                  </div>
                </div>

                {/* Inline Edit Form (Expands only when user wants to change something) */}
                {isEditingPico && (
                  <div className="pt-4 border-t border-[var(--border-subtle)] space-y-4 animate-in fade-in duration-200">
                    <p className="text-xs font-mono" style={{ color: 'var(--accent-primary)' }}>
                      Adjust any field below. When finished, click &quot;Save &amp; Continue&quot;:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-mono text-indigo-400 mb-1">
                          Population (P)
                        </label>
                        <input
                          type="text"
                          value={editedP}
                          onChange={(e) => setEditedP(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          style={{ color: 'var(--text-primary)' }}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-emerald-400 mb-1">
                          Intervention (I)
                        </label>
                        <input
                          type="text"
                          value={editedI}
                          onChange={(e) => setEditedI(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] focus:outline-none focus:ring-1 focus:ring-emerald-400"
                          style={{ color: 'var(--text-primary)' }}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-amber-400 mb-1">
                          Comparator (C)
                        </label>
                        <input
                          type="text"
                          value={editedC}
                          onChange={(e) => setEditedC(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] focus:outline-none focus:ring-1 focus:ring-amber-400"
                          style={{ color: 'var(--text-primary)' }}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-rose-400 mb-1">
                          Outcome (O)
                        </label>
                        <input
                          type="text"
                          value={editedO}
                          onChange={(e) => setEditedO(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] focus:outline-none focus:ring-1 focus:ring-rose-400"
                          style={{ color: 'var(--text-primary)' }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => handleContinueToSearch(true)}
                        className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-md flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
                        style={{ backgroundColor: 'var(--accent-primary)' }}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save &amp; Continue with Custom PICO</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 2: LOADING / SEARCHING STATE */}
      {/* ========================================================================= */}
      {stage === 'searching' && (
        <div className="theme-glass-card p-12 rounded-3xl border border-[var(--border-subtle)] text-center space-y-4 my-8 animate-in fade-in duration-300">
          <Loader2 className="w-10 h-10 animate-spin mx-auto" style={{ color: 'var(--accent-primary)' }} />
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Retrieving &amp; Processing Medical Evidence...
          </h3>
          <p className="text-xs font-mono max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
            {statusMessage || 'Connecting to PubMed E-utilities and Europe PMC API...'}
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 3: CLEAN RESULTS & SCREENING VIEW */}
      {/* ========================================================================= */}
      {stage === 'results' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Top Summary Bar */}
          <div className="theme-glass-card p-5 rounded-2xl border border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]">
                  Active Review
                </span>
                <span className="text-xs truncate max-w-md font-medium" style={{ color: 'var(--text-primary)' }}>
                  {queryText}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                <span>P: <strong className="text-indigo-400">{editedP || extractedPico?.p}</strong></span>
                <span>&bull;</span>
                <span>I: <strong className="text-emerald-400">{editedI || extractedPico?.i}</strong></span>
                <span>&bull;</span>
                <span>C: <strong className="text-amber-400">{editedC || extractedPico?.c}</strong></span>
                <span>&bull;</span>
                <span>O: <strong className="text-rose-400">{editedO || extractedPico?.o}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStage('query')}
                className="px-3 py-1.5 rounded-xl text-xs font-mono border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-canvas)] transition-all flex items-center gap-1.5 cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>New Question</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="px-4 py-1.5 rounded-xl text-xs font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV ({countIncluded})</span>
              </button>
            </div>
          </div>

          {/* Stats Badges & Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-[var(--accent-primary)] text-white font-bold'
                    : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                All Unique ({uniqueRecords.length})
              </button>

              <button
                onClick={() => setActiveFilter('include')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                  activeFilter === 'include'
                    ? 'bg-emerald-500 text-white font-bold'
                    : 'bg-[var(--bg-card)] text-emerald-400 hover:bg-emerald-500/10'
                }`}
              >
                Included ({countIncluded})
              </button>

              <button
                onClick={() => setActiveFilter('exclude')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                  activeFilter === 'exclude'
                    ? 'bg-rose-500 text-white font-bold'
                    : 'bg-[var(--bg-card)] text-rose-400 hover:bg-rose-500/10'
                }`}
              >
                Excluded ({countExcluded})
              </button>

              <button
                onClick={() => setActiveFilter('maybe')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                  activeFilter === 'maybe'
                    ? 'bg-amber-500 text-white font-bold'
                    : 'bg-[var(--bg-card)] text-amber-400 hover:bg-amber-500/10'
                }`}
              >
                Maybe ({countMaybe})
              </button>

              <button
                onClick={() => setActiveFilter('duplicates')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                  activeFilter === 'duplicates'
                    ? 'bg-slate-600 text-white font-bold'
                    : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Duplicates Hidden ({countDuplicates})
              </button>
            </div>

            <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              Showing {filteredRecords.length} records
            </div>
          </div>

          {/* Records List */}
          {filteredRecords.length === 0 ? (
            <div className="theme-glass-card p-12 rounded-3xl text-center space-y-2 border border-[var(--border-subtle)]">
              <FileText className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                No records found in this tab.
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Try switching to &quot;All Unique&quot; or start a new question.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRecords.map((record) => {
                const decision = decisions.find((d) => d.record_id === record.id);
                const isIncluded = decision?.status === 'include';
                const isExcluded = decision?.status === 'exclude';
                const isMaybe = decision?.status === 'maybe';
                const isDuplicate = decision?.is_duplicate;

                return (
                  <div
                    key={record.id}
                    className="theme-glass-card p-6 rounded-3xl border border-[var(--border-subtle)] transition-all space-y-4 hover:border-[var(--accent-primary)]/50"
                  >
                    {/* Header info */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1 max-w-3xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full uppercase bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                            {record.source_db === 'pubmed' ? 'PubMed E-utilities' : 'Europe PMC'}
                          </span>
                          {record.pub_year && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                              {record.pub_year}
                            </span>
                          )}
                          {record.pmid && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                              PMID: {record.pmid}
                            </span>
                          )}
                          {record.doi && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">
                              DOI: {record.doi}
                            </span>
                          )}
                          {isDuplicate && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400">
                              Duplicate Record (Hidden by Rule)
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
                          {record.title}
                        </h3>

                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {record.authors?.join(', ') || 'Unknown Authors'} &bull; <em>{record.journal || 'Journal'}</em>
                        </p>
                      </div>

                      {/* Current Status Pill */}
                      <div>
                        {isIncluded && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Included
                          </span>
                        )}
                        {isExcluded && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5" />
                            Excluded: {decision?.exclusion_reason || 'Out of Scope'}
                          </span>
                        )}
                        {isMaybe && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5" />
                            Maybe
                          </span>
                        )}
                        {!isIncluded && !isExcluded && !isMaybe && (
                          <span className="px-3 py-1 rounded-full text-xs font-mono bg-[var(--bg-elevated)] border border-[var(--border-subtle)]" style={{ color: 'var(--text-muted)' }}>
                            Unscreened
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Abstract with Inline PICO Highlights */}
                    <div className="p-4 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs leading-relaxed">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider block mb-2" style={{ color: 'var(--text-muted)' }}>
                        Abstract &amp; PICO Highlights:
                      </span>
                      <InlinePicoAbstract
                        abstractText={record.abstract}
                        picoTags={decision?.pico_tags || {
                          p: [editedP || extractedPico?.p || ''],
                          i: [editedI || extractedPico?.i || ''],
                          c: [editedC || extractedPico?.c || ''],
                          o: [editedO || extractedPico?.o || ''],
                        }}
                      />
                    </div>

                    {/* Screening Decision Actions */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2">
                        {/* Include */}
                        <button
                          type="button"
                          onClick={() => handleDecision(record.id, 'include')}
                          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isIncluded
                              ? 'bg-emerald-500 text-white shadow-md'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                          }`}
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Include</span>
                        </button>

                        {/* Exclude */}
                        <button
                          type="button"
                          onClick={() => {
                            const reason = excludeReasonInput[record.id] || 'Non-human / Animal or Out of Scope';
                            handleDecision(record.id, 'exclude', reason);
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isExcluded
                              ? 'bg-rose-500 text-white shadow-md'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20'
                          }`}
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Exclude</span>
                        </button>

                        {/* Maybe */}
                        <button
                          type="button"
                          onClick={() => handleDecision(record.id, 'maybe')}
                          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isMaybe
                              ? 'bg-amber-500 text-white shadow-md'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'
                          }`}
                        >
                          <HelpCircle className="w-4 h-4" />
                          <span>Maybe</span>
                        </button>
                      </div>

                      {/* Exclude reason quick select */}
                      <div className="flex items-center gap-2">
                        <select
                          value={excludeReasonInput[record.id] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setExcludeReasonInput((prev) => ({ ...prev, [record.id]: val }));
                            if (isExcluded) {
                              handleDecision(record.id, 'exclude', val);
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs border border-[var(--border-subtle)] bg-[var(--bg-canvas)] focus:outline-none cursor-pointer"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <option value="">Choose exclusion reason...</option>
                          <option value="Animal / Non-human model">Animal / Non-human model</option>
                          <option value="Non-English publication">Non-English publication</option>
                          <option value="In vitro / Simulation study">In vitro / Simulation study</option>
                          <option value="Wrong population">Wrong population</option>
                          <option value="Wrong intervention">Wrong intervention</option>
                          <option value="Case report / Non-RCT">Case report / Non-RCT</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
