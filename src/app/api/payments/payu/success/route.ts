import { NextRequest, NextResponse } from "next/server";
import {
  generateReverseHash,
  getPayUConfig,
} from "@/infrastructure/payments/payu";
import { createRepositories } from "@/infrastructure/supabase/InMemoryStore";
import {
  issueSubscriptionToken,
  SUBSCRIPTION_COOKIE,
} from "@/infrastructure/auth/subscriptionToken";

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
    const udf1 = String(formData.get("udf1") || "inst1");
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
    const paidOk = valid && status.toLowerCase() === "success";

    if (!paidOk) {
      const q = new URLSearchParams({
        payment: valid ? "failed" : "invalid",
        txnid,
      });
      return NextResponse.redirect(`${appUrl}/settings?${q.toString()}`, 303);
    }

    const ends = new Date();
    ends.setDate(ends.getDate() + 30);

    const repos = createRepositories();
    await repos.institute.update({
      plan: "basic",
      trialEndsAt: undefined,
      subscriptionEndsAt: ends.toISOString(),
    });

    const token = issueSubscriptionToken({
      instituteId: udf1 || "inst1",
      plan: "basic",
      accessUntil: ends,
    });

    console.log("[payu] plan activated + jwt issued", {
      txnid,
      mihpayid,
      until: ends.toISOString().slice(0, 10),
    });

    const q = new URLSearchParams({ payment: "success", txnid });
    const res = NextResponse.redirect(`${appUrl}/settings?${q.toString()}`, 303);
    res.cookies.set(SUBSCRIPTION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      expires: ends,
    });
    return res;
  } catch (e) {
    console.error("[payu/success]", e);
    return NextResponse.redirect(`${appUrl}/settings?payment=error`, 303);
  }
}

export async function GET() {
  const { appUrl } = getPayUConfig();
  return NextResponse.redirect(`${appUrl}/settings`);
}
