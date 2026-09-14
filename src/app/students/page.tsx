"use client";

import { useEffect, useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  EmptyState,
  Modal,
  IconButton,
} from "@/presentation/components/ui";
import { formatCurrency } from "@/lib/utils";
import { createRepositories } from "@/infrastructure/supabase/InMemoryStore";
import { ManageStudents } from "@/domain/use-cases/ManageStudents";
import { Student, Batch } from "@/domain/entities/Student";
import { Plus, Search, Phone, MessageCircle } from "lucide-react";

const repos = createRepositories();
const manageStudents = new ManageStudents(repos.students);

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    parentPhone: "",
    batchId: "",
    monthlyFee: "",
  });
  const [loading, setLoading] = useState(true);

  async function load() {
    const [s, b] = await Promise.all([
      manageStudents.list(),
      repos.batches.getAll(),
    ]);
    setStudents(s);
    setBatches(b);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search)
  );

  function onBatchChange(batchId: string) {
    const batch = batches.find((b) => b.id === batchId);
    setForm((prev) => ({
      ...prev,
      batchId,
      monthlyFee: batch ? String(batch.monthlyFeeDefault) : prev.monthlyFee,
    }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.phone || !form.batchId) return;
    await manageStudents.create({
      name: form.name.trim(),
      phone: form.phone.trim(),
      parentPhone: form.parentPhone || undefined,
      batchId: form.batchId,
      monthlyFee: Number(form.monthlyFee) || 0,
      joinedAt: new Date().toISOString().slice(0, 10),
      isActive: true,
    });
    setForm({ name: "", phone: "", parentPhone: "", batchId: "", monthlyFee: "" });
    setShowForm(false);
    load();
  }

  function batchName(id: string) {
    return batches.find((b) => b.id === id)?.name || "—";
  }

  if (loading) {
    return (
      <div className="p-4 animate-pulse space-y-3">
        <div className="h-8 bg-slate-200 rounded w-40" />
        <div className="h-20 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="Students"
        subtitle={students.length + " total"}
        action={
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus size={16} />
            Add
          </Button>
        }
      />

      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <Input
          placeholder="Search name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Student">
        <form onSubmit={handleCreate} className="space-y-3">
          <Input
            placeholder="Student name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            placeholder="Phone *"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
            inputMode="tel"
          />
          <Input
            placeholder="Parent phone (optional)"
            value={form.parentPhone}
            onChange={(e) => setForm({ ...form, parentPhone: e.target.value })}
            inputMode="tel"
          />
          <Select
            value={form.batchId}
            onChange={(e) => onBatchChange(e.target.value)}
            required
          >
            <option value="">Select batch *</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({formatCurrency(b.monthlyFeeDefault)}/mo)
              </option>
            ))}
          </Select>
          <div>
            <Input
              type="number"
              placeholder="Monthly fee (₹)"
              value={form.monthlyFee}
              onChange={(e) => setForm({ ...form, monthlyFee: e.target.value })}
            />
            <p className="text-xs text-slate-500 mt-1">
              Auto-filled from batch. Change if this student pays differently.
            </p>
          </div>
          <Button type="submit" className="w-full" size="lg">
            Save Student
          </Button>
        </form>
      </Modal>

      {filtered.length === 0 ? (
        <EmptyState
          title="No students yet"
          description="Add your first student to start tracking fees."
          action={
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus size={16} /> Add Student
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <Card key={s.id} className="!p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{s.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {batchName(s.batchId)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{s.phone}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <p className="text-sm font-semibold">
                    {formatCurrency(s.monthlyFee)}
                  </p>
                  <div className="flex gap-1.5">
                    <IconButton
                      href={"tel:+91" + s.phone.replace(/\D/g, "").slice(-10)}
                      variant="call"
                      title="Call"
                    >
                      <Phone size={16} />
                    </IconButton>
                    <IconButton
                      href={
                        "https://wa.me/91" +
                        s.phone.replace(/\D/g, "").slice(-10)
                      }
                      variant="whatsapp"
                      title="WhatsApp"
                    >
                      <MessageCircle size={16} />
                    </IconButton>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
