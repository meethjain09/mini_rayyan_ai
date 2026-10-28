/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * USER AUTHENTICATION MODAL
 * Provides Email & Password Sign In, Sign Up, and Account Management.
 * Implements persistent "Remember Me" session tracking across browser visits.
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
  UserCheck,
} from 'lucide-react';
import { supabase, isSupabaseConfigured, localStore, STORAGE_KEYS } from '../../lib/supabase';
import { Profile } from '../../types/database';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: Profile) => void;
  currentUser: Profile | null;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  currentUser,
  onLogout,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load remembered email and preferences on open
  useEffect(() => {
    if (isOpen && !currentUser) {
      const remembered = localStore.getRememberedEmail();
      if (remembered) {
        setEmail(remembered);
      }
      setRememberMe(localStore.isRememberMeEnabled());
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, currentUser]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setErrorMessage('Please provide both your email address and password.');
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMessage('Please enter a valid email address (e.g. researcher@hospital.org).');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      if (isSupabaseConfigured && supabase) {
        if (isSignUp) {
          const { data, error } = await supabase.auth.signUp({
            email: cleanEmail,
            password,
          });
          if (error) throw error;
          if (data.user) {
            const profile: Profile = {
              id: data.user.id,
              email: data.user.email || cleanEmail,
              created_at: new Date().toISOString(),
            };
            localStore.setCurrentUser(profile, rememberMe);
            setSuccessMessage('Account created successfully! Welcome to Mini-Rayyan.');
            setTimeout(() => {
              onAuthSuccess(profile);
              onClose();
            }, 600);
          }
        } else {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
          if (error) throw error;
          if (data.user) {
            const profile: Profile = {
              id: data.user.id,
              email: data.user.email || cleanEmail,
              created_at: new Date().toISOString(),
            };
            localStore.setCurrentUser(profile, rememberMe);
            setSuccessMessage('Signed in successfully! Loading your systematic reviews...');
            setTimeout(() => {
              onAuthSuccess(profile);
              onClose();
            }, 600);
          }
        }
      } else {
        // Local persistent account store
        let storedAccountsRaw = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
        let accounts: { [email: string]: { id: string; passwordHash: string; created_at: string } } = storedAccountsRaw
          ? JSON.parse(storedAccountsRaw)
          : {};

        if (isSignUp) {
          if (accounts[cleanEmail]) {
            setErrorMessage('An account with this email already exists. Switch to Sign In to access your workspace.');
            setLoading(false);
            return;
          }
          const newUserId = 'user-' + Math.random().toString(36).substring(2, 10);
          accounts[cleanEmail] = {
            id: newUserId,
            passwordHash: btoa(password),
            created_at: new Date().toISOString(),
          };
          localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));

          const profile: Profile = {
            id: newUserId,
            email: cleanEmail,
            created_at: accounts[cleanEmail].created_at,
          };
          localStore.setCurrentUser(profile, rememberMe);
          setSuccessMessage('Account created! Your personal systematic review workspace is ready.');
          setTimeout(() => {
            onAuthSuccess(profile);
            onClose();
          }, 600);
        } else {
          // Sign In
          const existing = accounts[cleanEmail];
          if (existing) {
            if (existing.passwordHash !== btoa(password)) {
              setErrorMessage('Incorrect password for this email address. Please try again.');
              setLoading(false);
              return;
            }
            const profile: Profile = {
              id: existing.id,
              email: cleanEmail,
              created_at: existing.created_at,
            };
            localStore.setCurrentUser(profile, rememberMe);
            setSuccessMessage('Welcome back! Loading your reviews...');
            setTimeout(() => {
              onAuthSuccess(profile);
              onClose();
            }, 500);
          } else {
            // Friendly prompt to create account or auto-register if desired
            setErrorMessage(
              'No account found with this email. Please switch to "Create Account" above to register.'
            );
            setLoading(false);
            return;
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const modalNode = (
    <div 
      className="fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-8 sm:pt-14 overflow-hidden bg-black/80 backdrop-blur-xl animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label="User Authentication"
    >
      <div 
        className="theme-glass-elevated rounded-3xl w-full max-w-md p-6 sm:p-8 relative z-10 shadow-2xl border border-[var(--border-elevated)] animate-in zoom-in-95 duration-150"
        style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-canvas)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 px-2 py-1 rounded-xl hover:bg-[var(--bg-canvas)] opacity-80 hover:opacity-100 transition-all cursor-pointer flex items-center gap-1.5"
          title="Close dialog (Esc)"
          aria-label="Close dialog"
        >
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-[var(--border-subtle)] opacity-70">ESC</span>
          <X className="w-4 h-4" />
        </button>

        {/* Logged in Account Overview vs Authentication Form */}
        {currentUser ? (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shadow-md"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--accent-text)' }}
              >
                {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h3 className="text-base font-bold font-display" style={{ color: 'var(--text-primary)' }}>
                  Active Reviewer Account
                </h3>
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                  {currentUser.email}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--text-muted)' }}>Account ID:</span>
                <span className="font-mono text-[11px]">{currentUser.id.substring(0, 16)}...</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--text-muted)' }}>Reviewer Role:</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Lead Investigator
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--text-muted)' }}>Remember Status:</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  Active on this device
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--text-muted)' }}>Data Persistence:</span>
                <span className="font-mono text-[11px]" style={{ color: 'var(--accent-primary)' }}>
                  {isSupabaseConfigured ? 'Supabase Cloud PostgreSQL' : 'Local Persistent Storage'}
                </span>
              </div>
            </div>

            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              All your research books, literature queries, and screening decisions remain private and saved to this account.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-[var(--border-subtle)] hover:bg-[var(--bg-canvas)] cursor-pointer"
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 cursor-pointer transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Header & Tabs */}
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shadow-md"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--accent-text)' }}
              >
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-display" style={{ color: 'var(--text-primary)' }}>
                  {isSignUp ? 'Create Reviewer Account' : 'Sign In to Mini-Rayyan'}
                </h2>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {isSignUp
                    ? 'Register to create your personal systematic review protocols'
                    : 'Access your clinical screening workspace & saved research books'}
                </p>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex rounded-xl bg-[var(--bg-canvas)] p-1 border border-[var(--border-subtle)] my-4">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setErrorMessage(null);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  !isSignUp
                    ? 'bg-[var(--accent-primary)] text-[var(--accent-text)] shadow-sm'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setErrorMessage(null);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  isSignUp
                    ? 'bg-[var(--accent-primary)] text-[var(--accent-text)] shadow-sm'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="flex-1">{errorMessage}</span>
                {errorMessage.includes('switch to "Create Account"') && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(true);
                      setErrorMessage(null);
                    }}
                    className="underline font-bold text-xs text-rose-300 ml-1 hover:text-white"
                  >
                    Switch
                  </button>
                )}
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="researcher@hospital.org"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs border border-[var(--border-subtle)] bg-[var(--bg-canvas)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] transition-all font-sans"
                    style={{ color: 'var(--text-primary)' }}
                    autoFocus
                  />
                  <Mail className="w-4 h-4 absolute left-3 top-3 opacity-50" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl text-xs border border-[var(--border-subtle)] bg-[var(--bg-canvas)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] transition-all font-sans"
                    style={{ color: 'var(--text-primary)' }}
                  />
                  <Lock className="w-4 h-4 absolute left-3 top-3 opacity-50" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 opacity-60 hover:opacity-100 transition-opacity p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {isSignUp && (
                <div>
                  <label className="block text-xs font-mono mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs border border-[var(--border-subtle)] bg-[var(--bg-canvas)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] transition-all font-sans"
                      style={{ color: 'var(--text-primary)' }}
                    />
                    <Lock className="w-4 h-4 absolute left-3 top-3 opacity-50" />
                  </div>
                </div>
              )}

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--border-subtle)] accent-[var(--accent-primary)] cursor-pointer"
                  />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Remember me on this device
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--accent-text)' }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>{isSignUp ? 'Create Reviewer Account' : 'Sign In to Workspace'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Guest Bypass option */}
            <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px]">
              <span style={{ color: 'var(--text-muted)' }}>Want to explore first?</span>
              <button
                type="button"
                onClick={onClose}
                className="hover:underline font-medium cursor-pointer"
                style={{ color: 'var(--accent-primary)' }}
              >
                Continue as Guest
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
};
