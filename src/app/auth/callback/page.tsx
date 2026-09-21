"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getSupabaseBrowser,
  isSupabaseConfigured,
} from "@/infrastructure/supabase/client";

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
        const qs = new URLSearchParams(window.location.search);
        const code = qs.get("code");

        if (code) {
          const { error } = await sb.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("exchangeCodeForSession", error);
            throw error;
          }
        } else {
          const hash = window.location.hash?.replace(/^#/, "") || "";
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

        // Give storage a tick
        await new Promise((r) => setTimeout(r, 50));

        const { data, error: sessErr } = await sb.auth.getSession();
        if (sessErr) throw sessErr;

        if (!data.session?.user) {
          // Retry once — sometimes session lands slightly later
          await new Promise((r) => setTimeout(r, 300));
          const again = await sb.auth.getSession();
          if (!again.data.session?.user) {
            throw new Error("No session after OAuth");
          }
        }

        const session = (await sb.auth.getSession()).data.session!;
        const user = session.user;
        const email = user.email || "";
        const name =
          (user.user_metadata?.full_name as string) ||
          (user.user_metadata?.name as string) ||
          email.split("@")[0] ||
          "Teacher";

        // Ensure institute row; learn if onboarding needed
        let needsOnboarding = true;
        try {
          const res = await fetch("/api/auth/ensure-institute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id,
              email,
              name,
            }),
          });
          const json = await res.json();
          needsOnboarding = Boolean(json.needsOnboarding);
        } catch (e) {
          console.warn("ensure-institute", e);
          needsOnboarding = true;
        }

        window.history.replaceState({}, "", "/auth/callback");

        if (cancelled) return;
        setMessage("Welcome! Redirecting…");
        router.replace(needsOnboarding ? "/onboarding" : "/");
      } catch (e) {
        console.error("[auth/callback]", e);
        if (!cancelled) {
          setMessage("Sign-in failed. Try again…");
          setTimeout(() => router.replace("/login?error=callback"), 1500);
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
