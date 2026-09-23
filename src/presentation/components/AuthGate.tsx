"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getSupabaseBrowser,
  isSupabaseConfigured,
} from "@/infrastructure/supabase/client";
import { getActiveInstituteId } from "@/infrastructure/supabase/instituteContext";
import { isPlatformOwner } from "@/lib/platform";

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

    let cancelled = false;

    (async () => {
      try {
        const sb = getSupabaseBrowser();
        const { data } = await sb.auth.getSession();
        const session = data.session;

        if (!session?.user) {
          router.replace("/login");
          return;
        }

        const email = session.user.email || "";
        const onOnboarding = pathname?.startsWith("/onboarding");
        const instituteId = getActiveInstituteId();

        // Tenant without institute id → must onboard (never browse demo data)
        if (!isPlatformOwner(email) && !instituteId && !onOnboarding) {
          router.replace("/onboarding");
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
  const isOnboarding = pathname?.startsWith("/onboarding");

  if (!ready && isSupabaseConfigured() && !isPublic && !isOnboarding) {
    return (
      <div className="p-8 text-center text-sm text-slate-500 animate-pulse">
        Checking sign-in…
      </div>
    );
  }

  return <>{children}</>;
}
