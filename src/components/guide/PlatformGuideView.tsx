/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PLATFORM GUIDE & INTERACTIVE WORKFLOW MANUAL
 * Comprehensive, production-grade guide explaining the Mini-Rayyan systematic review
 * architecture: 5-phase clinical protocol, PICO compilation, 8 literature adapters
 * (OpenAlex, Crossref, Semantic Scholar, PubMed, EurPMC, arXiv, DOAJ, CORE),
 * 3-tier deterministic deduplication, blinded screening, Gemini-powered AI evidence
 * synthesis with GRADE rating, Level 2 query versioning, and PRISMA 2020 reporting.
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
  Database,
  Cpu,
  Zap,
  Download,
  Flame,
  Award,
  AlertTriangle,
  Lightbulb,
  Keyboard,
  ArrowLeftRight,
  Server,
  CloudCheck,
} from 'lucide-react';
import { ThemeMode } from '../../types/theme';

interface PlatformGuideProps {
  onStartSimpleMode?: () => void;
  onOpenAdvancedPhase?: (tab: 'books' | 'query' | 'fetch' | 'screening' | 'loop') => void;
  onCloseGuide?: () => void;
  currentTheme?: ThemeMode;
}

// -----------------------------------------------------------------------------
// Sample Clinical PICO Questions & Case Studies
// -----------------------------------------------------------------------------
const SAMPLE_PICO_EXPLANATIONS = [
  {
    title: 'Dermatology: Sun Tan & Melanin Removal',
    category: 'Cutaneous Biology & Dermatology',
    query: 'Can skin tanning induced by UV radiation be removed or reversed with topical interventions?',
    p: 'Human subjects with ultraviolet radiation-induced epidermal hyperpigmentation (sun tan)',
    i: 'Topical depigmenting agents (glycolic/lactic AHA chemical peels, vitamin C, niacinamide, retinoids, hydroquinone)',
    c: 'Placebo, vehicle cream, or natural epidermal desquamation cycle without intervention',
    o: 'Melanin index reduction (Mexameter), accelerated desquamation rate, restoration of baseline skin tone (ITA°)',
    boolean: '("ultraviolet induced hyperpigmentation"[Title/Abstract] OR "sun tan"[Title/Abstract]) AND ("chemical peel"[Title/Abstract] OR "glycolic acid"[Title/Abstract] OR "niacinamide"[Title/Abstract]) AND ("melanin index"[Title/Abstract] OR "pigmentation clearance"[Title/Abstract])',
    sources: ['PubMed', 'OpenAlex', 'Europe PMC', 'Crossref'],
  },
  {
    title: 'Endocrinology: Type 2 Diabetes & Metformin',
    category: 'Metabolic & Cardiovascular Medicine',
    query: 'In adults with type 2 diabetes, does metformin compared to placebo reduce HbA1c and all-cause mortality?',
    p: 'Adults with type 2 diabetes mellitus (age >= 18 years, HbA1c > 7.0%)',
    i: 'Metformin monotherapy (immediate or extended release, 500-2550 mg daily)',
    c: 'Placebo, lifestyle modification alone, or standard diet control',
    o: 'HbA1c percentage reduction, fasting plasma glucose, all-cause and cardiovascular mortality',
    boolean: '("Adults with type 2 diabetes"[Title/Abstract]) AND ("Metformin"[Title/Abstract]) AND ("Placebo"[Title/Abstract] OR "diet control"[Title/Abstract]) AND ("HbA1c"[Title/Abstract] OR "mortality"[Title/Abstract])',
    sources: ['PubMed', 'Europe PMC', 'Semantic Scholar', 'DOAJ'],
  },
  {
    title: 'Cardiology: HFpEF & SGLT2 Inhibitors',
    category: 'Cardiovascular Therapeutics',
    query: 'In patients with heart failure with preserved ejection fraction, does empagliflozin lower cardiovascular death?',
    p: 'Adult patients with heart failure and preserved ejection fraction (LVEF > 40-50%)',
    i: 'SGLT2 inhibitors (Empagliflozin 10mg once daily or Dapagliflozin 10mg once daily)',
    c: 'Placebo or standard background heart failure guideline-directed medical therapy',
    o: 'Composite cardiovascular death, first and recurrent hospitalizations for heart failure',
    boolean: '("Heart failure with preserved ejection fraction"[Title/Abstract] OR "HFpEF"[Title/Abstract]) AND ("Empagliflozin"[Title/Abstract] OR "SGLT2 inhibitor"[Title/Abstract]) AND ("Placebo"[Title/Abstract])',
    sources: ['PubMed', 'OpenAlex', 'Europe PMC', 'CORE'],
  },
  {
    title: 'Neurology: Acute Ischemic Stroke & Tenecteplase',
    category: 'Cerebrovascular & Emergency Medicine',
    query: 'In acute ischemic stroke within 4.5 hours, does tenecteplase compared to alteplase improve functional recovery?',
    p: 'Adult patients presenting with acute ischemic stroke eligible for thrombolysis within 4.5h of onset',
    i: 'Intravenous Tenecteplase (0.25 mg/kg single bolus)',
    c: 'Intravenous Alteplase (0.9 mg/kg standard infusion over 60 minutes)',
    o: 'Modified Rankin Scale (mRS 0-1) at 90 days, substantial neurological improvement at 24h, intracranial hemorrhage',
    boolean: '("acute ischemic stroke"[Title/Abstract]) AND ("tenecteplase"[Title/Abstract]) AND ("alteplase"[Title/Abstract]) AND ("modified Rankin scale"[Title/Abstract] OR "functional outcome"[Title/Abstract])',
    sources: ['PubMed', 'Europe PMC', 'Crossref', 'arXiv'],
  },
];

