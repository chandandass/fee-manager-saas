"use client";

import { useEffect, useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Input,
  Select,
  EmptyState,
} from "@/presentation/components/ui";
import { formatCurrency } from "@/lib/utils";
import { createRepositories } from "@/infrastructure/supabase/InMemoryStore";
import { ManageStudents } from "@/domain/use-cases/ManageStudents";
import { Student, Batch } from "@/domain/entities/Student";
import { Plus, Search, Phone } from "lucide-react";

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
        <div className="h-20 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="Students"
        subtitle={`${students.length} total`}
        action={
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
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

      {showForm && (
        <Card>
          <form onSubmit={handleCreate} className="space-y-3">
            <h3 className="font-medium text-sm">New Student</h3>
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
            />
            <Input
              placeholder="Parent phone (optional)"
              value={form.parentPhone}
              onChange={(e) => setForm({ ...form, parentPhone: e.target.value })}
            />
            <Select
              value={form.batchId}
              onChange={(e) => setForm({ ...form, batchId: e.target.value })}
              required
            >
              <option value="">Select batch *</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
            <Input
              type="number"
              placeholder="Monthly fee (₹)"
              value={form.monthlyFee}
              onChange={(e) => setForm({ ...form, monthlyFee: e.target.value })}
            />
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Save
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

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
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{s.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {batchName(s.batchId)}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                    <Phone size={12} />
                    {s.phone}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">
                    {formatCurrency(s.monthlyFee)}
                  </p>
                  <Badge variant={s.isActive ? "success" : "default"}>
                    {s.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
