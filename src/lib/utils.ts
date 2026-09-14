import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

/** Assume fee due on 5th of the month. Returns days overdue (0 if not yet due). */
export function getDaysPending(month: string): number {
  // month = "YYYY-MM"
  const [y, m] = month.split("-").map(Number);
  const due = new Date(y, m - 1, 5); // 5th of that month
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  if (today <= due) return 0;
  const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export function daysPendingLabel(days: number): string {
  if (days <= 0) return "Due soon";
  if (days === 1) return "1 day overdue";
  if (days < 30) return `${days} days overdue`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month overdue" : `${months} months overdue";
}
