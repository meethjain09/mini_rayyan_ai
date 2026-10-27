import React, { useState } from 'react';
import {
  Plus,
  Search,
  CheckCircle,
  Clock,
  Sparkles,
  ChevronDown,
  Trash2,
  ArrowUpRight,
  LogOut,
  X,
  AlertTriangle,
  FolderGit2,
  Compass,
  BookmarkCheck,
  SlidersHorizontal,
  BookOpen,
  GitMerge,
  ShieldCheck,
  CheckCircle2,
  GitCompare,
  HelpCircle,
} from 'lucide-react';
import { ResearchBook, Profile, PicoConfig, QueryVersion } from '../../types/database';
import { ThemeMode } from '../../types/theme';
import { isSupabaseConfigured } from '../../lib/supabase';
import { ThemeSwitcher } from '../ui/ThemeSwitcher';
import { ClinicalQueryInterface } from '../query/ClinicalQueryInterface';
import { FetchAndDeduplicateView } from '../fetch/FetchAndDeduplicateView';
import { ScreeningDashboard } from '../screening/ScreeningDashboard';
import { Level2LoopDiffView } from '../loop/Level2LoopDiffView';
import { PlatformGuideView } from '../guide/PlatformGuideView';

interface ResearchBooksDashboardProps {
  user: Profile;
  books: ResearchBook[];
  activeBookId: string | null;
  onSelectBook: (bookId: string) => void;
  onCreateBook: (title: string, description: string, pico: PicoConfig) => void;
  onDeleteBook: (bookId: string) => void;
  onLogout: () => void;
  currentTheme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onSwitchToSimpleMode?: () => void;
  onSeedDemo?: () => void;
  initialTab?: 'books' | 'query' | 'fetch' | 'screening' | 'loop' | 'guide';
}

