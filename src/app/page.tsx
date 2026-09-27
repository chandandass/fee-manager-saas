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
import {
  DashboardStats,
  FeeRecord,
  Student,
  Institute,
} from "@/domain/entities/Student";
import {
  ArrowRight,
  Users,
  IndianRupee,
  Bell,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import { whatsappService } from "@/infrastructure/whatsapp/WhatsAppService";
import { useSubscription } from "@/presentation/hooks/useSubscription";
import { LandingPage } from "@/presentation/components/LandingPage";
import {
  getSupabaseBrowser,
  isSupabaseConfigured,
} from "@/infrastructure/supabase/client";
import { LockedRowsHint } from "@/presentation/components/SubscriptionGate";

const repos = createRepositories();
const getStats = new GetDashboardStats(repos.institute);
const manageFees = new ManageFees(repos.fees);

function PlanBadge({
  institute,
  subPlan,
  subActive,
}: {
  institute: Institute | null;
  subPlan: string;
  subActive: boolean;
}) {
  const fromDb =
    institute &&
    (institute.plan === "basic" || institute.plan === "pro") &&
    institute.subscriptionEndsAt &&
    new Date(institute.subscriptionEndsAt) > new Date();

  const paid =
    fromDb || (subActive && (subPlan === "basic" || subPlan === "pro"));

  if (paid) return <Badge variant="success">Basic</Badge>;
  if (subActive && subPlan === "trial") return <Badge variant="info">Trial</Badge>;
  if (
    institute?.plan === "trial" &&
    institute.trialEndsAt &&
    new Date(institute.trialEndsAt) > new Date()
  ) {
    return <Badge variant="info">Trial</Badge>;
  }
  return <Badge variant="danger">Expired</Badge>;
}

const DEFAULT_STATS: DashboardStats = {
  totalStudents: 0,
  activeBatches: 0,
  pendingFeesCount: 0,
  pendingFeesAmount: 0,
  collectedThisMonth: 0,
  attendanceToday: 0,
};

export default function HomePage() {
  const [sessionUser, setSessionUser] = useState<unknown | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setSessionUser({ id: "demo" });
      setCheckingAuth(false);
      return;
    }
    const sb = getSupabaseBrowser();
    sb.auth.getSession().then(({ data }) => {
      setSessionUser(data.session?.user || null);
      setCheckingAuth(false);
    });

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user || null);
      setCheckingAuth(false);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="animate-pulse space-y-3 text-center">
          <div className="w-12 h-12 bg-blue-500/20 rounded-2xl mx-auto flex items-center justify-center text-blue-600 font-bold text-xl">
            ₹
          </div>
          <p className="text-xs text-slate-400 font-medium">Loading FeeManager…</p>
        </div>
      </div>
    );
  }

  if (!sessionUser) {
    return <LandingPage />;
  }

  return <DashboardContent />;
}

const PREVIEW_COUNT = 2;

