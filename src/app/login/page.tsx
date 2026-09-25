"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getSupabaseBrowser,
  isSupabaseConfigured,
} from "@/infrastructure/supabase/client";

function getOAuthRedirectTo(): string {
  // Prefer env so phone testing can force LAN IP even if something strips origin
  const fromEnv = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  if (fromEnv) return `${fromEnv}/auth/callback`;
  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth/callback`;
  }
  return "http://localhost:3000/auth/callback";
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [redirectHint, setRedirectHint] = useState("");

  // Supabase sometimes returns ?code= on Site URL root (/) — forward to callback
  useEffect(() => {
    const code = params.get("code");
    if (code) {
      const q = window.location.search;
      window.location.replace(`/auth/callback${q}`);
      return;
    }

    if (!isSupabaseConfigured()) return;

    const hash = window.location.hash || "";
    if (hash.includes("access_token")) {
      window.location.replace("/auth/callback" + hash);
      return;
    }

    const sb = getSupabaseBrowser();
    sb.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/");
    });
  }, [params, router]);

  useEffect(() => {
    setRedirectHint(getOAuthRedirectTo());
    const err = params.get("error");
    if (err === "auth" || err === "callback" || err === "session") {
      setError("Sign-in did not finish. Please try Google again.");
    }
  }, [params]);

  async function signInWithGoogle() {
    setError("");
    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured. Check .env.local");
      return;
    }
    setLoading(true);
    try {
      const sb = getSupabaseBrowser();
      const redirectTo = getOAuthRedirectTo();

      // Helpful in phone debug
      console.log("[oauth] redirectTo =", redirectTo);

      const { error: oauthError } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: false,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setLoading(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-4 py-10">
      <div className="max-w-sm mx-auto w-full space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white items-center justify-center text-2xl font-bold shadow-xl shadow-blue-500/30 animate-float">
            ₹
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            FeeManager
          </h1>
          <p className="text-xs font-medium text-slate-500 leading-relaxed max-w-xs mx-auto">
            Smart tuition fee tracking for teachers & coaching institutes. Know who paid — send WhatsApp reminders in 1 click.
          </p>
        </div>

        <div className="glass-card rounded-3xl p-6 space-y-5 border border-white/80 shadow-xl shadow-slate-900/5">
          <div className="text-center space-y-1">
            <p className="text-base font-bold text-slate-900">
              Teacher Sign In
            </p>
            <p className="text-xs font-medium text-slate-500">
              Instant login — your centre is set up automatically.
            </p>
          </div>

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 shadow-sm hover:shadow-md cursor-pointer"
          >
            <GoogleIcon />
            {loading ? "Connecting Google…" : "Continue with Google"}
          </button>

          {error && (
            <p className="text-xs font-medium text-rose-600 text-center bg-rose-50 border border-rose-100 rounded-xl p-2.5">{error}</p>
          )}

          {redirectHint && (
            <p className="text-[10px] text-slate-400 text-center break-all leading-relaxed">
              Callback: {redirectHint}
            </p>
          )}
        </div>

        <p className="text-center text-xs font-medium text-slate-400">
          Built for Indian coaching centres & private tutors.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
          Loading…
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
