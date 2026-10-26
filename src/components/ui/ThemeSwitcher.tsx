import React, { useState, useEffect } from 'react';
import { Palette, Check, Sparkles } from 'lucide-react';
import { THEMES, ThemeMode } from '../../types/theme';

interface ThemeSwitcherProps {
  currentTheme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ currentTheme, onThemeChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Apply theme attribute to root
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('mini_rayyan_theme', currentTheme);
  }, [currentTheme]);

  const activeThemeMeta = THEMES.find((t) => t.id === currentTheme) || THEMES[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl theme-glass-input hover:brightness-110 transition-all text-xs cursor-pointer"
        title="Change Platform Color Palette & Theme"
      >
        <div
          className="w-3.5 h-3.5 rounded-full border border-white/30 shrink-0 shadow-sm"
          style={{ backgroundColor: activeThemeMeta.previewAccent }}
        />
        <span className="font-mono text-[11px] hidden sm:inline" style={{ color: 'var(--text-secondary)' }}>
          {activeThemeMeta.name}
        </span>
        <Palette className="w-3.5 h-3.5 opacity-70" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 theme-glass-elevated rounded-2xl p-2.5 shadow-2xl z-50">
            <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider opacity-60 flex items-center justify-between border-b border-white/[0.08] mb-1.5">
              <span>Color Themes</span>
              <Sparkles className="w-3 h-3 text-[var(--accent-primary)]" />
            </div>

            <div className="space-y-1">
              {THEMES.map((theme) => {
                const isSelected = theme.id === currentTheme;
                return (
                  <button
                    key={theme.id}
                    onClick={() => {
                      onThemeChange(theme.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white/10 ring-1 ring-[var(--accent-primary)] font-semibold'
                        : 'hover:bg-white/5 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-5 h-5 rounded-lg border border-white/20 flex items-center justify-center shrink-0 shadow-sm"
                        style={{ backgroundColor: theme.previewBg }}
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full shadow-sm"
                          style={{ backgroundColor: theme.previewAccent }}
                        />
                      </div>
                      <div>
                        <div className="text-xs text-[var(--text-primary)] leading-tight">{theme.name}</div>
                        <div className="text-[10px] font-mono opacity-60 truncate max-w-[170px]">
                          {theme.tagline}
                        </div>
                      </div>
                    </div>

                    {isSelected && <Check className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
