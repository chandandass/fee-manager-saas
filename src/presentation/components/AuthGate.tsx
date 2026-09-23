"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getSupabaseBrowser,
  isSupabaseConfigured,
} from "@/infrastructure/supabase/client";
import {
  getActiveInstituteId,
  setActiveInstituteId,
} from "@/infrastructure/supabase/instituteContext";
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

    if (
      pathname?.startsWith("/centres/new") ||
      pathname?.startsWith("/onboarding")
    ) {
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

        const email = (session.user.email || "").toLowerCase();
        let instituteId = getActiveInstituteId();

        if (isPlatformOwner(email) && !instituteId) {
          try {
            const res = await fetch(
              `/api/institutes/mine?email=${encodeURIComponent(email)}&userId=${encodeURIComponent(session.user.id)}`
            );
            const json = await res.json();
            const list = (json.institutes || []) as { id: string }[];
            if (list.length === 0) {
              router.replace("/centres/new");
              return;
            }
            // Sets localStorage + cookie BEFORE home mounts
            setActiveInstituteId(list[0].id);
            instituteId = list[0].id;
          } catch {
            router.replace("/centres/new");
            return;
          }
        }

        if (!isPlatformOwner(email) && !instituteId) {
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
  const isSetup =
    pathname?.startsWith("/onboarding") || pathname?.startsWith("/centres/new");

  if (!ready && isSupabaseConfigured() && !isPublic && !isSetup) {
    return (
      <div className="p-8 text-center text-sm text-slate-500 animate-pulse">
        Checking sign-in…
      </div>
    );
  }

  return <>{children}</>;
}
