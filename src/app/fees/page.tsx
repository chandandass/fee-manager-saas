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
  getCachedInstitute,
  getActiveInstituteId,
  shouldCheckFeeGen,
  recordFeeGenCheck,
} from "@/infrastructure/supabase/instituteContext";
import {
  Pencil,
  ChevronDown,
  ChevronUp,
  Check,
  Clock,
} from "lucide-react";
import { whatsappService } from "@/infrastructure/whatsapp/WhatsAppService";
import { useSubscription } from "@/presentation/hooks/useSubscription";
import {
  BlurLockRow,
  LockedRowsHint,
  PlanExpiredBanner,
  ExpiredCreateModal,
} from "@/presentation/components/SubscriptionGate";

const PREVIEW_COUNT = 2;

const repos = createRepositories();
const manageFees = new ManageFees(repos.fees);

function isSnoozed(fee: FeeRecord): boolean {
  if (!fee.snoozedUntil) return false;
  return fee.snoozedUntil > new Date().toISOString().slice(0, 10);
}

type StudentGroup = {
  studentId: string;
  studentName: string;
  phone: string;
  fees: FeeRecord[];
  totalDue: number;
  maxDays: number;
};

export default function FeesPage() {
  const { active: planActive, loading: subLoading } = useSubscription();
  const locked = !subLoading && !planActive;

  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [instituteName, setInstituteName] = useState("Tuition Centre");
  const [filter, setFilter] = useState<"pending" | "snoozed" | "paid" | "all">(
    "pending"
  );
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [partialFeeId, setPartialFeeId] = useState<string | null>(null);
  const [editFee, setEditFee] = useState<FeeRecord | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [snoozeMenuId, setSnoozeMenuId] = useState<string | null>(null);
  const [expiredModalOpen, setExpiredModalOpen] = useState(false);

  async function load() {
    try {
      // Load institute name from cache (no extra API call)
      const cached = getCachedInstitute();
      if (cached?.name) setInstituteName(cached.name);

      const currentMonth = new Date().toISOString().slice(0, 7);
      const instituteId = getActiveInstituteId();

      let feesPromise: Promise<FeeRecord[]>;
      // Skip fee generation if user subscription is expired!
      if (instituteId && planActive && shouldCheckFeeGen(instituteId, currentMonth)) {
        recordFeeGenCheck(instituteId, currentMonth);
        feesPromise = manageFees
          .generateMonthly(currentMonth)
          .catch(() => manageFees.list().catch(() => []));
      } else {
        feesPromise = manageFees.list().catch(() => []);
      }

      const [all, studs] = await Promise.all([
        feesPromise,
        repos.students.getAll().catch(() => []),
      ]);
      setFees(all || []);
      setStudents(studs || []);
    } catch (e) {
      console.warn("[fees] load error", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [planActive]);

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

  const groups: StudentGroup[] = Object.values(
    filteredFees.reduce<Record<string, StudentGroup>>((acc, fee) => {
      if (!acc[fee.studentId]) {
        acc[fee.studentId] = {
          studentId: fee.studentId,
          studentName: fee.studentName,
          phone: phoneMap[fee.studentId] || "",
          fees: [],
          totalDue: 0,
          maxDays: 0,
        };
      }
      acc[fee.studentId].fees.push(fee);
      if (fee.status !== "paid") {
        acc[fee.studentId].totalDue += fee.amount - fee.paidAmount;
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
      fees: [...g.fees].sort((a, b) => a.month.localeCompare(b.month)),
    }))
    .sort((a, b) => b.maxDays - a.maxDays || b.totalDue - a.totalDue);

  async function markFullPaid(fee: FeeRecord) {
    if (locked) return setExpiredModalOpen(true);
    await manageFees.recordPayment(fee.id, fee.amount);
    setPartialFeeId(null);
    setSnoozeMenuId(null);
    load();
  }

  function togglePartial(fee: FeeRecord) {
    if (locked) return setExpiredModalOpen(true);
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
    if (locked) return setExpiredModalOpen(true);
    setEditFee(fee);
    setPayAmount(String(fee.paidAmount));
  }

  async function savePartial(fee: FeeRecord, e: React.FormEvent) {
    e.preventDefault();
    if (locked) return setExpiredModalOpen(true);
    const amount = Number(payAmount);
    if (isNaN(amount) || amount <= 0) return;
    await manageFees.recordPayment(
      fee.id,
      Math.min(fee.amount, fee.paidAmount + amount)
    );
    closePartial();
    load();
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return setExpiredModalOpen(true);
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
    if (locked) return setExpiredModalOpen(true);
    await manageFees.snooze(fee.id, days);
    setSnoozeMenuId(null);
    setPartialFeeId(null);
    load();
  }

  async function unsnooze(fee: FeeRecord) {
    if (locked) return setExpiredModalOpen(true);
    await manageFees.clearSnooze(fee.id);
    load();
  }

  async function snoozeGroup(group: StudentGroup, days: number) {
    if (locked) return setExpiredModalOpen(true);
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

  function renderSingleCard(fee: FeeRecord) {
    const due = fee.amount - fee.paidAmount;
    const days = daysFor(fee);
    const phone = phoneMap[fee.studentId] || "";
    const showPartial = partialFeeId === fee.id;
    const showSnooze = snoozeMenuId === fee.id;
    const snoozed = isSnoozed(fee);

    return (
      <div key={fee.id}>
        <Card
          className={
            "!p-4 " +
            (showPartial || showSnooze ? "!rounded-b-none border-b-0" : "")
          }
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{fee.studentName}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {fee.month}
                {fee.status !== "paid" && days > 0 && !snoozed && (
                  <span className="text-red-600 font-medium">
                    {" · "}{daysPendingLabel(days)}
                  </span>
                )}
                {fee.status !== "paid" && days === 0 && !snoozed && (
                  <span className="text-slate-400"> · not due yet</span>
                )}
                {snoozed && fee.snoozedUntil && (
                  <span className="text-amber-600 font-medium">
                    {" · "}snoozed till{" "}
                    {new Date(fee.snoozedUntil).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
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
                  title="Snooze"
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
                    href={"tel:+91" + phone.replace(/\D/g, "").slice(-10)}
                    variant="call"
                    title="Call"
                  />
                  <IconButton
                    onClick={() =>
                      whatsappService.openReminder({
                        phone,
                        studentName: fee.studentName,
                        amount: due,
                        month: fee.month,
                        instituteName,
                      })
                    }
                    variant="whatsapp"
                    title="Send WhatsApp Reminder"
                  />
                </>
              )}

              {fee.status === "paid" ? (
                <Button size="sm" variant="secondary" onClick={() => openEdit(fee)}>
                  <Pencil size={14} />
                  Edit
                </Button>
              ) : snoozed ? (
                <Button size="sm" variant="secondary" onClick={() => unsnooze(fee)}>
                  Bring back
                </Button>
              ) : (
                <div className="inline-flex items-center rounded-xl overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 h-9 shrink-0">
                  <button
                    type="button"
                    onClick={() => markFullPaid(fee)}
                    className="h-full px-3 flex items-center gap-1.5 text-xs font-semibold hover:bg-white/10 active:bg-white/20 transition-colors"
                  >
                    <Check size={14} strokeWidth={2.5} />
                    Paid
                  </button>
                  <div className="h-4 w-[1px] bg-white/30" />
                  <button
                    type="button"
                    onClick={() => togglePartial(fee)}
                    className={
                      "h-full px-2 flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-colors " +
                      (showPartial ? "bg-white/20" : "")
                    }
                    title="Partial Payment"
                  >
                    {showPartial ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {showSnooze && (
          <div className="bg-amber-50 border border-t-0 border-amber-100 rounded-b-2xl px-4 py-3">
            <p className="text-xs text-slate-600 mb-2">Hide for a while</p>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="secondary" onClick={() => doSnooze(fee, 3)}>
                3 days
              </Button>
              <Button size="sm" variant="secondary" onClick={() => doSnooze(fee, 7)}>
                1 week
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSnoozeMenuId(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {showPartial && (
          <div className="bg-blue-50/80 border border-t-0 border-blue-100 rounded-b-2xl px-4 py-3">
            <form onSubmit={(e) => savePartial(fee, e)} className="space-y-2">
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
                <Button type="button" size="sm" variant="ghost" onClick={closePartial}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  function renderMultiCard(group: StudentGroup) {
    const expanded = expandedId === group.studentId;
    const showSnooze = snoozeMenuId === "g-" + group.studentId;

    return (
      <div key={group.studentId}>
        <Card
          className={
            "!p-4 " +
            (expanded || showSnooze ? "!rounded-b-none border-b-0" : "")
          }
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{group.studentName}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {group.fees.length} months pending
                {group.maxDays > 0 && (
                  <span className="text-red-600 font-medium">
                    {" · "}oldest {daysPendingLabel(group.maxDays)}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {filter === "pending" && (
                <button
                  type="button"
                  onClick={() => {
                    setExpandedId(null);
                    setSnoozeMenuId(showSnooze ? null : "g-" + group.studentId);
                  }}
                  className={
                    "w-8 h-8 rounded-lg flex items-center justify-center transition " +
                    (showSnooze
                      ? "bg-amber-100 text-amber-700"
                      : "text-slate-400 hover:bg-slate-100")
                  }
                  title="Snooze all"
                >
                  <Clock size={16} />
                </button>
              )}
              <Badge variant="warning">{group.fees.length} mo</Badge>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-lg font-semibold text-slate-900">
                {formatCurrency(group.totalDue)}
              </p>
              <p className="text-xs text-slate-500">total pending</p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {group.phone && (
                <>
                  <IconButton
                    href={
                      "tel:+91" + group.phone.replace(/\D/g, "").slice(-10)
                    }
                    variant="call"
                    title="Call"
                  />
                  <IconButton
                    onClick={() =>
                      whatsappService.openReminder({
                        phone: group.phone,
                        studentName: group.studentName,
                        amount: group.totalDue,
                        month: group.fees.length + " months",
                        instituteName,
                      })
                    }
                    variant="whatsapp"
                    title="WhatsApp total"
                  />
                </>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSnoozeMenuId(null);
                  setExpandedId(expanded ? null : group.studentId);
                }}
              >
                {expanded ? (
                  <>
                    <ChevronUp size={16} /> Hide
                  </>
                ) : (
                  <>
                    <ChevronDown size={16} /> Months
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {showSnooze && (
          <div className="bg-amber-50 border border-t-0 border-amber-100 rounded-b-2xl px-4 py-3">
            <p className="text-xs text-slate-600 mb-2">
              Hide all months for this student
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => snoozeGroup(group, 3)}
              >
                3 days
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => snoozeGroup(group, 7)}
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

        {expanded && !showSnooze && (
          <div className="border border-t-0 border-slate-200 rounded-b-2xl overflow-hidden bg-slate-50/90">
            {group.fees.map((fee, idx) => {
              const due = fee.amount - fee.paidAmount;
              const days = daysFor(fee);
              const showPartial = partialFeeId === fee.id;
              const isLast = idx === group.fees.length - 1;

              return (
                <div
                  key={fee.id}
                  className={
                    "px-4 py-3 " + (!isLast ? "border-b border-slate-100" : "")
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
                        <div className="inline-flex items-center rounded-xl overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 h-9 shrink-0">
                          <button
                            type="button"
                            onClick={() => markFullPaid(fee)}
                            className="h-full px-2.5 flex items-center gap-1 text-xs font-semibold hover:bg-white/10 active:bg-white/20 transition-colors"
                          >
                            <Check size={14} strokeWidth={2.5} />
                            Paid
                          </button>
                          <div className="h-4 w-[1px] bg-white/30" />
                          <button
                            type="button"
                            onClick={() => togglePartial(fee)}
                            className={
                              "h-full px-1.5 flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-colors " +
                              (showPartial ? "bg-white/20" : "")
                            }
                            title="Partial Payment"
                          >
                            {showPartial ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
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
  }

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

      <PlanExpiredBanner show={locked} />

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
              ? "All fees are clear! Check the Snoozed tab if you hid any."
              : filter === "snoozed"
              ? "No snoozed fees. Snoozed items come back after the date you chose."
              : "Fee records will appear once students are added."
          }
        />
      ) : (
        <div className="space-y-3">
          {groups.map((group, idx) => {
            const isRowLocked = locked && idx >= PREVIEW_COUNT;
            return (
              <BlurLockRow key={group.studentId} locked={isRowLocked}>
                {group.fees.length === 1
                  ? renderSingleCard(group.fees[0])
                  : renderMultiCard(group)}
              </BlurLockRow>
            );
          })}

          <LockedRowsHint
            show={locked && groups.length > PREVIEW_COUNT}
            totalCount={groups.length}
            visibleCount={PREVIEW_COUNT}
            label="fee records"
          />
        </div>
      )}

      <ExpiredCreateModal
        open={expiredModalOpen}
        onClose={() => setExpiredModalOpen(false)}
        description="Please renew your subscription to edit fee records or mark payments."
      />
    </div>
  );
}
