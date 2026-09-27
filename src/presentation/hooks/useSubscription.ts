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

// ─── localStorage cache helpers ──────────────────────────────────────────────
// Cache is used ONLY to seed the initial render so there's no loading flash.
// The API is ALWAYS called in the background regardless of cache age.

type SubCache = {
  active: boolean;
  plan: string;
  accessUntil: string | null;
  instituteId: string;
};

function cacheKey(instituteId: string) {
  return `fm_sub_${instituteId}`;
}

function readCache(instituteId: string): SubCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(cacheKey(instituteId));
    if (!raw) return null;
    const parsed: SubCache = JSON.parse(raw);
    if (parsed.instituteId !== instituteId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(instituteId: string, data: Omit<SubCache, "instituteId">) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(cacheKey(instituteId), JSON.stringify({ ...data, instituteId }));
  } catch {
    /* ignore */
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useSubscription(): SubscriptionState {
  // Seed state instantly from localStorage — eliminates loading flash on repeat visits.
  // The API is ALWAYS called in the background to get the real/current value.
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const id = getActiveInstituteId();
    if (!id) return false;
    return readCache(id) === null; // only show spinner if truly no cache
  });

  const [active, setActive] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const id = getActiveInstituteId();
    if (!id) return false;
    return readCache(id)?.active ?? true;
  });

  const [plan, setPlan] = useState<string>(() => {
    if (typeof window === "undefined") return "trial";
    const id = getActiveInstituteId();
    if (!id) return "expired";
    return readCache(id)?.plan ?? "trial";
  });

  const [accessUntil, setAccessUntil] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const id = getActiveInstituteId();
    if (!id) return null;
    return readCache(id)?.accessUntil ?? null;
  });

  const refresh = useCallback(async () => {
    const instituteId = getActiveInstituteId();
    if (!instituteId) {
      setActive(false);
      setPlan("expired");
      setAccessUntil(null);
      setLoading(false);
      return;
    }

    // Always hit the API — cache is never used to skip the network call
    try {
      const res = await fetch(
        `/api/subscription/status?instituteId=${encodeURIComponent(instituteId)}`,
        { credentials: "include" }
      );
      const data = await res.json();
      const newActive = Boolean(data.active);
      const newPlan = data.plan || "expired";
      const newUntil = data.accessUntil || null;

      // Update cache with latest real value for next page load
      writeCache(instituteId, { active: newActive, plan: newPlan, accessUntil: newUntil });

      setActive(newActive);
      setPlan(newPlan);
      setAccessUntil(newUntil);
    } catch {
      // Network error — keep whatever is shown (cached or optimistic)
      // Don't lock them out on a transient error
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
