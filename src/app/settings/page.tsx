"use client";

import { useEffect, useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  Badge,
} from "@/presentation/components/ui";
import { createRepositories } from "@/infrastructure/supabase/InMemoryStore";
import { Institute } from "@/domain/entities/Student";
import {
  Building2,
  CreditCard,
  Bell,
  ClipboardList,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

const repos = createRepositories();

export default function SettingsPage() {
  const [institute, setInstitute] = useState<Institute | null>(null);

  useEffect(() => {
    repos.institute.getCurrent().then(setInstitute);
  }, []);

  if (!institute) {
    return (
      <div className="p-4 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-32 mb-4" />
        <div className="h-40 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5">
      <PageHeader title="Settings" subtitle="Institute & subscription" />

      <Card>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
            <Building2 size={22} className="text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{institute.name}</p>
            <p className="text-sm text-slate-500">{institute.ownerName}</p>
            <p className="text-xs text-slate-400 mt-0.5">{institute.phone}</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Sparkles size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Current Plan</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="info">
                  {institute.plan === "trial" ? "7-Day Trial" : institute.plan}
                </Badge>
              </div>
            </div>
          </div>
          <Button size="sm">Upgrade</Button>
        </div>
        {institute.trialEndsAt && (
          <p className="text-xs text-slate-500 mt-3">
            Trial ends:{" "}
            {new Date(institute.trialEndsAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        )}
      </Card>

      <div className="space-y-1">
        <Link href="/attendance">
          <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <ClipboardList size={18} className="text-slate-500" />
              <span className="text-sm font-medium">Attendance</span>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </div>
        </Link>
        <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-200 opacity-60">
          <div className="flex items-center gap-3">
            <Bell size={18} className="text-slate-500" />
            <span className="text-sm font-medium">Reminder Settings</span>
          </div>
          <Badge variant="default">Soon</Badge>
        </div>
        <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-200 opacity-60">
          <div className="flex items-center gap-3">
            <CreditCard size={18} className="text-slate-500" />
            <span className="text-sm font-medium">Billing & Payments</span>
          </div>
          <Badge variant="default">Soon</Badge>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400 pt-4">
        FeeManager v0.1 · Built for Indian coaching centres
      </p>
    </div>
  );
}
