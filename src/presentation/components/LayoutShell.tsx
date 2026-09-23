"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/presentation/components/BottomNav";
import { OwnerMenu } from "@/presentation/components/OwnerMenu";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav =
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/auth") ||
    pathname?.startsWith("/onboarding") ||
    pathname?.startsWith("/centres/new");

  return (
    <>
      {!hideNav && (
        <div className="fixed top-3 right-3 z-40 max-w-lg mx-auto left-0 right-0 flex justify-end pointer-events-none">
          <div className="pointer-events-auto pr-3">
            <OwnerMenu />
          </div>
        </div>
      )}
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
