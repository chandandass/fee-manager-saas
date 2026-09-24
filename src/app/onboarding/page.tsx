"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getSupabaseBrowser,
  isSupabaseConfigured,
} from "@/infrastructure/supabase/client";
import { setActiveInstituteId } from "@/infrastructure/supabase/instituteContext";
import { logoutUser } from "@/lib/logout";
import { Button, Input } from "@/presentation/components/ui";

export default function OnboardingPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [instituteName, setInstituteName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      router.replace("/");
      return;
    }
    (async () => {
      const sb = getSupabaseBrowser();
      const { data } = await sb.auth.getSession();
      if (!data.session?.user) {
        router.replace("/login");
        return;
      }
      const u = data.session.user;
      const em = (u.email || "").toLowerCase();
      setUserId(u.id);
      setEmail(em);
      const n =
        (u.user_metadata?.full_name as string) ||
        (u.user_metadata?.name as string) ||
        "";
      setOwnerName(n);

      // Re-check claim: if admin already assigned this email → skip form
      try {
        const res = await fetch("/api/auth/ensure-institute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: u.id,
            email: em,
            name: n || "Teacher",
          }),
        });
        const json = await res.json();
        console.log("[onboarding] ensure-institute", json);
        if (json.ok && json.instituteId && json.claimed && !json.needsOnboarding) {
          setActiveInstituteId(json.instituteId);
          router.replace("/");
          return;
        }
        if (json.ok && json.instituteId && !json.needsOnboarding) {
          setActiveInstituteId(json.instituteId);
          router.replace("/");
          return;
        }
        if (json.ok && json.instituteId) {
          setActiveInstituteId(json.instituteId);
        }
      } catch (e) {
        console.warn("[onboarding] ensure", e);
      }

      setInstituteName("");
      setLoading(false);
    })();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!instituteName.trim()) {
      setError("Please enter your institute / tuition name");
      return;
    }
    if (!userId) {
      setError("Session expired. Please sign in again.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          email,
          instituteName: instituteName.trim(),
          phone,
          ownerName: ownerName.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || "Could not save. Try again.");
        setSaving(false);
        return;
      }
      if (json.institute?.id) {
        setActiveInstituteId(json.institute.id);
      }
      router.replace("/");
    } catch {
      setError("Network error. Try again.");
      setSaving(false);
    }
  }

  async function onCancel() {
    setCancelling(true);
    await logoutUser();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
        Checking your centre…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 bg-slate-50">
      <div className="max-w-sm mx-auto w-full space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold text-slate-900">Set up your centre</h1>
          <p className="text-sm text-slate-500">
            New account — tell us your tuition name. Phone is optional.
          </p>
          {email && (
            <p className="text-xs text-slate-400 pt-1">Signed in as {email}</p>
          )}
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Your name
            </label>
            <Input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="e.g. Ramesh Sharma"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Institute / tuition name <span className="text-red-500">*</span>
            </label>
            <Input
              value={instituteName}
              onChange={(e) => setInstituteName(e.target.value)}
              placeholder="e.g. Sharma Tuition Centre"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Phone{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile"
              inputMode="tel"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <Button type="submit" className="w-full" size="lg" disabled={saving || cancelling}>
            {saving ? "Saving…" : "Continue to app"}
          </Button>
        </form>

        <div className="text-center space-y-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving || cancelling}
            className="text-sm font-medium text-slate-500 hover:text-slate-800 underline-offset-2 hover:underline disabled:opacity-50"
          >
            {cancelling ? "Clearing…" : "Cancel onboarding"}
          </button>
        </div>
      </div>
    </div>
  );
}
