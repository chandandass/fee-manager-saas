"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/infrastructure/supabase/client";

const PUBLIC = ["/login", "/auth/callback"];

/**
 * Soft gate: if Supabase is configured and no session → /login.
 * Skip when env not set (local memory mode).
 */
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

    let cancelled = false;
    (async () => {
      try {
        const sb = getSupabaseBrowser();
        const { data } = await sb.auth.getSession();
        if (!data.session) {
          // Try restore from cookies set by callback
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
            await sb.auth.setSession({ access_token: access, refresh_token: refresh });
            const again = await sb.auth.getSession();
            if (again.data.session) {
              if (!cancelled) setReady(true);
              return;
            }
          }
          router.replace("/login");
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

  if (!ready && isSupabaseConfigured() && !PUBLIC.some((p) => pathname?.startsWith(p))) {
    return (
      <div className="p-8 text-center text-sm text-slate-500 animate-pulse">
        Checking sign-in…
      </div>
    );
  }

  return <>{children}</>;
}
