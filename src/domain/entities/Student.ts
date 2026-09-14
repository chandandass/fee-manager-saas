export type FeeStatus = "paid" | "pending" | "partial";

export interface Student {
  id: string;
  name: string;
  phone: string;
  parentPhone?: string;
  batchId: string;
  monthlyFee: number;
  joinedAt: string;
  isActive: boolean;
  notes?: string;
}

export interface Batch {
  id: string;
  name: string;
  subject?: string;
  teacherName?: string;
  schedule?: string;
  monthlyFeeDefault: number;
  studentCount: number;
  isActive: boolean;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  studentName: string;
  batchId: string;
  month: string; // YYYY-MM
  amount: number;
  paidAmount: number;
  status: FeeStatus;
  paidAt?: string;
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  batchId: string;
  date: string; // YYYY-MM-DD
  present: boolean;
}

export interface Institute {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  address?: string;
  plan: "trial" | "basic" | "pro";
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
}

export interface DashboardStats {
  totalStudents: number;
  activeBatches: number;
  pendingFeesCount: number;
  pendingFeesAmount: number;
  collectedThisMonth: number;
  attendanceToday: number;
}
