import {
  AttendanceRecord,
  Batch,
  DashboardStats,
  FeeRecord,
  Institute,
  Student,
} from "@/domain/entities/Student";
import { IStudentRepository } from "@/domain/repositories/IStudentRepository";
import { IBatchRepository } from "@/domain/repositories/IBatchRepository";
import { IFeeRepository } from "@/domain/repositories/IFeeRepository";
import { IAttendanceRepository } from "@/domain/repositories/IAttendanceRepository";
import { IInstituteRepository } from "@/domain/repositories/IInstituteRepository";

let students: Student[] = [
  { id: "s1", name: "Rahul Sharma", phone: "9876543210", parentPhone: "9876543211", batchId: "b1", monthlyFee: 1500, joinedAt: "2025-06-01", isActive: true },
  { id: "s2", name: "Priya Patel", phone: "9123456780", batchId: "b1", monthlyFee: 1500, joinedAt: "2025-07-15", isActive: true },
  { id: "s3", name: "Amit Kumar", phone: "9988776655", batchId: "b2", monthlyFee: 2000, joinedAt: "2025-08-01", isActive: true },
  { id: "s4", name: "Sneha Reddy", phone: "9765432109", parentPhone: "9765432108", batchId: "b2", monthlyFee: 2000, joinedAt: "2025-09-01", isActive: true },
];

let batches: Batch[] = [
  { id: "b1", name: "Class 10 - Maths", subject: "Mathematics", teacherName: "Mr. Verma", schedule: "Mon, Wed, Fri 5-6 PM", monthlyFeeDefault: 1500, studentCount: 2, isActive: true },
  { id: "b2", name: "Class 12 - Physics", subject: "Physics", teacherName: "Mrs. Iyer", schedule: "Tue, Thu, Sat 6-7 PM", monthlyFeeDefault: 2000, studentCount: 2, isActive: true },
];

const currentMonth = new Date().toISOString().slice(0, 7);

let fees: FeeRecord[] = [
  { id: "f1", studentId: "s1", studentName: "Rahul Sharma", batchId: "b1", month: currentMonth, amount: 1500, paidAmount: 1500, status: "paid", paidAt: new Date().toISOString() },
  { id: "f2", studentId: "s2", studentName: "Priya Patel", batchId: "b1", month: currentMonth, amount: 1500, paidAmount: 0, status: "pending" },
  { id: "f3", studentId: "s3", studentName: "Amit Kumar", batchId: "b2", month: currentMonth, amount: 2000, paidAmount: 1000, status: "partial" },
  { id: "f4", studentId: "s4", studentName: "Sneha Reddy", batchId: "b2", month: currentMonth, amount: 2000, paidAmount: 0, status: "pending" },
];

let attendance: AttendanceRecord[] = [];

