import { FeeRecord, FeeStatus } from "@/domain/entities/Student";
import { IFeeRepository } from "@/domain/repositories/IFeeRepository";
import { getSupabaseClient } from "./client";
import { requireActiveInstituteId } from "./instituteContext";
import { getMonthsBetween } from "@/lib/utils";

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
    const sb = getSupabaseClient();
    let q = sb
      .from("fees")
      .select("*")
      .eq("institute_id", requireActiveInstituteId());
    if (month) q = q.eq("month", month);
    const { data, error } = await q.order("month", { ascending: false });
    if (error) throw error;
    return (data || []).map(mapFee);
  }

  async getByStudent(studentId: string): Promise<FeeRecord[]> {
    const sb = getSupabaseClient();
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
    const sb = getSupabaseClient();
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

  async createMonthlyFees(targetMonth: string): Promise<FeeRecord[]> {
    const sb = getSupabaseClient();
    const instituteId = requireActiveInstituteId();

    const { data: students, error: sErr } = await sb
      .from("students")
      .select("*")
      .eq("institute_id", instituteId)
      .eq("is_active", true);
    if (sErr) throw sErr;
    if (!students || students.length === 0) return this.getAll();

    const { data: existingFees } = await sb
      .from("fees")
      .select("student_id, month")
      .eq("institute_id", instituteId);

    const existingKeys = new Set(
      (existingFees || []).map((f) => `${f.student_id}_${f.month}`)
    );

    const rowsToInsert: Array<{
      institute_id: string;
      student_id: string;
      batch_id: string | null;
      student_name: string;
      month: string;
      amount: number;
      paid_amount: number;
      status: string;
    }> = [];

    for (const s of students) {
      const startMonth = s.joined_at
        ? String(s.joined_at).slice(0, 7)
        : targetMonth;
      const months = getMonthsBetween(startMonth, targetMonth);

      for (const m of months) {
        const key = `${s.id}_${m}`;
        if (!existingKeys.has(key)) {
          rowsToInsert.push({
            institute_id: instituteId,
            student_id: String(s.id),
            batch_id: s.batch_id ? String(s.batch_id) : null,
            student_name: String(s.name),
            month: m,
            amount: Number(s.monthly_fee) || 0,
            paid_amount: 0,
            status: "pending",
          });
          existingKeys.add(key);
        }
      }
    }

    if (rowsToInsert.length > 0) {
      const { error: iErr } = await sb.from("fees").insert(rowsToInsert);
      if (iErr) console.error("[FeeRepo] createMonthlyFees insert error:", iErr);
    }

    return this.getAll();
  }

  async updateStatus(
    id: string,
    status: FeeStatus,
    paidAmount?: number
  ): Promise<FeeRecord> {
    const sb = getSupabaseClient();
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
    const sb = getSupabaseClient();
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
    const sb = getSupabaseClient();
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
