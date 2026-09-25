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
        <div className="fixed top-3 right-0 left-0 z-40 max-w-lg mx-auto flex justify-end pointer-events-none px-4">
          <div className="pointer-events-auto">
            <OwnerMenu />
          </div>
        </div>
      )}
      <div
        className={
          hideNav
            ? "min-h-screen"
            : "max-w-lg mx-auto min-h-screen pb-24 pt-1 relative"
        }
      >
        {children}
      </div>
      {!hideNav && <BottomNav />}
    </>
  );
}