export const ResearchBooksDashboard: React.FC<ResearchBooksDashboardProps> = ({
  user,
  books,
  activeBookId,
  onSelectBook,
  onCreateBook,
  onDeleteBook,
  onLogout,
  currentTheme,
  onThemeChange,
  onSwitchToSimpleMode,
  onSeedDemo,
  initialTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'books' | 'query' | 'fetch' | 'screening' | 'loop' | 'guide'>(initialTab || 'books');

  // New Book Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [population, setPopulation] = useState('');
  const [intervention, setIntervention] = useState('');
  const [comparator, setComparator] = useState('');
  const [outcome, setOutcome] = useState('');
  const [inclusionInput, setInclusionInput] = useState('');
  const [exclusionInput, setExclusionInput] = useState('');
  const [inclusionList, setInclusionList] = useState<string[]>([
    'Human randomized controlled trials (RCTs)',
    'Adult cohorts (age ≥ 18)',
  ]);
  const [exclusionList, setExclusionList] = useState<string[]>([
    'Animal or in vitro experimental models',
    'Non-English publications',
    'In silico or mathematical simulations',
  ]);

  // Filter books by search query
  const filteredBooks = books.filter((b) => {
    const q = searchQuery.toLowerCase();
    return (
      b.title.toLowerCase().includes(q) ||
      (b.description && b.description.toLowerCase().includes(q)) ||
      b.pico_config.p.toLowerCase().includes(q) ||
      b.pico_config.i.toLowerCase().includes(q)
    );
  });

  const activeBook = books.find((b) => b.id === activeBookId) || books[0];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const pico: PicoConfig = {
      p: population.trim() || 'Adult patients with target clinical condition',
      i: intervention.trim() || 'Primary therapeutic intervention',
      c: comparator.trim() || 'Placebo or active comparator',
      o: outcome.trim() || 'Primary clinical efficacy and adverse endpoints',
      inclusionCriteria: inclusionList,
      exclusionCriteria: exclusionList,
    };

    onCreateBook(newTitle.trim(), newDescription.trim(), pico);

    // Reset form
    setNewTitle('');
    setNewDescription('');
    setPopulation('');
    setIntervention('');
    setComparator('');
    setOutcome('');
    setIsCreateModalOpen(false);
  };

  const handleAddInclusion = () => {
    if (inclusionInput.trim()) {
      setInclusionList([...inclusionList, inclusionInput.trim()]);
      setInclusionInput('');
    }
  };

  const handleAddExclusion = () => {
    if (exclusionInput.trim()) {
      setExclusionList([...exclusionList, exclusionInput.trim()]);
      setExclusionInput('');
    }
  };

  const prefillT2DExample = () => {
    setNewTitle('Glucagon-like Peptide-1 (GLP-1) Receptor Agonists for Major Adverse Cardiovascular Events');
    setNewDescription('Systematic review evaluating cardiovascular outcomes (3-point MACE) and renal protection associated with GLP-1 RAs compared to placebo in high-risk diabetic cohorts.');
    setPopulation('Adults (≥18 years) with type 2 diabetes and established cardiovascular disease or elevated cardiovascular risk');
    setIntervention('GLP-1 receptor agonists (Semaglutide, Liraglutide, Dulaglutide)');
    setComparator('Placebo or standard diabetes care');
    setOutcome('Composite 3-point MACE (cardiovascular death, nonfatal MI, nonfatal stroke), all-cause mortality');
    setInclusionList([
      'Double-blind randomized controlled cardiovascular outcomes trials (CVOTs)',
      'Median follow-up period ≥ 12 months',
      'Confirmed type 2 diabetes mellitus at baseline',
    ]);
    setExclusionList([
      'Animal or non-human experimental models',
      'Non-randomized observational cohort studies',
      'Pediatric populations (< 18 years)',
      'Non-English language records',
    ]);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans relative overflow-x-hidden transition-colors duration-500">
      {/* Dimensional Ambient Mesh Lights (reactive to theme) */}
      <div 
        className="fixed top-[-10%] left-[15%] w-[650px] h-[450px] rounded-full blur-[150px] pointer-events-none transition-all duration-700" 
        style={{ backgroundColor: 'var(--orb-1)' }}
      />
      <div 
        className="fixed top-[20%] right-[10%] w-[550px] h-[500px] rounded-full blur-[170px] pointer-events-none transition-all duration-700" 
        style={{ backgroundColor: 'var(--orb-2)' }}
      />
      <div 
        className="fixed bottom-[-10%] left-[30%] w-[500px] h-[450px] rounded-full blur-[160px] pointer-events-none transition-all duration-700" 
        style={{ backgroundColor: 'var(--orb-3)' }}
      />

      {/* Subtle fine technical grid */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: `linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)`,
          backgroundSize: '48px 48px'
        }}
      />

      {/* Top Bar Navigation with Dynamic Frosted Glass */}
      <header className="sticky top-0 z-40 theme-glass-base">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand and Active Workspace Switcher */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0 min-w-0">
            <div 
              className="w-9 h-9 rounded-xl p-[1.5px] shadow-lg shrink-0"
              style={{ background: 'var(--border-conic)' }}
            >
              <div 
                className="w-full h-full rounded-[10px] flex items-center justify-center"
                style={{ backgroundColor: 'var(--bg-canvas)' }}
              >
                <Compass className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
              </div>
            </div>
            <a href="/" className="text-base font-extrabold tracking-tight font-display whitespace-nowrap shrink-0" style={{ color: 'var(--text-primary)' }}>
              Mini<span style={{ color: 'var(--accent-primary)' }}>Rayyan</span>
            </a>

            {/* Compact Workspace Indicator & Switcher */}
            {books.length > 0 && (
              <div className="relative group shrink-0 hidden sm:block">
                <button
                  type="button"
                  className="flex items-center gap-1.5 theme-glass-input text-xs rounded-xl px-2.5 py-1.5 transition-all cursor-pointer border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/50"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <FolderGit2 className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent-primary)' }} />
                  <span className="font-mono text-[10px] opacity-60 uppercase">Book:</span>
                  <span className="font-medium max-w-[130px] md:max-w-[170px] truncate" style={{ color: 'var(--text-primary)' }}>
                    {activeBook?.title || 'Select Book'}
                  </span>
                  <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
                </button>

                {/* Dropdown */}
                <div className="absolute left-0 mt-2 w-80 theme-glass-elevated rounded-2xl py-2 hidden group-hover:block z-50 shadow-2xl border border-[var(--border-elevated)]">
                  <div 
                    className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest border-b mb-1"
                    style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)' }}
                  >
                    Switch Research Workspace ({books.length})
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {books.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => onSelectBook(b.id)}
                        className={`w-full text-left px-4 py-2.5 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          b.id === activeBookId ? 'font-bold' : 'opacity-80 hover:opacity-100 hover:bg-white/5'
                        }`}
                        style={{
                          color: b.id === activeBookId ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          backgroundColor: b.id === activeBookId ? 'var(--pico-p-bg)' : undefined,
                        }}
                      >
                        <span className="truncate pr-2">{b.title}</span>
                        {b.id === activeBookId && <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent-primary)' }} />}
                      </button>
                    ))}
                  </div>
                  <div className="pt-2 border-t px-3" style={{ borderColor: 'var(--border-subtle)' }}>
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium hover:brightness-110 transition-colors cursor-pointer"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create New Protocol</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Actions, Theme Switcher & Logout (Spacious and never overflowed) */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Hackathon Dual-Engine Database Status Indicator */}
            <div 
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border"
              style={{
                backgroundColor: isSupabaseConfigured ? 'rgba(56, 189, 248, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                borderColor: isSupabaseConfigured ? 'rgba(56, 189, 248, 0.3)' : 'rgba(16, 185, 129, 0.3)',
                color: isSupabaseConfigured ? '#38bdf8' : '#10b981',
              }}
              title={isSupabaseConfigured ? 'Connected to remote Supabase PostgreSQL database' : 'Running on high-performance Localhost Database (100% Offline Ready)'}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: isSupabaseConfigured ? '#38bdf8' : '#10b981' }} />
              <span>{isSupabaseConfigured ? 'Cloud: Supabase' : 'Local DB: Offline'}</span>
            </div>

            {/* Quick Demo Dataset Seeder */}
            {onSeedDemo && (
              <button
                type="button"
                onClick={onSeedDemo}
                className="hidden md:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-mono border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-all cursor-pointer whitespace-nowrap shrink-0"
                title="Seed benchmark systematic review data (T2D protocol, v1/v2 queries, deduplicated studies, decisions & PRISMA)"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Seed Demo</span>
              </button>
            )}

            {/* Create New Protocol Button */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="theme-primary-btn px-3 sm:px-4 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              title="Create new systematic review research book"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Book</span>
            </button>

            {/* Simple Mode Toggle */}
            {onSwitchToSimpleMode && (
              <button
                type="button"
                onClick={onSwitchToSimpleMode}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-mono border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)]/20 transition-all cursor-pointer whitespace-nowrap shrink-0"
                style={{ color: 'var(--accent-primary)' }}
                title="Switch to Simplified Single-Question Flow"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="font-semibold hidden sm:inline">Simple Mode</span>
              </button>
            )}

            {/* Live Theme Palette Switcher */}
            <ThemeSwitcher currentTheme={currentTheme} onThemeChange={onThemeChange} />

            {/* Sign Out Button */}
            <button
              onClick={onLogout}
              title={`Signed in as ${user.email} (Click to sign out)`}
              className="p-2 opacity-60 hover:opacity-100 hover:text-red-400 rounded-xl transition-all shrink-0 cursor-pointer border border-[var(--border-subtle)] hover:border-red-400/40"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Single Primary Workspace Navigation Menu */}
        <div className="flex items-center gap-1.5 mb-6 p-1.5 rounded-2xl theme-glass-input w-fit max-w-full overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('books')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'books'
                ? 'theme-primary-btn shadow-md'
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Research Books</span>
            <span className="font-mono text-[10px] opacity-75">({books.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('query')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'query'
                ? 'theme-primary-btn shadow-md'
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Query &amp; PICO</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fetch')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'fetch'
                ? 'theme-primary-btn shadow-md'
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            <GitMerge className="w-3.5 h-3.5" />
            <span>Fetch &amp; Deduplicate</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('screening')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'screening'
                ? 'theme-primary-btn shadow-md'
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Screening Hub</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('loop')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'loop'
                ? 'theme-primary-btn shadow-md'
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Query Loop &amp; Diff</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'guide'
                ? 'theme-primary-btn shadow-md'
                : 'opacity-70 hover:opacity-100 hover:text-[var(--accent-primary)]'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Platform Guide</span>
          </button>
        </div>

        {!activeBook && activeTab !== 'books' && activeTab !== 'guide' ? (
          <div className="mt-8 text-center py-16 px-4 border border-dashed rounded-3xl theme-glass-base" style={{ borderColor: 'var(--border-subtle)' }}>
            <Compass className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <h3 className="text-base font-semibold font-display" style={{ color: 'var(--text-primary)' }}>No Research Protocol Created Yet</h3>
            <p className="text-xs max-w-sm mx-auto mt-1 font-sans" style={{ color: 'var(--text-muted)' }}>
              Please create a research book protocol first to formulate PICO queries, fetch literature, and screen studies.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {onSeedDemo && (
                <button
                  onClick={onSeedDemo}
                  className="px-4 py-2 text-xs flex items-center gap-2 cursor-pointer rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-semibold transition-all shadow-md"
                  title="Load full benchmark clinical trial data for instant hackathon demonstration"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Seed Hackathon Demo Dataset</span>
                </button>
              )}
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="theme-primary-btn px-4 py-2 text-xs flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Protocol</span>
              </button>
              {onSwitchToSimpleMode && (
                <button
                  onClick={onSwitchToSimpleMode}
                  className="theme-glass-input px-4 py-2 text-xs flex items-center gap-2 cursor-pointer rounded-xl hover:brightness-110"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Simple PICO Mode</span>
                </button>
              )}
            </div>
          </div>
        ) : activeTab === 'guide' ? (
          <PlatformGuideView
            currentTheme={currentTheme}
            onStartSimpleMode={onSwitchToSimpleMode}
            onOpenAdvancedPhase={(phase) => setActiveTab(phase)}
          />
        ) : activeTab === 'query' && activeBook ? (
          <ClinicalQueryInterface
            activeBook={activeBook}
            onQueryVersionSaved={() => setActiveTab('fetch')}
          />
        ) : activeTab === 'fetch' && activeBook ? (
          <FetchAndDeduplicateView
            activeBook={activeBook}
            onProceedToScreening={() => {
              setActiveTab('screening');
            }}
          />
        ) : activeTab === 'screening' && activeBook ? (
          <ScreeningDashboard
            book={activeBook}
            onBackToFetch={() => setActiveTab('fetch')}
          />
        ) : activeTab === 'loop' && activeBook ? (
          <Level2LoopDiffView
            book={activeBook}
            onSelectQueryVersionForFetch={() => setActiveTab('fetch')}
            onProceedToScreening={() => setActiveTab('screening')}
          />
        ) : (
          <>
            {/* Frosted Glass Hero Banner with Layered Depth */}
            <div className="theme-glass-card rounded-3xl p-8 sm:p-10 relative overflow-hidden">
              <div 
                className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-40" 
                style={{ backgroundColor: 'var(--accent-glow)' }}
              />

          <div className="relative z-10 max-w-2xl">
            <div 
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full theme-glass-input text-[11px] font-mono tracking-wider mb-4"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Sparkles className="w-3 h-3" style={{ color: 'var(--accent-primary)' }} />
              <span>PHASE 1: SYSTEMATIC REVIEW PROTOCOL INITIALIZATION</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-display text-balance" style={{ color: 'var(--text-primary)' }}>
              Systematic Literature Screening, Precision Engineered.
            </h1>
            <p className="mt-3 text-sm leading-relaxed font-sans" style={{ color: 'var(--text-secondary)' }}>
              Replicate Rayyan.ai systematic review workflows. Formulate clinical PICO protocols, screen randomized controlled trials, and maintain an immutable decision audit log.
            </p>
          </div>

          {/* Quick Metrics Strip */}
          <div className="mt-8 pt-6 border-t grid grid-cols-2 sm:grid-cols-4 gap-4" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Active Books</span>
              <div className="text-2xl font-bold font-display tabular-nums" style={{ color: 'var(--text-primary)' }}>{books.length}</div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Screening Engine</span>
              <div className="text-xs font-mono font-semibold" style={{ color: 'var(--accent-primary)' }}>PICO Rule Heuristics</div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Deduplication</span>
              <div className="text-xs font-mono font-semibold" style={{ color: 'var(--accent-secondary)' }}>DOI + PMID + Title</div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Audit Protocol</span>
              <div className="text-xs font-mono font-semibold" style={{ color: 'var(--text-secondary)' }}>Zero Hard Deletions</div>
            </div>
          </div>
        </div>

        {/* Search & Actions Bar with Glass-Input Tier */}
        <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by topic, intervention, or clinical population..."
              className="w-full pl-10 pr-4 py-2.5 theme-glass-input rounded-2xl text-xs placeholder:opacity-50 focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] transition-all font-sans"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2.5 text-xs font-semibold theme-glass-input rounded-2xl hover:brightness-110 transition-all cursor-pointer flex items-center gap-2"
              style={{ color: 'var(--text-primary)' }}
            >
              <Plus className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
              <span>Create Protocol</span>
            </button>
          </div>
        </div>

        {/* Research Books Grid - Featuring CSS-Masked Animated Gradient Borders on Active Workspace */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredBooks.map((book) => {
            const isActive = book.id === activeBookId;
            return (
              <div
                key={book.id}
                className={`p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 rounded-3xl ${
                  isActive ? 'theme-animated-card' : 'theme-glass-card'
                }`}
              >
                <div className="relative z-10">
                  {/* Card Header & Metadata */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-[11px] font-mono mb-2" style={{ color: 'var(--text-muted)' }}>
                        <span>WORKSPACE ID: {book.id.substring(0, 12)}</span>
                        {isActive && (
                          <span 
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border"
                            style={{ 
                              backgroundColor: 'var(--pico-p-bg)',
                              borderColor: 'var(--pico-p-border)',
                              color: 'var(--accent-primary)' 
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent-primary)' }} />
                            ACTIVE WORKSPACE
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold tracking-tight font-display leading-snug" style={{ color: 'var(--text-primary)' }}>
                        {book.title}
                      </h3>
                    </div>

                    <button
                      onClick={() => setDeleteConfirmId(book.id)}
                      className="p-2 opacity-50 hover:opacity-100 hover:text-red-400 hover:bg-white/[0.08] rounded-xl transition-colors cursor-pointer"
                      title="Archive Research Book"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="mt-3 text-xs line-clamp-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {book.description || 'Systematic review protocol initialized with standard PRISMA screening criteria.'}
                  </p>

                  {/* Modern PICO Quadrant Chips */}
                  <div className="mt-5 pt-4 border-t space-y-2" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div className="flex items-center justify-between text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                      <span className="uppercase tracking-wider">PICO Protocol Matrix</span>
                      <span className="text-[10px]" style={{ color: 'var(--accent-primary)' }}>Step 0 Configured</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {/* Population */}
                      <div 
                        className="p-2.5 rounded-xl border backdrop-blur-md"
                        style={{ backgroundColor: 'var(--pico-p-bg)', borderColor: 'var(--pico-p-border)' }}
                      >
                        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--pico-p-text)' }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--pico-p-text)' }} />
                          <span>Population [P]</span>
                        </div>
                        <p className="text-[11px] line-clamp-1" style={{ color: 'var(--text-primary)' }}>{book.pico_config.p || '—'}</p>
                      </div>

                      {/* Intervention */}
                      <div 
                        className="p-2.5 rounded-xl border backdrop-blur-md"
                        style={{ backgroundColor: 'var(--pico-i-bg)', borderColor: 'var(--pico-i-border)' }}
                      >
                        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--pico-i-text)' }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--pico-i-text)' }} />
                          <span>Intervention [I]</span>
                        </div>
                        <p className="text-[11px] line-clamp-1" style={{ color: 'var(--text-primary)' }}>{book.pico_config.i || '—'}</p>
                      </div>

                      {/* Comparator */}
                      <div 
                        className="p-2.5 rounded-xl border backdrop-blur-md"
                        style={{ backgroundColor: 'var(--pico-c-bg)', borderColor: 'var(--pico-c-border)' }}
                      >
                        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--pico-c-text)' }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--pico-c-text)' }} />
                          <span>Comparator [C]</span>
                        </div>
                        <p className="text-[11px] line-clamp-1" style={{ color: 'var(--text-primary)' }}>{book.pico_config.c || '—'}</p>
                      </div>

                      {/* Outcome */}
                      <div 
                        className="p-2.5 rounded-xl border backdrop-blur-md"
                        style={{ backgroundColor: 'var(--pico-o-bg)', borderColor: 'var(--pico-o-border)' }}
                      >
                        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--pico-o-text)' }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--pico-o-text)' }} />
                          <span>Outcome [O]</span>
                        </div>
                        <p className="text-[11px] line-clamp-1" style={{ color: 'var(--text-primary)' }}>{book.pico_config.o || '—'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Rules stats */}
                  <div className="mt-3 flex items-center gap-3 text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1" style={{ color: 'var(--accent-primary)' }}>
                      <BookmarkCheck className="w-3 h-3" />
                      {book.pico_config.inclusionCriteria?.length || 0} Inclusion
                    </span>
                    <span style={{ color: 'var(--text-dim)' }}>·</span>
                    <span className="flex items-center gap-1 text-rose-400">
                      <SlidersHorizontal className="w-3 h-3" />
                      {book.pico_config.exclusionCriteria?.length || 0} Exclusions
                    </span>
                  </div>
                </div>

                {/* Card Bottom Action */}
                <div className="mt-6 pt-4 border-t flex items-center justify-between relative z-10" style={{ borderColor: 'var(--border-subtle)' }}>
                  <span className="text-[11px] font-mono flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(book.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectBook(book.id);
                        setActiveTab('query');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold theme-glass-input hover:brightness-110 cursor-pointer"
                      style={{ color: 'var(--accent-primary)' }}
                      title="Open Natural Language Query & PICO Builder"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Build Query</span>
                    </button>

                    <button
                      onClick={() => onSelectBook(book.id)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'theme-primary-btn'
                          : 'theme-glass-input hover:brightness-110'
                      }`}
                    >
                      <span>{isActive ? 'Active' : 'Select'}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {filteredBooks.length === 0 && (
          <div className="mt-12 text-center py-16 px-4 border border-dashed rounded-3xl theme-glass-base" style={{ borderColor: 'var(--border-subtle)' }}>
            <Compass className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <h3 className="text-base font-semibold font-display" style={{ color: 'var(--text-primary)' }}>
              {books.length === 0 ? 'No Research Books Yet' : 'No matching Research Books found'}
            </h3>
            <p className="text-xs max-w-sm mx-auto mt-1 font-sans" style={{ color: 'var(--text-muted)' }}>
              {books.length === 0
                ? 'Your systematic review workspace is clean and ready. Create your first research protocol to begin screening literature.'
                : 'No review projects matched your search query. Clear search or create a new book.'}
            </p>
            {books.length === 0 && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {onSeedDemo && (
                  <button
                    type="button"
                    onClick={onSeedDemo}
                    className="px-4 py-2 text-xs flex items-center gap-2 cursor-pointer rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-semibold transition-all shadow-md"
                    title="Load complete hackathon demo data (T2D protocol, v1/v2 queries, deduplicated studies, decisions & PRISMA)"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Seed Hackathon Demo Dataset</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="theme-primary-btn px-4 py-2 text-xs flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Protocol</span>
                </button>
                {onSwitchToSimpleMode && (
                  <button
                    type="button"
                    onClick={onSwitchToSimpleMode}
                    className="theme-glass-input px-4 py-2 text-xs flex items-center gap-2 cursor-pointer rounded-xl hover:brightness-110"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Try Simple PICO Mode</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </>
    )}
  </main>

      {/* CREATE MODAL with Dynamic Theme Frosted Glass */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl overflow-y-auto">
          <div className="theme-glass-elevated rounded-3xl w-full max-w-2xl p-6 sm:p-8 relative my-8">
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center border"
                  style={{ backgroundColor: 'var(--pico-p-bg)', borderColor: 'var(--pico-p-border)' }}
                >
                  <Compass className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                </div>
                <div>
                  <h3 className="text-base font-bold font-display" style={{ color: 'var(--text-primary)' }}>Create Research Book</h3>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Configure clinical review protocol and PICO boundaries</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="opacity-50 hover:opacity-100 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-5 space-y-4">
              {/* Preset Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={prefillT2DExample}
                  className="theme-glass-input px-3 py-1.5 text-xs rounded-xl flex items-center gap-1.5 hover:brightness-110 transition-all cursor-pointer"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Preset: GLP-1 Cardioprotection Review</span>
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Review Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. SGLT2 Inhibitors vs Placebo in Heart Failure with Preserved Ejection Fraction"
                  className="w-full px-3.5 py-2.5 theme-glass-input rounded-xl text-xs placeholder:opacity-40 focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Description &amp; Research Question
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Clinical research question and rationale for this systematic screening review..."
                  className="w-full px-3.5 py-2.5 theme-glass-input rounded-xl text-xs placeholder:opacity-40 focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                />
              </div>

              {/* PICO Grid */}
              <div className="pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <h4 className="text-[11px] font-mono font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                  Step 0: PICO Matrix Formulation
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--pico-p-text)' }}>
                      Population [P]
                    </label>
                    <input
                      type="text"
                      value={population}
                      onChange={(e) => setPopulation(e.target.value)}
                      placeholder="e.g. Adults with confirmed type 2 diabetes"
                      className="w-full px-3 py-2 theme-glass-input rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--pico-i-text)' }}>
                      Intervention [I]
                    </label>
                    <input
                      type="text"
                      value={intervention}
                      onChange={(e) => setIntervention(e.target.value)}
                      placeholder="e.g. GLP-1 Receptor Agonists or Metformin"
                      className="w-full px-3 py-2 theme-glass-input rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--pico-c-text)' }}>
                      Comparator [C]
                    </label>
                    <input
                      type="text"
                      value={comparator}
                      onChange={(e) => setComparator(e.target.value)}
                      placeholder="e.g. Placebo or standard medical therapy"
                      className="w-full px-3 py-2 theme-glass-input rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--pico-o-text)' }}>
                      Outcome [O]
                    </label>
                    <input
                      type="text"
                      value={outcome}
                      onChange={(e) => setOutcome(e.target.value)}
                      placeholder="e.g. 3-point MACE, HbA1c reduction, mortality"
                      className="w-full px-3 py-2 theme-glass-input rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                    />
                  </div>
                </div>
              </div>

              {/* Inclusion list */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Inclusion Rules
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={inclusionInput}
                    onChange={(e) => setInclusionInput(e.target.value)}
                    placeholder="Add an inclusion criterion..."
                    className="flex-1 px-3 py-2 theme-glass-input rounded-xl text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddInclusion();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddInclusion}
                    className="px-3 py-2 theme-glass-input hover:brightness-110 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                  {inclusionList.map((item, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono border backdrop-blur-md"
                      style={{ 
                        backgroundColor: 'var(--pico-p-bg)', 
                        borderColor: 'var(--pico-p-border)',
                        color: 'var(--pico-p-text)'
                      }}
                    >
                      <span>✓ {item}</span>
                      <button
                        type="button"
                        onClick={() => setInclusionList(inclusionList.filter((_, i) => i !== idx))}
                        className="opacity-70 hover:opacity-100"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Exclusion list */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Exclusion Rules
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={exclusionInput}
                    onChange={(e) => setExclusionInput(e.target.value)}
                    placeholder="Add an exclusion criterion..."
                    className="flex-1 px-3 py-2 theme-glass-input rounded-xl text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddExclusion();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddExclusion}
                    className="px-3 py-2 theme-glass-input hover:brightness-110 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                  {exclusionList.map((item, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono bg-rose-950/40 text-rose-300 border border-rose-500/30 backdrop-blur-md"
                    >
                      <span>✕ {item}</span>
                      <button
                        type="button"
                        onClick={() => setExclusionList(exclusionList.filter((_, i) => i !== idx))}
                        className="text-rose-400 hover:text-white"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-4 border-t flex items-center justify-end gap-3" style={{ borderColor: 'var(--border-subtle)' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 theme-glass-input text-xs font-semibold rounded-xl cursor-pointer"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="theme-primary-btn px-5 py-2.5 text-xs font-bold cursor-pointer"
                >
                  Initialize Protocol
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* DELETE CONFIRM MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
          <div className="theme-glass-elevated rounded-3xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold font-display" style={{ color: 'var(--text-primary)' }}>Archive Research Book?</h3>
            </div>
            <p className="text-xs leading-relaxed font-sans" style={{ color: 'var(--text-secondary)' }}>
              Are you sure you want to detach this review workspace? All raw papers and audit links remain intact in the database schema.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 theme-glass-input text-xs font-semibold rounded-xl cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteBook(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-red-600/30 cursor-pointer"
              >
                Confirm Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
