import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/presentation/components/BottomNav";

export const metadata: Metadata = {
  title: "FeeManager – Tuition Fee & Student Management",
  description: "Know who has paid, who hasn't, and remind them on WhatsApp in seconds.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "FeeManager" },
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
        <div className="max-w-lg mx-auto min-h-screen pb-20 relative">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
