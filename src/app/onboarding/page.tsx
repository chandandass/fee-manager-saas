"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getSupabaseBrowser,
  isSupabaseConfigured,
} from "@/infrastructure/supabase/client";
import { Button, Input } from "@/presentation/components/ui";

export default function OnboardingPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [instituteName, setInstituteName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
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
      setUserId(u.id);
      const n =
        (u.user_metadata?.full_name as string) ||
        (u.user_metadata?.name as string) ||
        "";
      setOwnerName(n);
      if (n) setInstituteName(`${n.split(" ")[0]}'s Tuition`);
      setLoading(false);
    })();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!instituteName.trim()) {
      setError("Please enter your institute / tuition name");
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
      router.replace("/");
    } catch {
      setError("Network error. Try again.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 bg-slate-50">
      <div className="max-w-sm mx-auto w-full space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold text-slate-900">Set up your centre</h1>
          <p className="text-sm text-slate-500">
            One minute — then you can add students and track fees.
          </p>
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
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Phone <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile"
              inputMode="tel"
            />
            <p className="text-xs text-slate-400 mt-1">
              Useful later for WhatsApp reminders from your number.
            </p>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <Button type="submit" className="w-full" size="lg" disabled={saving}>
            {saving ? "Saving…" : "Continue to app"}
          </Button>
        </form>
      </div>
    </div>
  );
}