// -----------------------------------------------------------------------------
// Literature Search Sources Matrix (Adapter Pattern)
// -----------------------------------------------------------------------------
const LITERATURE_SOURCES_MATRIX = [
  {
    name: 'OpenAlex Scholarly Graph',
    tag: 'OpenAlex',
    badge: 'Open Access / Comprehensive',
    count: '250M+ Works',
    description: 'Modern open catalog created as the successor to Microsoft Academic Graph. Covers global multi-disciplinary scientific works with DOI links, citation graphs, and institution data.',
    politePool: 'Yes (100k requests/day with ?mailto=)',
    auth: 'Free, No API Key Required',
    domain: 'All Sciences & Biomedicine',
  },
  {
    name: 'Crossref REST API',
    tag: 'Crossref',
    badge: 'Official DOI Registry',
    count: '150M+ Records',
    description: 'The official international DOI registration agency for scholarly publishing. Essential for resolving official publisher metadata, metadata completeness, and canonical publication dates.',
    politePool: 'Yes (Polite pool with mailto header)',
    auth: 'Free, No API Key Required',
    domain: 'Global Scholarly Publishing',
  },
  {
    name: 'Semantic Scholar API',
    tag: 'SemScholar',
    badge: 'Allen Institute for AI',
    count: '200M+ Papers',
    description: 'AI-curated academic repository with deep citation graphs, highly influential citations, TLDR one-sentence paper summaries, and field of study tags.',
    politePool: '100 requests per 5 minutes unauthenticated',
    auth: 'Free Public Tier, Key Optional',
    domain: 'Computer Science, Medicine & Biology',
  },
  {
    name: 'PubMed E-utilities',
    tag: 'PubMed',
    badge: 'NCBI / NLM Gold Standard',
    count: '36M+ Citations',
    description: 'National Library of Medicine gold standard for biomedical research. Fully indexed with Medical Subject Headings (MeSH), clinical trial identifiers, and authoritative PMID numbers.',
    politePool: 'Yes (3 req/sec unauthenticated, 10/sec with API key)',
    auth: 'Free, Key Optional',
    domain: 'Clinical Medicine & Life Sciences',
  },
  {
    name: 'Europe PMC REST API',
    tag: 'EurPMC',
    badge: 'EMBL-EBI / Open Access',
    count: '40M+ Articles',
    description: 'European bio-repository indexing PubMed records along with preprints (bioRxiv, medRxiv), patents, clinical guidelines, and millions of open access full-text articles.',
    politePool: 'Standard HTTP pooling',
    auth: 'Free, No API Key Required',
    domain: 'Life Sciences & Preprints',
  },
  {
    name: 'arXiv Open Preprints',
    tag: 'arXiv',
    badge: 'Cornell Open Archive',
    count: '2.4M+ Preprints',
    description: 'Premier open-access preprint archive for quantitative biology, bioinformatics, biostatistics, medical imaging AI, and computational neuroscience.',
    politePool: 'Respectful 1 req/3sec pooling',
    auth: 'Completely Open',
    domain: 'Quantitative Biology, Stats & AI',
  },
  {
    name: 'DOAJ (Directory of Open Access Journals)',
    tag: 'DOAJ',
    badge: 'Curated Open Access',
    count: '10M+ Articles',
    description: 'Community-curated directory of high-quality peer-reviewed open access journals. Guarantees that retrieved studies provide free, unhindered full text to researchers.',
    politePool: 'Unrestricted REST endpoints',
    auth: 'Free, No API Key Required',
    domain: 'Peer-Reviewed Open Access',
  },
  {
    name: 'CORE Global Research Repositories',
    tag: 'CORE',
    badge: 'Institutional Repositories',
    count: '200M+ Papers',
    description: 'Aggregates research papers from thousands of university repositories and open access journals globally with full-text harvesting capabilities.',
    politePool: 'Free tier API key available',
    auth: 'Free Registration for Key',
    domain: 'Global Institutional Archives',
  },
];

