import { useEffect, useSyncExternalStore } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as ExpoLinking from 'expo-linking';

import { supabase } from '@/lib/supabase';

function getAuthRedirectUrl() {
  const configuredRedirectUrl = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL?.trim();
  if (configuredRedirectUrl) return configuredRedirectUrl;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/`;
  }
  return ExpoLinking.createURL('/');
}

export type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  authError: string | null;
};

export type SignUpProfile = {
  full_name: string;
  role: 'student' | 'teacher';
  course?: string;
  block?: string;
  year_level?: string;
};

let globalAuthState: AuthState = {
  session: null,
  user: null,
  loading: true,
  authError: null,
};
let authInitialized = false;
const listeners = new Set<() => void>();

const SESSION_LOAD_TIMEOUT_MS = 8000;

function notify() {
  listeners.forEach((listener) => listener());
}

export function setAuth(session: Session | null) {
  globalAuthState = {
    session,
    user: session?.user ?? null,
    loading: false,
    authError: null,
  };
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getAuthState() {
  return globalAuthState;
}

function initializeAuth() {
  if (authInitialized) return;
  authInitialized = true;

  let settled = false;
  const timeout = setTimeout(() => {
    if (settled) return;
    settled = true;
    globalAuthState = {
      session: null,
      user: null,
      loading: false,
      authError: 'Could not restore your saved session. Please sign in again.',
    };
    notify();
  }, SESSION_LOAD_TIMEOUT_MS);

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION') {
      settled = true;
      clearTimeout(timeout);
      setAuth(session);
    } else if (event === 'SIGNED_OUT' || session || !globalAuthState.session) {
      setAuth(session);
    }
  });

  supabase.auth
    .getSession()
    .then(({ data }) => {
      settled = true;
      clearTimeout(timeout);
      setAuth(data.session);
    })
    .catch((error: unknown) => {
      settled = true;
      clearTimeout(timeout);
      globalAuthState = {
        session: null,
        user: null,
        loading: false,
        authError: error instanceof Error
          ? `Could not restore your saved session: ${error.message}`
          : 'Could not restore your saved session. Please sign in again.',
      };
      notify();
    });
}

export function useAuth(): AuthState {
  const state = useSyncExternalStore(subscribe, getAuthState, getAuthState);

  useEffect(() => {
    initializeAuth();
  }, []);

  return state;
}

export async function signUp(
  email: string,
  password: string,
  profile?: SignUpProfile
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getAuthRedirectUrl(),
      ...(profile
        ? {
            data: {
              full_name: profile.full_name,
              requested_role: profile.role,
              ...(profile.course ? { course: profile.course } : {}),
              ...(profile.block ? { block: profile.block } : {}),
              ...(profile.year_level ? { year_level: profile.year_level } : {}),
            },
          }
        : {}),
    },
  });
  if (!error && data.session) {
    setAuth(data.session);
  }
  return { data, error };
}

export async function resendSignupConfirmation(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: getAuthRedirectUrl() },
  });
  return { error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (!error && data.session) {
    setAuth(data.session);
  }
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) {
    return { error: error.message };
  }
  setAuth(null);
  return { error: null };
}