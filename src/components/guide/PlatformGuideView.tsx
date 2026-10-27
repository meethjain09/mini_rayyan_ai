/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PLATFORM GUIDE & INTERACTIVE WALKTHROUGH
 * Comprehensive, visual documentation explaining how Mini-Rayyan works,
 * the 5-phase systematic review protocol, PICO extraction, 3-tier deduplication,
 * and Level 2 query versioning.
 */

import React, { useState } from 'react';
import {
  Compass,
  Sparkles,
  BookOpen,
  GitMerge,
  ShieldCheck,
  GitCompare,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Layers,
  Search,
  FileText,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  BookmarkCheck,
  Check,
  RefreshCw,
  ExternalLink,
  Info,
} from 'lucide-react';
import { ThemeMode } from '../../types/theme';

interface PlatformGuideProps {
  onStartSimpleMode?: () => void;
  onOpenAdvancedPhase?: (tab: 'books' | 'query' | 'fetch' | 'screening' | 'loop') => void;
  onCloseGuide?: () => void;
  currentTheme?: ThemeMode;
}

const SAMPLE_PICO_EXPLANATIONS = [
  {
    title: 'Type 2 Diabetes & Metformin',
    query: 'In adults with type 2 diabetes, does metformin compared to placebo reduce HbA1c?',
    p: 'Adults with type 2 diabetes mellitus (age >= 18)',
    i: 'Metformin monotherapy (immediate or extended release)',
    c: 'Placebo or lifestyle modification alone',
    o: 'HbA1c percentage reduction, fasting plasma glucose, adverse events',
    boolean: '("Adults with type 2 diabetes"[Title/Abstract]) AND ("Metformin"[Title/Abstract]) AND ("Placebo"[Title/Abstract] OR "control"[Title/Abstract])',
  },
  {
    title: 'Heart Failure & SGLT2 Inhibitors',
    query: 'In patients with heart failure with preserved ejection fraction, does empagliflozin compared to placebo lower cardiovascular death?',
    p: 'Adult patients with HFpEF (LVEF > 40-50%)',
    i: 'SGLT2 inhibitors (Empagliflozin or Dapagliflozin)',
    c: 'Placebo or standard background HF therapy',
    o: 'Composite cardiovascular mortality and heart failure hospitalizations',
    boolean: '("Heart failure with preserved ejection fraction"[Title/Abstract]) AND ("Empagliflozin"[Title/Abstract]) AND ("Placebo"[Title/Abstract])',
  },
  {
    title: 'Hospitalized COVID-19 & Remdesivir',
    query: 'In hospitalized patients with COVID-19, does remdesivir compared to standard care reduce 28-day mortality?',
    p: 'Hospitalized adults with confirmed SARS-CoV-2 infection',
    i: 'Remdesivir intravenous antiviral therapy',
    c: 'Standard supportive clinical care or placebo',
    o: '28-day all-cause mortality, time to clinical recovery, mechanical ventilation',
    boolean: '("COVID-19"[Title/Abstract]) AND ("Remdesivir"[Title/Abstract]) AND ("standard care"[Title/Abstract] OR "placebo"[Title/Abstract])',
  },
];

