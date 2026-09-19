"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  PageHeader,
  Card,
  Button,
  Badge,
} from "@/presentation/components/ui";
import { createRepositories } from "@/infrastructure/supabase/InMemoryStore";
import { Institute } from "@/domain/entities/Student";
import {
  Building2,
  CreditCard,
  Bell,
  Sparkles,
} from "lucide-react";
import { useSubscription } from "@/presentation/hooks/useSubscription";

const repos = createRepositories();
const LOCAL_PLAN_KEY = "fm_plan_active_until";

function PaymentBanner() {
  const params = useSearchParams();
  const payment = params.get("payment");
  if (!payment) return null;

  if (payment === "success") {
    return (
      <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-900">
        Payment successful. Your Basic plan is active for 30 days.
      </div>
    );
  }
  if (payment === "failed") {
    return (
      <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-900">
        Payment failed or cancelled. You can try again anytime.
      </div>
    );
  }
  if (payment === "invalid" || payment === "error") {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-950">
        Could not verify payment with PayU. If money was deducted, check PayU
        dashboard or contact support with your transaction id.
      </div>
    );
  }
  return null;
}

function SettingsContent() {
  const params = useSearchParams();
  const {
    active: subActive,
    plan: subPlan,
    accessUntil: subUntil,
    loading: subLoading,
    refresh: refreshSub,
  } = useSubscription();

  const [institute, setInstitute] = useState<Institute | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  /** Client backup when server memory resets after redirect */
  const [localUntil, setLocalUntil] = useState<string | null>(null);

  useEffect(() => {
    repos.institute.getCurrent().then(setInstitute);
    try {
      const raw = localStorage.getItem(LOCAL_PLAN_KEY);
      if (raw && new Date(raw) > new Date()) setLocalUntil(raw);
    } catch {
      /* ignore */
    }
  }, []);

  // After PayU success redirect: remember access locally + refresh JWT status
  useEffect(() => {
    if (params.get("payment") === "success") {
      const ends = new Date();
      ends.setDate(ends.getDate() + 30);
      const iso = ends.toISOString();
      try {
        localStorage.setItem(LOCAL_PLAN_KEY, iso);
      } catch {
        /* ignore */
      }
      setLocalUntil(iso);
      refreshSub();
      repos.institute.getCurrent().then(setInstitute);
    }
  }, [params, refreshSub]);

  const isPaid =
    subActive &&
    (subPlan === "basic" || subPlan === "pro" || subPlan === "trial"
      ? subPlan !== "trial"
        ? true
        : false
      : false) ||
    (localUntil !== null && new Date(localUntil) > new Date()) ||
    Boolean(
      institute?.subscriptionEndsAt &&
        new Date(institute.subscriptionEndsAt) > new Date() &&
        (institute.plan === "basic" || institute.plan === "pro")
    );

  // Simpler isPaid:
  const planActive =
    (subActive && subPlan !== "expired" && subPlan !== "trial") ||
    (subActive && subPlan === "basic") ||
    (subActive && subPlan === "pro") ||
    (localUntil && new Date(localUntil) > new Date()) ||
    (institute?.plan === "basic" &&
      institute.subscriptionEndsAt &&
      new Date(institute.subscriptionEndsAt) > new Date()) ||
    (institute?.plan === "pro" &&
      institute.subscriptionEndsAt &&
      new Date(institute.subscriptionEndsAt) > new Date());

  // Paid subscription (not mere trial)
  const showAsBasic =
    planActive &&
    (subPlan === "basic" ||
      subPlan === "pro" ||
      Boolean(localUntil) ||
      institute?.plan === "basic" ||
      institute?.plan === "pro");

  const accessLabel =
    subUntil ||
    localUntil ||
    institute?.subscriptionEndsAt ||
    null;

  async function startPayU() {
    if (!institute) return;
    setPaying(true);
    setPayError("");
    try {
      const res = await fetch("/api/payments/payu/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstname: institute.ownerName,
          phone: institute.phone,
          email: "owner@example.com",
          instituteId: institute.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPayError(data.error || "Payment init failed");
        setPaying(false);
        return;
      }

      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.paymentUrl;
      Object.entries(data.fields as Record<string, string>).forEach(
        ([name, value]) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = name;
          input.value = value;
          form.appendChild(input);
        }
      );
      document.body.appendChild(form);
      form.submit();
    } catch {
      setPayError("Network error. Try again.");
      setPaying(false);
    }
  }

  if (!institute || subLoading) {
    return (
      <div className="p-4 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-32 mb-4" />
        <div className="h-40 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5">
      <PageHeader title="Settings" subtitle="Institute & subscription" />

      <Suspense fallback={null}>
        <PaymentBanner />
      </Suspense>

      <Card>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
            <Building2 size={22} className="text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{institute.name}</p>
            <p className="text-sm text-slate-500">{institute.ownerName}</p>
            <p className="text-xs text-slate-400 mt-0.5">{institute.phone}</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Sparkles size={18} className="text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Current Plan</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Badge variant={showAsBasic ? "success" : "info"}>
                  {showAsBasic
                    ? "Basic (Active)"
                    : subActive && subPlan === "trial"
                    ? "7-Day Trial"
                    : "Expired"}
                </Badge>
                <span className="text-xs text-slate-500">₹249/month</span>
              </div>
            </div>
          </div>
          {!showAsBasic ? (
            <Button size="sm" onClick={startPayU} disabled={paying}>
              {paying ? "Redirecting…" : "Pay ₹249"}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={startPayU}
              disabled={paying}
            >
              {paying ? "Redirecting…" : "Renew"}
            </Button>
          )}
        </div>

        {showAsBasic && accessLabel && (
          <p className="text-xs text-green-700 mt-3">
            Active until{" "}
            {new Date(accessLabel).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        )}
        {!showAsBasic && institute.trialEndsAt && subPlan === "trial" && (
          <p className="text-xs text-slate-500 mt-3">
            Trial ends:{" "}
            {new Date(institute.trialEndsAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        )}
        {payError && <p className="text-xs text-red-600 mt-2">{payError}</p>}
      </Card>

      <div className="space-y-1">
        <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-200 opacity-60">
          <div className="flex items-center gap-3">
            <Bell size={18} className="text-slate-500" />
            <span className="text-sm font-medium">
              Fee Reminders / Notifications
            </span>
          </div>
          <Badge variant="default">Soon</Badge>
        </div>
        <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <CreditCard size={18} className="text-slate-500" />
            <span className="text-sm font-medium">Billing via PayU</span>
          </div>
          <Badge variant={showAsBasic ? "success" : "info"}>
            {showAsBasic ? "Active" : "₹249"}
          </Badge>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400 pt-4">
        FeeManager v0.1 · Built for Indian coaching centres
      </p>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-32 mb-4" />
          <div className="h-40 bg-slate-200 rounded-2xl" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
