"use client";

import { useState } from "react";
import { Lock, Sparkles } from "lucide-react";
import { Button, Modal } from "@/presentation/components/ui";
import { getActiveInstituteId } from "@/infrastructure/supabase/instituteContext";
import { initiatePayUCheckout } from "@/lib/payment";

export function ExpiredCreateModal({
  open,
  onClose,
  title = "Subscription Expired",
  description = "Please renew your subscription to add new students or batches.",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}) {
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");

  function handleRenew() {
    const instId = getActiveInstituteId();
    if (!instId) return;
    setPaying(true);
    setPayError("");
    initiatePayUCheckout(
      instId,
      () => setPaying(true),
      (err) => {
        setPayError(err);
        setPaying(false);
      }
    );
  }

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4 pt-1 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/20 text-amber-600 flex items-center justify-center mx-auto">
          <Lock size={22} />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
            {description}
          </p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-3 text-xs font-semibold text-slate-700">
          Basic Plan · ₹249 / month · Full Access
        </div>

        {payError && (
          <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded-xl">
            {payError}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" className="flex-1" onClick={handleRenew} disabled={paying}>
            {paying ? "Opening…" : "Renew Subscription"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Soft-lock hint shown below the visible items when plan has expired */
export function LockedRowsHint({
  show,
  totalCount,
  visibleCount = 2,
  label = "records",
}: {
  show: boolean;
  totalCount?: number;
  visibleCount?: number;
  label?: string;
}) {
  const [paying, setPaying] = useState(false);
  if (!show) return null;

  function handleRenew() {
    const instId = getActiveInstituteId();
    if (!instId) return;
    setPaying(true);
    initiatePayUCheckout(instId, () => setPaying(true), () => setPaying(false));
  }

  return (
    <div className="relative mt-3">
      <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/90 to-orange-50/90 p-5 text-center shadow-sm">
        <div className="mx-auto w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/20 text-amber-600 flex items-center justify-center mb-2.5">
          <Lock size={20} />
        </div>
        <p className="text-sm font-bold text-amber-950">
          Subscription Expired — Unlock All Data
        </p>
        <p className="text-xs text-amber-800/90 mt-1 mb-3.5 max-w-xs mx-auto leading-relaxed">
          {totalCount
            ? `Only ${visibleCount} of ${totalCount} ${label} are visible. Renew to unlock everything.`
            : `Only ${visibleCount} ${label} are visible. Renew your subscription to unlock full features.`}
        </p>
        <Button size="sm" onClick={handleRenew} disabled={paying}>
          <Sparkles size={14} />
          {paying ? "Opening PayU…" : "Renew Subscription (₹249/mo)"}
        </Button>
      </div>
    </div>
  );
}

export function PlanExpiredBanner({ show }: { show: boolean }) {
  const [paying, setPaying] = useState(false);
  if (!show) return null;

  function handleRenew() {
    const instId = getActiveInstituteId();
    if (!instId) return;
    setPaying(true);
    initiatePayUCheckout(instId, () => setPaying(true), () => setPaying(false));
  }

  return (
    <div className="rounded-2xl bg-amber-50 border border-amber-200/80 p-3.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
          <Lock size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-amber-950">Subscription Expired</p>
          <p className="text-[11px] font-medium text-amber-800/90 mt-0.5 truncate">
            Only 2 students visible. Renew to unlock all data.
          </p>
        </div>
      </div>
      <Button size="sm" onClick={handleRenew} disabled={paying} className="shrink-0">
        {paying ? "Opening…" : "Renew"}
      </Button>
    </div>
  );
}

/** Blur + lock wrapper for a single row when gated (used on Students/Batches pages) */
export function BlurLockRow({
  locked,
  children,
}: {
  locked: boolean;
  children: React.ReactNode;
}) {
  if (!locked) return <>{children}</>;

  function handleRenew() {
    const instId = getActiveInstituteId();
    if (!instId) return;
    initiatePayUCheckout(instId);
  }

  return (
    <div className="block relative">
      <div className="pointer-events-none select-none filter blur-[4px] opacity-35">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <button
          onClick={handleRenew}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/20 backdrop-blur-md text-slate-800 text-xs font-semibold px-4 py-2 shadow-sm hover:bg-white/40 hover:border-blue-400/50 hover:text-blue-700 transition-all active:scale-95"
        >
          <Sparkles size={12} className="text-blue-500" />
          Renew Subscription
        </button>
      </div>
    </div>
  );
}
