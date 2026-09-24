export type FeeStatus = "paid" | "pending" | "partial";

export type PlanType = "trial" | "basic" | "pro";

export interface Institute {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  plan: PlanType;
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
  /** INR per month for SaaS subscription. Default 249. */
  monthlyPriceInr?: number;
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

export interface Student {
  id: string;
  name: string;
  phone: string;
  parentPhone?: string;
  batchId: string;
  monthlyFee: number;
  joinedAt: string;
  feeStartDay: number;
  isActive: boolean;
  notes?: string;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  studentName: string;
  batchId: string;
  month: string;
  amount: number;
  paidAmount: number;
  status: FeeStatus;
  paidAt?: string;
  notes?: string;
  snoozedUntil?: string;
}

export interface DashboardStats {
  totalStudents: number;
  activeBatches: number;
  pendingFeesCount: number;
  pendingFeesAmount: number;
  collectedThisMonth: number;
  attendanceToday: number;
}
