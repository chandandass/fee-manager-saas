"use client";

import { useEffect, useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Input,
  EmptyState,
  Modal,
} from "@/presentation/components/ui";
import { formatCurrency } from "@/lib/utils";
import { createRepositories } from "@/infrastructure/supabase/InMemoryStore";
import { Batch } from "@/domain/entities/Student";
import { Plus, Users, Pencil } from "lucide-react";

const repos = createRepositories();

const emptyForm = {
  name: "",
  subject: "",
  schedule: "",
  monthlyFeeDefault: "",
};

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Batch | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  async function load() {
    const b = await repos.batches.getAll();
    setBatches(b);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(b: Batch) {
    setEditing(b);
    setForm({
      name: b.name,
      subject: b.subject || "",
      schedule: b.schedule || "",
      monthlyFeeDefault: String(b.monthlyFeeDefault),
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
    if (!form.name) return;
    const data = {
      name: form.name.trim(),
      subject: form.subject || undefined,
      schedule: form.schedule || undefined,
      monthlyFeeDefault: Number(form.monthlyFeeDefault) || 0,
    };
    if (editing) {
      await repos.batches.update(editing.id, data);
    } else {
      await repos.batches.create({
        ...data,
        isActive: true,
      });
    }
    closeForm();
    load();
  }

  if (loading) {
    return (
      <div className="p-4 animate-pulse space-y-3">
        <div className="h-8 bg-slate-200 rounded w-40" />
        <div className="h-24 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="Batches"
        subtitle={batches.length + " batches"}
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus size={16} />
            Add
          </Button>
        }
      />

      <Modal
        open={showForm}
        onClose={closeForm}
        title={editing ? "Edit Batch" : "Add Batch"}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            placeholder="Batch name * (e.g. Class 10 Maths)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            placeholder="Subject"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
          <Input
            placeholder="Schedule (e.g. Mon Wed Fri 5-6 PM)"
            value={form.schedule}
            onChange={(e) => setForm({ ...form, schedule: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Default monthly fee (₹)"
            value={form.monthlyFeeDefault}
            onChange={(e) =>
              setForm({ ...form, monthlyFeeDefault: e.target.value })
            }
          />
          <Button type="submit" className="w-full" size="lg">
            {editing ? "Save changes" : "Save Batch"}
          </Button>
        </form>
      </Modal>

      {batches.length === 0 ? (
        <EmptyState
          title="No batches yet"
          description="Create a batch first, then add students to it."
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus size={16} /> Create Batch
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {batches.map((b) => (
            <Card key={b.id} className="!p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{b.name}</p>
                  {b.subject && (
                    <p className="text-xs text-slate-500 mt-0.5">{b.subject}</p>
                  )}
                  {b.schedule && (
                    <p className="text-xs text-slate-500 mt-1">{b.schedule}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(b)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200"
                    title="Edit"
                  >
                    <Pencil size={15} />
                  </button>
                  <Badge variant={b.isActive ? "success" : "default"}>
                    {b.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-sm text-slate-600">
                  <Users size={14} />
                  {b.studentCount} students
                </div>
                <p className="text-sm font-semibold">
                  {formatCurrency(b.monthlyFeeDefault)}/mo
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
