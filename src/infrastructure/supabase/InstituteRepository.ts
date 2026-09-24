import { Institute, DashboardStats } from "@/domain/entities/Student";
import { IInstituteRepository } from "@/domain/repositories/IInstituteRepository";
import { getSupabaseAdmin, isSupabaseConfigured } from "./client";
import {
  DEMO_INSTITUTE_ID,
  getActiveInstituteId,
  requireActiveInstituteId,
} from "./instituteContext";

export { DEMO_INSTITUTE_ID };

function mapRow(row: Record<string, unknown>): Institute {
  const price = Number(row.monthly_price_inr);
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
    monthlyPriceInr:
      Number.isFinite(price) && price >= 1 ? Math.round(price) : 249,
  };
}

export class SupabaseInstituteRepository implements IInstituteRepository {
  constructor(private fixedId?: string) {}

  private resolveId(): string {
    if (this.fixedId) return this.fixedId;
    return requireActiveInstituteId();
  }

  async getCurrent(): Promise<Institute> {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase not configured");
    }
    const id = this.resolveId();
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("institutes")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Institute not found — complete setup");
    return mapRow(data);
  }

  async update(data: Partial<Institute>): Promise<Institute> {
    const sb = getSupabaseAdmin();
    const id = this.resolveId();
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
    if (data.monthlyPriceInr !== undefined) {
      patch.monthly_price_inr = data.monthlyPriceInr;
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
    const instituteId = this.resolveId();

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

/**
 * Activate plan after verified PayU success.
 * Idempotent: same txnid never extends subscription twice.
 */
export async function activateInstitutePlan(params: {
  txnid: string;
  mihpayid?: string;
  amount?: string;
  status?: string;
  days?: number;
  instituteId?: string;
  source?: "redirect" | "webhook";
  expectedAmountInr?: number;
  raw?: Record<string, unknown>;
}): Promise<{ accessUntil: Date; instituteId: string; duplicate: boolean }> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase not configured");
  }
  const sb = getSupabaseAdmin();
  const txnid = String(params.txnid || "").trim();
  if (!txnid) throw new Error("txnid required");

  const id = params.instituteId;
  if (!id) throw new Error("instituteId required");

  // Already processed this txn?
  const { data: existing } = await sb
    .from("payment_events")
    .select("id, status, institute_id")
    .eq("txnid", txnid)
    .maybeSingle();

  if (existing && String(existing.status).toLowerCase() === "success") {
    const { data: inst } = await sb
      .from("institutes")
      .select("subscription_ends_at")
      .eq("id", existing.institute_id || id)
      .maybeSingle();

    const ends = inst?.subscription_ends_at
      ? new Date(inst.subscription_ends_at)
      : new Date();

    console.log("[payu] duplicate txn ignored", txnid);
    return {
      accessUntil: ends,
      instituteId: String(existing.institute_id || id),
      duplicate: true,
    };
  }

  // Optional amount check vs institute price
  if (params.expectedAmountInr != null && params.amount) {
    const paid = Math.round(Number(params.amount));
    const expected = Math.round(params.expectedAmountInr);
    if (Number.isFinite(paid) && Number.isFinite(expected) && paid !== expected) {
      await sb.from("payment_events").upsert(
        {
          institute_id: id,
          txnid,
          mihpayid: params.mihpayid || null,
          amount: params.amount,
          status: "amount_mismatch",
          source: params.source || "redirect",
          raw: params.raw || null,
        },
        { onConflict: "txnid" }
      );
      throw new Error(
        `Amount mismatch: paid ${paid} expected ${expected}`
      );
    }
  }

  const days = params.days ?? 30;
  const ends = new Date();
  ends.setDate(ends.getDate() + days);

  // Record success first (unique txnid) — if conflict, treat as duplicate
  const { error: insErr } = await sb.from("payment_events").upsert(
    {
      institute_id: id,
      txnid,
      mihpayid: params.mihpayid || null,
      amount: params.amount || null,
      status: params.status || "success",
      source: params.source || "redirect",
      raw: params.raw || null,
    },
    { onConflict: "txnid" }
  );

  if (insErr) {
    // Unique violation → another request won the race
    if (insErr.code === "23505" || insErr.message?.includes("duplicate")) {
      const { data: inst } = await sb
        .from("institutes")
        .select("subscription_ends_at")
        .eq("id", id)
        .maybeSingle();
      return {
        accessUntil: inst?.subscription_ends_at
          ? new Date(inst.subscription_ends_at)
          : ends,
        instituteId: id,
        duplicate: true,
      };
    }
    throw insErr;
  }

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

  return { accessUntil: ends, instituteId: id, duplicate: false };
}
