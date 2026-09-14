import { FeeRecord } from "../entities/Student";
import { IFeeRepository } from "../repositories/IFeeRepository";

export class ManageFees {
  constructor(private feeRepo: IFeeRepository) {}

  async list(month?: string): Promise<FeeRecord[]> {
    return this.feeRepo.getAll(month);
  }

  async getPending(): Promise<FeeRecord[]> {
    return this.feeRepo.getPending();
  }

  async recordPayment(id: string, totalPaidAmount: number): Promise<FeeRecord> {
    if (totalPaidAmount < 0) throw new Error("Amount cannot be negative");
    return this.feeRepo.markPaid(id, totalPaidAmount, new Date().toISOString());
  }

  async snooze(id: string, days: number): Promise<FeeRecord> {
    const until = new Date();
    until.setDate(until.getDate() + days);
    until.setHours(0, 0, 0, 0);
    return this.feeRepo.snooze(id, until.toISOString().slice(0, 10));
  }

  async clearSnooze(id: string): Promise<FeeRecord> {
    return this.feeRepo.clearSnooze(id);
  }

  async generateMonthly(month: string): Promise<FeeRecord[]> {
    return this.feeRepo.createMonthlyFees(month);
  }
}
