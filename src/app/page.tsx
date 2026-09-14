"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  StatCard,
  Card,
  Button,
  Badge,
} from "@/presentation/components/ui";
import { formatCurrency } from "@/lib/utils";
import { createRepositories } from "@/infrastructure/supabase/InMemoryStore";
import { GetDashboardStats } from "@/domain/use-cases/GetDashboardStats";
import { ManageFees } from "@/domain/use-cases/ManageFees";
import { DashboardStats, FeeRecord } from "@/domain/entities/Student";
import { MessageCircle, ArrowRight, Users, IndianRupee } from "lucide-react";
import { whatsappService } from "@/infrastructure/whatsapp/WhatsAppService";

const repos = createRepositories();
const getStats = new GetDashboardStats(repos.institute);
const manageFees = new ManageFees(repos.fees);

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pending, setPending] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [s, p] = await Promise.all([
        getStats.execute(),
        manageFees.getPending(),
      ]);
      setStats(s);
      setPending(p);
      setLoading(false);
    }
    load();
  }, []);

  if (loading || !stats) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-48" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 bg-slate-200 rounded-2xl" />
          <div className="h-24 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5">
      <PageHeader
        title="Dashboard"
        subtitle="Sharma Tuition Centre"
        action={<Badge variant="info">Trial</Badge>}
      />

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
            Pending Payments
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
              🎉 All fees collected!
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {pending.slice(0, 5).map((fee) => (
              <Card
                key={fee.id}
                className="flex items-center justify-between gap-3 !p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {fee.studentName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatCurrency(fee.amount - fee.paidAmount)} pending
                  </p>
                </div>
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
                  <MessageCircle size={16} />
                  Remind
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
