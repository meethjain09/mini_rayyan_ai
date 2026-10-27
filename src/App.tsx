/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthModal } from './components/auth/AuthModal';
import { ResearchBooksDashboard } from './components/dashboard/ResearchBooksDashboard';
import { SimplePicoFlow } from './components/simple/SimplePicoFlow';
import { PlatformGuideView } from './components/guide/PlatformGuideView';
import { ThemeSwitcher } from './components/ui/ThemeSwitcher';
import { localStore, supabase, isSupabaseConfigured } from './lib/supabase';
import { Profile, ResearchBook, PicoConfig } from './types/database';
import { ThemeMode } from './types/theme';
import {
  SlidersHorizontal,
  User,
  LogIn,
  LogOut,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  BookOpen,
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<Profile | null>(null);
  const [books, setBooks] = useState<ResearchBook[]>([]);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'simple' | 'advanced' | 'guide'>('simple');
  const [advancedInitialTab, setAdvancedInitialTab] = useState<'books' | 'query' | 'fetch' | 'screening' | 'loop' | 'guide'>('books');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('mini_rayyan_theme') as ThemeMode) || 'emerald-sage';
    }
    return 'emerald-sage';
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync theme attribute to HTML root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mini_rayyan_theme', theme);
  }, [theme]);

  // Initialize session and books on mount
  useEffect(() => {
    const initApp = async () => {
      try {
        if (isSupabaseConfigured && supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const profile: Profile = {
              id: session.user.id,
              email: session.user.email || '',
              created_at: session.user.created_at,
            };
            setUser(profile);
            localStore.setCurrentUser(profile, true);
            const loadedBooks = localStore.getBooks(profile.id);
            setBooks(loadedBooks);
            setActiveBookId(localStore.getActiveBookId() || loadedBooks[0]?.id || null);
            setIsAuthModalOpen(false);
            return;
          }
        }

        // Check persistent local store for remembered user
        const localUser = localStore.getCurrentUser();
        if (localUser) {
          setUser(localUser);
          const loadedBooks = localStore.getBooks(localUser.id);
          setBooks(loadedBooks);
          setActiveBookId(localStore.getActiveBookId() || loadedBooks[0]?.id || null);
          setIsAuthModalOpen(false);
        } else {
          // If no user is logged in, do not load default content, and immediately pop up Sign In modal
          setUser(null);
          setBooks([]);
          setActiveBookId(null);
          setIsAuthModalOpen(true);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initApp();

    // Listen to real-time Supabase Auth state changes if configured
    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const profile: Profile = {
            id: session.user.id,
            email: session.user.email || '',
            created_at: session.user.created_at,
          };
          setUser(profile);
          localStore.setCurrentUser(profile, true);
          const loadedBooks = localStore.getBooks(profile.id);
          setBooks(loadedBooks);
          setIsAuthModalOpen(false);
        } else {
          setUser(null);
          localStore.setCurrentUser(null, false);
          setBooks([]);
          setIsAuthModalOpen(true);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  const handleAuthSuccess = (authenticatedUser: Profile) => {
    setUser(authenticatedUser);
    const loadedBooks = localStore.getBooks(authenticatedUser.id);
    setBooks(loadedBooks);
    setActiveBookId(loadedBooks[0]?.id || null);
    setIsAuthModalOpen(false);
    showToast(`Signed in as ${authenticatedUser.email}`);
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    localStore.setCurrentUser(null, false);
    setUser(null);
    setBooks([]);
    setActiveBookId(null);
    setIsAuthModalOpen(true);
    showToast('Signed out successfully.');
  };

  const handleCreateBook = (title: string, description: string, pico: PicoConfig) => {
    const newBook = localStore.createBook(title, description, pico, user?.id);
    const updatedBooks = localStore.getBooks(user?.id);
    setBooks(updatedBooks);
    setActiveBookId(newBook.id);
    showToast(`Created Research Book: "${title}"`);
  };

  const handleSelectBook = (bookId: string) => {
    localStore.setActiveBookId(bookId);
    setActiveBookId(bookId);
    const selected = books.find((b) => b.id === bookId);
    if (selected) {
      showToast(`Active Workspace switched to: "${selected.title}"`);
    }
  };

  const handleDeleteBook = (bookId: string) => {
    const doomed = books.find((b) => b.id === bookId);
    localStore.deleteBook(bookId);
    const updated = localStore.getBooks(user?.id);
    setBooks(updated);
    setActiveBookId(localStore.getActiveBookId());
    showToast(`Archived workspace "${doomed?.title || bookId}"`);
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-muted)' }}
      >
        <div 
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mb-3"
          style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }}
        />
        <span className="text-xs font-mono">Initializing Mini-Rayyan environment...</span>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen font-sans selection:bg-[var(--accent-primary)] selection:text-[var(--accent-text)] relative transition-colors duration-500"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-primary)' }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 theme-glass-elevated border border-[var(--border-elevated)] px-4 py-3 rounded-2xl shadow-2xl text-xs flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: 'var(--accent-primary)' }} />
          <span className="font-mono text-[11px]" style={{ color: 'var(--text-primary)' }}>{toastMessage}</span>
        </div>
      )}

      {/* Global User Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        currentUser={user}
        onLogout={handleLogout}
      />

      <div key={theme} className="theme-fade-transition min-h-screen flex flex-col">
        {/* Global Navigation Header in Simple Mode */}
        {viewMode === 'simple' && (
          <header className="sticky top-0 z-40 theme-glass-header border-b border-[var(--border-subtle)] px-4 sm:px-8 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shadow-md"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--accent-text)' }}
              >
                R
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Mini-Rayyan
                </span>
                <span className="text-[10px] font-mono ml-2 opacity-60">
                  AI Systematic Screener
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Theme Switcher */}
              <ThemeSwitcher currentTheme={theme} onThemeChange={setTheme} />

              {/* User Account / Sign In Button */}
              {user ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsAuthModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--accent-primary)] transition-all cursor-pointer"
                    title="Account Settings"
                  >
                    <div 
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--accent-text)' }}
                    >
                      {user.email.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-mono text-[11px] hidden md:inline truncate max-w-[140px]" style={{ color: 'var(--text-secondary)' }}>
                      {user.email}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="p-1.5 rounded-xl text-xs border border-[var(--border-subtle)] hover:border-rose-500/40 hover:bg-rose-500/10 text-rose-400 transition-all cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)]/20 transition-all cursor-pointer"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              )}

              {/* How It Works Guide Toggle */}
              <button
                type="button"
                onClick={() => setViewMode('guide')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-card)] transition-all cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
                title="Open comprehensive platform guide and learn systematic review methodology"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">How It Works</span>
              </button>

              {/* Mode Toggle */}
              <button
                type="button"
                onClick={() => setViewMode('advanced')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-card)] transition-all cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
                title="Open Advanced Workspace with PRISMA flow and Level 2 diff loop"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Advanced Mode</span>
              </button>
            </div>
          </header>
        )}

        {/* Global Navigation Header in Guide Mode */}
        {viewMode === 'guide' && (
          <header className="sticky top-0 z-40 theme-glass-header border-b border-[var(--border-subtle)] px-4 sm:px-8 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={() => setViewMode('simple')}
                className="w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shadow-md cursor-pointer hover:scale-105 transition-transform"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--accent-text)' }}
                title="Go to Home"
              >
                R
              </button>
              <div>
                <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Mini-Rayyan
                </span>
                <span className="text-[10px] font-mono ml-2 opacity-60">
                  Platform Guide &amp; Architecture
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Back to Simple Mode */}
              <button
                type="button"
                onClick={() => setViewMode('simple')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-card)] transition-all cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
                <span className="hidden sm:inline">Simple Mode</span>
              </button>

              {/* Open Advanced Mode */}
              <button
                type="button"
                onClick={() => setViewMode('advanced')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-card)] transition-all cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Advanced Mode</span>
              </button>

              {/* Theme Switcher */}
              <ThemeSwitcher currentTheme={theme} onThemeChange={setTheme} />

              {/* User Account / Sign In Button */}
              {user ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsAuthModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--accent-primary)] transition-all cursor-pointer"
                    title="Account Settings"
                  >
                    <div 
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--accent-text)' }}
                    >
                      {user.email.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-mono text-[11px] hidden md:inline truncate max-w-[140px]" style={{ color: 'var(--text-secondary)' }}>
                      {user.email}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="p-1.5 rounded-xl text-xs border border-[var(--border-subtle)] hover:border-rose-500/40 hover:bg-rose-500/10 text-rose-400 transition-all cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)]/20 transition-all cursor-pointer"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </header>
        )}

        {/* Main Content Area */}
        <main className="flex-1">
          {viewMode === 'simple' ? (
            <SimplePicoFlow 
              onOpenAdvancedMode={() => setViewMode('advanced')}
              user={user}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onOpenGuide={() => setViewMode('guide')}
            />
          ) : viewMode === 'guide' ? (
            <PlatformGuideView
              currentTheme={theme}
              onStartSimpleMode={() => setViewMode('simple')}
              onOpenAdvancedPhase={(phase) => {
                setAdvancedInitialTab(phase);
                setViewMode('advanced');
              }}
              onCloseGuide={() => setViewMode('simple')}
            />
          ) : (
            <ResearchBooksDashboard
              user={user || { id: 'usr-guest', email: 'guest.reviewer@rayyan.org', created_at: new Date().toISOString() }}
              books={books}
              activeBookId={activeBookId}
              onSelectBook={handleSelectBook}
              onCreateBook={handleCreateBook}
              onDeleteBook={handleDeleteBook}
              onLogout={handleLogout}
              currentTheme={theme}
              onThemeChange={setTheme}
              onSwitchToSimpleMode={() => setViewMode('simple')}
              initialTab={advancedInitialTab}
            />
          )}
        </main>
      </div>
    </div>
  );
}
