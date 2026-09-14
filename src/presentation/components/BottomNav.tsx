"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  IndianRupee,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Order: Home · Students · Fees (center) · Batches · More
 * Fees is the core value prop — center position = easiest reach on mobile.
 */
const items = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: Users },
  { href: "/fees", label: "Fees", icon: IndianRupee, primary: true },
  { href: "/batches", label: "Batches", icon: BookOpen },
  { href: "/settings", label: "More", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200">
      <div className="max-w-lg mx-auto flex items-stretch justify-around h-16 px-1">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          const isPrimary = item.primary;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors relative",
                active && !isPrimary && "text-blue-600",
                !active && !isPrimary && "text-slate-400 hover:text-slate-600",
                active && isPrimary && "text-blue-600",
                !active && isPrimary && "text-slate-500"
              )}
            >
              {isPrimary ? (
                <div
                  className={cn(
                    "flex items-center justify-center w-12 h-12 -mt-5 rounded-2xl shadow-md transition-colors",
                    active
                      ? "bg-blue-600 text-white shadow-blue-200"
                      : "bg-blue-50 text-blue-600 border border-blue-100"
                  )}
                >
                  <Icon size={22} strokeWidth={2.2} />
                </div>
              ) : (
                <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
              )}
              <span className={cn(isPrimary && "mt-0.5", isPrimary && active && "font-semibold")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
