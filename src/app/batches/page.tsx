"use client";

import { useEffect, useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Input,
  EmptyState,
} from "@/presentation/components/ui";
import { formatCurrency } from "@/lib/utils";
import { createRepositories } from "@/infrastructure/supabase/InMemoryStore";
import { Batch } from "@/domain/entities/Student";
import { Plus, Users } from "lucide-react";

const repos = createRepositories();

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    subject: "",
    schedule: "",
    monthlyFeeDefault: "",
  });
  const [loading, setLoading] = useState(true);

  async function load() {
    const b = await repos.batches.getAll();
    setBatches(b);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    await repos.batches.create({
      name: form.name.trim(),
      subject: form.subject || undefined,
      schedule: form.schedule || undefined,
      monthlyFeeDefault: Number(form.monthlyFeeDefault) || 0,
      isActive: true,
    });
    setForm({ name: "", subject: "", schedule: "", monthlyFeeDefault: "" });
    setShowForm(false);
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
        subtitle={`${batches.length} batches`}
        action={
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} />
            Add
          </Button>
        }
      />

      {showForm && (
        <Card>
          <form onSubmit={handleCreate} className="space-y-3">
            <h3 className="font-medium text-sm">New Batch</h3>
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

      {batches.length === 0 ? (
        <EmptyState
          title="No batches yet"
          description="Create a batch first, then add students to it."
          action={
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus size={16} /> Create Batch
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {batches.map((b) => (
            <Card key={b.id} className="!p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{b.name}</p>
                  {b.subject && (
                    <p className="text-xs text-slate-500 mt-0.5">{b.subject}</p>
                  )}
                  {b.schedule && (
                    <p className="text-xs text-slate-500 mt-1">{b.schedule}</p>
                  )}
                </div>
                <Badge variant={b.isActive ? "success" : "default"}>
                  {b.isActive ? "Active" : "Inactive"}
                </Badge>
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