// -----------------------------------------------------------------------------
// Interactive AI Evidence Synthesizer Case Study Simulator
// -----------------------------------------------------------------------------
const AI_SYNTHESIS_SIMULATOR = {
  caseQuery: 'Can skin tanning induced by UV radiation be removed or reversed?',
  pico: {
    p: 'Human subjects with UV-induced epidermal hyperpigmentation (sun tan)',
    i: 'Topical depigmenting therapies (AHA chemical exfoliation, Niacinamide, Retinoids)',
    c: 'Placebo vehicle or unassisted natural desquamation',
    o: 'Accelerated melanin clearance, Mexameter index, skin tone baseline recovery',
  },
  executiveAnswer: 'Yes. UV-induced epidermal tanning is reversible and can be accelerated from the natural 28-to-40-day epidermal turnover cycle down to 10-14 days using topical tyrosinase inhibitors, alpha-hydroxy acid chemical exfoliation, and strict broad-spectrum photoprotection.',
  overallVerdict: 'Affirmative with Partial Spontaneous Resolution',
  evidenceStrength: 'Moderate (GRADE 2B)',
  evidenceStrengthRationale: 'Based on 4 randomized double-blind clinical trials and 2 prospective cohort studies evaluating pigmentary clearance in human cutaneous models.',
  mechanisms: 'Melanogenesis stimulated by UV radiation deposits eumelanin in keratinocytes. Clearance requires two parallel processes: (1) biological shedding of melanin-laden keratinocytes through desquamation (accelerated by AHAs/retinoids), and (2) inhibition of melanosome transfer and new pigment synthesis (achieved by niacinamide and tyrosinase blockers).',
  perStudyMatrix: [
    {
      title: 'Accelerated clearance of UV-induced epidermal pigmentation using glycolic acid peels: A randomized split-face trial',
      citation: 'J Dermatol Sci 2021 · Rodriguez et al.',
      direction: 'Supports',
      contribution: 'Demonstrated 47% faster reduction in Mexameter melanin index in skin treated with 20% glycolic acid vs vehicle control (p < 0.01).',
      design: 'Randomized Controlled Trial (n=44)',
    },
    {
      title: 'Topical 4% niacinamide versus vehicle in post-solar hyperpigmentation: Double-blind clinical evaluation',
      citation: 'Br J Dermatol 2020 · Hakozaki et al.',
      direction: 'Supports',
      contribution: 'Proved significant inhibition of melanosome transfer from melanocytes to keratinocytes with complete tone restoration at day 21 vs day 38 in controls.',
      design: 'Double-Blind RCT (n=60)',
    },
    {
      title: 'Natural history and kinetic decay of cutaneous ultraviolet-induced tanning in skin phototypes II-IV',
      citation: 'Photochem Photobiol 2019 · Chen et al.',
      direction: 'Neutral',
      contribution: 'Showed that without any topical intervention, natural epidermal renewal completely clears moderate tanning in 28 to 42 days, confirming spontaneous reversibility.',
      design: 'Prospective Cohort (n=32)',
    },
    {
      title: 'High-dose oral ascorbic acid in rapid photopigment clearance: A comparative study',
      citation: 'Dermatol Ther 2022 · Patel et al.',
      direction: 'Opposes',
      contribution: 'Isolated oral vitamin C without topical formulation showed no statistically significant acceleration of tan clearance compared to placebo (p = 0.28).',
      design: 'Placebo-Controlled Trial (n=50)',
    },
  ],
  clinicalRecommendations: [
    'Apply broad-spectrum sunscreen (SPF >= 50, PA++++) daily to prevent persistent tyrosinase reactivation while treating existing pigmentation.',
    'Combine gentle chemical exfoliants (glycolic or lactic acid 5-10%) 2-3 nights per week to accelerate epidermal keratinocyte shedding.',
    'Introduce topical niacinamide (2-5%) or vitamin C (L-ascorbic acid 10-15%) each morning to prevent melanosome transfer to surrounding cells.',
    'Avoid aggressive mechanical scrubbing, which induces post-inflammatory hyperpigmentation (PIH), especially in Fitzpatrick skin phototypes IV-VI.',
  ],
  plainLanguageSummary: 'A sun tan is not permanent. Your skin naturally sheds its outer layer every 4 weeks, gradually carrying away melanin pigment. You can safely cut this time in half by using gentle exfoliating lotions (like glycolic acid) and brightening serums (like niacinamide) while wearing SPF 50 sunscreen every day.',
};

// -----------------------------------------------------------------------------
// Comprehensive Frequently Asked Questions
// -----------------------------------------------------------------------------
const FAQS = [
  {
    q: 'How does Mini-Rayyan compare to the original Rayyan.ai platform?',
    a: 'Mini-Rayyan captures the core workflow of Rayyan.ai—the gold standard in medical systematic reviews—while modernizing it with zero-install offline support, direct 8-source literature API aggregation (OpenAlex, Crossref, Semantic Scholar, PubMed, Europe PMC, arXiv, DOAJ, CORE), automated PICO compiler, and an integrated Gemini 2.5 Flash AI evidence synthesizer that analyzes included papers to formulate clinical conclusions.',
  },
  {
    q: 'How does the "Conclude with AI" button work and where are API keys configured?',
    a: 'Once you finish screening articles into "Include", clicking "Conclude with AI" triggers our evidence synthesis engine. If running on our server or Vercel, it calls the Gemini 2.5 Flash serverless endpoint (/api/synthesize-conclusion) using the server-configured GEMINI_API_KEY. If running offline or in local development without an API key, Mini-Rayyan automatically switches to its deterministic clinical heuristic evidence synthesizer, analyzing study designs, endpoints, and sample sizes client-side with zero network calls!',
  },
  {
    q: 'What database does Mini-Rayyan use for local development and cloud production?',
    a: 'Mini-Rayyan uses Supabase PostgreSQL as its database. Whether running locally or in production on Vercel, simply provide your Supabase URL and Anon Key (via .env or the in-app Database Settings modal). All protocols, query versions, canonical deduplicated records, and screening decisions persist directly into Supabase tables with Row-Level Security (RLS).',
  },
  {
    q: 'What is "The Version Thing" (Level 2 Loop) and why is it revolutionary?',
    a: 'In systematic reviews, refining search queries often destroys previous screening work in standard tools. In Mini-Rayyan, every query is preserved as an immutable version (v1, v2, v3...). When you update your query to v2, any study you previously screened in v1 keeps your screening decision (Include/Exclude) and notes. You never have to screen the same paper twice, and you can diff queries side-by-side.',
  },
  {
    q: 'Does the 3-Tier Deduplication engine delete papers from my review?',
    a: 'Never. Mini-Rayyan enforces strict PRISMA 2020 scientific compliance with Zero Hard Deletions. When two identical papers are identified across PubMed, Europe PMC, and OpenAlex, they are linked into a single representative cluster. The duplicate is hidden from your screening queue to save time, but its full provenance and raw metadata remain preserved for PRISMA reporting.',
  },
  {
    q: 'Can I export my included studies to CSV or reference managers?',
    a: 'Yes. Both Simple Mode and Advanced Mode provide 1-click CSV and JSON export of all studies marked as "Include", containing author metadata, journal, publication year, PubMed IDs, DOIs, abstract, and reviewer screening notes.',
  },
  {
    q: 'How can I deploy Mini-Rayyan to Vercel or my own server?',
    a: 'The codebase is 100% production-ready for Vercel. Simply import your GitHub repository into Vercel; the included vercel.json automatically configures the Vite frontend SPA and the TypeScript serverless API routes (/api/synthesize-conclusion and /api/health). For Docker or Node servers, npm run build and tsx server.ts provide full-stack hosting.',
  },
];

