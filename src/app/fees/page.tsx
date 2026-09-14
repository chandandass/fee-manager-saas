"use client";

import { useEffect, useState, useRef } from "react";
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
import { MessageCircle, Phone, Pencil, ChevronDown, Check } from "lucide-react";
import { whatsappService } from "@/infrastructure/whatsapp/WhatsAppService";

const repos = createRepositories();
const manageFees = new ManageFees(repos.fees);

export default function FeesPage() {
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "paid">("pending");
  const [loading, setLoading] = useState(true);
  const [partialFeeId, setPartialFeeId] = useState<string | null>(null);
  const [editFee, setEditFee] = useState<FeeRecord | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
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

  async function markFullPaid(fee: FeeRecord) {
    await manageFees.recordPayment(fee.id, fee.amount);
    setOpenMenuId(null);
    setPartialFeeId(null);
    load();
  }

  function openPartial(fee: FeeRecord) {
    setOpenMenuId(null);
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
            {key === "pending" && pendingCount > 0
              ? " (" + pendingCount + ")"
              : ""}
          </button>
        ))}
      </div>

      {/* Edit paid modal only (rare action) */}
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
            const menuOpen = openMenuId === fee.id;
            const showPartial = partialFeeId === fee.id;

            return (
              <div key={fee.id}>
                <Card className={"!p-4 " + (showPartial ? "!rounded-b-none border-b-0" : "")}>
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
                      ) : (
                        <div
                          className="relative flex"
                          ref={menuOpen ? menuRef : undefined}
                        >
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
                            onClick={() =>
                              setOpenMenuId(menuOpen ? null : fee.id)
                            }
                            className="px-2 rounded-r-xl bg-blue-600 text-white hover:bg-blue-700 border-l border-blue-500 flex items-center"
                            aria-label="More payment options"
                          >
                            <ChevronDown size={16} />
                          </button>

                          {menuOpen && (
                            <div className="absolute right-0 bottom-full mb-1.5 w-44 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-20">
                              <button
                                type="button"
                                onClick={() => openPartial(fee)}
                                className="w-full text-left px-3.5 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                              >
                                Partial payment…
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Inline partial form – attached under the card */}
                {showPartial && (
                  <div className="bg-slate-50 border border-t-0 border-slate-200 rounded-b-2xl px-4 py-3">
                    <form
                      onSubmit={(e) => savePartial(fee, e)}
                      className="space-y-3"
                    >
                      <p className="text-xs text-slate-500">
                        Remaining: {formatCurrency(due)}
                        {fee.paidAmount > 0 &&
                          " · already paid " + formatCurrency(fee.paidAmount)}
                      </p>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={due}
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          placeholder="Amount received (₹)"
                          className="flex-1"
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
