"use client";

import { useEffect, useState, useCallback } from "react";

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
    try {
      const res = await fetch("/api/subscription/status", {
        credentials: "include",
      });
      const data = await res.json();
      setActive(Boolean(data.active));
      setPlan(data.plan || "expired");
      setAccessUntil(data.accessUntil || null);
    } catch {
      // Fail open on network error for local demo; tighten later
      setActive(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { loading, active, plan, accessUntil, refresh };
}
