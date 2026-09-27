"use client";

import { useEffect, useState } from "react";
import { Modal, Button } from "@/presentation/components/ui";
import { useSubscription } from "@/presentation/hooks/useSubscription";
import { getActiveInstituteId } from "@/infrastructure/supabase/instituteContext";
import { initiatePayUCheckout } from "@/lib/payment";
import { Clock, Sparkles, Lock } from "lucide-react";

export function SubscriptionExpiryGate() {
  const { active, accessUntil, loading } = useSubscription();
  const [modalOpen, setModalOpen] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");

  useEffect(() => {
    if (loading || typeof window === "undefined") return;

    if (accessUntil) {
      const diffMs = new Date(accessUntil).getTime() - Date.now();
      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      setDaysLeft(days);

      // Check if 3 days or less remaining and active
      if (active && days >= 0 && days <= 3) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const storedKey = `fm_expiring_modal_${todayStr}`;
        const alreadySeen = localStorage.getItem(storedKey);

        if (!alreadySeen) {
          setModalOpen(true);
          try {
            localStorage.setItem(storedKey, "true");
          } catch {
            /* ignore */
          }
        }
      }
    }
  }, [active, accessUntil, loading]);

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

  if (!modalOpen) return null;

  return (
    <Modal
      open={modalOpen}
      onClose={() => setModalOpen(false)}
      title="Subscription Expiring Soon"
    >
      <div className="space-y-4 pt-1">
        <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
            <Clock size={22} className="animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-950">
              {daysLeft === 0
                ? "Subscription expires today!"
                : daysLeft === 1
                ? "Subscription expires tomorrow!"
                : `Subscription expires in ${daysLeft} days!`}
            </p>
            <p className="text-xs text-amber-800/90 mt-0.5">
              Renew now to ensure uninterrupted access to student records and WhatsApp reminders.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 text-xs text-slate-600 space-y-1">
          <p className="font-semibold text-slate-800 flex items-center gap-1.5">
            <Sparkles size={14} className="text-blue-600" /> Basic Plan · ₹249 / month
          </p>
          <p>Unlimited students, automated monthly fee calculation, and 1-click WhatsApp reminders.</p>
        </div>

        {payError && (
          <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded-xl">
            {payError}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            className="flex-1"
            onClick={() => setModalOpen(false)}
          >
            Remind Tomorrow
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={handleRenew}
            disabled={paying}
          >
            {paying ? "Opening…" : "Renew Plan"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
