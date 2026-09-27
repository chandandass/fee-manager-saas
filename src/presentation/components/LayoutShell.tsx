"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BottomNav } from "@/presentation/components/BottomNav";
import { OwnerMenu } from "@/presentation/components/OwnerMenu";
import {
  getSupabaseBrowser,
  isSupabaseConfigured,
} from "@/infrastructure/supabase/client";

import { SubscriptionExpiryGate } from "@/presentation/components/SubscriptionExpiryBanner";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAuthenticated(true);
      return;
    }
    const sb = getSupabaseBrowser();
    sb.auth.getSession().then(({ data }) => {
      setAuthenticated(!!data.session?.user);
    });

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session?.user);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [pathname]);

  const isPublicOrLanding =
    authenticated === false ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/auth") ||
    pathname?.startsWith("/onboarding") ||
    pathname?.startsWith("/centres/new");

  return (
    <>
      {!isPublicOrLanding && <SubscriptionExpiryGate />}
      {!isPublicOrLanding && (
        <div className="fixed top-3 right-0 left-0 z-40 max-w-lg mx-auto flex justify-end pointer-events-none px-4">
          <div className="pointer-events-auto">
            <OwnerMenu />
          </div>
        </div>
      )}
      <div
        className={
          isPublicOrLanding
            ? "min-h-screen"
            : "max-w-lg mx-auto min-h-screen pb-24 pt-1 relative"
        }
      >
        {children}
      </div>
      {!isPublicOrLanding && <BottomNav />}
    </>
  );
}
