import { FeeRecord, FeeStatus } from "../entities/Student";

export interface IFeeRepository {
  getAll(month?: string): Promise<FeeRecord[]>;
  getByStudent(studentId: string): Promise<FeeRecord[]>;
  getPending(): Promise<FeeRecord[]>;
  markPaid(id: string, paidAmount: number, paidAt?: string): Promise<FeeRecord>;
  createMonthlyFees(month: string): Promise<FeeRecord[]>;
  updateStatus(id: string, status: FeeStatus, paidAmount?: number): Promise<FeeRecord>;
  snooze(id: string, until: string): Promise<FeeRecord>;
  clearSnooze(id: string): Promise<FeeRecord>;
}
