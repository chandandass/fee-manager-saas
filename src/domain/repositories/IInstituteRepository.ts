import { DashboardStats, Institute } from "../entities/Student";

export interface IInstituteRepository {
  getCurrent(): Promise<Institute | null>;
  update(data: Partial<Institute>): Promise<Institute>;
  getDashboardStats(): Promise<DashboardStats>;
}
