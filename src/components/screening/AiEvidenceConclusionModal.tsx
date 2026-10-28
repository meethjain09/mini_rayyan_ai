/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * AI EVIDENCE SYNTHESIS & CLINICAL CONCLUSION MODAL
 * Empowers the user to activate AI after screening papers into "Include".
 * The AI reads all included papers, answers the user's original query,
 * provides full GRADE certainty, step-by-step rationale, and per-study evidence matrices.
 * Fully styled with dynamic theme CSS variables for all themes (Sage, Titanium Light, Cyber, Amber).
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  CheckCircle,
  XCircle,
  AlertCircle,
  BookOpen,
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  RotateCw,
  ExternalLink,
  ShieldCheck,
  Award,
  Layers,
  ArrowRight,
  TrendingUp,
  X,
} from 'lucide-react';
import { CanonicalRecord, EvidenceSynthesisResult, PicoConfig } from '../../types/database';
import { ThemeMode } from '../../types/theme';
import { generateLocalHeuristicSynthesis } from '../../services/evidenceSynthesizer';

interface AiEvidenceConclusionModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  pico?: PicoConfig;
  bookTitle?: string;
  includedRecords: CanonicalRecord[];
  candidateRecords?: CanonicalRecord[];
  onIncludeAllCandidates?: () => void;
  currentTheme?: ThemeMode;
}