let institute: Institute = {
  id: "inst1",
  name: "Sharma Tuition Centre",
  ownerName: "Ramesh Sharma",
  phone: "9876500000",
  plan: "trial",
  trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function isSnoozedActive(fee: FeeRecord): boolean {
  if (!fee.snoozedUntil) return false;
  const today = new Date().toISOString().slice(0, 10);
  return fee.snoozedUntil > today;
}

export class InMemoryStudentRepository implements IStudentRepository {
  async getAll() { return [...students]; }
  async getById(id: string) { return students.find((s) => s.id === id) || null; }
  async getByBatch(batchId: string) { return students.filter((s) => s.batchId === batchId); }
  async create(data: Omit<Student, "id">) {
    const student: Student = { ...data, id: uid() };
    students.push(student);
    const batch = batches.find((b) => b.id === data.batchId);
    if (batch) batch.studentCount += 1;
    return student;
  }
  async update(id: string, data: Partial<Student>) {
    const idx = students.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error("Student not found");
    students[idx] = { ...students[idx], ...data };
    return students[idx];
  }
  async delete(id: string) {
    const s = students.find((x) => x.id === id);
    students = students.filter((x) => x.id !== id);
    if (s) {
      const batch = batches.find((b) => b.id === s.batchId);
      if (batch) batch.studentCount = Math.max(0, batch.studentCount - 1);
    }
  }
}

export class InMemoryBatchRepository implements IBatchRepository {
  async getAll() { return [...batches]; }
  async getById(id: string) { return batches.find((b) => b.id === id) || null; }
  async create(data: Omit<Batch, "id" | "studentCount">) {
    const batch: Batch = { ...data, id: uid(), studentCount: 0 };
    batches.push(batch);
    return batch;
  }
  async update(id: string, data: Partial<Batch>) {
    const idx = batches.findIndex((b) => b.id === id);
    if (idx === -1) throw new Error("Batch not found");
    batches[idx] = { ...batches[idx], ...data };
    return batches[idx];
  }
  async delete(id: string) { batches = batches.filter((b) => b.id !== id); }
}

export class InMemoryFeeRepository implements IFeeRepository {
  async getAll(month?: string) {
    if (month) return fees.filter((f) => f.month === month);
    return [...fees];
  }
  async getByStudent(studentId: string) { return fees.filter((f) => f.studentId === studentId); }
  async getPending() {
    return fees.filter((f) => f.status !== "paid" && !isSnoozedActive(f));
  }
  async markPaid(id: string, paidAmount: number, paidAt?: string) {
    const idx = fees.findIndex((f) => f.id === id);
    if (idx === -1) throw new Error("Fee not found");
    const fee = fees[idx];
    const newPaid = Math.max(0, Math.min(fee.amount, paidAmount));
    let status: FeeRecord["status"] = "pending";
    if (newPaid >= fee.amount) status = "paid";
    else if (newPaid > 0) status = "partial";
    fees[idx] = {
      ...fee,
      paidAmount: newPaid,
      status,
      paidAt: newPaid > 0 ? (paidAt || new Date().toISOString()) : undefined,
      snoozedUntil: status === "paid" ? undefined : fee.snoozedUntil,
    };
    return fees[idx];
  }
  async createMonthlyFees(month: string) {
    const existing = fees.filter((f) => f.month === month);
    if (existing.length) return existing;
    const newFees: FeeRecord[] = students.filter((s) => s.isActive).map((s) => ({
      id: uid(),
      studentId: s.id,
      studentName: s.name,
      batchId: s.batchId,
      month,
      amount: s.monthlyFee,
      paidAmount: 0,
      status: "pending" as const,
    }));
    fees.push(...newFees);
    return newFees;
  }
  async updateStatus(id: string, status: FeeRecord["status"], paidAmount?: number) {
    const idx = fees.findIndex((f) => f.id === id);
    if (idx === -1) throw new Error("Fee not found");
    fees[idx] = { ...fees[idx], status, paidAmount: paidAmount ?? fees[idx].paidAmount };
    return fees[idx];
  }
  async snooze(id: string, until: string) {
    const idx = fees.findIndex((f) => f.id === id);
    if (idx === -1) throw new Error("Fee not found");
    fees[idx] = { ...fees[idx], snoozedUntil: until };
    return fees[idx];
  }
  async clearSnooze(id: string) {
    const idx = fees.findIndex((f) => f.id === id);
    if (idx === -1) throw new Error("Fee not found");
    fees[idx] = { ...fees[idx], snoozedUntil: undefined };
    return fees[idx];
  }
}

export class InMemoryAttendanceRepository implements IAttendanceRepository {
  async getByDate(date: string, batchId?: string) {
    return attendance.filter((a) => a.date === date && (!batchId || a.batchId === batchId));
  }
  async markAttendance(records: Omit<AttendanceRecord, "id">[]) {
    for (const r of records) {
      const existing = attendance.findIndex((a) => a.studentId === r.studentId && a.date === r.date);
      if (existing >= 0) attendance[existing] = { ...attendance[existing], ...r };
      else attendance.push({ ...r, id: uid() });
    }
  }
  async getStudentHistory(studentId: string, from: string, to: string) {
    return attendance.filter((a) => a.studentId === studentId && a.date >= from && a.date <= to);
  }
}

export class InMemoryInstituteRepository implements IInstituteRepository {
  async getCurrent() { return { ...institute }; }
  async update(data: Partial<Institute>) {
    institute = { ...institute, ...data };
    return institute;
  }
  async getDashboardStats(): Promise<DashboardStats> {
    const pending = fees.filter((f) => f.status !== "paid" && !isSnoozedActive(f));
    const collected = fees.filter((f) => f.month === currentMonth).reduce((sum, f) => sum + f.paidAmount, 0);
    return {
      totalStudents: students.filter((s) => s.isActive).length,
      activeBatches: batches.filter((b) => b.isActive).length,
      pendingFeesCount: pending.length,
      pendingFeesAmount: pending.reduce((s, f) => s + (f.amount - f.paidAmount), 0),
      collectedThisMonth: collected,
      attendanceToday: attendance.filter((a) => a.date === new Date().toISOString().slice(0, 10) && a.present).length,
    };
  }
}

export function createRepositories() {
  return {
    students: new InMemoryStudentRepository(),
    batches: new InMemoryBatchRepository(),
    fees: new InMemoryFeeRepository(),
    attendance: new InMemoryAttendanceRepository(),
    institute: new InMemoryInstituteRepository(),
  };
}
