"use client";

import { useEffect, useState, useCallback } from "react";
import { getActiveInstituteId } from "@/infrastructure/supabase/instituteContext";

export type SubscriptionState = {
  loading: boolean;
  active: boolean;
  plan: string;
  accessUntil: string | null;
  refresh: () => Promise<void>;
};

export function useSubscription(): SubscriptionState {
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(true);
  const [plan, setPlan] = useState("trial");
  const [accessUntil, setAccessUntil] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    // Wait until a centre is selected — avoids NO_INSTITUTE race on first login
    const instituteId = getActiveInstituteId();
    if (!instituteId) {
      setActive(false);
      setPlan("expired");
      setAccessUntil(null);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/subscription/status?instituteId=${encodeURIComponent(instituteId)}`,
        { credentials: "include" }
      );
      const data = await res.json();
      setActive(Boolean(data.active));
      setPlan(data.plan || "expired");
      setAccessUntil(data.accessUntil || null);
    } catch {
      setActive(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Small delay so AuthGate can set institute id first on owner login
    const t = setTimeout(() => {
      refresh();
    }, 50);
    return () => clearTimeout(t);
  }, [refresh]);

  return { loading, active, plan, accessUntil, refresh };
}
