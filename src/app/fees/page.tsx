"use client";

import { useEffect, useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  EmptyState,
} from "@/presentation/components/ui";
import { formatCurrency } from "@/lib/utils";
import { createRepositories } from "@/infrastructure/supabase/InMemoryStore";
import { ManageFees } from "@/domain/use-cases/ManageFees";
import { FeeRecord } from "@/domain/entities/Student";
import { MessageCircle, Check } from "lucide-react";
import { whatsappService } from "@/infrastructure/whatsapp/WhatsAppService";

const repos = createRepositories();
const manageFees = new ManageFees(repos.fees);

export default function FeesPage() {
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "paid">("all");
  const [loading, setLoading] = useState(true);

  async function load() {
    const all = await manageFees.list();
    setFees(all);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = fees.filter((f) => {
    if (filter === "pending") return f.status !== "paid";
    if (filter === "paid") return f.status === "paid";
    return true;
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
        <div className="h-20 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <PageHeader title="Fees" subtitle="Track & collect monthly fees" />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ["all", "All"],
            ["pending", "Pending"],
            ["paid", "Paid"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
              filter === key
                ? "bg-blue-600 text-white"
                : "bg-white border border-slate-200 text-slate-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No fee records"
          description="Fee records will appear here once students are added."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((fee) => (
            <Card key={fee.id} className="!p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {fee.studentName}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{fee.month}</p>
                </div>
                <Badge variant={statusVariant(fee.status)}>
                  {fee.status === "paid"
                    ? "Paid"
                    : fee.status === "partial"
                    ? "Partial"
                    : "Pending"}
                </Badge>
              </div>

              <div className="flex items-center justify-between mt-3">
                <div>
                  <p className="text-sm font-semibold">
                    {formatCurrency(fee.amount)}
                  </p>
                  {fee.paidAmount > 0 && fee.status !== "paid" && (
                    <p className="text-xs text-slate-500">
                      Paid: {formatCurrency(fee.paidAmount)}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  {fee.status !== "paid" && (
                    <>
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() =>
                          whatsappService.openReminder({
                            phone: "9876543210",
                            studentName: fee.studentName,
                            amount: fee.amount - fee.paidAmount,
                            month: fee.month,
                            instituteName: "Sharma Tuition Centre",
                          })
                        }
                      >
                        <MessageCircle size={15} />
                        WA
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => markPaid(fee.id, fee.amount)}
                      >
                        <Check size={15} />
                        Mark Paid
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
