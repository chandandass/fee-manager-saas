"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  StatCard,
  Card,
  Badge,
  IconButton,
} from "@/presentation/components/ui";
import { formatCurrency, getDaysPending, daysPendingLabel } from "@/lib/utils";
import { createRepositories } from "@/infrastructure/supabase/InMemoryStore";
import { GetDashboardStats } from "@/domain/use-cases/GetDashboardStats";
import { ManageFees } from "@/domain/use-cases/ManageFees";
import { DashboardStats, FeeRecord, Student } from "@/domain/entities/Student";
import {
  MessageCircle,
  Phone,
  ArrowRight,
  Users,
  IndianRupee,
  Bell,
  CheckCircle2,
} from "lucide-react";
import { whatsappService } from "@/infrastructure/whatsapp/WhatsAppService";

const repos = createRepositories();
const getStats = new GetDashboardStats(repos.institute);
const manageFees = new ManageFees(repos.fees);

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pending, setPending] = useState<FeeRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [s, p, studs] = await Promise.all([
        getStats.execute(),
        manageFees.getPending(),
        repos.students.getAll(),
      ]);
      setStats(s);
      setPending(
        p.sort((a, b) => getDaysPending(b.month) - getDaysPending(a.month))
      );
      setStudents(studs);
      setLoading(false);
    }
    load();
  }, []);

  const phoneMap = Object.fromEntries(students.map((s) => [s.id, s.phone]));

  if (loading || !stats) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-48" />
        <div className="h-16 bg-slate-200 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 bg-slate-200 rounded-2xl" />
          <div className="h-24 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  const overdueCount = pending.filter((f) => getDaysPending(f.month) > 0).length;

  return (
    <div className="p-4 space-y-5">
      <PageHeader
        title="Home"
        subtitle="Sharma Tuition Centre"
        action={<Badge variant="info">Trial</Badge>}
      />

      {/* In-app notification strip — helpful, not pushy */}
      {pending.length > 0 ? (
        <Link href="/fees">
          <div className="flex items-center gap-3 rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3.5 active:bg-amber-100 transition">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Bell size={18} className="text-amber-700" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-950">
                {pending.length === 1
                  ? "1 fee needs attention"
                  : pending.length + " fees need attention"}
              </p>
              <p className="text-xs text-amber-800/80 mt-0.5">
                {formatCurrency(stats.pendingFeesAmount)} pending
                {overdueCount > 0
                  ? " · " + overdueCount + " overdue"
                  : ""}
              </p>
            </div>
            <ArrowRight size={18} className="text-amber-600 shrink-0" />
          </div>
        </Link>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl bg-green-50 border border-green-100 px-4 py-3.5">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} className="text-green-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-green-950">
              All clear for now
            </p>
            <p className="text-xs text-green-800/80 mt-0.5">
              No fees need attention
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Students" value={stats.totalStudents} accent="blue" />
        <StatCard
          label="Pending Fees"
          value={stats.pendingFeesCount}
          sub={formatCurrency(stats.pendingFeesAmount)}
          accent="red"
        />
        <StatCard
          label="Collected"
          value={formatCurrency(stats.collectedThisMonth)}
          sub="This month"
          accent="green"
        />
        <StatCard label="Batches" value={stats.activeBatches} accent="amber" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/students">
          <Card className="flex items-center gap-3 hover:border-blue-200 transition cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Students</p>
              <p className="text-xs text-slate-500">Manage</p>
            </div>
          </Card>
        </Link>
        <Link href="/fees">
          <Card className="flex items-center gap-3 hover:border-green-200 transition cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <IndianRupee size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Fees</p>
              <p className="text-xs text-slate-500">Track & collect</p>
            </div>
          </Card>
        </Link>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-800">
            Needs attention
          </h2>
          <Link
            href="/fees"
            className="text-xs text-blue-600 font-medium flex items-center gap-1"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {pending.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500 text-center py-4">
              Nothing pending — great work
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {pending.slice(0, 5).map((fee) => {
              const due = fee.amount - fee.paidAmount;
              const days = getDaysPending(fee.month);
              const phone = phoneMap[fee.studentId] || "";
              return (
                <Card key={fee.id} className="!p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {fee.studentName}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatCurrency(due)}
                        {days > 0 && (
                          <span className="text-red-600 font-medium">
                            {" · "}{daysPendingLabel(days)}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {phone && (
                        <>
                          <IconButton
                            href={
                              "tel:+91" +
                              phone.replace(/\D/g, "").slice(-10)
                            }
                            variant="call"
                            title="Call"
                          >
                            <Phone size={16} />
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
                            title="WhatsApp"
                          >
                            <MessageCircle size={16} />
                          </IconButton>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
