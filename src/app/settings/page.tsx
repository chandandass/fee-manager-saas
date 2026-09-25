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
  Pencil,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { Modal, Input } from "@/presentation/components/ui";
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
      <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-xs font-semibold text-emerald-900">
        Payment successful! Your Basic plan is active for 30 days.
      </div>
    );
  }
  if (payment === "failed") {
    return (
      <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-xs font-semibold text-rose-900">
        Payment failed or cancelled. Please try again.
      </div>
    );
  }
  return null;
}

function PayRedirectOverlay({ amount }: { amount: number }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs px-6">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
        <div className="space-y-2">
          <p className="text-base font-bold text-slate-900">
            Opening PayU Gateway…
          </p>
          <p className="text-xs font-medium text-slate-600 leading-relaxed">
            Subscription Fee: <span className="font-bold text-slate-900">₹{amount}</span> / month
          </p>
          <div className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 leading-relaxed text-left space-y-1">
            <p className="font-bold text-amber-950">⚠️ Important Notice:</p>
            <p>Please do not close or navigate away from the app until payment is complete.</p>
            <p className="text-[11px] text-amber-900/90 font-normal">
              Your subscription will activate automatically upon returning.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PolicyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Privacy Policy & Terms of Service">
      <div className="space-y-4 text-xs text-slate-600 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
        <div>
          <h3 className="font-bold text-slate-900 text-sm mb-1">1. Privacy & Data Security</h3>
          <p>
            FeeManager values teacher and student privacy. Student records and fee details are stored in encrypted cloud databases (TLS in-transit and AES-256 at-rest encryption via Supabase) and are strictly confidential to your institute. We do not sell or share your data with third parties.
          </p>
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-sm mb-1">2. Payment & Billing</h3>
          <p>
            Payments are processed via PayU (PCI-DSS compliant). Subscription access is valid for 30 days from the payment date.
          </p>
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-sm mb-1">3. WhatsApp Reminders</h3>
          <p>
            Fee reminders are opened using your device&apos;s WhatsApp application. FeeManager does not send automated spam or marketing messages to your students or parents.
          </p>
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-sm mb-1">4. Cancellation & Expiry</h3>
          <p>
            FeeManager subscriptions are prepaid 30-day plans with no hidden auto-debit fees. Your plan will simply expire after 30 days unless you choose to renew manually.
          </p>
        </div>
      </div>
    </Modal>
  );
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
  const [instLoading, setInstLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  // Edit Modal State
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editOwnerName, setEditOwnerName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Policy Modal State
  const [policyOpen, setPolicyOpen] = useState(false);

  async function refreshInstitute() {
    const { getCachedInstitute, setCachedInstitute, setActiveInstituteId } =
      await import("@/infrastructure/supabase/instituteContext");

    // 1. Instant render from local cache (0ms UI latency)
    const cached = getCachedInstitute();
    if (cached) {
      setInstitute(cached);
      setInstLoading(false);
    }

    // 2. Background Revalidation from Supabase / Backend API
    try {
      const res = await fetch("/api/institutes/mine", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        const list = json.institutes || [];
        if (list.length > 0) {
          const first = list[0];
          setActiveInstituteId(first.id);
          const freshInst = {
            id: first.id,
            name: first.name,
            ownerName: first.owner_name || (user?.email ? user.email.split("@")[0] : "Teacher"),
            phone: first.phone || "",
            plan: first.plan || "trial",
            trialEndsAt: first.trial_ends_at,
            subscriptionEndsAt: first.subscription_ends_at,
            monthlyPriceInr: first.monthly_price_inr || 249,
          };
          setCachedInstitute(freshInst);
          setInstitute(freshInst);
          setInstLoading(false);
          return;
        }
      }
    } catch (ex) {
      console.warn("[settings] background revalidation failed", ex);
    }

    if (!cached) {
      // Fallback if no cached or DB institute is found
      setInstitute({
        id: "default",
        name: user?.email ? `${user.email.split("@")[0]}'s Coaching` : "My Tuition Centre",
        ownerName: user?.email ? user.email.split("@")[0] : "Teacher",
        phone: "",
        plan: "trial",
        monthlyPriceInr: 249,
      });
    }
    setInstLoading(false);
  }

  useEffect(() => {
    refreshInstitute();
  }, []);

  function openEditModal() {
    const inst = institute || {
      name: "Sharma Tuition Centre",
      ownerName: "Ramesh Sharma",
      phone: "9876543210",
    };
    setEditName(inst.name || "");
    setEditOwnerName(inst.ownerName || "");
    setEditPhone(inst.phone || "");
    setEditOpen(true);
  }

  async function handleSaveInstitute(e: React.FormEvent) {
    e.preventDefault();
    if (!editName.trim()) return;
    setSavingEdit(true);
    try {
      const { setCachedInstitute } = await import(
        "@/infrastructure/supabase/instituteContext"
      );
      const updated = await repos.institute.update({
        name: editName.trim(),
        ownerName: editOwnerName.trim(),
        phone: editPhone.trim(),
      });
      // Update UI instantly from returned data and refresh cache
      setCachedInstitute(updated);
      setInstitute(updated);
      setEditOpen(false);
    } catch (err) {
      console.warn("[settings] update inst error", err);
    } finally {
      setSavingEdit(false);
    }
  }

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

      await new Promise((r) => setTimeout(r, 900));

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

  if (instLoading && subLoading) {
    return (
      <div className="p-4 animate-pulse space-y-4">
        <div className="h-8 bg-slate-200/80 rounded-xl w-32 mb-4" />
        <div className="h-28 bg-slate-200/80 rounded-2xl" />
        <div className="h-40 bg-slate-200/80 rounded-2xl" />
      </div>
    );
  }

  const instData = institute || {
    id: "default",
    name: "Sharma Tuition Centre",
    ownerName: "Ramesh Sharma",
    phone: "9876543210",
    plan: "trial" as const,
    monthlyPriceInr: 249,
  };

  return (
    <div className="p-4 space-y-5 pb-24">
      {paying && <PayRedirectOverlay amount={price} />}

      <PageHeader title="Settings" subtitle="Institute & account management" />

      <Suspense fallback={null}>
        <PaymentBanner />
      </Suspense>

      {user && (
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-100/80 border border-slate-200/60 rounded-xl px-3 py-2 -mt-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span>Signed in as <strong className="text-slate-800 font-semibold">{user.email}</strong></span>
        </div>
      )}

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
              <Building2 size={22} strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-900 text-base truncate">{instData.name}</p>
              <p className="text-xs font-medium text-slate-500 mt-0.5">{instData.ownerName}</p>
              {instData.phone && (
                <p className="text-xs text-slate-400 mt-0.5">{instData.phone}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={openEditModal}
            className="w-9 h-9 rounded-xl border border-slate-200/80 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-center shrink-0 transition-all active:scale-95 cursor-pointer"
            title="Edit Tuition Centre Details"
          >
            <Pencil size={15} />
          </button>
        </div>
      </Card>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Tuition Centre Details"
      >
        <form onSubmit={handleSaveInstitute} className="space-y-3.5 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tuition / Coaching Centre Name *
            </label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="e.g. Sharma Tuition Centre"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Teacher / Owner Name *
            </label>
            <Input
              value={editOwnerName}
              onChange={(e) => setEditOwnerName(e.target.value)}
              placeholder="e.g. Ramesh Sharma"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phone Number (Optional)
            </label>
            <Input
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              inputMode="tel"
            />
          </div>
          <Button type="submit" className="w-full mt-2" disabled={savingEdit}>
            {savingEdit ? "Saving…" : "Save Changes"}
          </Button>
        </form>
      </Modal>

      <PolicyModal open={policyOpen} onClose={() => setPolicyOpen(false)} />

      <Card className="border-amber-200/80 bg-gradient-to-b from-white to-amber-50/20">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
              <Sparkles size={20} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Subscription Plan</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Badge
                  variant={isBasic ? "success" : isTrial ? "info" : "danger"}
                >
                  {isBasic
                    ? "Basic Plan (Active)"
                    : isTrial
                      ? "7-Day Free Trial"
                      : "Subscription Expired"}
                </Badge>
              </div>
            </div>
          </div>
          {!isBasic ? (
            <Button size="sm" onClick={startPayU} disabled={paying}>
              {paying ? "Opening…" : "Upgrade Plan"}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={startPayU}
              disabled={paying}
            >
              {paying ? "Opening…" : "Renew Plan"}
            </Button>
          )}
        </div>

        <p className="text-xs font-semibold text-slate-800 mt-3">
          Plan Price: <span className="text-blue-600 font-bold">₹{price} / month</span>
        </p>

        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Secure payment gateway powered by PayU. Supports UPI, NetBanking, Debit & Credit Cards.
        </p>

        {isBasic && (
          <p className="text-xs font-semibold text-emerald-700 mt-2.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
            Valid until{" "}
            {accessLabel
              ? new Date(accessLabel).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
          </p>
        )}
        {!isBasic && (
          <p className="text-xs font-medium text-amber-800 mt-2.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
            Free trial ends{" "}
            {instData.trialEndsAt
              ? new Date(instData.trialEndsAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
          </p>
        )}
        {payError && <p className="text-xs font-semibold text-rose-600 mt-2">{payError}</p>}
      </Card>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setPolicyOpen(true)}
          className="w-full flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:bg-slate-50 transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <ShieldCheck size={17} />
            </div>
            <span className="text-xs font-semibold text-slate-800">
              Privacy Policy & Terms of Service
            </span>
          </div>
          <ExternalLink size={14} className="text-slate-400" />
        </button>

        <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs opacity-75">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
              <Bell size={16} />
            </div>
            <span className="text-xs font-semibold text-slate-700">
              Automatic Fee Reminders
            </span>
          </div>
          <Badge variant="default">Coming Soon</Badge>
        </div>
      </div>

      <Button
        variant="danger"
        className="w-full"
        onClick={onLogout}
        disabled={loggingOut || paying}
      >
        <LogOut size={16} />
        {loggingOut ? "Signing out…" : "Log out"}
      </Button>

      <p className="text-center text-xs font-medium text-slate-400 pt-2">
        FeeManager v0.1 · Tuition Fee Tracking App
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
