import { Student } from "../entities/Student";

export interface IStudentRepository {
  getAll(): Promise<Student[]>;
  getById(id: string): Promise<Student | null>;
  getByBatch(batchId: string): Promise<Student[]>;
  create(student: Omit<Student, "id">): Promise<Student>;
  update(id: string, data: Partial<Student>): Promise<Student>;
  delete(id: string): Promise<void>;
}
