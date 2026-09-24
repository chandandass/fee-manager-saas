"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getSupabaseBrowser,
  isSupabaseConfigured,
} from "@/infrastructure/supabase/client";
import { setActiveInstituteId } from "@/infrastructure/supabase/instituteContext";
import { isPlatformOwner } from "@/lib/platform";

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
          if (error) throw error;
        } else {
          const hash = window.location.hash?.replace(/^#/, "") || "";
          if (hash.includes("access_token")) {
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

        await new Promise((r) => setTimeout(r, 100));

        let session = (await sb.auth.getSession()).data.session;
        if (!session?.user) {
          await new Promise((r) => setTimeout(r, 400));
          session = (await sb.auth.getSession()).data.session;
        }
        if (!session?.user) {
          throw new Error("No session");
        }

        const user = session.user;
        const email = (user.email || "").toLowerCase();
        const name =
          (user.user_metadata?.full_name as string) ||
          (user.user_metadata?.name as string) ||
          email.split("@")[0] ||
          "Teacher";

        if (isPlatformOwner(email)) {
          setMessage("Loading centres…");
          const res = await fetch("/api/institutes/mine", {
            credentials: "include",
          });
          const json = await res.json();
          const list = (json.institutes || []) as { id: string }[];

          window.history.replaceState({}, "", "/auth/callback");
          if (cancelled) return;

          if (list.length === 0) {
            setMessage("No centres yet — create one…");
            router.replace("/centres/new");
            return;
          }

          setActiveInstituteId(list[0].id);
          setMessage("Welcome…");
          router.replace("/");
          return;
        }

        // Server uses session cookie — only send display name
        const res = await fetch("/api/auth/ensure-institute", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        const json = await res.json();

        if (!json.ok || !json.instituteId) {
          throw new Error(json.reason || json.error || "Could not create centre");
        }

        setActiveInstituteId(json.instituteId);
        window.history.replaceState({}, "", "/auth/callback");
        if (cancelled) return;

        if (json.needsOnboarding) {
          setMessage("Set up your coaching centre…");
          router.replace("/onboarding");
          return;
        }

        setMessage("Welcome back…");
        router.replace("/");
      } catch (e) {
        console.error("[auth/callback]", e);
        if (!cancelled) {
          setMessage("Sign-in failed. Returning to login…");
          setTimeout(() => router.replace("/login?error=callback"), 1600);
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
