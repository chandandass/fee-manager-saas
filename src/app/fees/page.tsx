"use client";

import { useEffect, useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  EmptyState,
  IconButton,
} from "@/presentation/components/ui";
import { formatCurrency, getDaysPending, daysPendingLabel } from "@/lib/utils";
import { createRepositories } from "@/infrastructure/supabase/InMemoryStore";
import { ManageFees } from "@/domain/use-cases/ManageFees";
import { FeeRecord, Student } from "@/domain/entities/Student";
import { MessageCircle, Phone, Check } from "lucide-react";
import { whatsappService } from "@/infrastructure/whatsapp/WhatsAppService";

const repos = createRepositories();
const manageFees = new ManageFees(repos.fees);

export default function FeesPage() {
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "paid">("pending");
  const [loading, setLoading] = useState(true);

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
      // pending first, then by days overdue desc
      if (a.status === "paid" && b.status !== "paid") return 1;
      if (a.status !== "paid" && b.status === "paid") return -1;
      return getDaysPending(b.month) - getDaysPending(a.month);
    });

  async function markPaid(id: string, amount: number) {
    await manageFees.markAsPaid(id, amount);
    load();
  }

  const statusVariant = (s: FeeRecord["status"]) =>
    s === "paid" ? "success" : s === "partial" ? "warning" : "danger";

  if (loading) {
    return (
      <div className="p-4 animate-pulse space-y-3">
        <div className="h-8 bg-slate-200 rounded w-32" />
        <div className="h-24 bg-slate-200 rounded-2xl" />
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
            ? `${pendingCount} pending · ${formatCurrency(pendingAmount)}`
            : "All clear this month"
        }
      />

      {/* Filter chips */}
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
            {key === "pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}
          </button>
        ))}
      </div>

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

                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatCurrency(due > 0 ? due : fee.amount)}
                    </p>
                    {fee.paidAmount > 0 && fee.status !== "paid" && (
                      <p className="text-xs text-slate-500">
                        of {formatCurrency(fee.amount)} · paid {formatCurrency(fee.paidAmount)}
                      </p>
                    )}
                  </div>

                  {fee.status !== "paid" && (
                    <div className="flex items-center gap-2">
                      {phone && (
                        <>
                          <IconButton
                            href={`tel:+91${phone.replace(/\D/g, "").slice(-10)}`}
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
                      <Button
                        size="sm"
                        onClick={() => markPaid(fee.id, fee.amount)}
                      >
                        <Check size={15} />
                        Paid
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
