import { FeeRecord, FeeStatus } from "@/domain/entities/Student";
import { IFeeRepository } from "@/domain/repositories/IFeeRepository";
import { getSupabaseAdmin } from "./client";
import { DEMO_INSTITUTE_ID } from "./InstituteRepository";

function mapFee(row: Record<string, unknown>): FeeRecord {
  return {
    id: String(row.id),
    studentId: String(row.student_id),
    studentName: String(row.student_name),
    batchId: row.batch_id ? String(row.batch_id) : "",
    month: String(row.month),
    amount: Number(row.amount),
    paidAmount: Number(row.paid_amount) || 0,
    status: row.status as FeeStatus,
    paidAt: row.paid_at ? String(row.paid_at) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    snoozedUntil: row.snoozed_until
      ? String(row.snoozed_until).slice(0, 10)
      : undefined,
  };
}

function isSnoozedActive(fee: FeeRecord): boolean {
  if (!fee.snoozedUntil) return false;
  return fee.snoozedUntil > new Date().toISOString().slice(0, 10);
}

export class SupabaseFeeRepository implements IFeeRepository {
  async getAll(month?: string): Promise<FeeRecord[]> {
    const sb = getSupabaseAdmin();
    let q = sb.from("fees").select("*").eq("institute_id", DEMO_INSTITUTE_ID);
    if (month) q = q.eq("month", month);
    const { data, error } = await q.order("month", { ascending: false });
    if (error) throw error;
    return (data || []).map(mapFee);
  }

  async getByStudent(studentId: string): Promise<FeeRecord[]> {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("fees")
      .select("*")
      .eq("student_id", studentId)
      .order("month");
    if (error) throw error;
    return (data || []).map(mapFee);
  }

  async getPending(): Promise<FeeRecord[]> {
    const all = await this.getAll();
    return all.filter((f) => f.status !== "paid" && !isSnoozedActive(f));
  }

  async markPaid(
    id: string,
    paidAmount: number,
    paidAt?: string
  ): Promise<FeeRecord> {
    const sb = getSupabaseAdmin();
    const { data: existing, error: gErr } = await sb
      .from("fees")
      .select("*")
      .eq("id", id)
      .single();
    if (gErr) throw gErr;

    const amount = Number(existing.amount);
    const newPaid = Math.max(0, Math.min(amount, paidAmount));
    let status: FeeStatus = "pending";
    if (newPaid >= amount) status = "paid";
    else if (newPaid > 0) status = "partial";

    const { data, error } = await sb
      .from("fees")
      .update({
        paid_amount: newPaid,
        status,
        paid_at: newPaid > 0 ? paidAt || new Date().toISOString() : null,
        snoozed_until: status === "paid" ? null : existing.snoozed_until,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return mapFee(data);
  }

  async createMonthlyFees(month: string): Promise<FeeRecord[]> {
    const sb = getSupabaseAdmin();
    const { data: existing } = await sb
      .from("fees")
      .select("id")
      .eq("institute_id", DEMO_INSTITUTE_ID)
      .eq("month", month)
      .limit(1);
    if (existing && existing.length > 0) {
      return this.getAll(month);
    }

    const { data: students, error: sErr } = await sb
      .from("students")
      .select("*")
      .eq("institute_id", DEMO_INSTITUTE_ID)
      .eq("is_active", true);
    if (sErr) throw sErr;

    const rows = (students || []).map((s) => ({
      institute_id: DEMO_INSTITUTE_ID,
      student_id: s.id,
      batch_id: s.batch_id,
      student_name: s.name,
      month,
      amount: s.monthly_fee,
      paid_amount: 0,
      status: "pending",
    }));

    if (rows.length === 0) return [];

    const { data, error } = await sb.from("fees").insert(rows).select("*");
    if (error) throw error;
    return (data || []).map(mapFee);
  }

  async updateStatus(
    id: string,
    status: FeeStatus,
    paidAmount?: number
  ): Promise<FeeRecord> {
    const sb = getSupabaseAdmin();
    const patch: Record<string, unknown> = { status };
    if (paidAmount !== undefined) patch.paid_amount = paidAmount;
    const { data, error } = await sb
      .from("fees")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return mapFee(data);
  }

  async snooze(id: string, until: string): Promise<FeeRecord> {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("fees")
      .update({ snoozed_until: until.slice(0, 10) })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return mapFee(data);
  }

  async clearSnooze(id: string): Promise<FeeRecord> {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("fees")
      .update({ snoozed_until: null })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return mapFee(data);
  }
}
