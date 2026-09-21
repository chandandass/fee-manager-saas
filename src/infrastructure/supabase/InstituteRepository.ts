import { Institute, DashboardStats } from "@/domain/entities/Student";
import { IInstituteRepository } from "@/domain/repositories/IInstituteRepository";
import { getSupabaseAdmin, isSupabaseConfigured } from "./client";

/** Legacy demo seed — only used when no logged-in institute id */
export const DEMO_INSTITUTE_ID = "a0000000-0000-4000-8000-000000000001";

function activeInstituteId(): string {
  if (typeof window !== "undefined") {
    try {
      const id = localStorage.getItem("fm_institute_id");
      if (id) return id;
    } catch {
      /* ignore */
    }
  }
  return DEMO_INSTITUTE_ID;
}

function mapRow(row: Record<string, unknown>): Institute {
  return {
    id: String(row.id),
    name: String(row.name),
    ownerName: String(row.owner_name),
    phone: String(row.phone || ""),
    plan: row.plan as Institute["plan"],
    trialEndsAt: row.trial_ends_at ? String(row.trial_ends_at) : undefined,
    subscriptionEndsAt: row.subscription_ends_at
      ? String(row.subscription_ends_at)
      : undefined,
  };
}

export class SupabaseInstituteRepository implements IInstituteRepository {
  async getCurrent(): Promise<Institute> {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase not configured");
    }
    const sb = getSupabaseAdmin();
    const id = activeInstituteId();

    const { data, error } = await sb
      .from("institutes")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new Error("Institute not found — sign in again");
    }
    return mapRow(data);
  }

  async update(data: Partial<Institute>): Promise<Institute> {
    const sb = getSupabaseAdmin();
    const id = activeInstituteId();
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (data.name !== undefined) patch.name = data.name;
    if (data.ownerName !== undefined) patch.owner_name = data.ownerName;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.plan !== undefined) patch.plan = data.plan;
    if (data.trialEndsAt !== undefined) patch.trial_ends_at = data.trialEndsAt;
    if (data.subscriptionEndsAt !== undefined) {
      patch.subscription_ends_at = data.subscriptionEndsAt;
    }
    if (data.plan === "basic" || data.plan === "pro") {
      patch.trial_ends_at = null;
    }

    const { data: row, error } = await sb
      .from("institutes")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return mapRow(row);
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const sb = getSupabaseAdmin();
    const instituteId = activeInstituteId();

    const [students, batches, fees] = await Promise.all([
      sb
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("institute_id", instituteId)
        .eq("is_active", true),
      sb
        .from("batches")
        .select("id", { count: "exact", head: true })
        .eq("institute_id", instituteId)
        .eq("is_active", true),
      sb
        .from("fees")
        .select("amount, paid_amount, status, month")
        .eq("institute_id", instituteId),
    ]);

    const feeRows = fees.data || [];
    const pending = feeRows.filter((f) => f.status !== "paid");
    const currentMonth = new Date().toISOString().slice(0, 7);
    const collected = feeRows
      .filter((f) => f.month === currentMonth)
      .reduce((s, f) => s + (f.paid_amount || 0), 0);

    return {
      totalStudents: students.count || 0,
      activeBatches: batches.count || 0,
      pendingFeesCount: pending.length,
      pendingFeesAmount: pending.reduce(
        (s, f) => s + (f.amount - f.paid_amount),
        0
      ),
      collectedThisMonth: collected,
      attendanceToday: 0,
    };
  }
}

export async function activateInstitutePlan(params: {
  txnid: string;
  mihpayid?: string;
  amount?: string;
  status?: string;
  days?: number;
  instituteId?: string;
}) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase not configured");
  }
  const sb = getSupabaseAdmin();
  const days = params.days ?? 30;
  const ends = new Date();
  ends.setDate(ends.getDate() + days);
  const id = params.instituteId || DEMO_INSTITUTE_ID;

  const { error: upErr } = await sb
    .from("institutes")
    .update({
      plan: "basic",
      trial_ends_at: null,
      subscription_ends_at: ends.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (upErr) throw upErr;

  await sb.from("payment_events").insert({
    institute_id: id,
    txnid: params.txnid,
    mihpayid: params.mihpayid || null,
    amount: params.amount || null,
    status: params.status || "success",
  });

  return { accessUntil: ends, instituteId: id };
}
