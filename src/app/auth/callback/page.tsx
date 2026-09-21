"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getSupabaseBrowser,
  isSupabaseConfigured,
} from "@/infrastructure/supabase/client";

/**
 * Handles both:
 * - PKCE: ?code=...
 * - Implicit: #access_token=... (what you hit)
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      router.replace("/login?error=config");
      return;
    }

    let cancelled = false;

    async function finish() {
      const sb = getSupabaseBrowser();

      try {
        // 1) PKCE code in query
        const qs = new URLSearchParams(window.location.search);
        const code = qs.get("code");
        if (code) {
          const { error } = await sb.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          // 2) Tokens in hash (implicit) — parse and setSession
          const hash = window.location.hash?.replace(/^#/, "");
          if (hash) {
            const hp = new URLSearchParams(hash);
            const access_token = hp.get("access_token");
            const refresh_token = hp.get("refresh_token");
            if (access_token && refresh_token) {
              const { error } = await sb.auth.setSession({
                access_token,
                refresh_token,
              });
              if (error) throw error;
            }
          }
        }

        const { data, error: sessErr } = await sb.auth.getSession();
        if (sessErr) throw sessErr;
        if (!data.session?.user) {
          setMessage("No session found. Try again.");
          setTimeout(() => router.replace("/login?error=session"), 1500);
          return;
        }

        const user = data.session.user;
        const email = user.email || "";
        const name =
          (user.user_metadata?.full_name as string) ||
          (user.user_metadata?.name as string) ||
          email.split("@")[0] ||
          "Teacher";

        // Ensure institute exists (first-time teacher)
        try {
          await fetch("/api/auth/ensure-institute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id,
              email,
              name,
              accessToken: data.session.access_token,
            }),
          });
        } catch {
          /* non-blocking */
        }

        // Clean URL (remove tokens from address bar)
        window.history.replaceState({}, "", "/auth/callback");
        if (!cancelled) {
          setMessage("Welcome! Redirecting…");
          router.replace("/");
        }
      } catch (e) {
        console.error("[auth/callback]", e);
        if (!cancelled) {
          setMessage("Sign-in failed. Redirecting…");
          setTimeout(() => router.replace("/login?error=callback"), 1200);
        }
      }
    }

    finish();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <p className="text-sm text-slate-600 animate-pulse">{message}</p>
    </div>
  );
}
