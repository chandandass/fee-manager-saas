import { Batch } from "../entities/Student";

export interface IBatchRepository {
  getAll(): Promise<Batch[]>;
  getById(id: string): Promise<Batch | null>;
  create(batch: Omit<Batch, "id" | "studentCount">): Promise<Batch>;
  update(id: string, data: Partial<Batch>): Promise<Batch>;
  delete(id: string): Promise<void>;
}
