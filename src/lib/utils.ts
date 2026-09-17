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

/** Day of month label: 1 → 1st, 15 → 15th */
export function dayOfMonthLabel(day: number): string {
  const d = Math.min(28, Math.max(1, day));
  if (d === 1 || d === 21) return d + "st";
  if (d === 2 || d === 22) return d + "nd";
  if (d === 3 || d === 23) return d + "rd";
  return d + "th";
}

/**
 * Days overdue for a fee month, using student's fee start day (1–28).
 * Before that day in the cycle → 0 (not due yet).
 */
export function getDaysPending(month: string, feeStartDay: number = 1): number {
  const [y, m] = month.split("-").map(Number);
  const day = Math.min(28, Math.max(1, feeStartDay || 1));
  const due = new Date(y, m - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  if (today <= due) return 0;
  return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

export function daysPendingLabel(days: number): string {
  if (days <= 0) return "Due soon";
  if (days === 1) return "1 day overdue";
  if (days < 30) return days + " days overdue";
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month overdue";
  return months + " months overdue";
}