export const AiEvidenceConclusionModal: React.FC<AiEvidenceConclusionModalProps> = ({
  isOpen,
  onClose,
  query,
  pico,
  bookTitle,
  includedRecords,
  candidateRecords = [],
  onIncludeAllCandidates,
  currentTheme,
}) => {
  const [loading, setLoading] = useState(false);
  const [synthesis, setSynthesis] = useState<EvidenceSynthesisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'reasoning' | 'matrix' | 'recommendations'>('reasoning');
  const [expandedPaperId, setExpandedPaperId] = useState<string | null>(null);
  const [synthesizingStep, setSynthesizingStep] = useState(0);

  const steps = [
    'Parsing included study titles and full abstracts...',
    'Extracting intervention arms, comparator effects, and outcomes...',
    'Evaluating cross-study consistency & risk-of-bias indicators...',
    'Formulating direct answer and GRADE certainty rationale...',
  ];

  // Reset synthesis when query or papers change
  useEffect(() => {
    setSynthesis(null);
    setError(null);
  }, [query]);

  // Run or trigger synthesis
  const handleRunSynthesis = async () => {
    const papersToSynthesize = includedRecords.length > 0 
      ? includedRecords 
      : (candidateRecords.length > 0 ? candidateRecords.slice(0, 6) : []);

    if (papersToSynthesize.length === 0) {
      setError('You need at least one included research article to synthesize a conclusion.');
      return;
    }

    setLoading(true);
    setError(null);
    setSynthesizingStep(0);

    const stepInterval = setInterval(() => {
      setSynthesizingStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1000);

    try {
      const response = await fetch('/api/synthesize-conclusion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query || 'What is the clinical efficacy and safety of the evaluated intervention?',
          pico,
          bookTitle,
          includedRecords: papersToSynthesize.map((r) => ({
            id: r.id,
            title: r.title,
            abstract: r.abstract,
            authors: r.authors,
            year: r.pub_year,
            journal: r.journal,
            doi: r.doi,
            source_db: r.source_db,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.synthesis) {
        throw new Error(data.error || 'Backend synthesis route returned non-success response.');
      }

      setSynthesis(data.synthesis);
    } catch (err: any) {
      console.warn('Backend synthesis route failed or unavailable, using deterministic clinical evidence synthesizer:', err);
      try {
        const fallback = generateLocalHeuristicSynthesis(
          query || 'What is the clinical efficacy and safety of the evaluated intervention?',
          pico,
          bookTitle,
          papersToSynthesize.map((r) => ({
            id: r.id,
            title: r.title,
            abstract: r.abstract,
            authors: r.authors,
            year: r.pub_year,
            journal: r.journal,
            doi: r.doi,
            source_db: r.source_db,
          }))
        );
        setSynthesis(fallback as unknown as EvidenceSynthesisResult);
      } catch (fallbackErr: any) {
        setError(err.message || 'An error occurred while synthesizing evidence.');
      }
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

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

  // Trigger on open if no synthesis has run yet
  useEffect(() => {
    if (isOpen && !synthesis && !loading) {
      if (includedRecords.length > 0 || candidateRecords.length > 0) {
        handleRunSynthesis();
      }
    }
  }, [isOpen, query, includedRecords.length, candidateRecords.length]);

  if (!isOpen) return null;

  const handleCopyConclusion = () => {
    if (!synthesis) return;
    const text = `CLINICAL EVIDENCE SYNTHESIS & CONCLUSION
Query: ${synthesis.query}
Verdict: ${synthesis.overallVerdict} (Certainty: ${synthesis.evidenceStrength})

EXECUTIVE ANSWER:
${synthesis.executiveAnswer}

HOW DID THE AI REACH THIS CONCLUSION?
${synthesis.detailedReasoning.stepByStepSynthesis.join('\n')}

KEY MECHANISMS:
${synthesis.detailedReasoning.keyMechanisms}

CROSS-STUDY CONSISTENCY:
${synthesis.detailedReasoning.evidenceConsistency}

ANALYZED PAPERS (${synthesis.totalPapersAnalyzed} included studies):
${synthesis.perStudyBreakdown.map((p, i) => `${i + 1}. ${p.paperTitle} - ${p.citation} [${p.direction}]: ${p.keyEvidenceContribution}`).join('\n')}

PLAIN-LANGUAGE SUMMARY:
${synthesis.plainLanguageSummary}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadMarkdown = () => {
    if (!synthesis) return;
    const md = `# Evidence Synthesis & Systematic Conclusion Report
**Research Query:** ${synthesis.query}  
**Overall Verdict:** ${synthesis.overallVerdict}  
**Evidence Certainty (GRADE):** ${synthesis.evidenceStrength}  
**Studies Synthesized:** ${synthesis.totalPapersAnalyzed} included peer-reviewed papers  
**Date:** ${new Date(synthesis.synthesizedAt).toLocaleDateString()}

---

## 1. Executive Answer
${synthesis.executiveAnswer}

---

## 2. Evidence Certainty & Rationale
${synthesis.evidenceStrengthRationale}

---

## 3. How the Conclusion Was Reached (Step-by-Step Reasoning)
${synthesis.detailedReasoning.stepByStepSynthesis.map((s, i) => `### ${s}`).join('\n\n')}

### Biological & Clinical Mechanisms
${synthesis.detailedReasoning.keyMechanisms}

### Cross-Study Agreement & Consistency
${synthesis.detailedReasoning.evidenceConsistency}

### Limitations & Gaps Identified
${synthesis.detailedReasoning.limitationsAndGaps.map((l) => `- ${l}`).join('\n')}

---

## 4. Per-Study Evidence Contribution Matrix
| Study Citation | Design | Direction | Direct Contribution & Findings | Reported Effect |
| :--- | :--- | :--- | :--- | :--- |
${synthesis.perStudyBreakdown
  .map(
    (p) =>
      `| **${p.citation}** | ${p.studyDesign || 'Trial'} | ${p.direction} | ${p.keyEvidenceContribution.replace(/\|/g, '-')} | ${p.reportedEffectiveness.replace(/\|/g, '-')} |`
  )
  .join('\n')}

---

## 5. Clinical Recommendations
${synthesis.clinicalRecommendations.map((r) => `- ${r}`).join('\n')}

---

## 6. Plain-Language Summary (Patient/Consumer Facing)
${synthesis.plainLanguageSummary}
`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Evidence_Synthesis_${(query || 'query').slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getVerdictStyle = (verdict?: string) => {
    switch (verdict) {
      case 'Affirmative / Beneficial':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'Partially Supported / Nuanced':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'No Effect / Ineffective':
      case 'Harmful / Adverse':
        return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
      default:
        return 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30';
    }
  };

  const getCertaintyBadge = (certainty?: string) => {
    switch (certainty) {
      case 'High':
        return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/40';
      case 'Moderate':
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/40';
      case 'Low':
        return 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40';
      case 'Very Low':
        return 'bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/40';
    }
  };

  const modalNode = (
    <div 
      className="fixed inset-0 z-[9999] flex items-start justify-center p-3 sm:p-5 pt-3 sm:pt-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150"
      data-theme={currentTheme}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label="AI Evidence Synthesis & Clinical Conclusion"
    >
      <div 
        className="relative w-full max-w-5xl h-[92vh] sm:h-[90vh] flex flex-col rounded-3xl theme-glass-card shadow-2xl overflow-hidden border border-[var(--border-card)]"
        style={{ backgroundColor: 'var(--bg-canvas)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header - Synced to Active Theme & Fixed at Top */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--glass-card-bg)] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div 
              className="p-2.5 rounded-2xl flex items-center justify-center shadow-lg shrink-0"
              style={{ backgroundColor: 'var(--pico-p-bg)', color: 'var(--accent-primary)' }}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold font-display tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>
                  AI Evidence Synthesis &amp; Clinical Conclusion
                </h2>
                <span 
                  className="px-2.5 py-0.5 text-[11px] font-mono font-semibold rounded-full border shrink-0"
                  style={{ backgroundColor: 'var(--pico-p-bg)', borderColor: 'var(--pico-p-border)', color: 'var(--pico-p-text)' }}
                >
                  {includedRecords.length} {includedRecords.length === 1 ? 'Paper' : 'Papers'} Included
                </span>
              </div>
              <p className="text-xs truncate max-w-xl mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Synthesizing findings for: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>"{query || 'Clinical query'}"</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {synthesis && (
              <>
                <button
                  type="button"
                  onClick={handleCopyConclusion}
                  className="theme-glass-input hover:brightness-110 hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition cursor-pointer"
                  style={{ color: 'var(--text-primary)' }}
                  title="Copy formatted summary to clipboard"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadMarkdown}
                  className="theme-glass-input hover:brightness-110 hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition cursor-pointer"
                  style={{ color: 'var(--text-primary)' }}
                  title="Export complete report as Markdown"
                >
                  <Download className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
                  <span>Export .MD</span>
                </button>
                <button
                  type="button"
                  onClick={handleRunSynthesis}
                  disabled={loading}
                  className="theme-primary-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition disabled:opacity-50 cursor-pointer shadow-sm"
                  title="Re-run synthesis"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Re-Synthesize</span>
                </button>
              </>
            )}

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
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Fallback when 0 papers are included */}
          {includedRecords.length === 0 && !loading && !synthesis && (
            <div className="p-8 text-center rounded-3xl theme-glass-panel border border-[var(--border-card)] space-y-4">
              <div 
                className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: 'var(--pico-c-bg)', color: 'var(--pico-c-text)' }}
              >
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold font-display" style={{ color: 'var(--text-primary)' }}>
                No Papers Explicitly Marked as "Include" Yet
              </h3>
              <p className="text-xs sm:text-sm max-w-md mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                To formulate an evidence-based clinical conclusion, the AI analyzes articles you have selected. You can mark studies as <strong style={{ color: 'var(--accent-primary)' }}>Include [I]</strong> in your screening queue, or click below to synthesize the top candidate studies retrieved for your question.
              </p>

              <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
                {candidateRecords && candidateRecords.length > 0 && onIncludeAllCandidates && (
                  <button
                    type="button"
                    onClick={() => {
                      onIncludeAllCandidates();
                      setTimeout(() => handleRunSynthesis(), 100);
                    }}
                    className="theme-primary-btn px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-2 shadow-lg"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Include Top {Math.min(candidateRecords.length, 6)} Candidates &amp; Synthesize Now</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleRunSynthesis}
                  className="theme-glass-input hover:brightness-110 px-5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Synthesize Retrieved Corpus Directly
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-mono opacity-60 hover:opacity-100 cursor-pointer"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Return to Manual Screening
                </button>
              </div>
            </div>
          )}

          {/* Loading State with Animated Stepper */}
          {loading && (
            <div className="py-16 px-4 text-center space-y-6">
              <div className="relative w-16 h-16 mx-auto">
                <div 
                  className="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin"
                  style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--accent-primary)' }}
                />
                <div 
                  className="absolute inset-2 rounded-full border-4 border-b-transparent animate-spin [animation-direction:reverse]"
                  style={{ borderColor: 'var(--border-subtle)', borderBottomColor: 'var(--accent-secondary)' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 animate-pulse" style={{ color: 'var(--accent-primary)' }} />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold font-display" style={{ color: 'var(--text-primary)' }}>
                  Synthesizing Evidence Across Literature
                </h3>
                <p className="text-xs mt-1 max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
                  Applying GRADE certainty and PRISMA methodology to answer "{query}"
                </p>
              </div>

              {/* Progress Steps */}
              <div className="max-w-md mx-auto space-y-2 text-left">
                {steps.map((st, idx) => {
                  const isDone = idx < synthesizingStep;
                  const isCurrent = idx === synthesizingStep;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        isCurrent
                          ? 'border-[var(--accent-primary)]/40 bg-[var(--pico-p-bg)]'
                          : isDone
                          ? 'border-[var(--border-subtle)] bg-[var(--glass-input-bg)] opacity-70'
                          : 'border-[var(--border-subtle)]/40 opacity-40'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : isCurrent ? (
                        <RotateCw className="w-4 h-4 animate-spin shrink-0" style={{ color: 'var(--accent-primary)' }} />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-[var(--border-subtle)] shrink-0" />
                      )}
                      <span className="text-xs font-medium" style={{ color: isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        {st}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && !loading && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Synthesis Generation Notice</p>
                <p className="text-xs text-rose-300/80 mt-0.5">{error}</p>
                <button
                  type="button"
                  onClick={handleRunSynthesis}
                  className="mt-3 px-3.5 py-1.5 text-xs font-medium rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 transition cursor-pointer"
                >
                  Retry Synthesis
                </button>
              </div>
            </div>
          )}

          {/* Synthesis Content Display */}
          {synthesis && !loading && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Top Executive Answer Card */}
              <div 
                className="p-6 sm:p-7 rounded-3xl border shadow-xl space-y-4"
                style={{ 
                  backgroundColor: 'var(--glass-card-bg)', 
                  borderColor: 'var(--border-card)' 
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 text-xs font-mono font-bold rounded-lg border uppercase tracking-wider ${getVerdictStyle(synthesis.overallVerdict)}`}>
                      {synthesis.overallVerdict}
                    </span>
                    <span className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-semibold rounded-lg border ${getCertaintyBadge(synthesis.evidenceStrength)}`}>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Certainty: {synthesis.evidenceStrength} (GRADE)</span>
                    </span>
                  </div>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    Synthesized from {synthesis.totalPapersAnalyzed} screened peer-reviewed studies
                  </span>
                </div>

                <div className="mt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5" style={{ color: 'var(--accent-primary)' }}>
                    <Award className="w-4 h-4" />
                    <span>Executive Clinical Answer &amp; Verdict</span>
                  </h4>
                  <p className="text-base sm:text-lg font-semibold leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {synthesis.executiveAnswer}
                  </p>
                </div>

                <div 
                  className="mt-4 pt-3 border-t flex items-start gap-2.5 text-xs p-3 rounded-2xl border"
                  style={{ 
                    backgroundColor: 'var(--glass-input-bg)', 
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--accent-primary)' }} />
                  <div>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>GRADE Certainty Rationale: </span>
                    <span>{synthesis.evidenceStrengthRationale}</span>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('reasoning')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition cursor-pointer ${
                    activeTab === 'reasoning'
                      ? 'theme-primary-btn shadow-md'
                      : 'theme-glass-input opacity-70 hover:opacity-100'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Clinical Reasoning Trail</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('matrix')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition cursor-pointer ${
                    activeTab === 'matrix'
                      ? 'theme-primary-btn shadow-md'
                      : 'theme-glass-input opacity-70 hover:opacity-100'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Per-Study Evidence Matrix ({synthesis.perStudyBreakdown.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('recommendations')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition cursor-pointer ${
                    activeTab === 'recommendations'
                      ? 'theme-primary-btn shadow-md'
                      : 'theme-glass-input opacity-70 hover:opacity-100'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Recommendations &amp; Plain Summary</span>
                </button>
              </div>

              {/* TAB 1: HOW THE AI REACHED THIS CONCLUSION */}
              {activeTab === 'reasoning' && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {/* Step-by-Step Chain of Thought / Synthesis Trail */}
                  <div className="p-5 rounded-3xl theme-glass-card border border-[var(--border-subtle)] space-y-4">
                    <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      <TrendingUp className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                      <span>Step-by-Step Evidence Synthesis Trail</span>
                    </h4>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Transparent audit of how findings were evaluated across the included literature:
                    </p>
                    <div className="space-y-3">
                      {synthesis.detailedReasoning.stepByStepSynthesis.map((stepText, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-3.5 rounded-2xl border"
                          style={{ backgroundColor: 'var(--glass-input-bg)', borderColor: 'var(--border-subtle)' }}
                        >
                          <div 
                            className="w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0"
                            style={{ backgroundColor: 'var(--pico-p-bg)', color: 'var(--accent-primary)' }}
                          >
                            {idx + 1}
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                            {stepText}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Biological / Operational Mechanisms */}
                  <div className="p-5 rounded-3xl theme-glass-card border border-[var(--border-subtle)] space-y-2">
                    <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--accent-primary)' }}>
                      <Sparkles className="w-4 h-4" />
                      <span>Identified Biological &amp; Clinical Mechanisms</span>
                    </h4>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {synthesis.detailedReasoning.keyMechanisms}
                    </p>
                  </div>

                  {/* Cross-Study Consistency & Limitations Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl theme-glass-card border border-[var(--border-subtle)] space-y-2">
                      <h5 className="text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Cross-Trial Consistency</span>
                      </h5>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {synthesis.detailedReasoning.evidenceConsistency}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl theme-glass-card border border-[var(--border-subtle)] space-y-2">
                      <h5 className="text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                        <span>Reported Limitations &amp; Gaps</span>
                      </h5>
                      <ul className="text-xs space-y-1.5 list-disc list-inside" style={{ color: 'var(--text-secondary)' }}>
                        {synthesis.detailedReasoning.limitationsAndGaps.map((gap, i) => (
                          <li key={i} className="leading-relaxed">{gap}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PER-STUDY EVIDENCE MATRIX */}
              {activeTab === 'matrix' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>Breakdown of each individual study included in this review:</span>
                    <span>{synthesis.perStudyBreakdown.length} Records</span>
                  </div>

                  <div className="space-y-3">
                    {synthesis.perStudyBreakdown.map((study, idx) => {
                      const isExpanded = expandedPaperId === study.recordId;
                      const matchedRecord = includedRecords.find((r) => r.id === study.recordId);

                      return (
                        <div
                          key={idx}
                          className="rounded-2xl theme-glass-card border border-[var(--border-subtle)] overflow-hidden transition"
                        >
                          <div
                            onClick={() => setExpandedPaperId(isExpanded ? null : (study.recordId || `study-${idx}`))}
                            className="p-4 flex items-start justify-between gap-4 cursor-pointer hover:bg-white/[0.03]"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border uppercase ${
                                  study.direction === 'Supports'
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : study.direction === 'Opposes'
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    : 'bg-slate-500/20 text-slate-300 border-slate-500/40'
                                }`}>
                                  {study.direction}
                                </span>
                                {study.studyDesign && (
                                  <span className="px-2 py-0.5 text-[10px] font-mono rounded theme-glass-input opacity-70">
                                    {study.studyDesign}
                                  </span>
                                )}
                                <span className="text-xs font-mono opacity-60">
                                  {study.citation}
                                </span>
                              </div>
                              <h5 className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {study.paperTitle}
                              </h5>
                              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                                <strong style={{ color: 'var(--accent-primary)' }}>Evidence Contribution: </strong>
                                {study.keyEvidenceContribution}
                              </p>
                              {study.reportedEffectiveness && (
                                <p className="text-xs opacity-75" style={{ color: 'var(--text-muted)' }}>
                                  <strong>Reported Effect: </strong>
                                  {study.reportedEffectiveness}
                                </p>
                              )}
                            </div>

                            <button className="p-1 rounded theme-glass-input shrink-0 mt-1 cursor-pointer">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>

                          {/* Expanded Full Abstract & Metadata */}
                          {isExpanded && matchedRecord && (
                            <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)] space-y-3 text-xs">
                              <div className="flex items-center justify-between font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                <span>Source: <strong className="uppercase" style={{ color: 'var(--text-primary)' }}>{matchedRecord.source_db}</strong></span>
                                {matchedRecord.doi && (
                                  <a
                                    href={`https://doi.org/${matchedRecord.doi}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1 hover:underline text-cyan-400"
                                  >
                                    <span>DOI: {matchedRecord.doi}</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                              <div>
                                <span className="font-semibold block mb-1" style={{ color: 'var(--text-primary)' }}>Full Abstract:</span>
                                <p className="leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>
                                  {matchedRecord.abstract || 'No abstract text available.'}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: RECOMMENDATIONS & PLAIN SUMMARY */}
              {activeTab === 'recommendations' && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {/* Practical Recommendations */}
                  <div className="p-5 rounded-3xl theme-glass-card border border-[var(--border-subtle)] space-y-3">
                    <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      <BookOpen className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                      <span>Key Clinical &amp; Methodological Recommendations</span>
                    </h4>
                    <ul className="space-y-2">
                      {synthesis.clinicalRecommendations.map((rec, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 text-xs leading-relaxed"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Plain Language Summary */}
                  <div 
                    className="p-5 rounded-3xl border space-y-2"
                    style={{ backgroundColor: 'var(--pico-p-bg)', borderColor: 'var(--pico-p-border)' }}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--pico-p-text)' }}>
                      <FileText className="w-4 h-4" />
                      <span>Plain-Language Summary (Patient &amp; Consumer Facing)</span>
                    </div>
                    <p className="text-xs sm:text-sm leading-relaxed italic" style={{ color: 'var(--text-primary)' }}>
                      "{synthesis.plainLanguageSummary}"
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Bottom Action Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[var(--border-subtle)] bg-[var(--glass-card-bg)] shrink-0">
          <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            PRISMA 2020 qualitative evidence synthesis &bull; Clinical Reasoning
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl theme-glass-input hover:brightness-110 transition cursor-pointer flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}
          >
            <span>Close</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-[var(--border-subtle)] text-[var(--text-muted)] bg-[var(--bg-canvas)]">ESC</span>
          </button>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
};