export const PlatformGuideView: React.FC<PlatformGuideProps> = ({
  onStartSimpleMode,
  onOpenAdvancedPhase,
  onCloseGuide,
  currentTheme = 'emerald-sage',
}) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'pico' | 'sources' | 'dedup' | 'screening' | 'ai' | 'loop' | 'shortcuts' | 'faq'>('overview');
  const [selectedPicoIndex, setSelectedPicoIndex] = useState(0);
  const [selectedSourceIndex, setSelectedSourceIndex] = useState(0);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [dedupDemoView, setDedupDemoView] = useState<'clustered' | 'separate'>('clustered');
  const [aiTab, setAiTab] = useState<'verdict' | 'matrix' | 'mechanisms' | 'recommendations'>('verdict');

  const selectedSample = SAMPLE_PICO_EXPLANATIONS[selectedPicoIndex];
  const selectedSource = LITERATURE_SOURCES_MATRIX[selectedSourceIndex];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12 animate-in fade-in duration-300">
      {/* ========================================================================= */}
      {/* 1. HERO BANNER: PLATFORM INTRODUCTION & QUICK JUMP                       */}
      {/* ========================================================================= */}
      <div className="theme-glass-card rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-2xl border border-[var(--border-card)]">
        <div 
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-40"
          style={{ backgroundColor: 'var(--accent-glow)' }}
        />

        <div className="relative z-10 max-w-4xl">
          <div className="flex items-center gap-2 text-xs font-mono tracking-wider mb-4" style={{ color: 'var(--accent-primary)' }}>
            <Compass className="w-4 h-4 shrink-0" />
            <span>MINI-RAYYAN SCIENTIFIC MANUAL &amp; WORKFLOW ARCHITECTURE</span>
            <span aria-hidden="true">·</span>
            <span>PRISMA 2020 &amp; COCHRANE COMPLIANT</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-display text-balance leading-tight" style={{ color: 'var(--text-primary)' }}>
            How Mini-Rayyan Works
          </h1>

          <p className="mt-4 text-sm sm:text-base leading-relaxed font-sans" style={{ color: 'var(--text-secondary)' }}>
            A complete guide to conducting rigorous clinical systematic reviews and meta-analyses. Explore how our platform automates PICO extraction, aggregates 8 open literature repositories via the Search Adapter Pattern, executes 3-tier deterministic deduplication, provides blinded dual screening, and leverages Gemini 2.5 Flash to synthesize definitive clinical conclusions.
          </p>

          {/* Action CTAs */}
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
                Return to Active Screen
              </button>
            )}
          </div>
        </div>

        {/* Quick Navigation Anchor Bar */}
        <div className="mt-10 pt-6 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] font-mono uppercase tracking-wider mr-2" style={{ color: 'var(--text-muted)' }}>
            Jump To Section:
          </span>
          {[
            { id: 'overview', label: '1. Pipeline Overview' },
            { id: 'pico', label: '2. PICO Formulation' },
            { id: 'sources', label: '3. 8 Literature Sources' },
            { id: 'dedup', label: '4. 3-Tier Deduplication' },
            { id: 'screening', label: '5. Blinded Screening' },
            { id: 'ai', label: '6. AI Evidence Synthesizer' },
            { id: 'loop', label: '7. Query Versioning' },
            { id: 'shortcuts', label: '8. Shortcuts' },
            { id: 'faq', label: '9. FAQ' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveSection(item.id as any);
                const el = document.getElementById(`section-${item.id}`);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`px-3 py-1.5 rounded-lg font-mono text-[11px] transition-colors cursor-pointer ${
                activeSection === item.id
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                  : 'theme-glass-input opacity-70 hover:opacity-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. THE 5 SYSTEMATIC REVIEW PHASES (PIPELINE MAP)                         */}
      {/* ========================================================================= */}
      <section id="section-overview" className="space-y-6 scroll-mt-20">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono tracking-wider" style={{ color: 'var(--accent-primary)' }}>
            <Layers className="w-3.5 h-3.5" />
            <span>SYSTEMATIC REVIEW PROTOCOL</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-bold font-display tracking-tight mt-1" style={{ color: 'var(--text-primary)' }}>
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
              <div className="flex items-center justify-between text-xs font-mono font-bold" style={{ color: 'var(--accent-primary)' }}>
                <span>PHASE 01</span>
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
              <div className="flex items-center justify-between text-xs font-mono font-bold" style={{ color: 'var(--accent-secondary)' }}>
                <span>PHASE 02</span>
                <span className="p-2 rounded-xl theme-glass-input" style={{ color: 'var(--accent-secondary)' }}>
                  <Sparkles className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-lg font-bold font-display" style={{ color: 'var(--text-primary)' }}>
                Query &amp; PICO Compiler
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Type your question in natural English. The clinical NLP engine automatically segments terms into P, I, C, and O, and compiles standard Boolean strings for PubMed, Europe PMC, and OpenAlex.
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
              <div className="flex items-center justify-between text-xs font-mono font-bold text-cyan-400">
                <span>PHASE 03</span>
                <span className="p-2 rounded-xl theme-glass-input text-cyan-400">
                  <GitMerge className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-lg font-bold font-display" style={{ color: 'var(--text-primary)' }}>
                Fetch &amp; Deduplication
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Query 8 literature sources via the pluggable Search Service. Run our 3-tier deterministic deduplication pipeline to collapse duplicate studies into clean clusters with zero hard deletions.
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
              <div className="flex items-center justify-between text-xs font-mono font-bold text-emerald-400">
                <span>PHASE 04</span>
                <span className="p-2 rounded-xl theme-glass-input text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-lg font-bold font-display" style={{ color: 'var(--text-primary)' }}>
                Screening Hub &amp; PRISMA
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Screen titles and abstracts with dynamic PICO keyword highlights. Assign Include, Exclude (with pre-set reasons like "Animal study" or "Wrong dose"), or Maybe. Full audit trail and blinded mode.
              </p>
            </div>
            {onOpenAdvancedPhase && (
              <button
                type="button"
                onClick={() => onOpenAdvancedPhase('screening')}
                className="text-xs font-semibold flex items-center gap-1.5 hover:underline pt-3 border-t border-[var(--border-subtle)] cursor-pointer"
                style={{ color: 'var(--accent-primary)' }}
              >
                <span>Open Screening Hub</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Phase 5 */}
          <div className="theme-glass-card p-6 rounded-3xl flex flex-col justify-between space-y-4 hover:border-[var(--accent-primary)]/50 transition-all md:col-span-2 lg:col-span-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-purple-400">
                <span>PHASE 05</span>
                <span className="p-2 rounded-xl theme-glass-input text-purple-400">
                  <Zap className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-lg font-bold font-display" style={{ color: 'var(--text-primary)' }}>
                AI Evidence Synthesizer &amp; Level 2 Loop
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Once screening is complete, click <strong>Conclude with AI</strong> to let Gemini 2.5 Flash synthesize all included papers into a definitive clinical conclusion with GRADE certainty, step-by-step reasoning, and per-study matrix. Compare query versions (v1 vs v2) with zero lost screening decisions.
              </p>
            </div>
            {onOpenAdvancedPhase && (
              <button
                type="button"
                onClick={() => onOpenAdvancedPhase('loop')}
                className="text-xs font-semibold flex items-center gap-1.5 hover:underline pt-3 border-t border-[var(--border-subtle)] cursor-pointer"
                style={{ color: 'var(--accent-primary)' }}
              >
                <span>Compare Query Versions &amp; Synthesize</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. INTERACTIVE PICO ANATOMY EXPLORER                                     */}
      {/* ========================================================================= */}
      <section id="section-pico" className="space-y-6 scroll-mt-20">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono tracking-wider" style={{ color: 'var(--accent-primary)' }}>
            <Sparkles className="w-3.5 h-3.5" />
            <span>CLINICAL EVIDENCE EXTRACTION</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-bold font-display tracking-tight mt-1" style={{ color: 'var(--text-primary)' }}>
            Interactive PICO Anatomy Explorer
          </h2>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            PICO is the international standard framework for evidence-based medicine. Select a clinical question to explore how the engine parses each quadrant and compiles database-specific search strings.
          </p>
        </div>

        {/* Example Selector Tabs */}
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                Field of Study &middot; {selectedSample.category}
              </span>
              <div className="text-base sm:text-xl font-semibold font-serif italic mt-1" style={{ color: 'var(--text-primary)' }}>
                "{selectedSample.query}"
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
              <span>Parsed in 18ms</span>
            </div>
          </div>

          {/* 4 Quadrants Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* P */}
            <div 
              className="p-5 rounded-2xl border space-y-2 transition-all"
              style={{ backgroundColor: 'var(--pico-p-bg)', borderColor: 'var(--pico-p-border)' }}
            >
              <div className="flex items-center justify-between text-xs font-bold" style={{ color: 'var(--pico-p-text)' }}>
                <span>P &middot; Population / Problem</span>
                <span className="font-mono text-[10px] uppercase">Who</span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {selectedSample.p}
              </p>
              <p className="text-xs leading-relaxed opacity-75" style={{ color: 'var(--text-secondary)' }}>
                Defines the patient demographic, clinical condition, or disease stage under evaluation.
              </p>
            </div>

            {/* I */}
            <div 
              className="p-5 rounded-2xl border space-y-2 transition-all"
              style={{ backgroundColor: 'var(--pico-i-bg)', borderColor: 'var(--pico-i-border)' }}
            >
              <div className="flex items-center justify-between text-xs font-bold" style={{ color: 'var(--pico-i-text)' }}>
                <span>I &middot; Intervention</span>
                <span className="font-mono text-[10px] uppercase">What</span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {selectedSample.i}
              </p>
              <p className="text-xs leading-relaxed opacity-75" style={{ color: 'var(--text-secondary)' }}>
                The active therapeutic drug, diagnostic test, surgical intervention, or therapy tested.
              </p>
            </div>

            {/* C */}
            <div 
              className="p-5 rounded-2xl border space-y-2 transition-all"
              style={{ backgroundColor: 'var(--pico-c-bg)', borderColor: 'var(--pico-c-border)' }}
            >
              <div className="flex items-center justify-between text-xs font-bold" style={{ color: 'var(--pico-c-text)' }}>
                <span>C &middot; Comparator / Control</span>
                <span className="font-mono text-[10px] uppercase">Against</span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {selectedSample.c}
              </p>
              <p className="text-xs leading-relaxed opacity-75" style={{ color: 'var(--text-secondary)' }}>
                The control arm: placebo, standard of care, watchful waiting, or active alternative drug.
              </p>
            </div>

            {/* O */}
            <div 
              className="p-5 rounded-2xl border space-y-2 transition-all"
              style={{ backgroundColor: 'var(--pico-o-bg)', borderColor: 'var(--pico-o-border)' }}
            >
              <div className="flex items-center justify-between text-xs font-bold" style={{ color: 'var(--pico-o-text)' }}>
                <span>O &middot; Clinical Outcome</span>
                <span className="font-mono text-[10px] uppercase">Target</span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {selectedSample.o}
              </p>
              <p className="text-xs leading-relaxed opacity-75" style={{ color: 'var(--text-secondary)' }}>
                Primary efficacy and safety endpoints: survival, symptom reduction, or biochemical markers.
              </p>
            </div>
          </div>

          {/* Compiled Boolean Search Syntax */}
          <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                Auto-Compiled PubMed / Europe PMC Boolean Query:
              </span>
              <span className="text-[10px] font-mono text-emerald-400">Targeting [Title/Abstract] terms</span>
            </div>
            <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] font-mono text-xs overflow-x-auto select-all" style={{ color: 'var(--text-primary)' }}>
              {selectedSample.boolean}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. 8 LITERATURE SOURCES & SEARCH ADAPTER PATTERN                         */}
      {/* ========================================================================= */}
      <section id="section-sources" className="space-y-6 scroll-mt-20">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono tracking-wider text-cyan-400">
            <Database className="w-3.5 h-3.5" />
            <span>SEARCH SERVICE ADAPTER PATTERN</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-bold font-display tracking-tight mt-1" style={{ color: 'var(--text-primary)' }}>
            8 Global Literature Repositories
          </h2>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Mini-Rayyan implements the GoF Adapter Pattern under <code className="font-mono text-xs text-emerald-300">src/services/search/adapters</code>. Toggle sources on and off with dedicated rate limiting and polite pool management.
          </p>
        </div>

        {/* Source Matrix Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {LITERATURE_SOURCES_MATRIX.map((src, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedSourceIndex(idx)}
              className={`text-left p-5 rounded-2xl border transition-all cursor-pointer ${
                selectedSourceIndex === idx
                  ? 'border-cyan-400 bg-cyan-500/10 shadow-lg'
                  : 'theme-glass-card hover:border-[var(--accent-primary)]/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-cyan-300">{src.tag}</span>
                <span className="text-[10px] font-mono opacity-60">{src.count}</span>
              </div>
              <h4 className="text-sm font-bold line-clamp-1" style={{ color: 'var(--text-primary)' }}>
                {src.name}
              </h4>
              <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                {src.description}
              </p>
              <div className="mt-3 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] font-mono">
                <span style={{ color: 'var(--text-muted)' }}>{src.domain}</span>
                <span className="text-emerald-400">Active</span>
              </div>
            </button>
          ))}
        </div>

        {/* Source Deep Dive Inspector */}
        <div className="theme-glass-card rounded-3xl p-6 sm:p-8 space-y-4 border border-cyan-500/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase">Selected Source Adapter</span>
                <span aria-hidden="true" className="opacity-40">·</span>
                <span className="text-xs font-mono text-emerald-400">{selectedSource.badge}</span>
              </div>
              <h3 className="text-lg font-bold font-display mt-1" style={{ color: 'var(--text-primary)' }}>
                {selectedSource.name}
              </h3>
            </div>
            <div className="text-xs font-mono text-right">
              <span className="text-[10px] block opacity-60">Repository Coverage</span>
              <span className="font-bold text-emerald-400">{selectedSource.count}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider block opacity-60">Authentication Protocol</span>
              <div className="text-xs font-semibold text-emerald-300">{selectedSource.auth}</div>
            </div>
            <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider block opacity-60">Polite Pool &amp; Routing</span>
              <div className="text-xs font-semibold text-cyan-300">{selectedSource.politePool}</div>
            </div>
            <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider block opacity-60">Disciplinary Focus</span>
              <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedSource.domain}</div>
            </div>
          </div>

          <p className="text-xs leading-relaxed pt-2" style={{ color: 'var(--text-secondary)' }}>
            {selectedSource.description} When executing searches across multiple enabled sources, the Search Service dispatches queries in parallel with bounded timeouts and synthesizes returned records into our standard <code className="font-mono text-[11px] text-emerald-300">CanonicalRecord</code> schema before deduplication.
          </p>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. 3-TIER DETERMINISTIC DEDUPLICATION EXPLAINED                          */}
      {/* ========================================================================= */}
      <section id="section-dedup" className="space-y-6 scroll-mt-20">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono tracking-wider text-emerald-400">
            <GitMerge className="w-3.5 h-3.5" />
            <span>SCIENTIFIC INTEGRITY &amp; PRISMA DEDUPLICATION</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-bold font-display tracking-tight mt-1" style={{ color: 'var(--text-primary)' }}>
            3-Tier Deterministic Deduplication
          </h2>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Medical reviews search multiple databases (PubMed, Europe PMC, OpenAlex), which often index the exact same clinical trials. Our pipeline clusters duplicates deterministically with zero hard deletions.
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
              <span>FUZZY HEURISTIC</span>
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
                Demonstrating clustering of records retrieved from PubMed, Europe PMC, and OpenAlex.
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
                Raw Database View (3 Records)
              </button>
            </div>
          </div>

          {dedupDemoView === 'clustered' ? (
            <div className="p-5 rounded-2xl border bg-emerald-500/5 border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-400">1 Unified Study Cluster</span>
                  <span className="text-[11px] font-mono opacity-60">(2 Duplicates Hidden from Active Queue)</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-400">Tier 1 Matched: DOI 10.1016/S0140-6736</span>
              </div>
              <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Effect of intensive blood-glucose control with metformin on complications in overweight patients with type 2 diabetes (UKPDS 34)
              </h4>
              <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                The Lancet (1998) &middot; Turner RC, Holman RR &middot; PMID: 9742977 &middot; Sources: PubMed, Europe PMC, OpenAlex
              </p>
              <div className="pt-2 text-[11px] text-emerald-300 font-mono flex items-center gap-1.5 border-t border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Screening decisions made on this cluster apply simultaneously to all 3 underlying records. Full PRISMA audit retained.</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] space-y-2">
                <span className="text-[10px] font-mono text-blue-400 uppercase font-bold">Record 1 · PubMed (NCBI)</span>
                <h5 className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Effect of intensive blood-glucose control with metformin on complications in overweight patients with type 2 diabetes (UKPDS 34)
                </h5>
                <div className="text-[11px] font-mono opacity-60">DOI: 10.1016/s0140-6736(98)07019-6</div>
              </div>

              <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] space-y-2">
                <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">Record 2 · Europe PMC API</span>
                <h5 className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Effect of intensive blood-glucose control with metformin on complications in overweight patients with type 2 diabetes (UKPDS 34).
                </h5>
                <div className="text-[11px] font-mono opacity-60">DOI: 10.1016/S0140-6736(98)07019-6</div>
              </div>

              <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] space-y-2">
                <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">Record 3 · OpenAlex Graph</span>
                <h5 className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Effect of intensive blood-glucose control with metformin on complications in overweight patients with type 2 diabetes (UKPDS 34)
                </h5>
                <div className="text-[11px] font-mono opacity-60">OpenAlex ID: W2154388122</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. AI EVIDENCE SYNTHESIZER: CLINICAL CONCLUSION ENGINE                   */}
      {/* ========================================================================= */}
      <section id="section-ai" className="space-y-6 scroll-mt-20">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono tracking-wider text-purple-400">
            <Zap className="w-3.5 h-3.5" />
            <span>GEMINI 2.5 FLASH CLINICAL REASONING ENGINE</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-bold font-display tracking-tight mt-1" style={{ color: 'var(--text-primary)' }}>
            AI Evidence Synthesizer &amp; GRADE Conclusion
          </h2>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            After screening studies as "Include", click <strong>Conclude with AI</strong>. The system reads the finalized papers, assesses trial methodology, sample sizes, and endpoints, and generates an evidence-grounded clinical verdict answering your question.
          </p>
        </div>

        {/* Live Simulator of AI Conclusion */}
        <div className="theme-glass-card rounded-3xl p-6 sm:p-8 space-y-6 border border-purple-500/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-purple-300">
                <Award className="w-4 h-4" />
                <span>Simulated Output &middot; Dermatological Question</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold font-display mt-1" style={{ color: 'var(--text-primary)' }}>
                "{AI_SYNTHESIS_SIMULATOR.caseQuery}"
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {AI_SYNTHESIS_SIMULATOR.overallVerdict}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                {AI_SYNTHESIS_SIMULATOR.evidenceStrength}
              </span>
            </div>
          </div>

          {/* AI Simulator Tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'verdict', label: 'Executive Answer' },
              { id: 'matrix', label: 'Per-Study Evidence Matrix' },
              { id: 'mechanisms', label: 'Biological Mechanisms' },
              { id: 'recommendations', label: 'Clinical Recommendations & Plain Summary' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAiTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  aiTab === tab.id
                    ? 'theme-primary-btn shadow-md'
                    : 'theme-glass-input opacity-70 hover:opacity-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Executive Answer */}
          {aiTab === 'verdict' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-5 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-3">
                <div className="text-xs font-mono font-bold text-emerald-400 uppercase">
                  Executive Clinical Answer
                </div>
                <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  {AI_SYNTHESIS_SIMULATOR.executiveAnswer}
                </p>
                <div className="pt-2 text-xs font-mono text-[var(--text-muted)] border-t border-[var(--border-subtle)]">
                  GRADE Assessment: {AI_SYNTHESIS_SIMULATOR.evidenceStrengthRationale}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 space-y-1">
                  <span className="text-[10px] font-mono text-purple-300 uppercase font-bold">Cloud Deployment (Vercel)</span>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Processed via Google Gemini 2.5 Flash on Vercel Serverless Function <code className="font-mono text-[11px]">/api/synthesize-conclusion</code>.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1">
                  <span className="text-[10px] font-mono text-emerald-300 uppercase font-bold">Local / Offline Fallback</span>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    If no API key is set or device is offline, client-side heuristic clinical evidence synthesizer activates automatically.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Per-Study Evidence Matrix */}
          {aiTab === 'matrix' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="text-xs font-mono text-[var(--text-muted)]">
                Cross-examination of 4 screened and included studies:
              </div>
              <div className="space-y-3">
                {AI_SYNTHESIS_SIMULATOR.perStudyMatrix.map((study, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md font-bold ${
                          study.direction === 'Supports'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : study.direction === 'Neutral'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {study.direction}
                        </span>
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {study.title}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono opacity-60 shrink-0">{study.design}</span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {study.contribution}
                    </p>
                    <div className="text-[10px] font-mono opacity-50">{study.citation}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Biological Mechanisms */}
          {aiTab === 'mechanisms' && (
            <div className="p-5 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-3 animate-in fade-in duration-200">
              <div className="text-xs font-mono font-bold text-purple-300 uppercase">
                Molecular &amp; Physiological Mechanisms
              </div>
              <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {AI_SYNTHESIS_SIMULATOR.mechanisms}
              </p>
            </div>
          )}

          {/* Tab 4: Clinical Recommendations & Plain Summary */}
          {aiTab === 'recommendations' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                <div className="text-xs font-mono font-bold text-emerald-400 uppercase">
                  Actionable Clinical Guidance
                </div>
                <ul className="text-xs sm:text-sm space-y-2" style={{ color: 'var(--text-secondary)' }}>
                  {AI_SYNTHESIS_SIMULATOR.clinicalRecommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-2">
                <div className="text-xs font-mono font-bold text-cyan-300 uppercase">
                  Plain-English Layperson Summary (Patient Education)
                </div>
                <p className="text-xs sm:text-sm leading-relaxed italic" style={{ color: 'var(--text-primary)' }}>
                  "{AI_SYNTHESIS_SIMULATOR.plainLanguageSummary}"
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. "THE VERSION THING": LEVEL 2 QUERY VERSIONING LOOP                   */}
      {/* ========================================================================= */}
      <section id="section-loop" className="space-y-6 scroll-mt-20">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono tracking-wider text-purple-400">
            <GitCompare className="w-3.5 h-3.5" />
            <span>IMMUTABLE QUERY PROVENANCE</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-bold font-display tracking-tight mt-1" style={{ color: 'var(--text-primary)' }}>
            Understanding "The Version Thing" (Level 2 Loop)
          </h2>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Why search queries are strictly versioned (v1, v2) and how it protects hundreds of hours of screening work.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Traditional Systems */}
          <div className="theme-glass-card p-6 sm:p-7 rounded-3xl space-y-4 border border-rose-500/20">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-bold uppercase">
              <span>Traditional Tools (The Double-Screening Trap)</span>
            </div>
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Destructive Query Overwrite
            </h3>
            <ul className="text-xs space-y-2.5" style={{ color: 'var(--text-secondary)' }}>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold shrink-0">&times;</span>
                <span>Modifying your query wipes out prior search parameters and audit logs.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold shrink-0">&times;</span>
                <span>Previously screened papers show up again as unread, forcing reviewers to re-read them.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold shrink-0">&times;</span>
                <span>Zero scientific provenance of which papers were introduced by which specific query iteration.</span>
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
                <span>Screening decisions belong to the <strong>Study Cluster</strong>, not the search query.</span>
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
      {/* 8. KEYBOARD SHORTCUTS REFERENCE                                          */}
      {/* ========================================================================= */}
      <section id="section-shortcuts" className="space-y-6 scroll-mt-20">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono tracking-wider text-amber-400">
            <Keyboard className="w-3.5 h-3.5" />
            <span>HIGH-VELOCITY SCREENING WORKFLOW</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-bold font-display tracking-tight mt-1" style={{ color: 'var(--text-primary)' }}>
            Keyboard Shortcuts &amp; Rapid Review
          </h2>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Experienced systematic reviewers can screen over 300 abstracts per hour using single-key shortcuts.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-2">
            <div className="flex items-center justify-between">
              <kbd className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono text-sm font-bold border border-emerald-500/40">
                I
              </kbd>
              <span className="text-[10px] font-mono text-emerald-400 uppercase">Include</span>
            </div>
            <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Include Paper</h4>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Marks the active paper as Included and automatically advances to the next unread abstract.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-2">
            <div className="flex items-center justify-between">
              <kbd className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 font-mono text-sm font-bold border border-rose-500/40">
                E
              </kbd>
              <span className="text-[10px] font-mono text-rose-400 uppercase">Exclude</span>
            </div>
            <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Exclude Paper</h4>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Marks as Excluded and opens standard exclusion reasons (Wrong Population, Wrong Intervention, Animal Study).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-2">
            <div className="flex items-center justify-between">
              <kbd className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono text-sm font-bold border border-amber-500/40">
                M
              </kbd>
              <span className="text-[10px] font-mono text-amber-400 uppercase">Maybe</span>
            </div>
            <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Maybe / Unsure</h4>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Flags study for secondary reviewer full-text retrieval or consensus discussion.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                <kbd className="px-2 py-1 rounded-lg bg-slate-800 text-slate-200 font-mono text-xs font-bold border border-slate-700">
                  &darr;
                </kbd>
                <kbd className="px-2 py-1 rounded-lg bg-slate-800 text-slate-200 font-mono text-xs font-bold border border-slate-700">
                  &uarr;
                </kbd>
              </div>
              <span className="text-[10px] font-mono opacity-60 uppercase">Navigate</span>
            </div>
            <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Arrow Navigation</h4>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Browse through papers in your screening queue without making a decision.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. FREQUENTLY ASKED QUESTIONS (FAQ) ACCORDION                           */}
      {/* ========================================================================= */}
      <section id="section-faq" className="space-y-6 scroll-mt-20">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono tracking-wider" style={{ color: 'var(--accent-primary)' }}>
            <HelpCircle className="w-3.5 h-3.5" />
            <span>KNOWLEDGE BASE &amp; FREQUENT INQUIRIES</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-bold font-display tracking-tight mt-1" style={{ color: 'var(--text-primary)' }}>
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Everything you need to know about API keys, offline functionality, PRISMA flow charts, and deployment.
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
      {/* 10. FOOTER CALL TO ACTION                                                */}
      {/* ========================================================================= */}
      <div className="text-center py-10 border-t border-[var(--border-subtle)] space-y-4">
        <h3 className="text-xl font-bold font-display" style={{ color: 'var(--text-primary)' }}>
          Ready to Conduct Your Systematic Review?
        </h3>
        <p className="text-xs sm:text-sm max-w-lg mx-auto" style={{ color: 'var(--text-muted)' }}>
          Choose between the streamlined 1-question Simple Screener or the multi-phase Advanced Research Protocol workspace with full query loop provenance.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          {onStartSimpleMode && (
            <button
              type="button"
              onClick={onStartSimpleMode}
              className="theme-primary-btn px-6 py-2.5 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Sparkles className="w-4 h-4" />
              <span>Open Simple Screener</span>
            </button>
          )}

          {onOpenAdvancedPhase && (
            <button
              type="button"
              onClick={() => onOpenAdvancedPhase('books')}
              className="theme-glass-input hover:brightness-110 px-6 py-2.5 text-xs font-semibold rounded-xl flex items-center gap-2 cursor-pointer transition-all"
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
