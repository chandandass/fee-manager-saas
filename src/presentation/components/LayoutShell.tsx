"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/presentation/components/BottomNav";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav =
    pathname?.startsWith("/login") || pathname?.startsWith("/auth");

  return (
    <>
      <div
        className={
          hideNav
            ? "min-h-screen"
            : "max-w-lg mx-auto min-h-screen pb-20 relative"
        }
      >
        {children}
      </div>
      {!hideNav && <BottomNav />}
    </>
  );
}
