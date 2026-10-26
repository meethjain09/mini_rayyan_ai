/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * INLINE PICO ABSTRACT HIGHLIGHTER
 * Tokenizes abstract text and renders high-contrast, accessible inline PICO annotations
 * (Population: Violet, Intervention: Emerald, Comparator: Amber, Outcome: Rose).
 */

import React, { useState } from 'react';
import { Tag, Sparkles, Plus, X, Eye, HelpCircle } from 'lucide-react';
import { PicoTags } from '../../types/database';
import { segmentAbstractWithPico, AbstractSegment } from '../../lib/screeningRules';

interface InlinePicoAbstractProps {
  abstractText: string | null;
  picoTags: PicoTags;
  onUpdatePicoTags?: (newTags: PicoTags) => void;
  readOnly?: boolean;
}

export const InlinePicoAbstract: React.FC<InlinePicoAbstractProps> = ({
  abstractText,
  picoTags,
  onUpdatePicoTags,
  readOnly = false,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'p' | 'i' | 'c' | 'o' | 'none'>('all');
  const [newTagInput, setNewTagInput] = useState('');
  const [newTagCategory, setNewTagCategory] = useState<'p' | 'i' | 'c' | 'o'>('p');
  const [showAddForm, setShowAddForm] = useState(false);

  if (!abstractText) {
    return (
      <div className="p-6 rounded-2xl theme-glass-card text-center" style={{ color: 'var(--text-muted)' }}>
        <p className="text-xs font-mono">No abstract text provided for this record.</p>
      </div>
    );
  }

  // Filter tags if a specific category is selected
  const effectiveTags: PicoTags = {
    p: activeFilter === 'all' || activeFilter === 'p' ? picoTags.p : [],
    i: activeFilter === 'all' || activeFilter === 'i' ? picoTags.i : [],
    c: activeFilter === 'all' || activeFilter === 'c' ? picoTags.c : [],
    o: activeFilter === 'all' || activeFilter === 'o' ? picoTags.o : [],
  };

  const segments: AbstractSegment[] = activeFilter === 'none'
    ? [{ text: abstractText, isHighlight: false }]
    : segmentAbstractWithPico(abstractText, effectiveTags);

  const getHighlightStyle = (category?: 'p' | 'i' | 'c' | 'o') => {
    switch (category) {
      case 'p':
        return {
          backgroundColor: 'rgba(129, 140, 248, 0.18)',
          borderBottom: '2px solid rgba(129, 140, 248, 0.9)',
          color: 'var(--text-primary)',
        };
      case 'i':
        return {
          backgroundColor: 'rgba(52, 211, 153, 0.18)',
          borderBottom: '2px solid rgba(52, 211, 153, 0.9)',
          color: 'var(--text-primary)',
        };
      case 'c':
        return {
          backgroundColor: 'rgba(251, 191, 36, 0.18)',
          borderBottom: '2px solid rgba(251, 191, 36, 0.9)',
          color: 'var(--text-primary)',
        };
      case 'o':
        return {
          backgroundColor: 'rgba(244, 63, 94, 0.18)',
          borderBottom: '2px solid rgba(244, 63, 94, 0.9)',
          color: 'var(--text-primary)',
        };
      default:
        return {};
    }
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagInput.trim() || !onUpdatePicoTags) return;

    const term = newTagInput.trim();
    const updated = { ...picoTags };
    if (!updated[newTagCategory].includes(term)) {
      updated[newTagCategory] = [...updated[newTagCategory], term];
      onUpdatePicoTags(updated);
    }
    setNewTagInput('');
    setShowAddForm(false);
  };

  const handleRemoveTag = (category: 'p' | 'i' | 'c' | 'o', tagToRemove: string) => {
    if (!onUpdatePicoTags || readOnly) return;
    const updated = {
      ...picoTags,
      [category]: picoTags[category].filter((t) => t !== tagToRemove),
    };
    onUpdatePicoTags(updated);
  };

  const totalTags = picoTags.p.length + picoTags.i.length + picoTags.c.length + picoTags.o.length;

  return (
    <div className="space-y-4">
      {/* PICO Highlighter Toolbar & Filter Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-mono uppercase tracking-wider mr-1" style={{ color: 'var(--text-muted)' }}>
            Highlight:
          </span>
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono cursor-pointer transition-all ${
              activeFilter === 'all'
                ? 'theme-primary-btn font-semibold shadow-xs'
                : 'theme-glass-input opacity-70 hover:opacity-100'
            }`}
          >
            All PICO ({totalTags})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('p')}
            className={`px-2 py-0.5 rounded-lg text-[11px] font-mono cursor-pointer transition-all flex items-center gap-1 ${
              activeFilter === 'p' ? 'ring-1 ring-indigo-400 font-semibold' : 'opacity-70 hover:opacity-100'
            }`}
            style={{ backgroundColor: 'rgba(129, 140, 248, 0.15)', color: '#818cf8' }}
          >
            <span className="font-bold">P</span> Population ({picoTags.p.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('i')}
            className={`px-2 py-0.5 rounded-lg text-[11px] font-mono cursor-pointer transition-all flex items-center gap-1 ${
              activeFilter === 'i' ? 'ring-1 ring-emerald-400 font-semibold' : 'opacity-70 hover:opacity-100'
            }`}
            style={{ backgroundColor: 'rgba(52, 211, 153, 0.15)', color: '#34d399' }}
          >
            <span className="font-bold">I</span> Intervention ({picoTags.i.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('c')}
            className={`px-2 py-0.5 rounded-lg text-[11px] font-mono cursor-pointer transition-all flex items-center gap-1 ${
              activeFilter === 'c' ? 'ring-1 ring-amber-400 font-semibold' : 'opacity-70 hover:opacity-100'
            }`}
            style={{ backgroundColor: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' }}
          >
            <span className="font-bold">C</span> Comparator ({picoTags.c.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('o')}
            className={`px-2 py-0.5 rounded-lg text-[11px] font-mono cursor-pointer transition-all flex items-center gap-1 ${
              activeFilter === 'o' ? 'ring-1 ring-rose-400 font-semibold' : 'opacity-70 hover:opacity-100'
            }`}
            style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' }}
          >
            <span className="font-bold">O</span> Outcome ({picoTags.o.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('none')}
            className={`px-2 py-0.5 rounded-lg text-[11px] font-mono cursor-pointer opacity-50 hover:opacity-100 transition-opacity ${
              activeFilter === 'none' ? 'underline font-semibold' : ''
            }`}
            style={{ color: 'var(--text-muted)' }}
          >
            Plain Text
          </button>
        </div>

        {!readOnly && onUpdatePicoTags && (
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="theme-glass-input px-2.5 py-1 rounded-lg text-[11px] font-mono flex items-center gap-1 cursor-pointer hover:opacity-100 opacity-80"
            style={{ color: 'var(--accent-primary)' }}
          >
            <Plus className="w-3 h-3" />
            <span>Add Tag</span>
          </button>
        )}
      </div>

      {/* Manual Tag Creation Mini-Form */}
      {showAddForm && !readOnly && (
        <form onSubmit={handleAddTag} className="theme-glass-input p-3 rounded-xl flex items-center gap-2">
          <select
            value={newTagCategory}
            onChange={(e) => setNewTagCategory(e.target.value as any)}
            className="theme-glass-card text-xs px-2 py-1 rounded-lg outline-none font-mono"
            style={{ color: 'var(--text-primary)' }}
          >
            <option value="p">Population (P)</option>
            <option value="i">Intervention (I)</option>
            <option value="c">Comparator (C)</option>
            <option value="o">Outcome (O)</option>
          </select>
          <input
            type="text"
            placeholder="Type word or phrase in abstract to tag..."
            value={newTagInput}
            onChange={(e) => setNewTagInput(e.target.value)}
            className="flex-1 bg-transparent border-none text-xs outline-none px-2 py-1 font-sans"
            style={{ color: 'var(--text-primary)' }}
          />
          <button
            type="submit"
            className="theme-primary-btn px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Save Tag
          </button>
          <button
            type="button"
            onClick={() => setShowAddForm(false)}
            className="p-1 opacity-60 hover:opacity-100 cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      )}

      {/* Interactive Abstract Text with Inline Color Highlighting */}
      <div 
        className="p-5 rounded-2xl theme-glass-panel leading-relaxed text-sm font-sans select-text relative"
        style={{ color: 'var(--text-primary)', minHeight: '140px' }}
      >
        {segments.map((seg, idx) => {
          if (!seg.isHighlight) {
            return <span key={idx}>{seg.text}</span>;
          }
          return (
            <mark
              key={idx}
              title={`[${seg.label?.toUpperCase()}] Extracted PICO term`}
              className="rounded px-1 py-0.5 font-medium transition-all cursor-help relative group inline"
              style={getHighlightStyle(seg.category)}
            >
              {seg.text}
              <span className="hidden group-hover:inline-block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 text-[10px] font-mono rounded shadow-lg z-20 whitespace-nowrap pointer-events-none"
                style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--accent-primary)', border: '1px solid var(--border-subtle)' }}
              >
                {seg.label}
              </span>
            </mark>
          );
        })}
      </div>

      {/* Active PICO Chips Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2">
        {/* Population */}
        <div className="p-2.5 rounded-xl theme-glass-card border-l-2" style={{ borderLeftColor: '#818cf8' }}>
          <div className="flex items-center justify-between text-[10px] font-mono mb-1.5" style={{ color: '#818cf8' }}>
            <span className="font-bold">P · POPULATION</span>
            <span>({picoTags.p.length})</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {picoTags.p.length === 0 ? (
              <span className="text-[10px] font-mono opacity-40" style={{ color: 'var(--text-muted)' }}>None detected</span>
            ) : (
              picoTags.p.map((t, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-sans"
                  style={{ backgroundColor: 'rgba(129, 140, 248, 0.12)', color: 'var(--text-primary)' }}
                >
                  <span>{t}</span>
                  {!readOnly && onUpdatePicoTags && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTag('p', t)}
                      className="opacity-50 hover:opacity-100 cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Intervention */}
        <div className="p-2.5 rounded-xl theme-glass-card border-l-2" style={{ borderLeftColor: '#34d399' }}>
          <div className="flex items-center justify-between text-[10px] font-mono mb-1.5" style={{ color: '#34d399' }}>
            <span className="font-bold">I · INTERVENTION</span>
            <span>({picoTags.i.length})</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {picoTags.i.length === 0 ? (
              <span className="text-[10px] font-mono opacity-40" style={{ color: 'var(--text-muted)' }}>None detected</span>
            ) : (
              picoTags.i.map((t, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-sans"
                  style={{ backgroundColor: 'rgba(52, 211, 153, 0.12)', color: 'var(--text-primary)' }}
                >
                  <span>{t}</span>
                  {!readOnly && onUpdatePicoTags && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTag('i', t)}
                      className="opacity-50 hover:opacity-100 cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Comparator */}
        <div className="p-2.5 rounded-xl theme-glass-card border-l-2" style={{ borderLeftColor: '#fbbf24' }}>
          <div className="flex items-center justify-between text-[10px] font-mono mb-1.5" style={{ color: '#fbbf24' }}>
            <span className="font-bold">C · COMPARATOR</span>
            <span>({picoTags.c.length})</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {picoTags.c.length === 0 ? (
              <span className="text-[10px] font-mono opacity-40" style={{ color: 'var(--text-muted)' }}>None detected</span>
            ) : (
              picoTags.c.map((t, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-sans"
                  style={{ backgroundColor: 'rgba(251, 191, 36, 0.12)', color: 'var(--text-primary)' }}
                >
                  <span>{t}</span>
                  {!readOnly && onUpdatePicoTags && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTag('c', t)}
                      className="opacity-50 hover:opacity-100 cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Outcome */}
        <div className="p-2.5 rounded-xl theme-glass-card border-l-2" style={{ borderLeftColor: '#f43f5e' }}>
          <div className="flex items-center justify-between text-[10px] font-mono mb-1.5" style={{ color: '#f43f5e' }}>
            <span className="font-bold">O · OUTCOME</span>
            <span>({picoTags.o.length})</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {picoTags.o.length === 0 ? (
              <span className="text-[10px] font-mono opacity-40" style={{ color: 'var(--text-muted)' }}>None detected</span>
            ) : (
              picoTags.o.map((t, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-sans"
                  style={{ backgroundColor: 'rgba(244, 63, 94, 0.12)', color: 'var(--text-primary)' }}
                >
                  <span>{t}</span>
                  {!readOnly && onUpdatePicoTags && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTag('o', t)}
                      className="opacity-50 hover:opacity-100 cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
