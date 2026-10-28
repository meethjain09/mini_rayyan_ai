/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PRISMA 2020 FLOW DIAGRAM & CSV EXPORT ENGINE
 * Renders audit-compliant PRISMA 2020 systematic review flow metrics
 * and provides 1-click export of structured screening data.
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  Filter,
  Layers,
  ArrowDown,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import { CanonicalRecord, ResearchBook, ScreeningDecision } from '../../types/database';

interface PrismaReportModalProps {
  book: ResearchBook;
  records: CanonicalRecord[];
  decisions: ScreeningDecision[];
  isOpen: boolean;
  onClose: () => void;
}

export const PrismaReportModal: React.FC<PrismaReportModalProps> = ({
  book,
  records,
  decisions,
  isOpen,
  onClose,
}) => {
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

  // 1. Identification Phase
  const totalIdentified = records.length;
  const pubmedCount = records.filter((r) => r.source_db === 'pubmed').length;
  const europePmcCount = records.filter((r) => r.source_db === 'europe_pmc').length;

  // 2. Deduplication Phase
  const duplicateRecords = decisions.filter((d) => d.is_duplicate);
  const duplicatesCount = duplicateRecords.length;
  const uniqueScreenableCount = totalIdentified - duplicatesCount;

  // 3. Screening Phase
  const nonDuplicateDecisions = decisions.filter((d) => !d.is_duplicate);
  const screenedCount = nonDuplicateDecisions.filter((d) => d.status !== 'unscreened').length;
  const unscreenedCount = nonDuplicateDecisions.filter((d) => d.status === 'unscreened').length;
  const maybeCount = nonDuplicateDecisions.filter((d) => d.status === 'maybe').length;
  
  // Exclusions Breakdown
  const excludedDecisions = nonDuplicateDecisions.filter((d) => d.status === 'exclude');
  const excludedCount = excludedDecisions.length;

  const reasonCounts: Record<string, number> = {};
  excludedDecisions.forEach((d) => {
    const reason = d.exclusion_reason || 'Unspecified reason';
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
  });

  // 4. Included Phase
  const includedDecisions = nonDuplicateDecisions.filter((d) => d.status === 'include');
  const includedCount = includedDecisions.length;

  // CSV Exporter
  const handleExportCsv = (includeOnly: boolean = false) => {
    const headers = [
      'Record ID',
      'Title',
      'First Author',
      'All Authors',
      'Publication Year',
      'Journal',
      'DOI',
      'PMID',
      'Source DB',
      'Is Duplicate',
      'Screening Status',
      'Decision Type',
      'Exclusion Reason',
      'Reviewer Notes',
      'PICO Population (P)',
      'PICO Intervention (I)',
      'PICO Comparator (C)',
      'PICO Outcome (O)',
      'Last Decision Updated',
    ];

    const recordsToExport = includeOnly
      ? records.filter((r) => {
          const dec = decisions.find((d) => d.record_id === r.id);
          return dec && !dec.is_duplicate && dec.status === 'include';
        })
      : records;

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = recordsToExport.map((r) => {
      const dec = decisions.find((d) => d.record_id === r.id);
      return [
        escapeCsv(r.id),
        escapeCsv(r.title),
        escapeCsv(r.authors?.[0] || 'Unknown'),
        escapeCsv(r.authors?.join('; ') || ''),
        escapeCsv(r.pub_year || ''),
        escapeCsv(r.journal || ''),
        escapeCsv(r.doi || ''),
        escapeCsv(r.pmid || ''),
        escapeCsv(r.source_db),
        escapeCsv(dec?.is_duplicate ? 'TRUE' : 'FALSE'),
        escapeCsv(dec?.status || 'unscreened'),
        escapeCsv(dec?.decision_type || 'unscreened'),
        escapeCsv(dec?.exclusion_reason || ''),
        escapeCsv(dec?.notes || ''),
        escapeCsv(dec?.pico_tags?.p?.join('; ') || ''),
        escapeCsv(dec?.pico_tags?.i?.join('; ') || ''),
        escapeCsv(dec?.pico_tags?.c?.join('; ') || ''),
        escapeCsv(dec?.pico_tags?.o?.join('; ') || ''),
        escapeCsv(dec?.updated_at || r.created_at),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const cleanTitle = book.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.href = url;
    link.setAttribute(
      'download',
      `mini_rayyan_${cleanTitle}_${includeOnly ? 'included_studies' : 'prisma_full_dataset'}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const modalNode = (
    <div 
      className="fixed inset-0 z-[9999] flex items-start justify-center p-3 sm:p-5 pt-3 sm:pt-6 overflow-y-auto bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label="PRISMA 2020 Flow Diagram"
    >
      <div 
        className="relative w-full max-w-4xl max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-3xl p-6 sm:p-8 theme-glass-card shadow-2xl border overflow-hidden"
        style={{ borderColor: 'var(--border-strong)', backgroundColor: 'var(--bg-canvas)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full theme-glass-input text-[11px] font-mono mb-1.5" style={{ color: 'var(--accent-primary)' }}>
              <ShieldCheck className="w-3 h-3" />
              <span>PRISMA 2020 FLOW &amp; AUDIT SYNTHESIS</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight font-display" style={{ color: 'var(--text-primary)' }}>
              Systematic Review Screening Flow
            </h2>
            <p className="text-xs font-sans mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Project: <span className="font-semibold text-primary">{book.title}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleExportCsv(true)}
              className="theme-primary-btn px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Included ({includedCount})</span>
            </button>
            <button
              type="button"
              onClick={() => handleExportCsv(false)}
              className="theme-glass-input px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-1.5 cursor-pointer opacity-80 hover:opacity-100"
              style={{ color: 'var(--text-primary)' }}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Full PRISMA CSV</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1.5 rounded-xl opacity-80 hover:opacity-100 cursor-pointer theme-glass-input flex items-center gap-1.5"
              style={{ color: 'var(--text-secondary)' }}
              title="Close modal (Esc)"
              aria-label="Close modal"
            >
              <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded border border-[var(--border-subtle)] text-[var(--text-muted)] bg-[var(--bg-canvas)]">ESC</span>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable content container */}
        <div className="flex-1 overflow-y-auto pr-1">

        {/* PRISMA 2020 Interactive Diagram Canvas */}
        <div className="py-6 space-y-6">
          {/* STAGE 1: IDENTIFICATION */}
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider mb-2 font-bold" style={{ color: 'var(--accent-primary)' }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }} />
              <span>1. Identification</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl theme-glass-panel">
                <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>Records identified via databases</span>
                <div className="text-2xl font-extrabold font-display tabular-nums mt-1" style={{ color: 'var(--text-primary)' }}>
                  {totalIdentified}
                </div>
                <div className="mt-2 text-xs font-mono space-y-1" style={{ color: 'var(--text-secondary)' }}>
                  <div className="flex justify-between">
                    <span>PubMed Central:</span>
                    <span className="font-bold">{pubmedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Europe PMC:</span>
                    <span className="font-bold">{europePmcCount}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl theme-glass-panel border-l-4" style={{ borderLeftColor: '#a855f7' }}>
                <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>Duplicate records flagged &amp; retained</span>
                <div className="text-2xl font-extrabold font-display tabular-nums mt-1" style={{ color: '#c084fc' }}>
                  {duplicatesCount}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Clustered via 3-Tier Deterministic Algorithm (DOI, PMID, Title+Year+Author). No records hard-deleted.
                </p>
              </div>
            </div>
          </div>

          {/* CONNECTOR ARROW */}
          <div className="flex justify-center -my-2 opacity-40">
            <ArrowDown className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
          </div>

          {/* STAGE 2: SCREENING */}
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider mb-2 font-bold" style={{ color: 'var(--accent-secondary)' }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent-secondary)' }} />
              <span>2. Screening</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl theme-glass-panel">
                <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>Unique studies screened for eligibility</span>
                <div className="text-2xl font-extrabold font-display tabular-nums mt-1" style={{ color: 'var(--text-primary)' }}>
                  {screenedCount} <span className="text-xs font-normal opacity-60">/ {uniqueScreenableCount}</span>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs font-mono">
                  <span className="text-emerald-400 font-semibold">{includedCount} Incl</span>
                  <span className="text-rose-400 font-semibold">{excludedCount} Excl</span>
                  <span className="text-amber-400 font-semibold">{maybeCount} Maybe</span>
                  <span className="opacity-60">{unscreenedCount} Unscreened</span>
                </div>
              </div>

              {/* Exclusions Breakdown Box */}
              <div className="p-4 rounded-2xl theme-glass-panel border-l-4" style={{ borderLeftColor: '#f43f5e' }}>
                <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                  Records excluded with specific reasons (n = {excludedCount})
                </span>
                <div className="mt-2 max-h-36 overflow-y-auto space-y-1.5 pr-1 text-xs">
                  {Object.keys(reasonCounts).length === 0 ? (
                    <span className="text-[11px] opacity-40 font-mono">No exclusions recorded yet.</span>
                  ) : (
                    Object.entries(reasonCounts).map(([reason, count]) => (
                      <div key={reason} className="flex items-center justify-between py-0.5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                        <span className="truncate max-w-[240px]" title={reason} style={{ color: 'var(--text-secondary)' }}>
                          {reason}
                        </span>
                        <span className="font-mono font-bold text-rose-400 tabular-nums">n = {count}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CONNECTOR ARROW */}
          <div className="flex justify-center -my-2 opacity-40">
            <ArrowDown className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
          </div>

          {/* STAGE 3: INCLUDED */}
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider mb-2 font-bold" style={{ color: '#34d399' }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#34d399' }} />
              <span>3. Included Studies</span>
            </div>

            <div className="p-5 rounded-2xl theme-glass-panel border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderColor: '#34d399' }}>
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                  Final Eligible Studies for Synthesis
                </span>
                <div className="text-3xl font-extrabold font-display tabular-nums mt-1 text-emerald-300">
                  {includedCount}
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Full human-verified RCTs satisfying Population, Intervention, Comparator and Outcome criteria.
                </p>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleExportCsv(true)}
                  className="theme-primary-btn px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Included CSV</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Footer info note */}
        <div className="pt-3 border-t flex items-center justify-between text-[11px] font-mono shrink-0" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
          <span>PRISMA 2020 Statement Compliant Flow</span>
          <span>Zero Hard Deletions · Reversible Audit Trail</span>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
};
