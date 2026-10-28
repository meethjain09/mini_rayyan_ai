import React, { useState, useEffect } from 'react';
import {
  Download,
  Filter,
  Layers,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  Split,
  Merge,
  BookOpen,
  ArrowRight,
  Database,
  Search,
  Check,
  RefreshCw,
  GitMerge,
  GitBranch,
  Mail,
  Key,
  Globe2,
  Info,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ResearchBook, QueryVersion, CanonicalRecord, ScreeningDecision, LiteratureSource } from '../../types/database';
import { fetchLiteratureRecords, LITERATURE_SOURCES_CONFIG, LiteratureFetchResponse } from '../../lib/literatureApi';
import { runDeduplicationPipeline, DeduplicationResult, normalizeDoi } from '../../lib/deduplication';
import { localStore } from '../../lib/supabase';

interface FetchAndDeduplicateViewProps {
  activeBook: ResearchBook;
  onProceedToScreening: () => void;
}

export const FetchAndDeduplicateView: React.FC<FetchAndDeduplicateViewProps> = ({
  activeBook,
  onProceedToScreening,
}) => {
  const [queryVersions, setQueryVersions] = useState<QueryVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');

  // 8 Multi-source Database Toggles
  const [sourceOpenAlex, setSourceOpenAlex] = useState(true);
  const [sourceCrossref, setSourceCrossref] = useState(true);
  const [sourceSemanticScholar, setSourceSemanticScholar] = useState(true);
  const [sourcePubMed, setSourcePubMed] = useState(true);
  const [sourceEuropePmc, setSourceEuropePmc] = useState(true);
  const [sourceArxiv, setSourceArxiv] = useState(true);
  const [sourceDoaj, setSourceDoaj] = useState(true);
  const [sourceCore, setSourceCore] = useState(false);

  // Polite Pool & API Config
  const [politeEmail, setPoliteEmail] = useState('researcher@institution.edu');
  const [coreApiKey, setCoreApiKey] = useState('');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Execution state
  const [isFetching, setIsFetching] = useState(false);
  const [pipelineStep, setPipelineStep] = useState<string>('');
  const [lastFetchResult, setLastFetchResult] = useState<LiteratureFetchResponse | null>(null);

  // Ingested data state
  const [records, setRecords] = useState<CanonicalRecord[]>([]);
  const [decisions, setDecisions] = useState<ScreeningDecision[]>([]);
  const [activeInspectorTab, setActiveInspectorTab] = useState<'unique' | 'duplicates'>('unique');
  const [selectedRecordForMerge, setSelectedRecordForMerge] = useState<string | null>(null);

  useEffect(() => {
    const qvs = localStore.getQueryVersions(activeBook.id);
    setQueryVersions(qvs);
    if (qvs.length > 0 && !selectedVersionId) {
      setSelectedVersionId(qvs[0].id);
    }

    const currentRecords = localStore.getRecords(activeBook.id);
    const currentDecisions = localStore.getDecisions(activeBook.id);
    setRecords(currentRecords);
    setDecisions(currentDecisions);

    if (activeBook.default_sources && activeBook.default_sources.length > 0) {
      setSourceOpenAlex(activeBook.default_sources.includes('openalex'));
      setSourceCrossref(activeBook.default_sources.includes('crossref'));
      setSourceSemanticScholar(activeBook.default_sources.includes('semanticscholar'));
      setSourcePubMed(activeBook.default_sources.includes('pubmed'));
      setSourceEuropePmc(activeBook.default_sources.includes('europe_pmc'));
      setSourceArxiv(activeBook.default_sources.includes('arxiv'));
      setSourceDoaj(activeBook.default_sources.includes('doaj'));
      setSourceCore(activeBook.default_sources.includes('core'));
    }
  }, [activeBook.id, activeBook.default_sources]);

  const selectedVersion = queryVersions.find((q) => q.id === selectedVersionId) || queryVersions[0];

  const handleSelectAllSources = () => {
    setSourceOpenAlex(true);
    setSourceCrossref(true);
    setSourceSemanticScholar(true);
    setSourcePubMed(true);
    setSourceEuropePmc(true);
    setSourceArxiv(true);
    setSourceDoaj(true);
    setSourceCore(true);
  };

  const handleSelectCoreBiomedical = () => {
    setSourceOpenAlex(true);
    setSourceCrossref(true);
    setSourceSemanticScholar(true);
    setSourcePubMed(true);
    setSourceEuropePmc(true);
    setSourceArxiv(false);
    setSourceDoaj(true);
    setSourceCore(false);
  };

  const handleExecuteFetchAndDeduplication = async () => {
    if (!selectedVersion) return;
    setIsFetching(true);

    try {
      setPipelineStep('Dispatching parallel queries across selected scholarly APIs...');
      await new Promise((r) => setTimeout(r, 400));

      const fetchResult = await fetchLiteratureRecords({
        query: selectedVersion.boolean_query || selectedVersion.raw_user_query,
        bookId: activeBook.id,
        politeEmail,
        coreApiKey: coreApiKey.trim() || undefined,
        sourcePubMed,
        sourceEuropePmc,
        sourceOpenAlex,
        sourceCrossref,
        sourceSemanticScholar,
        sourceArxiv,
        sourceDoaj,
        sourceCore,
        dateStart: selectedVersion.date_start || undefined,
        dateEnd: selectedVersion.date_end || undefined,
      });

      setLastFetchResult(fetchResult);

      setPipelineStep('Harmonizing cross-database metadata into CanonicalRecord schema...');
      await new Promise((r) => setTimeout(r, 400));

      setPipelineStep('Executing 3-tier deterministic deduplication (DOI -> PMID -> Title/Year/Author)...');
      await new Promise((r) => setTimeout(r, 500));

      // Run deduplication against existing records while preserving reviewer decisions
      const existing = localStore.getRecords(activeBook.id);
      const existingDecisions = localStore.getDecisions(activeBook.id);
      const deduplicationOutput = runDeduplicationPipeline(fetchResult.records, existing, activeBook.id, existingDecisions);

      setPipelineStep('Linking canonical records to Query Version and generating audit trails...');
      await new Promise((r) => setTimeout(r, 300));

      // Persist to localStore / database
      localStore.saveRecords(activeBook.id, deduplicationOutput.records, selectedVersion.id);
      localStore.saveDecisions(activeBook.id, deduplicationOutput.decisions);

      setRecords(deduplicationOutput.records);
      setDecisions(deduplicationOutput.decisions);
    } catch (err) {
      console.error('Fetch and deduplication error:', err);
    } finally {
      setIsFetching(false);
      setPipelineStep('');
    }
  };

  // Manual Reviewer Override: Uncluster a record
  const handleUncluster = (recordId: string) => {
    localStore.unclusterRecord(activeBook.id, recordId);
    setRecords(localStore.getRecords(activeBook.id));
    setDecisions(localStore.getDecisions(activeBook.id));
  };

  // Manual Reviewer Override: Merge two records
  const handleMerge = (canonicalId: string, duplicateId: string) => {
    localStore.mergeRecordsIntoCluster(activeBook.id, canonicalId, duplicateId);
    setRecords(localStore.getRecords(activeBook.id));
    setDecisions(localStore.getDecisions(activeBook.id));
    setSelectedRecordForMerge(null);
  };

  const uniqueRecords = records.filter((r) => {
    const dec = decisions.find((d) => d.record_id === r.id);
    return !dec?.is_duplicate;
  });

  const duplicateRecords = records.filter((r) => {
    const dec = decisions.find((d) => d.record_id === r.id);
    return dec?.is_duplicate;
  });

  // Source distribution calculation
  const sourceCounts = records.reduce<Record<string, number>>((acc, rec) => {
    acc[rec.source_db] = (acc[rec.source_db] || 0) + 1;
    return acc;
  }, {});

  const getSourceBadge = (source: LiteratureSource) => {
    const conf = LITERATURE_SOURCES_CONFIG[source] || {
      shortName: source.toUpperCase(),
      badgeClass: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border uppercase ${conf.badgeClass}`}>
        {conf.shortName}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="theme-glass-card rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider theme-accent-pill">
            <Globe2 className="w-3.5 h-3.5" />
            <span>Phase 3: Multi-Source Literature Ingestion &amp; Deduplication</span>
          </div>
          <span className="text-xs font-mono opacity-60" style={{ color: 'var(--text-muted)' }}>
            8 Global Academic Catalogs Supported
          </span>
        </div>

        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display" style={{ color: 'var(--text-primary)' }}>
            Multi-Source Literature Ingestion Engine
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm max-w-3xl leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Search across open scientific catalogs simultaneously: <strong>OpenAlex</strong> (250M+ works), <strong>Crossref</strong> (official DOI registry), <strong>Semantic Scholar</strong> (Allen AI), <strong>PubMed</strong>, <strong>Europe PMC</strong>, <strong>arXiv</strong> preprints, <strong>DOAJ</strong>, and <strong>CORE</strong> repositories. Our 3-tier deterministic pipeline clusters identical studies across databases (DOI &rarr; PMID &rarr; Title/Year/Author) without hard data deletion.
          </p>
        </div>
      </div>

      {/* Query Version & Multi-Source Config Card */}
      <div className="theme-glass-card rounded-3xl p-6 sm:p-7 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
            <Database className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
            <span>Search Query &amp; External Database Dispatch</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <button
              type="button"
              onClick={handleSelectCoreBiomedical}
              className="text-[11px] underline opacity-70 hover:opacity-100 cursor-pointer"
            >
              Biomedical Core
            </button>
            <span className="opacity-30">|</span>
            <button
              type="button"
              onClick={handleSelectAllSources}
              className="text-[11px] underline opacity-70 hover:opacity-100 cursor-pointer"
            >
              Select All 8
            </button>
          </div>
        </div>

        {/* Query Version Selector */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
          <div className="space-y-1.5 lg:col-span-2">
            <label className="text-[11px] font-mono uppercase tracking-wider block" style={{ color: 'var(--text-secondary)' }}>
              Target Query Version:
            </label>
            <select
              value={selectedVersionId}
              onChange={(e) => setSelectedVersionId(e.target.value)}
              className="w-full theme-glass-input px-3.5 py-2.5 rounded-xl text-xs outline-none font-mono cursor-pointer"
              style={{ color: 'var(--text-primary)' }}
            >
              {queryVersions.map((qv) => (
                <option key={qv.id} value={qv.id} className="bg-slate-900 text-white">
                  v{qv.version_number} &mdash; &quot;{qv.raw_user_query.substring(0, 75)}...&quot; ({qv.total_hits} estimated hits)
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={handleExecuteFetchAndDeduplication}
              disabled={isFetching || !selectedVersion}
              className="theme-primary-btn px-5 py-3 text-xs font-bold cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-xl"
            >
              {isFetching ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Querying Selected Catalogs...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Fetch &amp; Run Deduplication</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 8 Database Selection Grid */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-mono uppercase tracking-wider block" style={{ color: 'var(--text-secondary)' }}>
              Select Literature Catalogs to Ingest:
            </label>
            <span className="text-[10px] font-mono opacity-60">Free &amp; Open Access APIs</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* OpenAlex */}
            <label className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${sourceOpenAlex ? 'bg-amber-500/10 border-amber-500/30' : 'theme-glass-input opacity-50'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-amber-300">OpenAlex</span>
                <input
                  type="checkbox"
                  checked={sourceOpenAlex}
                  onChange={(e) => setSourceOpenAlex(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-500"
                />
              </div>
              <span className="text-[10px] opacity-70 mt-1 line-clamp-1">250M+ open catalog</span>
            </label>

            {/* Crossref */}
            <label className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${sourceCrossref ? 'bg-cyan-500/10 border-cyan-500/30' : 'theme-glass-input opacity-50'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-cyan-300">Crossref</span>
                <input
                  type="checkbox"
                  checked={sourceCrossref}
                  onChange={(e) => setSourceCrossref(e.target.checked)}
                  className="rounded text-cyan-500 focus:ring-cyan-500"
                />
              </div>
              <span className="text-[10px] opacity-70 mt-1 line-clamp-1">Official DOI registry</span>
            </label>

            {/* Semantic Scholar */}
            <label className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${sourceSemanticScholar ? 'bg-indigo-500/10 border-indigo-500/30' : 'theme-glass-input opacity-50'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-indigo-300">Semantic Scholar</span>
                <input
                  type="checkbox"
                  checked={sourceSemanticScholar}
                  onChange={(e) => setSourceSemanticScholar(e.target.checked)}
                  className="rounded text-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <span className="text-[10px] opacity-70 mt-1 line-clamp-1">Allen AI citation graph</span>
            </label>

            {/* PubMed */}
            <label className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${sourcePubMed ? 'bg-blue-500/10 border-blue-500/30' : 'theme-glass-input opacity-50'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-blue-300">PubMed (NCBI)</span>
                <input
                  type="checkbox"
                  checked={sourcePubMed}
                  onChange={(e) => setSourcePubMed(e.target.checked)}
                  className="rounded text-blue-500 focus:ring-blue-500"
                />
              </div>
              <span className="text-[10px] opacity-70 mt-1 line-clamp-1">36M+ MEDLINE records</span>
            </label>

            {/* Europe PMC */}
            <label className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${sourceEuropePmc ? 'bg-emerald-500/10 border-emerald-500/30' : 'theme-glass-input opacity-50'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-emerald-300">Europe PMC</span>
                <input
                  type="checkbox"
                  checked={sourceEuropePmc}
                  onChange={(e) => setSourceEuropePmc(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-emerald-500"
                />
              </div>
              <span className="text-[10px] opacity-70 mt-1 line-clamp-1">EBI life sciences &amp; OA</span>
            </label>

            {/* arXiv */}
            <label className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${sourceArxiv ? 'bg-rose-500/10 border-rose-500/30' : 'theme-glass-input opacity-50'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-rose-300">arXiv Preprints</span>
                <input
                  type="checkbox"
                  checked={sourceArxiv}
                  onChange={(e) => setSourceArxiv(e.target.checked)}
                  className="rounded text-rose-500 focus:ring-rose-500"
                />
              </div>
              <span className="text-[10px] opacity-70 mt-1 line-clamp-1">q-bio, CS &amp; physics</span>
            </label>

            {/* DOAJ */}
            <label className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${sourceDoaj ? 'bg-teal-500/10 border-teal-500/30' : 'theme-glass-input opacity-50'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-teal-300">DOAJ</span>
                <input
                  type="checkbox"
                  checked={sourceDoaj}
                  onChange={(e) => setSourceDoaj(e.target.checked)}
                  className="rounded text-teal-500 focus:ring-teal-500"
                />
              </div>
              <span className="text-[10px] opacity-70 mt-1 line-clamp-1">Open Access Journals</span>
            </label>

            {/* CORE */}
            <label className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${sourceCore ? 'bg-purple-500/10 border-purple-500/30' : 'theme-glass-input opacity-50'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-purple-300">CORE Repositories</span>
                <input
                  type="checkbox"
                  checked={sourceCore}
                  onChange={(e) => setSourceCore(e.target.checked)}
                  className="rounded text-purple-500 focus:ring-purple-500"
                />
              </div>
              <span className="text-[10px] opacity-70 mt-1 line-clamp-1">Global university papers</span>
            </label>
          </div>
        </div>

        {/* Polite Pool & Advanced Config Toggle */}
        <div className="pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            type="button"
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="flex items-center gap-1.5 text-xs font-mono opacity-80 hover:opacity-100 cursor-pointer"
            style={{ color: 'var(--accent-primary)' }}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Polite Pool &amp; API Headers Configuration</span>
            {showAdvancedSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showAdvancedSettings && (
            <div className="mt-3 p-4 rounded-2xl theme-glass-input space-y-3 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <Mail className="w-3 h-3 text-emerald-400" />
                    <span>Polite Pool Email (OpenAlex, Crossref, PubMed):</span>
                  </label>
                  <input
                    type="email"
                    value={politeEmail}
                    onChange={(e) => setPoliteEmail(e.target.value)}
                    placeholder="researcher@hospital.org"
                    className="w-full theme-glass-card px-3 py-1.5 rounded-xl text-xs font-mono outline-none"
                    style={{ color: 'var(--text-primary)' }}
                  />
                  <span className="text-[10px] font-mono opacity-60 block">
                    Passing your email activates the OpenAlex &amp; Crossref Polite Pools (up to 100k req/day and faster latency).
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <Key className="w-3 h-3 text-purple-400" />
                    <span>Optional CORE API Key:</span>
                  </label>
                  <input
                    type="text"
                    value={coreApiKey}
                    onChange={(e) => setCoreApiKey(e.target.value)}
                    placeholder="Optional (registered at core.ac.uk)"
                    className="w-full theme-glass-card px-3 py-1.5 rounded-xl text-xs font-mono outline-none"
                    style={{ color: 'var(--text-primary)' }}
                  />
                  <span className="text-[10px] font-mono opacity-60 block">
                    Leave blank for free public tier, or supply key for full repository payload access.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Selected Query Details */}
        {selectedVersion && (
          <div className="p-3.5 rounded-2xl theme-glass-input text-xs space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono opacity-70">
              <span>COMPILED QUERY SPECIFICATION (VERSION {selectedVersion.version_number})</span>
              <span>DATE FILTER: {selectedVersion.date_start || 'All'} &ndash; {selectedVersion.date_end || 'Present'}</span>
            </div>
            <p className="font-mono text-[11px] break-all leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              {selectedVersion.boolean_query || selectedVersion.raw_user_query}
            </p>
          </div>
        )}

        {/* Progressive Loading State Indicator */}
        {isFetching && (
          <div className="p-4 rounded-2xl theme-glass-input border border-[var(--accent-primary)] space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="flex items-center gap-2" style={{ color: 'var(--accent-primary)' }}>
                <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: 'var(--accent-primary)' }} />
                <span>Active Pipeline Step:</span>
              </span>
              <span className="opacity-60">Multi-Source Dispatch Active</span>
            </div>
            <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
              {pipelineStep}
            </div>
          </div>
        )}

        {/* Per-Source Ingestion Breakdown */}
        {records.length > 0 && (
          <div className="pt-2 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider opacity-60" style={{ color: 'var(--text-muted)' }}>
              Source Yield:
            </span>
            {(Object.entries(sourceCounts) as [LiteratureSource, number][]).map(([source, count]) => {
              const conf = LITERATURE_SOURCES_CONFIG[source] || { shortName: source, badgeClass: 'bg-gray-500/10 text-gray-300' };
              return (
                <span key={source} className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium border flex items-center gap-1.5 ${conf.badgeClass}`}>
                  <span>{conf.shortName}</span>
                  <span className="font-bold tabular-nums">({count})</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Pipeline Metrics HUD */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="theme-glass-card rounded-2xl p-5 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider opacity-60 block" style={{ color: 'var(--text-muted)' }}>
            Total Ingested Records
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-display tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {records.length}
          </div>
          <span className="text-[10px] font-mono opacity-60">Multi-source canonical DB</span>
        </div>

        <div className="theme-glass-card rounded-2xl p-5 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider opacity-60 block" style={{ color: 'var(--text-muted)' }}>
            Unique Study Clusters
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-display tabular-nums" style={{ color: 'var(--accent-primary)' }}>
            {uniqueRecords.length}
          </div>
          <span className="text-[10px] font-mono opacity-60">Ready for screening</span>
        </div>

        <div className="theme-glass-card rounded-2xl p-5 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider opacity-60 block" style={{ color: 'var(--text-muted)' }}>
            Duplicate Records Flagged
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-display tabular-nums" style={{ color: 'var(--accent-secondary)' }}>
            {duplicateRecords.length}
          </div>
          <span className="text-[10px] font-mono opacity-60">Kept in DB, hidden</span>
        </div>

        <div className="theme-glass-card rounded-2xl p-5 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider opacity-60 block" style={{ color: 'var(--text-muted)' }}>
            Deduplication Rate
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-display tabular-nums" style={{ color: 'var(--text-secondary)' }}>
            {records.length > 0
              ? Math.round((duplicateRecords.length / records.length) * 100)
              : 0}%
          </div>
          <span className="text-[10px] font-mono opacity-60">Cross-catalog deduplicated</span>
        </div>
      </div>

      {/* Deduplication & Records Inspector */}
      {records.length > 0 && (
        <div className="theme-glass-card rounded-3xl p-6 sm:p-7 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-2 p-1 rounded-xl theme-glass-input w-fit">
              <button
                type="button"
                onClick={() => setActiveInspectorTab('unique')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeInspectorTab === 'unique'
                    ? 'theme-primary-btn shadow-md'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Unique Studies ({uniqueRecords.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveInspectorTab('duplicates')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeInspectorTab === 'duplicates'
                    ? 'theme-primary-btn shadow-md'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <GitMerge className="w-3.5 h-3.5" />
                <span>Deduplication Clusters ({duplicateRecords.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onProceedToScreening}
              className="theme-primary-btn px-4 py-2 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <span>Proceed to Phase 4 Screening</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* TAB 1: Unique Studies (Representatives) */}
          {activeInspectorTab === 'unique' && (
            <div className="space-y-4">
              {uniqueRecords.map((record) => {
                const isSelectedForMerge = selectedRecordForMerge === record.id;
                return (
                  <div
                    key={record.id}
                    className="p-4 sm:p-5 rounded-2xl theme-glass-input space-y-3 hover:brightness-105 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                          {getSourceBadge(record.source_db)}
                          {record.pub_year && <span className="opacity-70">Year: {record.pub_year}</span>}
                          {record.journal && <span className="opacity-70">&middot; {record.journal}</span>}
                          {record.doi && <span className="opacity-60">&middot; DOI: {record.doi}</span>}
                          {record.pmid && <span className="opacity-60">&middot; PMID: {record.pmid}</span>}
                        </div>
                        <h4 className="text-sm font-bold leading-snug font-display" style={{ color: 'var(--text-primary)' }}>
                          {record.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {selectedRecordForMerge && selectedRecordForMerge !== record.id ? (
                          <button
                            type="button"
                            onClick={() => handleMerge(record.id, selectedRecordForMerge)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold theme-primary-btn flex items-center gap-1 cursor-pointer"
                          >
                            <GitMerge className="w-3 h-3" />
                            <span>Confirm Merge Here</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedRecordForMerge(isSelectedForMerge ? null : record.id)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-mono opacity-70 hover:opacity-100 theme-glass-input cursor-pointer"
                            title="Pick this record to manually merge with another"
                          >
                            {isSelectedForMerge ? 'Cancel Selection' : 'Merge into Another...'}
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs line-clamp-3 leading-relaxed opacity-85" style={{ color: 'var(--text-secondary)' }}>
                      {record.abstract || 'No abstract text available in canonical literature metadata.'}
                    </p>

                    <div className="pt-2 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono opacity-65" style={{ borderColor: 'var(--border-subtle)' }}>
                      <span className="truncate max-w-md">Authors: {record.authors.slice(0, 3).join(', ')}{record.authors.length > 3 ? ' et al.' : ''}</span>
                      <span className="text-[10px]">Cluster ID: {record.cluster_id?.substring(0, 10)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: Deduplication Clusters & Overrides */}
          {activeInspectorTab === 'duplicates' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl theme-glass-input text-xs flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--accent-primary)' }} />
                <span className="leading-relaxed opacity-85">
                  <strong>Auditable &amp; Reversible Deduplication:</strong> Duplicate papers across OpenAlex, Crossref, PubMed, Europe PMC, and arXiv are kept permanently in storage (`is_duplicate = true`), preserving reviewer audit trails while keeping screening queues noise-free. If the algorithm flagged a false duplicate, click <strong>&quot;Un-cluster (Unique Study)&quot;</strong> below to restore it immediately.
                </span>
              </div>

              {duplicateRecords.length === 0 ? (
                <div className="text-center py-10 opacity-60 text-xs font-mono">
                  No duplicate records identified for this search. All retrieved records are unique.
                </div>
              ) : (
                <div className="space-y-4">
                  {duplicateRecords.map((dupRecord) => {
                    const decision = decisions.find((d) => d.record_id === dupRecord.id);
                    const representative = records.find((r) => r.id === decision?.duplicate_of_record_id);

                    return (
                      <div
                        key={dupRecord.id}
                        className="p-4 sm:p-5 rounded-2xl border space-y-3"
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.05)',
                          borderColor: 'rgba(239, 68, 68, 0.2)',
                        }}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                              <span className="px-2 py-0.5 rounded uppercase font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                DUPLICATE DETECTED
                              </span>
                              {getSourceBadge(dupRecord.source_db)}
                              {dupRecord.doi && <span className="opacity-60">DOI: {dupRecord.doi}</span>}
                            </div>
                            <h4 className="text-sm font-bold line-through opacity-75 font-display" style={{ color: 'var(--text-primary)' }}>
                              {dupRecord.title}
                            </h4>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleUncluster(dupRecord.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold theme-glass-input hover:border-emerald-500 hover:text-emerald-300 cursor-pointer flex items-center gap-1.5 shrink-0 transition-all"
                          >
                            <Split className="w-3.5 h-3.5" />
                            <span>Un-cluster (Unique Study)</span>
                          </button>
                        </div>

                        {/* Representative Link info */}
                        {representative && (
                          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/50 text-xs space-y-1">
                            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block">
                              &rarr; Clustered into Primary Representative Study:
                            </span>
                            <p className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>
                              {representative.title}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] font-mono opacity-70">
                              <span>Source: {representative.source_db.toUpperCase()}</span>
                              {representative.doi && <span>&middot; DOI: {representative.doi}</span>}
                              {representative.pmid && <span>&middot; PMID: {representative.pmid}</span>}
                            </div>
                          </div>
                        )}

                        <div className="text-[11px] font-mono opacity-60">
                          Reviewer Audit Reason: {decision?.notes || 'Deterministic multi-tier duplicate match'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
