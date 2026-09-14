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

  async markAsPaid(id: string, paidAmount: number): Promise<FeeRecord> {
    if (paidAmount <= 0) throw new Error("Paid amount must be positive");
    return this.feeRepo.markPaid(id, paidAmount, new Date().toISOString());
  }

  async generateMonthly(month: string): Promise<FeeRecord[]> {
    return this.feeRepo.createMonthlyFees(month);
  }
}