function DashboardContent() {
  const { active: subActive, plan: subPlan, loading: subLoading } = useSubscription();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pending, setPending] = useState<FeeRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [institute, setInstitute] = useState<Institute | null>(null);
  const [loading, setLoading] = useState(true);

  // If OAuth landed on /?code=… forward to callback (Supabase Site URL fallback)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const qs = new URLSearchParams(window.location.search);
    if (qs.get("code")) {
      window.location.replace("/auth/callback" + window.location.search);
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        let inst = await repos.institute.getCurrent().catch(() => null);
        if (!inst) {
          try {
            const res = await fetch("/api/institutes/mine", { credentials: "include" });
            if (res.ok) {
              const json = await res.json();
              const list = json.institutes || [];
              if (list.length > 0) {
                const { setActiveInstituteId, getActiveInstituteId } = await import(
                  "@/infrastructure/supabase/instituteContext"
                );
                // Pick the currently-selected coaching, not always the first
                const activeId = getActiveInstituteId();
                const first = activeId
                  ? (list.find((i: { id: string }) => i.id === activeId) ?? list[0])
                  : list[0];
                setActiveInstituteId(first.id);
                inst = {
                  id: first.id,
                  name: first.name,
                  ownerName: first.owner_name || "Teacher",
                  phone: first.phone || "",
                  plan: first.plan || "trial",
                  trialEndsAt: first.trial_ends_at,
                  subscriptionEndsAt: first.subscription_ends_at,
                  monthlyPriceInr: first.monthly_price_inr || 249,
                };
              }
            }
          } catch {
            /* ignore */
          }
        }
        setInstitute(inst);

        // getDashboardStats already queries students, batches & fees in one shot.
        // Only fetch pending fees + students (for phone/feeDay map) separately.
        const [s, p, studs] = await Promise.all([
          getStats.execute().catch((err) => {
            console.warn("[home] getStats error:", err);
            return DEFAULT_STATS;
          }),
          manageFees.getPending().catch(() => []),
          repos.students.getAll().catch(() => []),
        ]);

        const combinedStats: DashboardStats = {
          totalStudents: s?.totalStudents || 0,
          activeBatches: s?.activeBatches || 0,
          pendingFeesCount: s?.pendingFeesCount || (p || []).length,
          pendingFeesAmount: s?.pendingFeesAmount || 0,
          collectedThisMonth: s?.collectedThisMonth || 0,
          attendanceToday: 0,
        };

        setStats(combinedStats);
        setStudents(studs || []);
        const feeDayMap = Object.fromEntries(
          (studs || []).map((st: Student) => [st.id, st.feeStartDay || 1])
        );
        setPending(
          (p || []).sort(
            (a, b) =>
              getDaysPending(b.month, feeDayMap[b.studentId] || 1) -
              getDaysPending(a.month, feeDayMap[a.studentId] || 1)
          )
        );
      } catch (e) {
        console.warn("[home] load error", e);
        setStats(DEFAULT_STATS);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const phoneMap = Object.fromEntries(students.map((s) => [s.id, s.phone]));
  const feeDayMap = Object.fromEntries(
    students.map((s) => [s.id, s.feeStartDay || 1])
  );

  if (loading) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200/80 rounded-xl w-48" />
        <div className="h-20 bg-slate-200/80 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 bg-slate-200/80 rounded-2xl" />
          <div className="h-24 bg-slate-200/80 rounded-2xl" />
          <div className="h-24 bg-slate-200/80 rounded-2xl" />
          <div className="h-24 bg-slate-200/80 rounded-2xl" />
        </div>
      </div>
    );
  }

  const currentStats = stats || DEFAULT_STATS;

  const overdueCount = pending.filter(
    (f) => getDaysPending(f.month, feeDayMap[f.studentId] || 1) > 0
  ).length;

  // Subscription gate — only show PREVIEW_COUNT items when expired
  const isLocked = !subLoading && !subActive;
  const visiblePending = isLocked ? pending.slice(0, PREVIEW_COUNT) : pending.slice(0, 5);

  return (
    <div className="p-4 space-y-5 pb-24">
      <PageHeader
        title="Dashboard"
        subtitle={institute?.name || "Tuition Fee Manager"}
        action={
          <PlanBadge
            institute={institute}
            subPlan={subPlan}
            subActive={subActive}
          />
        }
      />

      {pending.length > 0 ? (
        <Link href="/fees" className="block">
          <div className="flex items-center gap-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 p-4 hover-lift transition-all group">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-600 animate-pulse-subtle">
              <Bell size={20} strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
                {pending.length === 1
                  ? "1 fee payment pending"
                  : `${pending.length} fee payments pending`}
              </p>
              <p className="text-xs font-medium text-amber-800/90 mt-0.5">
                {formatCurrency(currentStats.pendingFeesAmount)} pending
                {overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/80 border border-amber-200 flex items-center justify-center shrink-0 group-hover:translate-x-0.5 transition-transform">
              <ArrowRight size={16} className="text-amber-700" />
            </div>
          </div>
        </Link>
      ) : (
        <div className="flex items-center gap-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 p-4">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-600">
            <CheckCircle2 size={20} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-emerald-950">
              All payments clear
            </p>
            <p className="text-xs font-medium text-emerald-800/90 mt-0.5">
              Great work! No fees pending this month.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <StatCard
          label="Total Students"
          value={currentStats.totalStudents}
          accent="blue"
          icon={Users}
        />
        <StatCard
          label="Pending Fees"
          value={currentStats.pendingFeesCount}
          sub={formatCurrency(currentStats.pendingFeesAmount)}
          accent="red"
          icon={Bell}
        />
        <StatCard
          label="Collected"
          value={formatCurrency(currentStats.collectedThisMonth)}
          sub="This month"
          accent="green"
          icon={IndianRupee}
        />
        <StatCard
          label="Active Batches"
          value={currentStats.activeBatches}
          accent="amber"
          icon={BookOpen}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/students">
          <Card className="flex items-center gap-3 hover:border-blue-300 transition-all cursor-pointer group">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Students</p>
              <p className="text-[11px] font-medium text-slate-500">Manage &amp; Add</p>
            </div>
          </Card>
        </Link>
        <Link href="/fees">
          <Card className="flex items-center gap-3 hover:border-emerald-300 transition-all cursor-pointer group">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center group-hover:scale-105 transition-transform">
              <IndianRupee size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Collect Fee</p>
              <p className="text-[11px] font-medium text-slate-500">Track &amp; Remind</p>
            </div>
          </Card>
        </Link>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">
            Pending Fee Reminders
          </h2>
          <Link
            href="/fees"
            className="text-xs text-blue-600 font-semibold flex items-center gap-1 hover:underline"
          >
            View all <ArrowRight size={13} />
          </Link>
        </div>

        {pending.length === 0 ? (
          <Card className="text-center py-6">
            <p className="text-xs font-medium text-slate-500">
              🎉 No pending fees right now. Everything is up to date!
            </p>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {visiblePending.map((fee) => {
              const dueAmt = fee.amount - fee.paidAmount;
              const days = getDaysPending(
                fee.month,
                feeDayMap[fee.studentId] || 1
              );
              const phone = phoneMap[fee.studentId] || "";
              return (
                <Card key={fee.id} className="!p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {fee.studentName}
                      </p>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">
                        {formatCurrency(dueAmt)}
                        {days > 0 && (
                          <span className="text-rose-600 font-semibold">
                            {" \u00b7 "}{daysPendingLabel(days)}
                          </span>
                        )}
                        {days === 0 && (
                          <span className="text-slate-400"> \u00b7 due today</span>
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
                          />
                          <IconButton
                            onClick={() =>
                              whatsappService.openReminder({
                                phone,
                                studentName: fee.studentName,
                                amount: dueAmt,
                                month: fee.month,
                                instituteName:
                                  institute?.name || "Tuition Centre",
                              })
                            }
                            variant="whatsapp"
                            title="Send WhatsApp Reminder"
                          />
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
            <LockedRowsHint
              show={isLocked && pending.length > PREVIEW_COUNT}
              totalCount={pending.length}
              visibleCount={PREVIEW_COUNT}
              label="fee reminders"
            />
          </div>
        )}
      </div>
    </div>
  );
}
