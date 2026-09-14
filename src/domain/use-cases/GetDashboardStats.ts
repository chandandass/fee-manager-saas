import { DashboardStats } from "../entities/Student";
import { IInstituteRepository } from "../repositories/IInstituteRepository";

export class GetDashboardStats {
  constructor(private instituteRepo: IInstituteRepository) {}

  async execute(): Promise<DashboardStats> {
    return this.instituteRepo.getDashboardStats();
  }
}
