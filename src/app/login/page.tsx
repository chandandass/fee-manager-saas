"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getSupabaseBrowser,
  isSupabaseConfigured,
} from "@/infrastructure/supabase/client";
import { Suspense } from "react";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // If Google sent tokens to /login by mistake, recover them
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash.includes("access_token")) {
      // Move handling to callback page so URL is cleaned
      window.location.replace("/auth/callback" + hash);
      return;
    }

    const sb = getSupabaseBrowser();
    sb.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/");
    });
  }, [router]);

  useEffect(() => {
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
      const origin = window.location.origin;

      const { error: oauthError } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
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
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 bg-slate-50">
      <div className="max-w-sm mx-auto w-full space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-blue-600 text-white items-center justify-center text-xl font-bold shadow-lg shadow-blue-600/25">
            ₹
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            FeeManager
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Tuition fee tracking for teachers.
            <br />
            Know who paid — remind on WhatsApp.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <p className="text-sm font-medium text-slate-800 text-center">
            Teacher sign in
          </p>
          <p className="text-xs text-slate-500 text-center">
            First time? Use Google — we set up your centre automatically.
          </p>

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-slate-800 hover:bg-slate-50 active:bg-slate-100 transition disabled:opacity-60 shadow-sm"
          >
            <GoogleIcon />
            {loading ? "Opening Google…" : "Continue with Google"}
          </button>

          {error && (
            <p className="text-xs text-red-600 text-center">{error}</p>
          )}
        </div>

        <p className="text-center text-xs text-slate-400">
          By continuing you agree to use FeeManager for your coaching centre.
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
