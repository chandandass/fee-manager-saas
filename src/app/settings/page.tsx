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

const repos = createRepositories();

function PaymentBanner() {
  const params = useSearchParams();
  const payment = params.get("payment");
  if (!payment) return null;

  if (payment === "success") {
    return (
      <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-900">
        Payment successful. Your plan is active for 30 days.
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
        Could not verify payment. If money was deducted, contact support with
        your transaction id.
      </div>
    );
  }
  return null;
}

function SettingsContent() {
  const [institute, setInstitute] = useState<Institute | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");

  async function refresh() {
    const inst = await repos.institute.getCurrent();
    setInstitute(inst);
  }

  useEffect(() => {
    refresh();
  }, []);

  // Reload plan after PayU redirect
  const params = useSearchParams();
  useEffect(() => {
    if (params.get("payment") === "success") {
      refresh();
    }
  }, [params]);

  const isPaid =
    institute &&
    (institute.plan === "basic" || institute.plan === "pro") &&
    institute.subscriptionEndsAt &&
    new Date(institute.subscriptionEndsAt) > new Date();

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

  if (!institute) {
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
                <Badge variant={isPaid ? "success" : "info"}>
                  {isPaid
                    ? "Basic (Active)"
                    : institute.plan === "trial"
                    ? "7-Day Trial"
                    : institute.plan}
                </Badge>
                <span className="text-xs text-slate-500">₹249/month</span>
              </div>
            </div>
          </div>
          {!isPaid ? (
            <Button size="sm" onClick={startPayU} disabled={paying}>
              {paying ? "Redirecting…" : "Pay ₹249"}
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={startPayU} disabled={paying}>
              {paying ? "Redirecting…" : "Renew"}
            </Button>
          )}
        </div>

        {isPaid && institute.subscriptionEndsAt && (
          <p className="text-xs text-green-700 mt-3">
            Active until{" "}
            {new Date(institute.subscriptionEndsAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        )}
        {!isPaid && institute.trialEndsAt && (
          <p className="text-xs text-slate-500 mt-3">
            Trial ends:{" "}
            {new Date(institute.trialEndsAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        )}
        {payError && (
          <p className="text-xs text-red-600 mt-2">{payError}</p>
        )}
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
          <Badge variant={isPaid ? "success" : "info"}>
            {isPaid ? "Active" : "₹249"}
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
