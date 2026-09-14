import { AttendanceRecord } from "../entities/Student";

export interface IAttendanceRepository {
  getByDate(date: string, batchId?: string): Promise<AttendanceRecord[]>;
  markAttendance(records: Omit<AttendanceRecord, "id">[]): Promise<void>;
  getStudentHistory(studentId: string, from: string, to: string): Promise<AttendanceRecord[]>;
}
