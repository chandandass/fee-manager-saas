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
 * Floating glassmorphic navigation pill container for mobile & desktop shell.
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
    <nav className="fixed bottom-3 left-3 right-3 z-50 max-w-md mx-auto">
      <div className="glass-nav rounded-2xl shadow-xl shadow-slate-900/10 border border-white/60 p-1.5 flex items-center justify-around backdrop-blur-xl">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          const isPrimary = item.primary;

          if (isPrimary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative -mt-6 flex flex-col items-center group focus:outline-none"
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-13 h-13 rounded-2xl shadow-lg transition-all duration-300 transform group-hover:scale-105 active:scale-95",
                    active
                      ? "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-blue-500/35 ring-4 ring-blue-100"
                      : "bg-gradient-to-tr from-blue-500 to-indigo-500 text-white shadow-blue-500/25 group-hover:shadow-blue-500/40"
                  )}
                >
                  <Icon size={23} strokeWidth={2.4} />
                </div>
                <span
                  className={cn(
                    "text-[11px] font-semibold mt-1 transition-colors",
                    active ? "text-blue-600" : "text-slate-600"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center py-1.5 px-2 rounded-xl text-[11px] font-medium transition-all duration-200 relative active:scale-95",
                active
                  ? "text-blue-600 font-semibold bg-blue-50/80"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
              )}
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.3 : 1.8}
                className={cn(
                  "transition-transform duration-200",
                  active && "scale-110 text-blue-600"
                )}
              />
              <span className="mt-0.5">{item.label}</span>
              {active && (
                <span className="absolute bottom-1 w-1 h-1 bg-blue-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

