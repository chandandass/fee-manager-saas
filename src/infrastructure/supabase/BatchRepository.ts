import { Batch } from "@/domain/entities/Student";
import { IBatchRepository } from "@/domain/repositories/IBatchRepository";
import { getSupabaseAdmin } from "./client";
import { requireActiveInstituteId } from "./instituteContext";

function mapBatch(row: Record<string, unknown>, studentCount = 0): Batch {
  return {
    id: String(row.id),
    name: String(row.name),
    subject: row.subject ? String(row.subject) : undefined,
    teacherName: row.teacher_name ? String(row.teacher_name) : undefined,
    schedule: row.schedule ? String(row.schedule) : undefined,
    monthlyFeeDefault: Number(row.monthly_fee_default) || 0,
    studentCount,
    isActive: Boolean(row.is_active),
  };
}

export class SupabaseBatchRepository implements IBatchRepository {
  async getAll(): Promise<Batch[]> {
    const instituteId = requireActiveInstituteId();
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("batches")
      .select("*")
      .eq("institute_id", instituteId)
      .order("name");
    if (error) throw error;

    const { data: students } = await sb
      .from("students")
      .select("batch_id")
      .eq("institute_id", instituteId)
      .eq("is_active", true);

    const counts: Record<string, number> = {};
    for (const s of students || []) {
      if (s.batch_id) counts[s.batch_id] = (counts[s.batch_id] || 0) + 1;
    }

    return (data || []).map((r) => mapBatch(r, counts[r.id] || 0));
  }

  async getById(id: string): Promise<Batch | null> {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb.from("batches").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const { count } = await sb
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("batch_id", id)
      .eq("is_active", true);
    return mapBatch(data, count || 0);
  }

  async create(batch: Omit<Batch, "id" | "studentCount">): Promise<Batch> {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("batches")
      .insert({
        institute_id: requireActiveInstituteId(),
        name: batch.name,
        subject: batch.subject || null,
        teacher_name: batch.teacherName || null,
        schedule: batch.schedule || null,
        monthly_fee_default: batch.monthlyFeeDefault,
        is_active: batch.isActive,
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapBatch(data, 0);
  }

  async update(id: string, data: Partial<Batch>): Promise<Batch> {
    const sb = getSupabaseAdmin();
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.subject !== undefined) patch.subject = data.subject;
    if (data.teacherName !== undefined) patch.teacher_name = data.teacherName;
    if (data.schedule !== undefined) patch.schedule = data.schedule;
    if (data.monthlyFeeDefault !== undefined)
      patch.monthly_fee_default = data.monthlyFeeDefault;
    if (data.isActive !== undefined) patch.is_active = data.isActive;

    const { data: row, error } = await sb
      .from("batches")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return mapBatch(row, 0);
  }

  async delete(id: string): Promise<void> {
    const sb = getSupabaseAdmin();
    const { error } = await sb.from("batches").delete().eq("id", id);
    if (error) throw error;
  }
}
