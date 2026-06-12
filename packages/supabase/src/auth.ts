import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { createElement } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, hasSupabase } from './client';

export type UserRole = 'broker' | 'lender' | 'admin';

export interface UserProfile {
  id: string;
  role: UserRole;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  brokerage_name?: string | null;
  firm_name?: string | null;
  is_verified?: boolean;
  verification_status?: 'pending' | 'approved' | 'rejected';
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  // True when running without Supabase env vars — surface a friendly demo banner.
  mockMode: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  signUpBroker: (
    payload: BrokerSignupPayload
  ) => Promise<{ error?: string; user?: User | null }>;
  signUpLender: (
    payload: LenderSignupPayload
  ) => Promise<{ error?: string; user?: User | null }>;
  refreshProfile: () => Promise<void>;
  requestPasswordReset: (email: string, redirectTo?: string) => Promise<{ error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
}

export interface BrokerSignupPayload {
  email: string;
  password: string;
  brokerage_name: string;
  fsra_province: string;
  fsra_license_number: string;
  first_name: string;
  last_name: string;
}

export interface LenderSignupPayload {
  email: string;
  password: string;
  firm_name: string;
  lender_type: string;
  tier?: string;
}

const AuthContext = createContext<AuthState | null>(null);

const MOCK_USERS: Record<UserRole, UserProfile> = {
  broker: {
    id: 'mock-broker-id',
    role: 'broker',
    email: 'marcus@northbridge.ca',
    first_name: 'Marcus',
    last_name: 'Chen',
    brokerage_name: 'Northbridge Mortgage Partners',
    is_verified: true,
    verification_status: 'approved',
  },
  lender: {
    id: 'mock-lender-id',
    role: 'lender',
    email: 'eleanor@fortressmic.ca',
    firm_name: 'Fortress MIC',
    is_verified: true,
    verification_status: 'approved',
  },
  admin: {
    id: 'mock-admin-id',
    role: 'admin',
    email: 'admin@plynth.ca',
    first_name: 'Plynth',
    last_name: 'Operations',
    is_verified: true,
    verification_status: 'approved',
  },
};

export interface AuthProviderProps {
  children: ReactNode;
  // Which portal we're running in — controls fallback profile + post-signup role.
  portalRole: UserRole;
}

export function AuthProvider({ children, portalRole }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    if (error) {
      // Most useful console signal during development.
      console.warn('[auth] loadProfile failed:', error.message);
      return;
    }
    if (data) {
      setProfile(data as UserProfile);
    } else {
      // Auth user exists but no profile row — sign them out so they can
      // restart the signup flow cleanly instead of getting stuck in a loop.
      console.warn(
        '[auth] no profile for uid',
        uid,
        '— signing out so signup can restart'
      );
      await supabase.auth.signOut();
      setProfile(null);
    }
  };

  useEffect(() => {
    if (!hasSupabase || !supabase) {
      // Mock mode: persist a tiny session flag so users can "sign in/out".
      const signed = localStorage.getItem('plynth.mock.signedIn') === '1';
      if (signed) setProfile(MOCK_USERS[portalRole]);
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadProfile(s.user.id);
      else setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portalRole]);

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      localStorage.setItem('plynth.mock.signedIn', '1');
      setProfile(MOCK_USERS[portalRole]);
      return {};
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  };

  const signOut = async () => {
    if (!supabase) {
      localStorage.removeItem('plynth.mock.signedIn');
      setProfile(null);
      return;
    }
    await supabase.auth.signOut();
  };

  const signUpBroker = async (payload: BrokerSignupPayload) => {
    if (!supabase) {
      localStorage.setItem('plynth.mock.signedIn', '1');
      setProfile({ ...MOCK_USERS.broker, ...payload, role: 'broker' });
      return {};
    }
    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: { role: 'broker' },
      },
    });
    if (error) return { error: error.message };
    if (!data.session) {
      return {
        error:
          'Check your email to confirm the account, then sign in. ' +
          '(To skip this step in dev, disable "Confirm email" in Supabase → Auth → Providers → Email.)',
        user: data.user,
      };
    }
    if (data.user) {
      const { error: insertErr } = await supabase.from('user_profiles').insert({
        id: data.user.id,
        role: 'broker',
        email: payload.email,
        brokerage_name: payload.brokerage_name,
        fsra_province: payload.fsra_province,
        fsra_license_number: payload.fsra_license_number,
        first_name: payload.first_name,
        last_name: payload.last_name,
      });
      if (insertErr) return { error: insertErr.message, user: data.user };
    }
    return { user: data.user };
  };

  const signUpLender = async (payload: LenderSignupPayload) => {
    if (!supabase) {
      localStorage.setItem('plynth.mock.signedIn', '1');
      setProfile({ ...MOCK_USERS.lender, ...payload, role: 'lender' });
      return {};
    }
    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: { data: { role: 'lender' } },
    });
    if (error) return { error: error.message };
    if (!data.session) {
      // Email confirmation is enabled — the profile insert would fail RLS
      // because there's no auth.uid() yet. Surface the issue clearly.
      return {
        error:
          'Check your email to confirm the account, then sign in. ' +
          '(To skip this step in dev, disable "Confirm email" in Supabase → Auth → Providers → Email.)',
        user: data.user,
      };
    }
    if (data.user) {
      const { error: insertErr } = await supabase.from('user_profiles').insert({
        id: data.user.id,
        role: 'lender',
        email: payload.email,
        firm_name: payload.firm_name,
        lender_type: payload.lender_type,
        tier: payload.tier ?? 'professional',
      });
      if (insertErr) return { error: insertErr.message, user: data.user };
    }
    return { user: data.user };
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  const requestPasswordReset = async (email: string, redirectTo?: string) => {
    if (!supabase) return {};
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo ?? window.location.origin + '/reset-password',
    });
    return error ? { error: error.message } : {};
  };

  const updatePassword = async (newPassword: string) => {
    if (!supabase) return {};
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return error ? { error: error.message } : {};
  };

  const value: AuthState = {
    user,
    session,
    profile,
    loading,
    mockMode: !hasSupabase,
    signIn,
    signOut,
    signUpBroker,
    signUpLender,
    refreshProfile,
    requestPasswordReset,
    updatePassword,
  };

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
