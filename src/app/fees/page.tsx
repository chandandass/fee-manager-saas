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

type StudentFeeGroup = {
  studentId: string;
  studentName: string;
  phone: string;
  feeStartDay: number;
  fees: FeeRecord[];
  totalDue: number;
  maxDays: number;
};

export default function FeesPage() {
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [filter, setFilter] = useState<"pending" | "snoozed" | "paid" | "all">(
    "pending"
  );
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
  const feeDayMap = Object.fromEntries(
    students.map((s) => [s.id, s.feeStartDay || 1])
  );

  function daysFor(fee: FeeRecord) {
    return getDaysPending(fee.month, feeDayMap[fee.studentId] || 1);
  }

  const filteredFees = fees.filter((f) => {
    if (filter === "pending") return f.status !== "paid" && !isSnoozed(f);
    if (filter === "snoozed") return f.status !== "paid" && isSnoozed(f);
    if (filter === "paid") return f.status === "paid";
    return true;
  });

  /** One card per student when pending/snoozed; paid/all can stay flatter but still grouped */
  const groups: StudentFeeGroup[] = Object.values(
    filteredFees.reduce<Record<string, StudentFeeGroup>>((acc, fee) => {
      if (!acc[fee.studentId]) {
        acc[fee.studentId] = {
          studentId: fee.studentId,
          studentName: fee.studentName,
          phone: phoneMap[fee.studentId] || "",
          feeStartDay: feeDayMap[fee.studentId] || 1,
          fees: [],
          totalDue: 0,
          maxDays: 0,
        };
      }
      const due = fee.amount - fee.paidAmount;
      acc[fee.studentId].fees.push(fee);
      if (fee.status !== "paid") {
        acc[fee.studentId].totalDue += due;
        acc[fee.studentId].maxDays = Math.max(
          acc[fee.studentId].maxDays,
          daysFor(fee)
        );
      }
      return acc;
    }, {})
  )
    .map((g) => ({
      ...g,
      fees: g.fees.sort((a, b) => a.month.localeCompare(b.month)),
    }))
    .sort((a, b) => b.maxDays - a.maxDays || b.totalDue - a.totalDue);

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

  async function snoozeAllPending(group: StudentFeeGroup, days: number) {
    for (const fee of group.fees) {
      if (fee.status !== "paid" && !isSnoozed(fee)) {
        await manageFees.snooze(fee.id, days);
      }
    }
    setSnoozeMenuId(null);
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
              " months · " +
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
                {editFee.month} · {formatCurrency(editFee.amount)}
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

      {groups.length === 0 ? (
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
          {groups.map((group) => {
            const multi = group.fees.length > 1;
            const expanded = expandedId === group.studentId || !multi;
            const showSnoozeAll = snoozeMenuId === "all-" + group.studentId;
            const unpaidFees = group.fees.filter((f) => f.status !== "paid");

            return (
              <div key={group.studentId}>
                <Card
                  className={
                    "!p-4 " +
                    (showSnoozeAll || (expanded && multi)
                      ? "!rounded-b-none border-b-0"
                      : "")
                  }
                >
                  {/* Student header — always one row per student */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">
                        {group.studentName}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {multi
                          ? group.fees.length +
                            " months" +
                            (group.maxDays > 0
                              ? " · oldest " + daysPendingLabel(group.maxDays)
                              : "")
                          : group.fees[0].month +
                            (group.maxDays > 0
                              ? " · " + daysPendingLabel(group.maxDays)
                              : group.fees[0].status !== "paid"
                              ? " · not due yet"
                              : "")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {filter === "pending" && unpaidFees.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setSnoozeMenuId(
                              showSnoozeAll ? null : "all-" + group.studentId
                            )
                          }
                          className={
                            "w-8 h-8 rounded-lg flex items-center justify-center transition " +
                            (showSnoozeAll
                              ? "bg-amber-100 text-amber-700"
                              : "text-slate-400 hover:bg-slate-100")
                          }
                          title="Snooze"
                        >
                          <Clock size={16} />
                        </button>
                      )}
                      {multi && (
                        <Badge variant="warning">{group.fees.length} mo</Badge>
                      )}
                      {!multi && (
                        <Badge variant={statusVariant(group.fees[0].status)}>
                          {group.fees[0].status === "paid"
                            ? "Paid"
                            : group.fees[0].status === "partial"
                            ? "Partial"
                            : "Pending"}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">
                        {formatCurrency(
                          group.totalDue > 0
                            ? group.totalDue
                            : group.fees[0].amount
                        )}
                      </p>
                      {multi && group.totalDue > 0 && (
                        <p className="text-xs text-slate-500">
                          total outstanding
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {group.phone && group.totalDue > 0 && (
                        <>
                          <IconButton
                            href={
                              "tel:+91" +
                              group.phone.replace(/\D/g, "").slice(-10)
                            }
                            variant="call"
                            title="Call"
                          >
                            <Phone size={18} />
                          </IconButton>
                          <IconButton
                            onClick={() =>
                              whatsappService.openReminder({
                                phone: group.phone,
                                studentName: group.studentName,
                                amount: group.totalDue,
                                month: multi
                                  ? group.fees.length + " months"
                                  : group.fees[0].month,
                                instituteName: "Sharma Tuition Centre",
                              })
                            }
                            variant="whatsapp"
                            title="WhatsApp"
                          >
                            <MessageCircle size={18} />
                          </IconButton>
                        </>
                      )}

                      {multi ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            setExpandedId(
                              expandedId === group.studentId
                                ? null
                                : group.studentId
                            )
                          }
                        >
                          {expandedId === group.studentId ? (
                            <>
                              <ChevronUp size={16} /> Hide
                            </>
                          ) : (
                            <>
                              <ChevronDown size={16} /> Months
                            </>
                          )}
                        </Button>
                      ) : group.fees[0].status === "paid" ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openEdit(group.fees[0])}
                        >
                          <Pencil size={14} />
                          Edit
                        </Button>
                      ) : isSnoozed(group.fees[0]) ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => unsnooze(group.fees[0])}
                        >
                          Bring back
                        </Button>
                      ) : (
                        <div className="flex">
                          <Button
                            size="sm"
                            onClick={() => markFullPaid(group.fees[0])}
                            className="rounded-r-none"
                          >
                            <Check size={15} />
                            Paid
                          </Button>
                          <button
                            type="button"
                            onClick={() => togglePartial(group.fees[0])}
                            className={
                              "px-2.5 rounded-r-xl flex items-center border-l border-blue-500 " +
                              (partialFeeId === group.fees[0].id
                                ? "bg-blue-700 text-white"
                                : "bg-blue-600 text-white hover:bg-blue-700")
                            }
                          >
                            {partialFeeId === group.fees[0].id ? (
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

                {/* Snooze all months for this student */}
                {showSnoozeAll && (
                  <div className="bg-amber-50 border border-t-0 border-amber-100 px-4 py-3 rounded-b-2xl">
                    <p className="text-xs text-slate-600 mb-2">
                      Hide all pending months for this student
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => snoozeAllPending(group, 3)}
                      >
                        3 days
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => snoozeAllPending(group, 7)}
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

                {/* Single-month partial expand */}
                {!multi && partialFeeId === group.fees[0].id && (
                  <div className="bg-blue-50/80 border border-t-0 border-blue-100 rounded-b-2xl px-4 py-3">
                    <form
                      onSubmit={(e) => savePartial(group.fees[0], e)}
                      className="space-y-2"
                    >
                      <p className="text-xs text-slate-600">
                        Partial · remaining{" "}
                        {formatCurrency(
                          group.fees[0].amount - group.fees[0].paidAmount
                        )}
                      </p>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={1}
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

                {/* Multi-month breakdown */}
                {multi && expanded && !showSnoozeAll && (
                  <div className="border border-t-0 border-slate-200 rounded-b-2xl overflow-hidden bg-slate-50/80">
                    {group.fees.map((fee, idx) => {
                      const due = fee.amount - fee.paidAmount;
                      const days = daysFor(fee);
                      const showPartial = partialFeeId === fee.id;
                      const isLast = idx === group.fees.length - 1;

                      return (
                        <div
                          key={fee.id}
                          className={
                            "px-4 py-3 " +
                            (!isLast ? "border-b border-slate-100" : "")
                          }
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800">
                                {fee.month}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatCurrency(due > 0 ? due : fee.amount)}
                                {fee.status === "paid"
                                  ? " · paid"
                                  : days > 0
                                  ? " · " + daysPendingLabel(days)
                                  : fee.status === "partial"
                                  ? " · partial"
                                  : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Badge variant={statusVariant(fee.status)}>
                                {fee.status === "paid"
                                  ? "Paid"
                                  : fee.status === "partial"
                                  ? "Partial"
                                  : "Pending"}
                              </Badge>
                              {fee.status === "paid" ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openEdit(fee)}
                                >
                                  <Pencil size={14} />
                                </Button>
                              ) : isSnoozed(fee) ? (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => unsnooze(fee)}
                                >
                                  Back
                                </Button>
                              ) : (
                                <div className="flex">
                                  <Button
                                    size="sm"
                                    onClick={() => markFullPaid(fee)}
                                    className="rounded-r-none"
                                  >
                                    <Check size={14} />
                                    Paid
                                  </Button>
                                  <button
                                    type="button"
                                    onClick={() => togglePartial(fee)}
                                    className={
                                      "px-2 rounded-r-xl flex items-center border-l border-blue-500 " +
                                      (showPartial
                                        ? "bg-blue-700 text-white"
                                        : "bg-blue-600 text-white")
                                    }
                                  >
                                    {showPartial ? (
                                      <ChevronUp size={14} />
                                    ) : (
                                      <ChevronDown size={14} />
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          {showPartial && (
                            <form
                              onSubmit={(e) => savePartial(fee, e)}
                              className="mt-2 flex gap-2 items-center"
                            >
                              <Input
                                type="number"
                                inputMode="numeric"
                                min={1}
                                value={payAmount}
                                onChange={(e) => setPayAmount(e.target.value)}
                                placeholder="₹ received"
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
                            </form>
                          )}
                        </div>
                      );
                    })}
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
