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
  GitBranch
} from 'lucide-react';
import { ResearchBook, QueryVersion, CanonicalRecord, ScreeningDecision } from '../../types/database';
import { fetchLiteratureRecords } from '../../lib/literatureApi';
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
  const [sourcePubMed, setSourcePubMed] = useState(true);
  const [sourceEuropePmc, setSourceEuropePmc] = useState(true);

  // Execution state
  const [isFetching, setIsFetching] = useState(false);
  const [pipelineStep, setPipelineStep] = useState<string>('');
  const [fetchStats, setFetchStats] = useState<DeduplicationResult['stats'] | null>(null);

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
  }, [activeBook.id]);

  const selectedVersion = queryVersions.find((q) => q.id === selectedVersionId) || queryVersions[0];

  const handleExecuteFetchAndDeduplication = async () => {
    if (!selectedVersion) return;
    setIsFetching(true);

    try {
      setPipelineStep('Querying PubMed E-utilities and Europe PMC APIs...');
      await new Promise((r) => setTimeout(r, 600));

      const { records: fetchedRecords, sourcesQueried, liveApiSuccess } = await fetchLiteratureRecords({
        query: selectedVersion.boolean_query,
        bookId: activeBook.id,
        sourcePubMed,
        sourceEuropePmc,
        dateStart: selectedVersion.date_start || undefined,
        dateEnd: selectedVersion.date_end || undefined,
      });

      setPipelineStep('Normalizing metadata into unified CanonicalRecord schema...');
      await new Promise((r) => setTimeout(r, 500));

      setPipelineStep('Executing 3-tier deterministic deduplication (DOI -> PMID -> Title/Year/Author)...');
      await new Promise((r) => setTimeout(r, 600));

      // Run deduplication against existing records
      const existing = localStore.getRecords(activeBook.id);
      const deduplicationOutput = runDeduplicationPipeline(fetchedRecords, existing, activeBook.id);

      setPipelineStep('Linking canonical records to Query Version and generating screening audit logs...');
      await new Promise((r) => setTimeout(r, 400));

      // Persist to localStore / database
      localStore.saveRecords(activeBook.id, deduplicationOutput.records, selectedVersion.id);
      localStore.saveDecisions(activeBook.id, deduplicationOutput.decisions);

      setRecords(deduplicationOutput.records);
      setDecisions(deduplicationOutput.decisions);
      setFetchStats(deduplicationOutput.stats);
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
  const handleMerge = (primaryId: string, duplicateId: string) => {
    localStore.mergeRecordsIntoCluster(activeBook.id, primaryId, duplicateId);
    setRecords(localStore.getRecords(activeBook.id));
    setDecisions(localStore.getDecisions(activeBook.id));
    setSelectedRecordForMerge(null);
  };

  // Separate records into unique studies vs duplicates
  const duplicateDecisions = decisions.filter((d) => d.is_duplicate);
  const duplicateRecordIds = new Set(duplicateDecisions.map((d) => d.record_id));
  const uniqueRecords = records.filter((r) => !duplicateRecordIds.has(r.id));
  const duplicateRecords = records.filter((r) => duplicateRecordIds.has(r.id));

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="theme-glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full theme-glass-input text-[11px] font-mono tracking-wider mb-3" style={{ color: 'var(--accent-primary)' }}>
            <GitMerge className="w-3.5 h-3.5" />
            <span>PHASE 3: API FETCH ENGINE &amp; DETERMINISTIC DEDUPLICATION</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display text-fluid-h2" style={{ color: 'var(--text-primary)' }}>
            Literature Ingestion &amp; Deduplication Pipeline
          </h2>
          <p className="mt-2 text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Search from inside the tool through PubMed E-utilities and Europe PMC REST APIs. Our 3-tier deterministic deduplication pipeline clusters identical papers (DOI &rarr; PMID &rarr; Title/Year/Author) and hides duplicates without hard deletion.
          </p>
        </div>
      </div>

      {/* Control Panel: Query Version Selector & Source Checkboxes */}
      <div className="theme-glass-card rounded-3xl p-6 sm:p-7 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Query Version Dropdown */}
          <div className="space-y-1.5 lg:col-span-1">
            <label className="text-[11px] font-mono uppercase tracking-wider block" style={{ color: 'var(--text-secondary)' }}>
              Target Query Version (Step 1 Output):
            </label>
            {queryVersions.length === 0 ? (
              <div className="text-xs p-3 rounded-xl theme-glass-input opacity-70">
                No query compiled yet. Go to "Query &amp; PICO Builder" first.
              </div>
            ) : (
              <select
                value={selectedVersionId}
                onChange={(e) => setSelectedVersionId(e.target.value)}
                className="w-full px-3.5 py-2.5 theme-glass-input rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] cursor-pointer"
              >
                {queryVersions.map((qv) => (
                  <option key={qv.id} value={qv.id} className="bg-slate-900 text-slate-100">
                    v{qv.version_number}: "{qv.raw_user_query.substring(0, 45)}..." (~{qv.total_hits} hits)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Database Checkboxes */}
          <div className="space-y-1.5 lg:col-span-1">
            <label className="text-[11px] font-mono uppercase tracking-wider block" style={{ color: 'var(--text-secondary)' }}>
              External Literature APIs:
            </label>
            <div className="flex items-center gap-4 text-xs font-mono">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sourcePubMed}
                  onChange={(e) => setSourcePubMed(e.target.checked)}
                  className="rounded text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                />
                <span style={{ color: 'var(--text-primary)' }}>PubMed E-utilities</span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sourceEuropePmc}
                  onChange={(e) => setSourceEuropePmc(e.target.checked)}
                  className="rounded text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                />
                <span style={{ color: 'var(--text-primary)' }}>Europe PMC REST</span>
              </label>
            </div>
          </div>

          {/* Action Trigger */}
          <div className="lg:col-span-1 flex flex-col justify-end">
            <button
              type="button"
              onClick={handleExecuteFetchAndDeduplication}
              disabled={isFetching || !selectedVersion}
              className="theme-primary-btn px-5 py-3 text-xs font-bold cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-xl"
            >
              {isFetching ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Literature Pipeline...</span>
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

        {/* Selected Query Details */}
        {selectedVersion && (
          <div className="p-3.5 rounded-2xl theme-glass-input text-xs space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono opacity-70">
              <span>COMPILED BOOLEAN QUERY STRING (VERSION {selectedVersion.version_number})</span>
              <span>DATE FILTER: {selectedVersion.date_start} – {selectedVersion.date_end}</span>
            </div>
            <p className="font-mono text-[11px] break-all leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              {selectedVersion.boolean_query}
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
              <span className="opacity-60">NCBI &amp; EBI Compliant</span>
            </div>
            <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
              {pipelineStep}
            </div>
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
          <span className="text-[10px] font-mono opacity-60">Canonical storage</span>
        </div>

        <div className="theme-glass-card rounded-2xl p-5 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider opacity-60 block" style={{ color: 'var(--text-muted)' }}>
            Unique Study Clusters
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-display tabular-nums" style={{ color: 'var(--accent-primary)' }}>
            {uniqueRecords.length}
          </div>
          <span className="text-[10px] font-mono opacity-60">Representatives</span>
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
          <span className="text-[10px] font-mono opacity-60">Noise eliminated</span>
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
                <span>Deduplication Clusters &amp; Overrides ({duplicateRecords.length})</span>
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
                          <span
                            className="px-2 py-0.5 rounded uppercase font-bold"
                            style={{
                              backgroundColor: record.source_db === 'pubmed' ? 'var(--pico-p-bg)' : 'var(--pico-i-bg)',
                              color: record.source_db === 'pubmed' ? 'var(--accent-primary)' : 'var(--accent-secondary)',
                            }}
                          >
                            {record.source_db.toUpperCase()}
                          </span>
                          {record.pub_year && <span className="opacity-70">Year: {record.pub_year}</span>}
                          {record.journal && <span className="opacity-70">· {record.journal}</span>}
                          {record.doi && <span className="opacity-60">· DOI: {record.doi}</span>}
                          {record.pmid && <span className="opacity-60">· PMID: {record.pmid}</span>}
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
                  <strong>Auditable &amp; Reversible Deduplication:</strong> Duplicate papers are kept permanently in PostgreSQL (`is_duplicate = true`, `status = 'exclude'`), preserving reviewer audit trails while keeping screening queues noise-free. If the algorithm flagged a false duplicate, click <strong>"Un-cluster (Unique Study)"</strong> below to restore it immediately.
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
                              <span className="opacity-70 font-semibold">{dupRecord.source_db.toUpperCase()}</span>
                              {dupRecord.doi && <span className="opacity-70">· DOI: {dupRecord.doi}</span>}
                              {dupRecord.pmid && <span className="opacity-70">· PMID: {dupRecord.pmid}</span>}
                            </div>
                            <h4 className="text-sm font-bold font-display" style={{ color: 'var(--text-primary)' }}>
                              {dupRecord.title}
                            </h4>
                          </div>

                          {/* Manual Reviewer Override Button */}
                          <button
                            type="button"
                            onClick={() => handleUncluster(dupRecord.id)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold theme-glass-input hover:brightness-110 flex items-center gap-1.5 cursor-pointer shrink-0"
                            style={{ color: 'var(--accent-primary)' }}
                            title="Mark as false duplicate and restore as a distinct unique study"
                          >
                            <Split className="w-3.5 h-3.5" />
                            <span>Un-cluster (Unique Study)</span>
                          </button>
                        </div>

                        {/* Clustered with comparison */}
                        {representative && (
                          <div className="p-3 rounded-xl theme-glass-input text-xs space-y-1">
                            <span className="text-[10px] font-mono uppercase tracking-wider block opacity-70">
                              Clustered with Representative Primary Study:
                            </span>
                            <div className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>
                              "{representative.title}"
                            </div>
                            <div className="text-[10px] font-mono opacity-60">
                              Source: {representative.source_db.toUpperCase()} · DOI: {representative.doi || 'None'} · PMID: {representative.pmid || 'None'}
                            </div>
                          </div>
                        )}

                        <div className="text-[11px] font-mono text-rose-400/90">
                          {decision?.notes || 'Automated deduplication match.'}
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
