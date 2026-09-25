import { Student } from "@/domain/entities/Student";
import { IStudentRepository } from "@/domain/repositories/IStudentRepository";
import { getSupabaseClient } from "./client";
import { requireActiveInstituteId } from "./instituteContext";

function mapStudent(row: Record<string, unknown>): Student {
  return {
    id: String(row.id),
    name: String(row.name),
    phone: String(row.phone),
    parentPhone: row.parent_phone ? String(row.parent_phone) : undefined,
    batchId: row.batch_id ? String(row.batch_id) : "",
    monthlyFee: Number(row.monthly_fee) || 0,
    joinedAt: String(row.joined_at).slice(0, 10),
    feeStartDay: Number(row.fee_start_day) || 1,
    isActive: Boolean(row.is_active),
    notes: row.notes ? String(row.notes) : undefined,
  };
}

export class SupabaseStudentRepository implements IStudentRepository {
  async getAll(): Promise<Student[]> {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from("students")
      .select("*")
      .eq("institute_id", requireActiveInstituteId())
      .order("name");
    if (error) throw error;
    return (data || []).map(mapStudent);
  }

  async getById(id: string): Promise<Student | null> {
    const sb = getSupabaseClient();
    const { data, error } = await sb.from("students").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? mapStudent(data) : null;
  }

  async getByBatch(batchId: string): Promise<Student[]> {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from("students")
      .select("*")
      .eq("batch_id", batchId)
      .eq("is_active", true);
    if (error) throw error;
    return (data || []).map(mapStudent);
  }

  async create(data: Omit<Student, "id">): Promise<Student> {
    const sb = getSupabaseClient();
    const { data: row, error } = await sb
      .from("students")
      .insert({
        institute_id: requireActiveInstituteId(),
        batch_id: data.batchId || null,
        name: data.name,
        phone: data.phone,
        parent_phone: data.parentPhone || null,
        monthly_fee: data.monthlyFee,
        fee_start_day: Math.min(28, Math.max(1, data.feeStartDay || 1)),
        joined_at: data.joinedAt || new Date().toISOString().slice(0, 10),
        is_active: data.isActive,
        notes: data.notes || null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapStudent(row);
  }

  async update(id: string, data: Partial<Student>): Promise<Student> {
    const sb = getSupabaseClient();
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.parentPhone !== undefined) patch.parent_phone = data.parentPhone;
    if (data.batchId !== undefined) patch.batch_id = data.batchId;
    if (data.monthlyFee !== undefined) patch.monthly_fee = data.monthlyFee;
    if (data.feeStartDay !== undefined) patch.fee_start_day = data.feeStartDay;
    if (data.isActive !== undefined) patch.is_active = data.isActive;
    if (data.notes !== undefined) patch.notes = data.notes;

    const { data: row, error } = await sb
      .from("students")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return mapStudent(row);
  }

  async delete(id: string): Promise<void> {
    const sb = getSupabaseClient();
    const { error } = await sb.from("students").delete().eq("id", id);
    if (error) throw error;
  }
}
