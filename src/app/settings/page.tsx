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
  LogOut,
} from "lucide-react";
import { useSubscription } from "@/presentation/hooks/useSubscription";
import { useSessionUser } from "@/presentation/hooks/useSessionUser";
import { logoutUser } from "@/lib/logout";

const repos = createRepositories();

function PaymentBanner() {
  const params = useSearchParams();
  const payment = params.get("payment");
  if (!payment) return null;
  if (payment === "success") {
    return (
      <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-900">
        Payment successful. Basic plan is active for 30 days.
      </div>
    );
  }
  if (payment === "failed") {
    return (
      <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-900">
        Payment failed or cancelled.
      </div>
    );
  }
  return null;
}

function SettingsContent() {
  const params = useSearchParams();
  const { user } = useSessionUser();
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
  const [loggingOut, setLoggingOut] = useState(false);

  async function refreshInstitute() {
    try {
      const inst = await repos.institute.getCurrent();
      setInstitute(inst);
    } catch {
      setInstitute(null);
    }
  }

  useEffect(() => {
    refreshInstitute();
  }, []);

  useEffect(() => {
    if (params.get("payment") === "success") {
      refreshSub();
      refreshInstitute();
    }
  }, [params, refreshSub]);

  const price = institute?.monthlyPriceInr ?? 249;

  const isBasic =
    (institute?.plan === "basic" || institute?.plan === "pro") &&
    institute.subscriptionEndsAt &&
    new Date(institute.subscriptionEndsAt) > new Date();

  const isTrial =
    !isBasic &&
    ((subActive && subPlan === "trial") ||
      (institute?.plan === "trial" &&
        institute.trialEndsAt &&
        new Date(institute.trialEndsAt) > new Date()));

  const accessLabel =
    (isBasic && institute?.subscriptionEndsAt) ||
    subUntil ||
    institute?.subscriptionEndsAt ||
    null;

  async function startPayU() {
    if (!institute) return;
    setPaying(true);
    setPayError("");
    try {
      const res = await fetch("/api/payments/payu/initiate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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

  async function onLogout() {
    setLoggingOut(true);
    await logoutUser();
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

      {user && (
        <p className="text-xs text-slate-500 -mt-2">
          Signed in as{" "}
          <span className="font-medium text-slate-700">{user.email}</span>
        </p>
      )}

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
                <Badge
                  variant={isBasic ? "success" : isTrial ? "info" : "danger"}
                >
                  {isBasic
                    ? "Basic (Active)"
                    : isTrial
                      ? "7-Day Trial"
                      : "Expired"}
                </Badge>
                <span className="text-xs text-slate-500">
                  ₹{price}/month
                </span>
              </div>
            </div>
          </div>
          {!isBasic ? (
            <Button size="sm" onClick={startPayU} disabled={paying}>
              {paying ? "Redirecting…" : `Pay ₹${price}`}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={startPayU}
              disabled={paying}
            >
              {paying ? "Redirecting…" : `Renew ₹${price}`}
            </Button>
          )}
        </div>

        {isBasic && accessLabel && (
          <p className="text-xs text-green-700 mt-3">
            Active until{" "}
            {new Date(accessLabel).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        )}
        {isTrial && institute.trialEndsAt && (
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
          <Badge variant={isBasic ? "success" : "info"}>
            {isBasic ? "Active" : `₹${price}`}
          </Badge>
        </div>
      </div>

      <Button
        variant="danger"
        className="w-full"
        onClick={onLogout}
        disabled={loggingOut}
      >
        <LogOut size={16} />
        {loggingOut ? "Signing out…" : "Log out"}
      </Button>

      <p className="text-center text-xs text-slate-400 pt-2">
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
