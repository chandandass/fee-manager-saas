"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getSupabaseBrowser,
  isSupabaseConfigured,
} from "@/infrastructure/supabase/client";

const PUBLIC = ["/login", "/auth/callback"];

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setReady(true);
      return;
    }

    if (PUBLIC.some((p) => pathname?.startsWith(p))) {
      setReady(true);
      return;
    }

    // Onboarding requires session but is allowed
    let cancelled = false;

    (async () => {
      try {
        const sb = getSupabaseBrowser();
        let { data } = await sb.auth.getSession();

        if (!data.session) {
          const access = document.cookie
            .split("; ")
            .find((c) => c.startsWith("sb-access-token="))
            ?.split("=")
            .slice(1)
            .join("=");
          const refresh = document.cookie
            .split("; ")
            .find((c) => c.startsWith("sb-refresh-token="))
            ?.split("=")
            .slice(1)
            .join("=");
          if (access && refresh) {
            await sb.auth.setSession({
              access_token: access,
              refresh_token: refresh,
            });
            data = (await sb.auth.getSession()).data;
          }
        }

        if (!data.session) {
          if (!pathname?.startsWith("/onboarding")) {
            router.replace("/login");
          } else {
            router.replace("/login");
          }
          return;
        }

        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  const isPublic = PUBLIC.some((p) => pathname?.startsWith(p));
  if (
    !ready &&
    isSupabaseConfigured() &&
    !isPublic &&
    !pathname?.startsWith("/onboarding")
  ) {
    return (
      <div className="p-8 text-center text-sm text-slate-500 animate-pulse">
        Checking sign-in…
      </div>
    );
  }

  return <>{children}</>;
}
