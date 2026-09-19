import { NextRequest, NextResponse } from "next/server";
import {
  generateReverseHash,
  getPayUConfig,
} from "@/infrastructure/payments/payu";

/**
 * PayU redirects here (POST) after successful payment.
 * Validates reverse hash, then redirects user to Settings with success flag.
 * TODO: persist subscriptionEndsAt in DB when Supabase is wired.
 */
export async function POST(req: NextRequest) {
  const config = getPayUConfig();
  const appUrl = config.appUrl;

  try {
    const formData = await req.formData();
    const status = String(formData.get("status") || "");
    const txnid = String(formData.get("txnid") || "");
    const amount = String(formData.get("amount") || "");
    const productinfo = String(formData.get("productinfo") || "");
    const firstname = String(formData.get("firstname") || "");
    const email = String(formData.get("email") || "");
    const hash = String(formData.get("hash") || "");
    const udf1 = String(formData.get("udf1") || "");
    const udf2 = String(formData.get("udf2") || "");
    const udf3 = String(formData.get("udf3") || "");
    const udf4 = String(formData.get("udf4") || "");
    const udf5 = String(formData.get("udf5") || "");
    const mihpayid = String(formData.get("mihpayid") || "");

    const expected = generateReverseHash({
      salt: config.salt,
      status,
      email,
      firstname,
      productinfo,
      amount,
      txnid,
      key: config.key,
      udf1,
      udf2,
      udf3,
      udf4,
      udf5,
    });

    const valid = hash.toLowerCase() === expected.toLowerCase();
    const success =
      valid && (status === "success" || status === "Success");

    if (success) {
      // Placeholder: log until real persistence
      console.log("[payu] payment ok", { txnid, amount, mihpayid, udf1 });
      // TODO: update institute plan to basic, set subscriptionEndsAt = now + 30 days
    } else {
      console.warn("[payu] success callback hash/status invalid", {
        status,
        valid,
        txnid,
      });
    }

    const q = new URLSearchParams({
      payment: success ? "success" : "invalid",
      txnid,
    });
    return NextResponse.redirect(`${appUrl}/settings?${q.toString()}`, 303);
  } catch (e) {
    console.error("[payu/success]", e);
    return NextResponse.redirect(`${appUrl}/settings?payment=error`, 303);
  }
}

export async function GET() {
  const { appUrl } = getPayUConfig();
  return NextResponse.redirect(`${appUrl}/settings`);
}
