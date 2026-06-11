// Auth state for the whole app (WAV-27). Wraps Supabase auth:
//   - booting   : restoring the persisted session / parsing an OAuth redirect
//   - session   : signed in (Apple / Google OAuth)
//   - guest     : the user chose "Continue as Guest" — local-only, no cloud
//   - error     : the last sign-in attempt failed (drives the ERROR screen)
import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

const GUEST_KEY = "wavstract-guest";

type AuthState = {
  booting: boolean;
  session: Session | null;
  guest: boolean;
  error: string | null;
  /** OAuth redirects the whole page on web — only resolves on failure. */
  signInWith: (provider: "apple" | "google") => Promise<void>;
  continueAsGuest: () => void;
  signOut: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

function readGuest(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(GUEST_KEY) === "1";
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [guest, setGuest] = useState(readGuest);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // A failed OAuth round-trip lands back here with the failure in the URL
    // (#error_description=...) — surface it as the ERROR screen.
    try {
      const hash = window.location.hash.slice(1);
      const query = window.location.search.slice(1);
      const params = new URLSearchParams(hash.includes("error") ? hash : query);
      const desc = params.get("error_description") || params.get("error");
      if (desc) {
        setError(desc.replace(/\+/g, " "));
        window.history.replaceState(null, "", window.location.pathname);
      }
    } catch { /* SSR / no window */ }

    // Never strand the user on the boot screen — if session restore hangs
    // (stuck lock, flaky network), fall through to onboarding; a late session
    // still lands via onAuthStateChange.
    const failSafe = setTimeout(() => setBooting(false), 3000);
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => {})
      .finally(() => {
        clearTimeout(failSafe);
        setBooting(false);
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signInWith = useCallback(async (provider: "apple" | "google") => {
    setError(null);
    const { data, error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        skipBrowserRedirect: true,
      },
    });
    if (err || !data?.url) {
      setError(err?.message ?? "Could not start sign-in.");
      throw err ?? new Error("no oauth url");
    }
    // Probe before navigating: an unconfigured provider answers 400 with JSON —
    // surface that as the designed ERROR screen instead of stranding the user
    // on a raw Supabase error page. A configured provider 302s (opaque, status
    // 0 with redirect:manual) and falls through to the real navigation.
    let probedError: string | null = null;
    try {
      const probe = await fetch(data.url, { redirect: "manual" });
      if (probe.status >= 400) {
        probedError = "Sign-in isn't available yet.";
        try {
          probedError = (await probe.json()).msg ?? probedError;
        } catch { /* not json */ }
      }
    } catch { /* network hiccup during probe — let the real navigation try */ }
    if (probedError) {
      setError(probedError);
      throw new Error(probedError);
    }
    window.location.assign(data.url);
  }, []);

  const continueAsGuest = useCallback(() => {
    try {
      localStorage.setItem(GUEST_KEY, "1");
    } catch { /* private mode */ }
    setGuest(true);
  }, []);

  const signOut = useCallback(async () => {
    try {
      localStorage.removeItem(GUEST_KEY);
    } catch { /* ignore */ }
    setGuest(false);
    await supabase.auth.signOut().catch(() => {});
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<AuthState>(
    () => ({ booting, session, guest, error, signInWith, continueAsGuest, signOut, clearError }),
    [booting, session, guest, error, signInWith, continueAsGuest, signOut, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
