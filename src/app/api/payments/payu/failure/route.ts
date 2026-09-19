import { NextRequest, NextResponse } from "next/server";
import { getPayUConfig } from "@/infrastructure/payments/payu";

/** PayU redirects here when payment fails or is cancelled. */
export async function POST(req: NextRequest) {
  const { appUrl } = getPayUConfig();
  try {
    const formData = await req.formData();
    const txnid = String(formData.get("txnid") || "");
    const status = String(formData.get("status") || "failed");
    console.log("[payu] payment failed", { txnid, status });
    const q = new URLSearchParams({ payment: "failed", txnid });
    return NextResponse.redirect(`${appUrl}/settings?${q.toString()}`, 303);
  } catch {
    return NextResponse.redirect(`${appUrl}/settings?payment=failed`, 303);
  }
}

export async function GET() {
  const { appUrl } = getPayUConfig();
  return NextResponse.redirect(`${appUrl}/settings?payment=failed`);
}
