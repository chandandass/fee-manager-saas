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
import {
  MessageCircle,
  Phone,
  Pencil,
  ChevronDown,
  ChevronUp,
  Check,
  Clock,
} from "lucide-react";
import { whatsappService } from "@/infrastructure/whatsapp/WhatsAppService";

const repos = createRepositories();
const manageFees = new ManageFees(repos.fees);

function isSnoozed(fee: FeeRecord): boolean {
  if (!fee.snoozedUntil) return false;
  return fee.snoozedUntil > new Date().toISOString().slice(0, 10);
}

export default function FeesPage() {
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [filter, setFilter] = useState<"pending" | "snoozed" | "paid" | "all">(
    "pending"
  );
  const [loading, setLoading] = useState(true);
  const [partialFeeId, setPartialFeeId] = useState<string | null>(null);
  const [editFee, setEditFee] = useState<FeeRecord | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [snoozeMenuId, setSnoozeMenuId] = useState<string | null>(null);

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
      if (filter === "pending") return f.status !== "paid" && !isSnoozed(f);
      if (filter === "snoozed") return f.status !== "paid" && isSnoozed(f);
      if (filter === "paid") return f.status === "paid";
      return true;
    })
    .sort((a, b) => {
      if (a.status === "paid" && b.status !== "paid") return 1;
      if (a.status !== "paid" && b.status === "paid") return -1;
      return getDaysPending(b.month) - getDaysPending(a.month);
    });

  async function markFullPaid(fee: FeeRecord) {
    await manageFees.recordPayment(fee.id, fee.amount);
    setPartialFeeId(null);
    setSnoozeMenuId(null);
    load();
  }

  function togglePartial(fee: FeeRecord) {
    if (partialFeeId === fee.id) {
      setPartialFeeId(null);
      setPayAmount("");
      return;
    }
    setSnoozeMenuId(null);
    setPartialFeeId(fee.id);
    const remaining = fee.amount - fee.paidAmount;
    setPayAmount(remaining > 0 ? String(remaining) : "");
  }

  function closePartial() {
    setPartialFeeId(null);
    setPayAmount("");
  }

  function openEdit(fee: FeeRecord) {
    setEditFee(fee);
    setPayAmount(String(fee.paidAmount));
  }

  async function savePartial(fee: FeeRecord, e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(payAmount);
    if (isNaN(amount) || amount <= 0) return;
    const newTotal = Math.min(fee.amount, fee.paidAmount + amount);
    await manageFees.recordPayment(fee.id, newTotal);
    closePartial();
    load();
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editFee) return;
    const amount = Number(payAmount);
    if (isNaN(amount) || amount < 0) return;
    await manageFees.recordPayment(
      editFee.id,
      Math.min(editFee.amount, amount)
    );
    setEditFee(null);
    setPayAmount("");
    load();
  }

  async function doSnooze(fee: FeeRecord, days: number) {
    await manageFees.snooze(fee.id, days);
    setSnoozeMenuId(null);
    setPartialFeeId(null);
    load();
  }

  async function unsnooze(fee: FeeRecord) {
    await manageFees.clearSnooze(fee.id);
    load();
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

  const activePending = fees.filter(
    (f) => f.status !== "paid" && !isSnoozed(f)
  );
  const snoozedCount = fees.filter(
    (f) => f.status !== "paid" && isSnoozed(f)
  ).length;
  const pendingAmount = activePending.reduce(
    (s, f) => s + (f.amount - f.paidAmount),
    0
  );

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="Fees"
        subtitle={
          activePending.length > 0
            ? activePending.length +
              " need attention · " +
              formatCurrency(pendingAmount)
            : "All clear"
        }
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ["pending", "Needs attention"],
            ["snoozed", "Snoozed"],
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
            {key === "pending" && activePending.length > 0
              ? " (" + activePending.length + ")"
              : ""}
            {key === "snoozed" && snoozedCount > 0
              ? " (" + snoozedCount + ")"
              : ""}
          </button>
        ))}
      </div>

      <Modal
        open={!!editFee}
        onClose={() => {
          setEditFee(null);
          setPayAmount("");
        }}
        title="Edit payment"
      >
        {editFee && (
          <form onSubmit={saveEdit} className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-3 text-sm">
              <p className="font-medium text-slate-900">{editFee.studentName}</p>
              <p className="text-slate-500 mt-0.5">
                Monthly fee: {formatCurrency(editFee.amount)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Total paid for this month (₹)
              </label>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={editFee.amount}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-slate-500 mt-1.5">
                Set 0 if marked paid by mistake.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setPayAmount("0")}
              >
                Mark unpaid
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
          title={
            filter === "pending"
              ? "Nothing needs attention"
              : filter === "snoozed"
              ? "No snoozed fees"
              : "No fee records"
          }
          description={
            filter === "pending"
              ? "Sab clear — or check Snoozed if you hid some."
              : filter === "snoozed"
              ? "Snoozed items come back after the date you chose."
              : "Fee records will appear once students are added."
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((fee) => {
            const due = fee.amount - fee.paidAmount;
            const days = getDaysPending(fee.month);
            const phone = phoneMap[fee.studentId] || "";
            const showPartial = partialFeeId === fee.id;
            const showSnooze = snoozeMenuId === fee.id;
            const snoozed = isSnoozed(fee);

            return (
              <div key={fee.id}>
                <Card
                  className={
                    "!p-4 " +
                    (showPartial || showSnooze
                      ? "!rounded-b-none border-b-0"
                      : "")
                  }
                >
                  {/* Top: name left · snooze + status right */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">
                        {fee.studentName}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {fee.month}
                        {fee.status !== "paid" && days > 0 && !snoozed && (
                          <span className="text-red-600 font-medium">
                            {" · "}{daysPendingLabel(days)}
                          </span>
                        )}
                        {snoozed && fee.snoozedUntil && (
                          <span className="text-amber-600 font-medium">
                            {" · "}snoozed till{" "}
                            {new Date(fee.snoozedUntil).toLocaleDateString(
                              "en-IN",
                              { day: "numeric", month: "short" }
                            )}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Snooze: left of status (only for active pending) */}
                      {fee.status !== "paid" && !snoozed && (
                        <button
                          type="button"
                          onClick={() => {
                            setPartialFeeId(null);
                            setSnoozeMenuId(showSnooze ? null : fee.id);
                          }}
                          className={
                            "w-8 h-8 rounded-lg flex items-center justify-center transition " +
                            (showSnooze
                              ? "bg-amber-100 text-amber-700"
                              : "text-slate-400 hover:bg-slate-100 hover:text-slate-600")
                          }
                          title="Snooze / later"
                          aria-label="Snooze"
                        >
                          <Clock size={16} />
                        </button>
                      )}
                      <Badge variant={statusVariant(fee.status)}>
                        {fee.status === "paid"
                          ? "Paid"
                          : fee.status === "partial"
                          ? "Partial"
                          : "Pending"}
                      </Badge>
                    </div>
                  </div>

                  {/* Amount + primary actions */}
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
                      {fee.status !== "paid" && phone && !snoozed && (
                        <>
                          <IconButton
                            href={
                              "tel:+91" + phone.replace(/\D/g, "").slice(-10)
                            }
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
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openEdit(fee)}
                        >
                          <Pencil size={14} />
                          Edit
                        </Button>
                      ) : snoozed ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => unsnooze(fee)}
                        >
                          Bring back
                        </Button>
                      ) : (
                        <div className="flex">
                          <Button
                            size="sm"
                            onClick={() => markFullPaid(fee)}
                            className="rounded-r-none"
                          >
                            <Check size={15} />
                            Paid
                          </Button>
                          <button
                            type="button"
                            onClick={() => togglePartial(fee)}
                            className={
                              "px-2.5 rounded-r-xl flex items-center border-l border-blue-500 " +
                              (showPartial
                                ? "bg-blue-700 text-white"
                                : "bg-blue-600 text-white hover:bg-blue-700")
                            }
                            title="Partial payment"
                          >
                            {showPartial ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {showSnooze && (
                  <div className="bg-amber-50 border border-t-0 border-amber-100 rounded-b-2xl px-4 py-3">
                    <p className="text-xs text-slate-600 mb-2">
                      Hide from “Needs attention” for a while
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => doSnooze(fee, 3)}
                      >
                        3 days
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => doSnooze(fee, 7)}
                      >
                        1 week
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSnoozeMenuId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {showPartial && (
                  <div className="bg-blue-50/80 border border-t-0 border-blue-100 rounded-b-2xl px-4 py-3">
                    <form
                      onSubmit={(e) => savePartial(fee, e)}
                      className="space-y-2"
                    >
                      <p className="text-xs text-slate-600">
                        Partial · remaining {formatCurrency(due)}
                      </p>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={due}
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          placeholder="₹ amount"
                          className="flex-1 bg-white"
                          autoFocus
                        />
                        <Button type="submit" size="sm">
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={closePartial}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