const FAQS = [
  {
    q: 'What is Mini-Rayyan and how does it compare to Rayyan.ai?',
    a: 'Mini-Rayyan replicates the core workflow of Rayyan.ai, the gold standard systematic review application. It allows medical researchers to formulate structured clinical PICO questions, fetch studies from PubMed and Europe PMC, automatically deduplicate papers, perform blinded screening with exclusion reasons, and generate PRISMA 2020 flow reports.',
  },
  {
    q: 'What is the "Query Version" thing and why is it important?',
    a: 'When conducting systematic reviews, researchers often refine their search queries over time. Traditional search engines wipe out past work or pull in duplicate papers you already reviewed. Mini-Rayyan numbers every query as an immutable version (v1, v2, v3...). When you update your query to v2, any study you already screened in v1 keeps your decision (Include/Exclude) and notes. You never have to screen the same paper twice.',
  },
  {
    q: 'Does the 3-Tier Deduplication engine delete papers from my review?',
    a: 'No. Mini-Rayyan enforces an immutable audit trail with Zero Hard Deletions. When two identical papers are identified across PubMed and Europe PMC, they are linked into a single representative cluster. The duplicate is hidden from your active screening queue so you don’t review it twice, but its full provenance and raw metadata remain preserved for PRISMA reporting. You can uncluster or merge studies at any time.',
  },
  {
    q: 'How does the automated PICO extraction work?',
    a: 'Our rule-based clinical NLP engine parses standard clinical grammar to extract the four pillars: Population (P), Intervention (I), Comparator (C), and Outcome (O). It formats these into PubMed-compliant [Title/Abstract] MeSH queries and Europe PMC TITLE_ABS: queries with customizable date ranges.',
  },
  {
    q: 'Can I export my included studies to CSV or citation managers?',
    a: 'Yes! Both Simple Mode and Advanced Mode provide 1-click CSV export of all studies marked as "Include" along with author metadata, PubMed IDs, DOIs, and reviewer screening notes.',
  },
  {
    q: 'Is my data saved if I close my browser or refresh?',
    a: 'Yes. With persistent authentication enabled ("Remember me"), your research books, query versions, and screening decisions remain saved to your personal account across visits.',
  },
];

