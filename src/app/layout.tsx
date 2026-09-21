import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/presentation/components/BottomNav";
import { AuthGate } from "@/presentation/components/AuthGate";
import { LayoutShell } from "@/presentation/components/LayoutShell";

export const metadata: Metadata = {
  title: "FeeManager – Tuition Fee & Student Management",
  description:
    "Know who has paid, who hasn't, and remind them on WhatsApp in seconds.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FeeManager",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#2563eb",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">
        <AuthGate>
          <LayoutShell>{children}</LayoutShell>
        </AuthGate>
      </body>
    </html>
  );
}
