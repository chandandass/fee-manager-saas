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
import { formatCurrency, dayOfMonthLabel } from "@/lib/utils";
import { createRepositories } from "@/infrastructure/supabase/InMemoryStore";
import { ManageStudents } from "@/domain/use-cases/ManageStudents";
import { Student, Batch } from "@/domain/entities/Student";
import { Plus, Search, Phone, MessageCircle, Pencil } from "lucide-react";
import { useSubscription } from "@/presentation/hooks/useSubscription";
import {
  BlurLockRow,
  LockedRowsHint,
  PlanExpiredBanner,
} from "@/presentation/components/SubscriptionGate";

const repos = createRepositories();
const manageStudents = new ManageStudents(repos.students);
const PREVIEW_COUNT = 3;

const defaultFeeDay = Math.min(28, new Date().getDate());

const emptyForm = {
  name: "",
  phone: "",
  parentPhone: "",
  batchId: "",
  monthlyFee: "",
  feeStartDay: String(defaultFeeDay),
};

export default function StudentsPage() {
  const { active: planActive, loading: subLoading } = useSubscription();
  const locked = !subLoading && !planActive;

  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState(emptyForm);
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
      monthlyFee:
        !editing && batch
          ? String(batch.monthlyFeeDefault)
          : batch && !prev.monthlyFee
          ? String(batch.monthlyFeeDefault)
          : prev.monthlyFee,
    }));
  }

  function openCreate() {
    if (locked) return;
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(s: Student) {
    if (locked) return;
    setEditing(s);
    setForm({
      name: s.name,
      phone: s.phone,
      parentPhone: s.parentPhone || "",
      batchId: s.batchId,
      monthlyFee: String(s.monthlyFee),
      feeStartDay: String(s.feeStartDay || 1),
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;
    if (!form.name || !form.phone || !form.batchId) return;
    const feeStartDay = Math.min(
      28,
      Math.max(1, Number(form.feeStartDay) || defaultFeeDay)
    );
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      parentPhone: form.parentPhone || undefined,
      batchId: form.batchId,
      monthlyFee: Number(form.monthlyFee) || 0,
      feeStartDay,
    };

    if (editing) {
      await manageStudents.update(editing.id, payload);
    } else {
      await manageStudents.create({
        ...payload,
        joinedAt: new Date().toISOString().slice(0, 10),
        isActive: true,
      });
    }
    closeForm();
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
          <Button size="sm" onClick={openCreate} disabled={locked}>
            <Plus size={16} />
            Add
          </Button>
        }
      />

      <PlanExpiredBanner show={locked} />

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

      <Modal
        open={showForm}
        onClose={closeForm}
        title={editing ? "Edit Student" : "Add Student"}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
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
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Fee due every month on
            </label>
            <Select
              value={form.feeStartDay}
              onChange={(e) =>
                setForm({ ...form, feeStartDay: e.target.value })
              }
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={String(d)}>
                  {dayOfMonthLabel(d)}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" className="w-full" size="lg">
            {editing ? "Save changes" : "Save Student"}
          </Button>
        </form>
      </Modal>

      {filtered.length === 0 ? (
        <EmptyState
          title="No students yet"
          description="Add your first student to start tracking fees."
          action={
            <Button size="sm" onClick={openCreate} disabled={locked}>
              <Plus size={16} /> Add Student
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((s, index) => {
            const rowLocked = locked && index >= PREVIEW_COUNT;
            const card = (
              <Card key={s.id} className="!p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{s.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {batchName(s.batchId)}
                      {" · Fee on "}{dayOfMonthLabel(s.feeStartDay || 1)}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{s.phone}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <p className="text-sm font-semibold">
                      {formatCurrency(s.monthlyFee)}
                    </p>
                    {!rowLocked && (
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(s)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <IconButton
                          href={
                            "tel:+91" + s.phone.replace(/\D/g, "").slice(-10)
                          }
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
                    )}
                  </div>
                </div>
              </Card>
            );
            return (
              <BlurLockRow key={s.id} locked={rowLocked}>
                {card}
              </BlurLockRow>
            );
          })}
          <LockedRowsHint show={locked && filtered.length > PREVIEW_COUNT} />
        </div>
      )}
    </div>
  );
}