export const PlatformGuideView: React.FC<PlatformGuideProps> = ({
  onStartSimpleMode,
  onOpenAdvancedPhase,
  onCloseGuide,
  currentTheme = 'emerald-sage',
}) => {
  const [selectedPicoIndex, setSelectedPicoIndex] = useState(0);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [dedupDemoView, setDedupDemoView] = useState<'separate' | 'clustered'>('clustered');

  const selectedSample = SAMPLE_PICO_EXPLANATIONS[selectedPicoIndex];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12 animate-in fade-in duration-300">
      {/* ========================================================================= */}
      {/* 1. HERO BANNER: PLATFORM INTRODUCTION */}
      {/* ========================================================================= */}
      <div className="theme-glass-card rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-2xl border border-[var(--border-card)]">
        <div 
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-40"
          style={{ backgroundColor: 'var(--accent-glow)' }}
        />

        <div className="relative z-10 max-w-3xl">
          <div 
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full theme-glass-input text-[11px] font-mono tracking-wider mb-4"
            style={{ color: 'var(--accent-primary)' }}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>INTERACTIVE PLATFORM MANUAL &amp; WORKFLOW GUIDE</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-display text-balance leading-tight" style={{ color: 'var(--text-primary)' }}>
            How Mini-Rayyan Works
          </h1>

          <p className="mt-4 text-sm sm:text-base leading-relaxed font-sans" style={{ color: 'var(--text-secondary)' }}>
            A complete guide to conducting rigorous clinical systematic reviews. Learn how to formulate structured PICO questions, execute multi-source literature ingestion, run 3-tier deterministic deduplication, and conduct blinded screening with full PRISMA 2020 compliance.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {onStartSimpleMode && (
              <button
                type="button"
                onClick={onStartSimpleMode}
                className="theme-primary-btn px-5 py-2.5 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <Sparkles className="w-4 h-4" />
                <span>Launch Simple Screener</span>
              </button>
            )}

            {onOpenAdvancedPhase && (
              <button
                type="button"
                onClick={() => onOpenAdvancedPhase('books')}
                className="theme-glass-input hover:brightness-110 px-5 py-2.5 text-xs font-semibold rounded-xl flex items-center gap-2 cursor-pointer transition-all"
                style={{ color: 'var(--text-primary)' }}
              >
                <BookOpen className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                <span>Explore Advanced Workspace</span>
              </button>
            )}

            {onCloseGuide && (
              <button
                type="button"
                onClick={onCloseGuide}
                className="px-4 py-2.5 text-xs font-mono opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >
                Back to Active Screen
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. THE 5 SYSTEMATIC REVIEW PHASES (PIPELINE MAP) */}
      {/* ========================================================================= */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display tracking-tight" style={{ color: 'var(--text-primary)' }}>
            The 5 Systematic Review Phases
          </h2>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Every systematic review follows an organized 5-stage pipeline adhering to international Cochrane and PRISMA standards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Phase 1 */}
          <div className="theme-glass-card p-6 rounded-3xl flex flex-col justify-between space-y-4 hover:border-[var(--accent-primary)]/50 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold" style={{ color: 'var(--accent-primary)' }}>
                  Phase 01
                </span>
                <span className="p-2 rounded-xl theme-glass-input text-emerald-400">
                  <BookOpen className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-lg font-bold font-display" style={{ color: 'var(--text-primary)' }}>
                Protocol Initialization
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Create isolated research books with pre-defined clinical scope. Configure target patient populations, therapeutic interventions, and strict inclusion/exclusion criteria before searching.
              </p>
            </div>
            {onOpenAdvancedPhase && (
              <button
                type="button"
                onClick={() => onOpenAdvancedPhase('books')}
                className="text-xs font-semibold flex items-center gap-1.5 hover:underline pt-3 border-t border-[var(--border-subtle)] cursor-pointer"
                style={{ color: 'var(--accent-primary)' }}
              >
                <span>Manage Protocols</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Phase 2 */}
          <div className="theme-glass-card p-6 rounded-3xl flex flex-col justify-between space-y-4 hover:border-[var(--accent-primary)]/50 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold" style={{ color: 'var(--accent-primary)' }}>
                  Phase 02
                </span>
                <span className="p-2 rounded-xl theme-glass-input" style={{ color: 'var(--accent-secondary)' }}>
                  <Sparkles className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-lg font-bold font-display" style={{ color: 'var(--text-primary)' }}>
                Query &amp; PICO Compiler
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Type your question in natural English. The clinical NLP engine automatically segments terms into P, I, C, and O, and compiles standard Boolean strings for PubMed and Europe PMC.
              </p>
            </div>
            {onOpenAdvancedPhase && (
              <button
                type="button"
                onClick={() => onOpenAdvancedPhase('query')}
                className="text-xs font-semibold flex items-center gap-1.5 hover:underline pt-3 border-t border-[var(--border-subtle)] cursor-pointer"
                style={{ color: 'var(--accent-primary)' }}
              >
                <span>Build PICO Query</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Phase 3 */}
          <div className="theme-glass-card p-6 rounded-3xl flex flex-col justify-between space-y-4 hover:border-[var(--accent-primary)]/50 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold" style={{ color: 'var(--accent-primary)' }}>
                  Phase 03
                </span>
                <span className="p-2 rounded-xl theme-glass-input text-cyan-400">
                  <GitMerge className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-lg font-bold font-display" style={{ color: 'var(--text-primary)' }}>
                Fetch &amp; Deduplication
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Query PubMed E-utilities and Europe PMC live APIs simultaneously. Run our 3-tier deterministic deduplication pipeline to collapse duplicate studies into clean clusters with zero hard deletions.
              </p>
            </div>
            {onOpenAdvancedPhase && (
              <button
                type="button"
                onClick={() => onOpenAdvancedPhase('fetch')}
                className="text-xs font-semibold flex items-center gap-1.5 hover:underline pt-3 border-t border-[var(--border-subtle)] cursor-pointer"
                style={{ color: 'var(--accent-primary)' }}
              >
                <span>Fetch Literature</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Phase 4 */}
          <div className="theme-glass-card p-6 rounded-3xl flex flex-col justify-between space-y-4 hover:border-[var(--accent-primary)]/50 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold" style={{ color: 'var(--accent-primary)' }}>
                  Phase 04
                </span>
                <span className="p-2 rounded-xl theme-glass-input text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-lg font-bold font-display" style={{ color: 'var(--text-primary)' }}>
                Screening Hub &amp; PRISMA
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Screen abstracts with dynamic PICO keyword highlights. Assign Include, Exclude (with pre-set reasons like "Animal study" or "Wrong dose"), or Maybe. Review real-time PRISMA 2020 diagrams.
              </p>
            </div>
            {onOpenAdvancedPhase && (
              <button
                type="button"
                onClick={() => onOpenAdvancedPhase('screening')}
                className="text-xs font-semibold flex items-center gap-1.5 hover:underline pt-3 border-t border-[var(--border-subtle)] cursor-pointer"
                style={{ color: 'var(--accent-primary)' }}
              >
                <span>Screen Studies</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Phase 5 */}
          <div className="theme-glass-card p-6 rounded-3xl flex flex-col justify-between space-y-4 hover:border-[var(--accent-primary)]/50 transition-all md:col-span-2 lg:col-span-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold" style={{ color: 'var(--accent-primary)' }}>
                  Phase 05
                </span>
                <span className="p-2 rounded-xl theme-glass-input text-purple-400">
                  <GitCompare className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-lg font-bold font-display" style={{ color: 'var(--text-primary)' }}>
                Query Loop &amp; Version Diff (Level 2 Provenance)
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Compare two search queries (v1 vs v2) side-by-side. See which studies were newly added, which were retained, and confirm that all your prior screening decisions are seamlessly preserved across query iterations.
              </p>
            </div>
            {onOpenAdvancedPhase && (
              <button
                type="button"
                onClick={() => onOpenAdvancedPhase('loop')}
                className="text-xs font-semibold flex items-center gap-1.5 hover:underline pt-3 border-t border-[var(--border-subtle)] cursor-pointer"
                style={{ color: 'var(--accent-primary)' }}
              >
                <span>Compare Query Versions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. INTERACTIVE PICO ANATOMY EXPLORER */}
      {/* ========================================================================= */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Interactive PICO Anatomy Explorer
          </h2>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            PICO is the international standard framework for evidence-based clinical queries. Select an example to see how Mini-Rayyan extracts each quadrant.
          </p>
        </div>

        {/* Example Selector Pills */}
        <div className="flex flex-wrap gap-2">
          {SAMPLE_PICO_EXPLANATIONS.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedPicoIndex(idx)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                selectedPicoIndex === idx
                  ? 'theme-primary-btn shadow-md'
                  : 'theme-glass-input hover:brightness-110 opacity-70 hover:opacity-100'
              }`}
            >
              {sample.title}
            </button>
          ))}
        </div>

        {/* Clinical Question Card */}
        <div className="theme-glass-card rounded-3xl p-6 sm:p-8 space-y-6 border border-[var(--border-card)]">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>
              Clinical Research Question:
            </span>
            <div className="text-base sm:text-lg font-semibold font-serif italic" style={{ color: 'var(--text-primary)' }}>
              "{selectedSample.query}"
            </div>
          </div>

          {/* 4 Quadrants Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* P */}
            <div 
              className="p-4 rounded-2xl border space-y-1.5 transition-all"
              style={{ backgroundColor: 'var(--pico-p-bg)', borderColor: 'var(--pico-p-border)' }}
            >
              <div className="flex items-center justify-between text-xs font-bold" style={{ color: 'var(--pico-p-text)' }}>
                <span>P &middot; Population / Problem</span>
                <span className="font-mono text-[10px] uppercase">Who</span>
              </div>
              <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                {selectedSample.p}
              </p>
              <p className="text-[11px] leading-relaxed opacity-75" style={{ color: 'var(--text-secondary)' }}>
                Defines the patient demographic, clinical condition, or disease stage under evaluation.
              </p>
            </div>

            {/* I */}
            <div 
              className="p-4 rounded-2xl border space-y-1.5 transition-all"
              style={{ backgroundColor: 'var(--pico-i-bg)', borderColor: 'var(--pico-i-border)' }}
            >
              <div className="flex items-center justify-between text-xs font-bold" style={{ color: 'var(--pico-i-text)' }}>
                <span>I &middot; Intervention</span>
                <span className="font-mono text-[10px] uppercase">What</span>
              </div>
              <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                {selectedSample.i}
              </p>
              <p className="text-[11px] leading-relaxed opacity-75" style={{ color: 'var(--text-secondary)' }}>
                The active therapeutic drug, diagnostic test, surgical intervention, or therapy tested.
              </p>
            </div>

            {/* C */}
            <div 
              className="p-4 rounded-2xl border space-y-1.5 transition-all"
              style={{ backgroundColor: 'var(--pico-c-bg)', borderColor: 'var(--pico-c-border)' }}
            >
              <div className="flex items-center justify-between text-xs font-bold" style={{ color: 'var(--pico-c-text)' }}>
                <span>C &middot; Comparator / Control</span>
                <span className="font-mono text-[10px] uppercase">Against</span>
              </div>
              <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                {selectedSample.c}
              </p>
              <p className="text-[11px] leading-relaxed opacity-75" style={{ color: 'var(--text-secondary)' }}>
                The control arm: placebo, standard care, watchful waiting, or active alternative drug.
              </p>
            </div>

            {/* O */}
            <div 
              className="p-4 rounded-2xl border space-y-1.5 transition-all"
              style={{ backgroundColor: 'var(--pico-o-bg)', borderColor: 'var(--pico-o-border)' }}
            >
              <div className="flex items-center justify-between text-xs font-bold" style={{ color: 'var(--pico-o-text)' }}>
                <span>O &middot; Clinical Outcome</span>
                <span className="font-mono text-[10px] uppercase">Target</span>
              </div>
              <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                {selectedSample.o}
              </p>
              <p className="text-[11px] leading-relaxed opacity-75" style={{ color: 'var(--text-secondary)' }}>
                Primary efficacy and safety endpoints: survival, symptom reduction, or biochemical markers.
              </p>
            </div>
          </div>

          {/* Compiled Boolean Search Syntax */}
          <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
              Auto-Compiled Medical Database Boolean Query:
            </span>
            <div className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] font-mono text-xs overflow-x-auto select-all" style={{ color: 'var(--text-primary)' }}>
              {selectedSample.boolean}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. 3-TIER DETERMINISTIC DEDUPLICATION EXPLAINED */}
      {/* ========================================================================= */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display tracking-tight" style={{ color: 'var(--text-primary)' }}>
            3-Tier Deterministic Deduplication
          </h2>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Medical reviews search multiple databases (PubMed, Europe PMC), which often index the exact same trial. Our pipeline clusters duplicates deterministically without data loss.
          </p>
        </div>

        {/* 3 Tiers Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="theme-glass-card p-6 rounded-3xl space-y-3 border-t-2 border-emerald-400">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-emerald-400">
              <span>TIER 1</span>
              <span>100% CONFIDENCE</span>
            </div>
            <h3 className="text-base font-bold font-display" style={{ color: 'var(--text-primary)' }}>
              Normalized DOI Match
            </h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Digital Object Identifiers are normalized by stripping URL protocols (<code className="font-mono text-[10px]">https://doi.org/</code>) and lowercasing. Two records with identical DOIs are instantly clustered.
            </p>
          </div>

          <div className="theme-glass-card p-6 rounded-3xl space-y-3 border-t-2 border-cyan-400">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-cyan-400">
              <span>TIER 2</span>
              <span>99.9% CONFIDENCE</span>
            </div>
            <h3 className="text-base font-bold font-display" style={{ color: 'var(--text-primary)' }}>
              PMID Match
            </h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              If DOI is missing, PubMed Unique Identifiers (PMID) are matched across records. The official NLM identifier guarantees authoritative clinical record linkage.
            </p>
          </div>

          <div className="theme-glass-card p-6 rounded-3xl space-y-3 border-t-2 border-amber-400">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-amber-400">
              <span>TIER 3</span>
              <span>FALLBACK HEURISTIC</span>
            </div>
            <h3 className="text-base font-bold font-display" style={{ color: 'var(--text-primary)' }}>
              Title + Year + Author
            </h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              For older or non-indexed studies, titles are stripped of punctuation, whitespace, and case. Matched against publication year and the first author's surname.
            </p>
          </div>
        </div>

        {/* Interactive Deduplication Simulator Card */}
        <div className="theme-glass-card rounded-3xl p-6 sm:p-8 space-y-5 border border-[var(--border-card)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold font-display" style={{ color: 'var(--text-primary)' }}>
                Live Deduplication Simulator: Landmark UKPDS 34 Trial
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                See how records from PubMed and Europe PMC are handled by the pipeline.
              </p>
            </div>

            <div className="flex rounded-xl bg-[var(--bg-canvas)] p-1 border border-[var(--border-subtle)] text-xs font-medium">
              <button
                type="button"
                onClick={() => setDedupDemoView('clustered')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  dedupDemoView === 'clustered'
                    ? 'theme-primary-btn shadow-sm'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                Clustered View (Rayyan Standard)
              </button>
              <button
                type="button"
                onClick={() => setDedupDemoView('separate')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  dedupDemoView === 'separate'
                    ? 'theme-primary-btn shadow-sm'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                Raw Database View
              </button>
            </div>
          </div>

          {dedupDemoView === 'clustered' ? (
            <div className="p-5 rounded-2xl border bg-emerald-500/5 border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400">1 Unique Clinical Study Cluster</span>
                  <span className="text-[11px] font-mono opacity-60">(1 Duplicate Hidden from Queue)</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-400">Tier 1 Matched: DOI 10.1016/S0140-6736</span>
              </div>
              <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Effect of intensive blood-glucose control with metformin on complications in overweight patients with type 2 diabetes (UKPDS 34)
              </h4>
              <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                The Lancet (1998) &middot; Turner RC, Holman RR &middot; PMID: 9742977
              </p>
              <div className="pt-2 text-[11px] text-emerald-300 font-mono flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Screening decision made on this study applies to all 2 linked database records.</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] space-y-2">
                <span className="text-[10px] font-mono text-blue-400 uppercase font-bold">Record 1 from PubMed API</span>
                <h5 className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Effect of intensive blood-glucose control with metformin on complications in overweight patients with type 2 diabetes (UKPDS 34)
                </h5>
                <div className="text-[11px] font-mono opacity-60">DOI: 10.1016/S0140-6736(98)07019-6</div>
              </div>

              <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] space-y-2">
                <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">Record 2 from Europe PMC API</span>
                <h5 className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Effect of intensive blood-glucose control with metformin on complications in overweight patients with type 2 diabetes (UKPDS 34).
                </h5>
                <div className="text-[11px] font-mono opacity-60">DOI: 10.1016/s0140-6736(98)07019-6</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. "THE VERSION THING": IMMUTABLE QUERY VERSIONING */}
      {/* ========================================================================= */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Understanding "The Version Thing" (Level 2 Loop)
          </h2>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Why search queries are versioned (v1, v2) and how it protects hundreds of hours of screening work.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Traditional Systems */}
          <div className="theme-glass-card p-6 sm:p-7 rounded-3xl space-y-4 border border-rose-500/20">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-bold uppercase">
              <span>Traditional Database / Naive Tools</span>
            </div>
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              The Double-Screening Trap
            </h3>
            <ul className="text-xs space-y-2.5" style={{ color: 'var(--text-secondary)' }}>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold shrink-0">&times;</span>
                <span>Modifying your query overwrites your previous search parameters.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold shrink-0">&times;</span>
                <span>Previously screened papers show up as unread, forcing you to re-read them.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold shrink-0">&times;</span>
                <span>No historical record of which papers were introduced by which specific search query.</span>
              </li>
            </ul>
          </div>

          {/* Mini-Rayyan Level 2 Loop */}
          <div className="theme-glass-card p-6 sm:p-7 rounded-3xl space-y-4 border border-emerald-500/30 bg-emerald-500/[0.03]">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold uppercase">
              <span>Mini-Rayyan Level 2 Loop Engine</span>
            </div>
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Cluster-Linked Decision Persistence
            </h3>
            <ul className="text-xs space-y-2.5" style={{ color: 'var(--text-secondary)' }}>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Every query is saved as an immutable version (v1, v2, v3...) with exact timestamps.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Screening decisions belong to the <strong>Study Cluster</strong>, not the query.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>When v2 retrieves a paper you already excluded in v1, its excluded status and reasons are preserved automatically.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>The <strong>Loop &amp; Diff</strong> view lets you compare versions side-by-side with full PRISMA reporting.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. STEP-BY-STEP QUICK START CHECKLIST */}
      {/* ========================================================================= */}
      <section className="theme-glass-card rounded-3xl p-6 sm:p-10 space-y-6 border border-[var(--border-card)]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Quick-Start Guide: Conduct Your First Review in 4 Steps
          </h2>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Follow these simple steps to run a complete systematic review from clinical question to PRISMA export.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-2">
            <div className="text-xs font-mono font-bold text-[var(--accent-primary)]">STEP 01</div>
            <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Ask Your Question</h4>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Type your clinical question in plain English in the <strong>Query &amp; PICO</strong> tab or in <strong>Simple Mode</strong>.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-2">
            <div className="text-xs font-mono font-bold text-[var(--accent-primary)]">STEP 02</div>
            <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Review Extracted PICO</h4>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Check the automatically parsed P, I, C, and O terms. Customize any keywords or date limits, then click <strong>Save Query Version</strong>.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-2">
            <div className="text-xs font-mono font-bold text-[var(--accent-primary)]">STEP 03</div>
            <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Fetch &amp; Deduplicate</h4>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              In <strong>Fetch &amp; Deduplicate</strong>, select your query version and click <strong>Run Literature Pipeline</strong> to retrieve and cluster records.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-2">
            <div className="text-xs font-mono font-bold text-[var(--accent-primary)]">STEP 04</div>
            <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Screen &amp; Export</h4>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              In the <strong>Screening Hub</strong>, read abstracts with highlighted terms, mark decisions (Include/Exclude/Maybe), and export your final dataset as CSV.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. FREQUENTLY ASKED QUESTIONS (FAQ) ACCORDION */}
      {/* ========================================================================= */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Common questions about clinical screening, database coverage, and export options.
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div 
                key={idx}
                className="theme-glass-card rounded-2xl border border-[var(--border-subtle)] overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full text-left p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.03] transition-colors"
                >
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {faq.q}
                  </span>
                  <div className="p-1 rounded-lg theme-glass-input shrink-0" style={{ color: 'var(--accent-primary)' }}>
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm leading-relaxed border-t border-[var(--border-subtle)]/50" style={{ color: 'var(--text-secondary)' }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. FOOTER CALL TO ACTION */}
      {/* ========================================================================= */}
      <div className="text-center py-8 border-t border-[var(--border-subtle)] space-y-4">
        <h3 className="text-lg font-bold font-display" style={{ color: 'var(--text-primary)' }}>
          Ready to Start Your Systematic Review?
        </h3>
        <p className="text-xs max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
          Choose between the streamlined 1-question Simple Screener or the multi-phase Advanced Research Protocol workspace.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          {onStartSimpleMode && (
            <button
              type="button"
              onClick={onStartSimpleMode}
              className="theme-primary-btn px-5 py-2.5 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Sparkles className="w-4 h-4" />
              <span>Open Simple Screener</span>
            </button>
          )}

          {onOpenAdvancedPhase && (
            <button
              type="button"
              onClick={() => onOpenAdvancedPhase('books')}
              className="theme-glass-input hover:brightness-110 px-5 py-2.5 text-xs font-semibold rounded-xl flex items-center gap-2 cursor-pointer transition-all"
              style={{ color: 'var(--text-primary)' }}
            >
              <BookOpen className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
              <span>Open Advanced Workspace</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
