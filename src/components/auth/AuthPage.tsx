import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, Database, CheckCircle2, AlertCircle, Sparkles, Compass } from 'lucide-react';
import { supabase, isSupabaseConfigured, localStore } from '../../lib/supabase';
import { Profile } from '../../types/database';
import { ThemeMode } from '../../types/theme';
import { ThemeSwitcher } from '../ui/ThemeSwitcher';

interface AuthPageProps {
  onAuthSuccess: (user: Profile) => void;
  currentTheme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess, currentTheme, onThemeChange }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email || !password) {
      setErrorMessage('Please fill in both email and password.');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      if (isSupabaseConfigured && supabase) {
        if (isSignUp) {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          });
          if (error) throw error;
          if (data.user) {
            const profile: Profile = {
              id: data.user.id,
              email: data.user.email || email,
              created_at: new Date().toISOString(),
            };
            setSuccessMessage('Account created! Sign in to enter workspace.');
            onAuthSuccess(profile);
          }
        } else {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;
          if (data.user) {
            const profile: Profile = {
              id: data.user.id,
              email: data.user.email || email,
              created_at: new Date().toISOString(),
            };
            onAuthSuccess(profile);
          }
        }
      } else {
        // Fallback local storage auth for instant evaluation
        const profile: Profile = {
          id: 'user-' + Math.random().toString(36).substring(2, 9),
          email,
          created_at: new Date().toISOString(),
        };
        localStore.setCurrentUser(profile);
        onAuthSuccess(profile);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = () => {
    const demoUser = localStore.getCurrentUser() || {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'lead.investigator@rayyan-screening.org',
      created_at: new Date().toISOString(),
    };
    localStore.setCurrentUser(demoUser);
    onAuthSuccess(demoUser);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-500">
      {/* Top right theme switcher pill */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeSwitcher currentTheme={currentTheme} onThemeChange={onThemeChange} />
      </div>

      {/* Atmospheric Ambient Light Orbs (dynamic by theme) */}
      <div 
        className="absolute top-[-10%] left-[20%] w-[650px] h-[500px] rounded-full blur-[150px] pointer-events-none transition-all duration-700" 
        style={{ backgroundColor: 'var(--orb-1)' }}
      />
      <div 
        className="absolute bottom-[-15%] right-[10%] w-[600px] h-[550px] rounded-full blur-[170px] pointer-events-none transition-all duration-700" 
        style={{ backgroundColor: 'var(--orb-2)' }}
      />
      <div 
        className="absolute top-[40%] right-[30%] w-[400px] h-[400px] rounded-full blur-[130px] pointer-events-none transition-all duration-700" 
        style={{ backgroundColor: 'var(--orb-3)' }}
      />

      {/* Grid texture overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: `linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)`,
          backgroundSize: '44px 44px'
        }}
      />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4 group cursor-pointer">
            <div 
              className="absolute -inset-1 rounded-2xl opacity-70 blur-md group-hover:opacity-100 transition duration-500"
              style={{ background: 'var(--border-conic)' }}
            />
            <div 
              className="relative w-14 h-14 rounded-2xl border flex items-center justify-center shadow-2xl"
              style={{ backgroundColor: 'var(--glass-elevated-bg)', borderColor: 'var(--border-elevated)' }}
            >
              <Compass className="w-7 h-7 group-hover:rotate-45 transition-transform duration-500" style={{ color: 'var(--accent-primary)' }} />
            </div>
          </div>

          <div 
            className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full theme-glass-input text-[11px] font-mono tracking-wider"
            style={{ color: 'var(--accent-primary)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: 'var(--accent-primary)' }} />
            <span>BIOINFORMATICS SCREENING PROTOCOL</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-display" style={{ color: 'var(--text-primary)' }}>
            Mini<span style={{ color: 'var(--accent-primary)' }}>Rayyan</span>
          </h1>
          <p className="mt-2 text-xs max-w-xs font-sans tracking-wide" style={{ color: 'var(--text-secondary)' }}>
            Next-generation systematic review &amp; clinical PICO screening workspace
          </p>

          {/* Database indicator pill */}
          <div className="mt-3">
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono border backdrop-blur-md"
              style={{
                backgroundColor: isSupabaseConfigured ? 'var(--pico-p-bg)' : 'var(--glass-input-bg)',
                borderColor: isSupabaseConfigured ? 'var(--pico-p-border)' : 'var(--border-subtle)',
                color: isSupabaseConfigured ? 'var(--accent-primary)' : 'var(--text-muted)',
              }}
            >
              <Database className="w-3 h-3" style={{ color: 'var(--accent-primary)' }} />
              <span>{isSupabaseConfigured ? 'Supabase Live DB Connected' : 'Local Fast Evaluation Mode'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Multi-Tier Glass Elevated Card */}
        <div className="theme-glass-elevated py-8 px-6 sm:px-10 rounded-3xl relative overflow-hidden">
          {/* Subtle top border illumination */}
          <div 
            className="absolute top-0 inset-x-0 h-[1.5px]"
            style={{ background: `linear-gradient(90deg, transparent, var(--accent-primary), transparent)` }}
          />

          {/* Instant Demo Evaluator Button */}
          <div className="mb-6">
            <button
              type="button"
              onClick={handleQuickDemoLogin}
              className="w-full theme-glass-input p-3 text-xs rounded-2xl flex items-center justify-between hover:brightness-110 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div 
                  className="p-1.5 rounded-lg"
                  style={{ backgroundColor: 'var(--pico-p-bg)', color: 'var(--accent-primary)' }}
                >
                  <Sparkles className="w-3.5 h-3.5 group-hover:scale-125 transition-transform duration-300" />
                </div>
                <div className="text-left">
                  <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>Instant Evaluator Access</div>
                  <div className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>Pre-seeded with Diabetes &amp; HF Reviews</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" style={{ color: 'var(--accent-primary)' }} />
            </button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" style={{ borderColor: 'var(--border-subtle)' }} />
              </div>
              <div className="relative flex justify-center text-[10px]">
                <span className="px-3 uppercase tracking-widest font-mono" style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-muted)' }}>
                  Or sign in with email
                </span>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div 
              className="mb-4 p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in"
              style={{ backgroundColor: 'var(--pico-p-bg)', borderColor: 'var(--pico-p-border)', color: 'var(--pico-p-text)' }}
            >
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--accent-primary)' }} />
              <span>{successMessage}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Researcher Email
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none opacity-50">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="investigator@hospital.org"
                  required
                  className="block w-full pl-10 pr-3.5 py-2.5 theme-glass-input rounded-xl text-xs placeholder:opacity-40 focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] transition-all font-sans"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Password
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none opacity-50">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="block w-full pl-10 pr-3.5 py-2.5 theme-glass-input rounded-xl text-xs placeholder:opacity-40 focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] transition-all font-sans"
                />
              </div>
            </div>

            {isSignUp && (
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Confirm Password
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none opacity-50">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="block w-full pl-10 pr-3.5 py-2.5 theme-glass-input rounded-xl text-xs placeholder:opacity-40 focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] transition-all font-sans"
                  />
                </div>
              </div>
            )}

            {/* Primary Action with Animated Gradient Border */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 theme-primary-btn py-3 px-4 text-xs flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isSignUp ? 'Create Researcher Account' : 'Enter Workspace'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="text-xs transition-colors font-sans cursor-pointer hover:underline"
              style={{ color: 'var(--text-secondary)' }}
            >
              {isSignUp ? 'Already registered? Sign in here' : 'Need a workspace? Register here'}
            </button>
          </div>

          <div className="mt-6 pt-5 border-t text-[11px] font-mono flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
              <span>Multi-Book Isolation</span>
            </div>
            <span>PRISMA 2020 Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};
