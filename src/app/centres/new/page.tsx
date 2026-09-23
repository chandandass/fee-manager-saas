"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getSupabaseBrowser,
  isSupabaseConfigured,
} from "@/infrastructure/supabase/client";
import { setActiveInstituteId } from "@/infrastructure/supabase/instituteContext";
import { isPlatformOwner } from "@/lib/platform";
import { logoutUser } from "@/lib/logout";
import { Button, Input } from "@/presentation/components/ui";

/** Platform owner: create first coaching centre when none exist */
export default function NewCentrePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      router.replace("/login");
      return;
    }
    (async () => {
      const sb = getSupabaseBrowser();
      const { data } = await sb.auth.getSession();
      const u = data.session?.user;
      if (!u?.email || !isPlatformOwner(u.email)) {
        router.replace("/");
        return;
      }
      setEmail(u.email);
      setUserId(u.id);
      setOwnerName(
        (u.user_metadata?.full_name as string) ||
          (u.user_metadata?.name as string) ||
          ""
      );
      setLoading(false);
    })();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Centre name is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/institutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorEmail: email,
          actorUserId: userId,
          name: name.trim(),
          ownerName: ownerName.trim() || name.trim(),
          phone,
        }),
      });
      const json = await res.json();
      if (!json.ok || !json.institute?.id) {
        setError(json.error || "Could not create");
        setSaving(false);
        return;
      }
      setActiveInstituteId(json.institute.id);
      router.replace("/");
    } catch {
      setError("Network error");
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
          <h1 className="text-xl font-bold text-slate-900">Create coaching centre</h1>
          <p className="text-sm text-slate-500">
            No centres on the platform yet. Add the first one.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Centre name <span className="text-red-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sharma Tuition Centre"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Owner name
            </label>
            <Input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Teacher / owner name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Phone <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              placeholder="10-digit mobile"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <Button type="submit" className="w-full" size="lg" disabled={saving}>
            {saving ? "Creating…" : "Create & open"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => logoutUser()}
          className="block w-full text-center text-sm text-slate-500 hover:text-slate-800"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
