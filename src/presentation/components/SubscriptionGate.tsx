"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/presentation/components/ui";

/** Soft-lock overlay for list items beyond the free preview when plan expired */
export function LockedRowsHint({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="relative mt-2">
      <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm px-4 py-8 text-center">
        <div className="mx-auto w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center mb-3">
          <Lock size={20} className="text-slate-500" />
        </div>
        <p className="text-sm font-medium text-slate-800">
          Plan expired — unlock full list
        </p>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          Subscribe to see all students and fees without limits.
        </p>
        <Link href="/settings">
          <Button size="sm">Pay ₹249 / month</Button>
        </Link>
      </div>
    </div>
  );
}

export function PlanExpiredBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 flex items-start gap-3">
      <Lock size={18} className="text-amber-700 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-amber-950">Plan expired</p>
        <p className="text-xs text-amber-800/90 mt-0.5">
          You can still preview a few items. Pay ₹249 to unlock everything.
        </p>
        <Link href="/settings" className="inline-block mt-2">
          <Button size="sm">Renew plan</Button>
        </Link>
      </div>
    </div>
  );
}

/** Blur + lock wrapper for a single row when gated */
export function BlurLockRow({
  locked,
  children,
}: {
  locked: boolean;
  children: React.ReactNode;
}) {
  if (!locked) return <>{children}</>;
  return (
    <Link href="/settings" className="block relative">
      <div className="pointer-events-none select-none blur-[3px] opacity-60">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 text-white text-xs font-medium px-3 py-1.5">
          <Lock size={12} /> Unlock
        </span>
      </div>
    </Link>
  );
}
