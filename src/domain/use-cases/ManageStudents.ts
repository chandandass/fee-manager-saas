import { Student } from "../entities/Student";
import { IStudentRepository } from "../repositories/IStudentRepository";

export class ManageStudents {
  constructor(private studentRepo: IStudentRepository) {}

  async list(): Promise<Student[]> {
    return this.studentRepo.getAll();
  }

  async get(id: string): Promise<Student | null> {
    return this.studentRepo.getById(id);
  }

  async create(data: Omit<Student, "id">): Promise<Student> {
    if (!data.name.trim() || !data.phone.trim()) {
      throw new Error("Name and phone are required");
    }
    return this.studentRepo.create(data);
  }

  async update(id: string, data: Partial<Student>): Promise<Student> {
    return this.studentRepo.update(id, data);
  }

  async remove(id: string): Promise<void> {
    return this.studentRepo.delete(id);
  }
}
