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

  /**
   * Record total amount paid so far for this fee.
   * e.g. fee 2000, already 500, user pays 500 more → pass 1000.
   * Or correct a mistake: pass 0 to mark fully unpaid.
   */
  async recordPayment(id: string, totalPaidAmount: number): Promise<FeeRecord> {
    if (totalPaidAmount < 0) throw new Error("Amount cannot be negative");
    return this.feeRepo.markPaid(id, totalPaidAmount, new Date().toISOString());
  }

  async generateMonthly(month: string): Promise<FeeRecord[]> {
    return this.feeRepo.createMonthlyFees(month);
  }
}
