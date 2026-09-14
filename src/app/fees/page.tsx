"use client";

import { useEffect, useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  EmptyState,
  IconButton,
  Modal,
  Input,
} from "@/presentation/components/ui";
import { formatCurrency, getDaysPending, daysPendingLabel } from "@/lib/utils";
import { createRepositories } from "@/infrastructure/supabase/InMemoryStore";
import { ManageFees } from "@/domain/use-cases/ManageFees";
import { FeeRecord, Student } from "@/domain/entities/Student";
import { MessageCircle, Phone, Pencil } from "lucide-react";
import { whatsappService } from "@/infrastructure/whatsapp/WhatsAppService";

const repos = createRepositories();
const manageFees = new ManageFees(repos.fees);

export default function FeesPage() {
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "paid">("pending");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<FeeRecord | null>(null);
  const [payAmount, setPayAmount] = useState("");

  async function load() {
    const [all, studs] = await Promise.all([
      manageFees.list(),
      repos.students.getAll(),
    ]);
    setFees(all);
    setStudents(studs);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const phoneMap = Object.fromEntries(students.map((s) => [s.id, s.phone]));

  const filtered = fees
    .filter((f) => {
      if (filter === "pending") return f.status !== "paid";
      if (filter === "paid") return f.status === "paid";
      return true;
    })
    .sort((a, b) => {
      if (a.status === "paid" && b.status !== "paid") return 1;
      if (a.status !== "paid" && b.status === "paid") return -1;
      return getDaysPending(b.month) - getDaysPending(a.month);
    });

  function openPayment(fee: FeeRecord) {
    setEditing(fee);
    // Pre-fill with remaining due (or full amount if already paid, for edit)
    const remaining = fee.amount - fee.paidAmount;
    setPayAmount(String(remaining > 0 ? remaining : fee.amount));
  }

  async function savePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const entered = Number(payAmount);
    if (isNaN(entered) || entered < 0) return;

    // User enters "amount received now" OR we treat as total paid?
    // UX: field = "Total paid so far" is clearer for corrections.
    // But teachers think "I received X today".
    // Simple approach: field labeled "Amount paid (total for this month)"
    // Pre-filled with remaining for new, or current paid for edit.
    // Actually better: "How much has been paid in total for this month?"
    const totalPaid =
      editing.paidAmount > 0 && editing.status === "paid"
        ? entered
        : editing.paidAmount + entered;

    // If opening from pending with remaining pre-filled, entered = remaining means full pay.
    // If they change to smaller number, it's partial of the remaining → total = paidAmount + entered.
    // If editing already paid, pre-fill full amount, they can lower it.

    let newTotal: number;
    if (editing.status === "paid" || editing.paidAmount === 0) {
      // Fresh or full edit: treat input as total paid
      newTotal = Math.min(editing.amount, entered);
    } else {
      // Partial already: pre-filled remaining; input is "extra received now"
      // Simpler unified UX: always treat field as TOTAL paid for the month
      newTotal = Math.min(editing.amount, entered);
    }

    // Unified: always "Total amount paid for this month"
    newTotal = Math.min(editing.amount, Math.max(0, entered));

    await manageFees.recordPayment(editing.id, newTotal);
    setEditing(null);
    setPayAmount("");
    load();
  }

  function openEdit(fee: FeeRecord) {
    setEditing(fee);
    setPayAmount(String(fee.paidAmount));
  }

  const statusVariant = (s: FeeRecord["status"]) =>
    s === "paid" ? "success" : s === "partial" ? "warning" : "danger";

  if (loading) {
    return (
      <div className="p-4 animate-pulse space-y-3">
        <div className="h-8 bg-slate-200 rounded w-32" />
        <div className="h-24 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  const pendingCount = fees.filter((f) => f.status !== "paid").length;
  const pendingAmount = fees
    .filter((f) => f.status !== "paid")
    .reduce((s, f) => s + (f.amount - f.paidAmount), 0);

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="Fees"
        subtitle={
          pendingCount > 0
            ? pendingCount + " pending · " + formatCurrency(pendingAmount)
            : "All clear this month"
        }
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ["pending", "Pending"],
            ["paid", "Paid"],
            ["all", "All"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={
              filter === key
                ? "px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition bg-blue-600 text-white"
                : "px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition bg-white border border-slate-200 text-slate-600"
            }
          >
            {label}
            {key === "pending" && pendingCount > 0 ? " (" + pendingCount + ")" : ""}
          </button>
        ))}
      </div>

      {/* Payment modal */}
      <Modal
        open={!!editing}
        onClose={() => {
          setEditing(null);
          setPayAmount("");
        }}
        title={editing?.status === "paid" ? "Edit payment" : "Record payment"}
      >
        {editing && (
          <form onSubmit={savePayment} className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-3 text-sm">
              <p className="font-medium text-slate-900">{editing.studentName}</p>
              <p className="text-slate-500 mt-0.5">
                Monthly fee: {formatCurrency(editing.amount)}
              </p>
              {editing.paidAmount > 0 && (
                <p className="text-slate-500">
                  Already paid: {formatCurrency(editing.paidAmount)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Total paid for this month (₹)
              </label>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={editing.amount}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="0"
                autoFocus
              />
              <p className="text-xs text-slate-500 mt-1.5">
                Enter full amount for complete payment, or less for partial.
                Set 0 if marked by mistake.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setPayAmount(String(editing.amount))}
              >
                Full {formatCurrency(editing.amount)}
              </Button>
              <Button type="submit" className="flex-1">
                Save
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {filtered.length === 0 ? (
        <EmptyState
          title={filter === "pending" ? "No pending fees" : "No fee records"}
          description={
            filter === "pending"
              ? "Sab fees clear hain. Great!"
              : "Fee records will appear once students are added."
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((fee) => {
            const due = fee.amount - fee.paidAmount;
            const days = getDaysPending(fee.month);
            const phone = phoneMap[fee.studentId] || "";

            return (
              <Card key={fee.id} className="!p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {fee.studentName}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {fee.month}
                      {fee.status !== "paid" && days > 0 && (
                        <span className="text-red-600 font-medium">
                          {" · "}{daysPendingLabel(days)}
                        </span>
                      )}
                    </p>
                  </div>
                  <Badge variant={statusVariant(fee.status)}>
                    {fee.status === "paid"
                      ? "Paid"
                      : fee.status === "partial"
                      ? "Partial"
                      : "Pending"}
                  </Badge>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatCurrency(due > 0 ? due : fee.amount)}
                    </p>
                    {fee.paidAmount > 0 && fee.status !== "paid" && (
                      <p className="text-xs text-slate-500">
                        of {formatCurrency(fee.amount)} · paid{" "}
                        {formatCurrency(fee.paidAmount)}
                      </p>
                    )}
                    {fee.status === "paid" && (
                      <p className="text-xs text-slate-500">Fully paid</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {fee.status !== "paid" && phone && (
                      <>
                        <IconButton
                          href={"tel:+91" + phone.replace(/\D/g, "").slice(-10)}
                          variant="call"
                          title="Call"
                        >
                          <Phone size={18} />
                        </IconButton>
                        <IconButton
                          onClick={() =>
                            whatsappService.openReminder({
                              phone,
                              studentName: fee.studentName,
                              amount: due,
                              month: fee.month,
                              instituteName: "Sharma Tuition Centre",
                            })
                          }
                          variant="whatsapp"
                          title="WhatsApp reminder"
                        >
                          <MessageCircle size={18} />
                        </IconButton>
                      </>
                    )}
                    {fee.status === "paid" ? (
                      <Button size="sm" variant="secondary" onClick={() => openEdit(fee)}>
                        <Pencil size={14} />
                        Edit
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => openPayment(fee)}>
                        Record
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
