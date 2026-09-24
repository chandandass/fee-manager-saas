"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, Building2, Plus, Pencil, Check, LogOut } from "lucide-react";
import { useSessionUser } from "@/presentation/hooks/useSessionUser";
import {
  getActiveInstituteId,
  setActiveInstituteId,
} from "@/infrastructure/supabase/instituteContext";
import { Button, Input, Modal } from "@/presentation/components/ui";
import { logoutUser } from "@/lib/logout";

type Inst = {
  id: string;
  name: string;
  owner_name: string;
  phone: string | null;
  plan: string;
  email?: string | null;
  monthly_price_inr?: number;
};

export function OwnerMenu() {
  const { user, loading } = useSessionUser();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Inst[] | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [activeId, setActiveId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Inst | null>(null);
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [price, setPrice] = useState("249");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setActiveId(getActiveInstituteId() || "");
  }, [open]);

  const loadList = useCallback(async () => {
    if (!user?.isOwner) return;
    setListLoading(true);
    try {
      const res = await fetch("/api/institutes/mine", { credentials: "include" });
      const json = await res.json();
      setList(json.institutes || []);
    } catch {
      setList([]);
    } finally {
      setListLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (open && user?.isOwner && list === null) loadList();
  }, [open, user, list, loadList]);

  if (loading || !user?.isOwner) return null;

  function selectCentre(id: string) {
    setActiveInstituteId(id);
    setActiveId(id);
    setOpen(false);
    window.location.href = "/";
  }

  function openCreate() {
    setEditing(null);
    setName("");
    setOwnerName("");
    setPhone("");
    setTeacherEmail("");
    setPrice("249");
    setErr("");
    setFormOpen(true);
  }

  function openEdit(inst: Inst) {
    setEditing(inst);
    setName(inst.name);
    setOwnerName(inst.owner_name || "");
    setPhone(inst.phone || "");
    setTeacherEmail(inst.email || "");
    setPrice(String(inst.monthly_price_inr ?? 249));
    setErr("");
    setFormOpen(true);
  }

  async function saveForm(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErr("Name required");
      return;
    }
    const priceNum = Math.round(Number(price));
    if (!Number.isFinite(priceNum) || priceNum < 1) {
      setErr("Price must be at least ₹1");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      if (editing) {
        const res = await fetch("/api/institutes", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instituteId: editing.id,
            name,
            ownerName,
            phone,
            email: teacherEmail.trim().toLowerCase() || null,
            monthlyPriceInr: priceNum,
          }),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Update failed");
      } else {
        const res = await fetch("/api/institutes", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            ownerName,
            phone,
            email: teacherEmail.trim().toLowerCase() || undefined,
            monthlyPriceInr: priceNum,
          }),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Create failed");
        if (json.institute?.id) setActiveInstituteId(json.institute.id);
      }
      setFormOpen(false);
      setList(null);
      await loadList();
      if (!editing) window.location.href = "/";
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 text-slate-700 hover:bg-slate-200"
        title="Centres"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-sm bg-white h-full shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-900">Platform</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-slate-50">
              <Button size="sm" className="w-full" onClick={openCreate}>
                <Plus size={16} /> Add coaching centre
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
              <p className="text-xs font-medium text-slate-400 px-1 py-2">
                All centres
              </p>
              {listLoading && (
                <p className="text-xs text-slate-400 px-2 py-4">Loading…</p>
              )}
              {!listLoading && list && list.length === 0 && (
                <p className="text-xs text-slate-400 px-2 py-4">No centres yet</p>
              )}
              {list?.map((inst) => {
                const selected = inst.id === activeId;
                const p = inst.monthly_price_inr ?? 249;
                return (
                  <div
                    key={inst.id}
                    className={
                      "rounded-xl border px-3 py-2.5 flex items-start gap-2 " +
                      (selected
                        ? "border-blue-200 bg-blue-50"
                        : "border-slate-100 bg-white")
                    }
                  >
                    <button
                      type="button"
                      className="flex-1 min-w-0 text-left"
                      onClick={() => selectCentre(inst.id)}
                    >
                      <p className="text-sm font-medium text-slate-900 truncate flex items-center gap-1">
                        <Building2 size={14} className="shrink-0 text-slate-400" />
                        {inst.name}
                        {selected && (
                          <Check size={14} className="text-blue-600 shrink-0" />
                        )}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {inst.owner_name}
                        {" · ₹"}{p}/mo
                      </p>
                      {inst.email && (
                        <p className="text-[11px] text-slate-400 truncate">
                          {inst.email}
                        </p>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(inst)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 shrink-0"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="p-3 border-t border-slate-100 space-y-1">
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="block text-center text-xs text-blue-600 font-medium py-2"
              >
                Settings
              </Link>
              <button
                type="button"
                onClick={() => logoutUser()}
                className="w-full flex items-center justify-center gap-2 text-xs font-medium text-red-600 py-2.5 rounded-xl hover:bg-red-50"
              >
                <LogOut size={14} />
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit centre" : "Add coaching centre"}
      >
        <form onSubmit={saveForm} className="space-y-3">
          <Input
            placeholder="Centre name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            placeholder="Owner / teacher name"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
          />
          <div>
            <Input
              placeholder="Teacher Gmail (for login access)"
              type="email"
              value={teacherEmail}
              onChange={(e) => setTeacherEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Monthly price (₹)
            </label>
            <Input
              type="number"
              min={1}
              max={99999}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="249"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Default ₹249. Set lower for bargains (e.g. 199).
            </p>
          </div>
          <Input
            placeholder="Phone (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
          />
          {err && <p className="text-xs text-red-600">{err}</p>}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Saving…" : editing ? "Save" : "Create"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
