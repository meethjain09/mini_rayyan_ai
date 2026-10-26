/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * USER AUTHENTICATION MODAL
 * Provides Email & Password Sign In, Sign Up, and Account Management.
 * Works seamlessly with Supabase Auth or local persistent account store.
 */

import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  User,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { supabase, isSupabaseConfigured, localStore } from '../../lib/supabase';
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
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setErrorMessage('Please provide both email address and password.');
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
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
            setSuccessMessage('Account created successfully! Welcome to Mini-Rayyan.');
            setTimeout(() => {
              onAuthSuccess(profile);
              onClose();
            }, 800);
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
            setSuccessMessage('Signed in successfully!');
            setTimeout(() => {
              onAuthSuccess(profile);
              onClose();
            }, 600);
          }
        }
      } else {
        // Local persistent account handling
        // Generate or retrieve deterministic user id based on email
        let storedAccountsRaw = localStorage.getItem('mini_rayyan_accounts');
        let accounts: { [email: string]: { id: string; passwordHash: string; created_at: string } } = storedAccountsRaw
          ? JSON.parse(storedAccountsRaw)
          : {};

        if (isSignUp) {
          if (accounts[cleanEmail]) {
            setErrorMessage('An account with this email already exists. Please Sign In instead.');
            setLoading(false);
            return;
          }
          const newUserId = 'user-' + Math.random().toString(36).substring(2, 10);
          accounts[cleanEmail] = {
            id: newUserId,
            passwordHash: btoa(password), // simple local encoding
            created_at: new Date().toISOString(),
          };
          localStorage.setItem('mini_rayyan_accounts', JSON.stringify(accounts));

          const profile: Profile = {
            id: newUserId,
            email: cleanEmail,
            created_at: accounts[cleanEmail].created_at,
          };
          localStore.setCurrentUser(profile);
          setSuccessMessage('Account created! Your systematic review workspace is ready.');
          setTimeout(() => {
            onAuthSuccess(profile);
            onClose();
          }, 800);
        } else {
          // Sign In
          const existing = accounts[cleanEmail];
          if (existing) {
            if (existing.passwordHash !== btoa(password)) {
              setErrorMessage('Incorrect password for this email address.');
              setLoading(false);
              return;
            }
            const profile: Profile = {
              id: existing.id,
              email: cleanEmail,
              created_at: existing.created_at,
            };
            localStore.setCurrentUser(profile);
            setSuccessMessage('Signed in! Loading your research books and queries...');
            setTimeout(() => {
              onAuthSuccess(profile);
              onClose();
            }, 600);
          } else {
            // First time sign-in: auto create and welcome
            const newUserId = 'user-' + Math.random().toString(36).substring(2, 10);
            accounts[cleanEmail] = {
              id: newUserId,
              passwordHash: btoa(password),
              created_at: new Date().toISOString(),
            };
            localStorage.setItem('mini_rayyan_accounts', JSON.stringify(accounts));

            const profile: Profile = {
              id: newUserId,
              email: cleanEmail,
              created_at: accounts[cleanEmail].created_at,
            };
            localStore.setCurrentUser(profile);
            setSuccessMessage('Account created and signed in! Welcome.');
            setTimeout(() => {
              onAuthSuccess(profile);
              onClose();
            }, 600);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-200">
      <div 
        className="fixed inset-0" 
        onClick={onClose}
      />
      <div 
        className="theme-glass-elevated rounded-3xl w-full max-w-md p-6 sm:p-8 relative z-10 shadow-2xl border border-[var(--border-elevated)] animate-in zoom-in-95 duration-200"
        style={{ color: 'var(--text-primary)' }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-[var(--bg-canvas)] opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logged in state vs Authentication Form */}
        {currentUser ? (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shadow-md"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--accent-text)' }}
              >
                {currentUser.email.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-bold font-display" style={{ color: 'var(--text-primary)' }}>
                  User Account
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
                <span style={{ color: 'var(--text-muted)' }}>Data Persistence:</span>
                <span className="font-mono text-[11px]" style={{ color: 'var(--accent-primary)' }}>
                  {isSupabaseConfigured ? 'Supabase Cloud PostgreSQL' : 'Local Persistent Storage'}
                </span>
              </div>
            </div>

            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              All research books, query versions, deduplication clusters, and screening decisions are saved under this account.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-[var(--border-subtle)] hover:bg-[var(--bg-canvas)] cursor-pointer"
              >
                Close
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
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--accent-text)' }}
              >
                <Lock className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {isSignUp ? 'Create Reviewer Account' : 'Sign In to Mini-Rayyan'}
              </h2>
            </div>
            <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
              {isSignUp
                ? 'Register to retain your research books, screening decisions, and query versions.'
                : 'Sign in to access your systematic reviews and saved screening progress.'}
            </p>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="researcher@hospital.org"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs border border-[var(--border-subtle)] bg-[var(--bg-canvas)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
                    style={{ color: 'var(--text-primary)' }}
                  />
                  <Mail className="w-4 h-4 absolute left-3 top-3 opacity-50" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs border border-[var(--border-subtle)] bg-[var(--bg-canvas)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
                    style={{ color: 'var(--text-primary)' }}
                  />
                  <Lock className="w-4 h-4 absolute left-3 top-3 opacity-50" />
                </div>
              </div>

              {isSignUp && (
                <div>
                  <label className="block text-xs font-mono mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs border border-[var(--border-subtle)] bg-[var(--bg-canvas)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
                      style={{ color: 'var(--text-primary)' }}
                    />
                    <Lock className="w-4 h-4 absolute left-3 top-3 opacity-50" />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Toggle Sign Up / Sign In */}
            <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="text-xs hover:underline cursor-pointer"
                style={{ color: 'var(--accent-primary)' }}
              >
                {isSignUp
                  ? 'Already have an account? Sign In here'
                  : "Don't have an account yet? Create one here"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
