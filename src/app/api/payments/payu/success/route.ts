import { NextRequest, NextResponse } from "next/server";
import {
  generateReverseHash,
  getPayUConfig,
} from "@/infrastructure/payments/payu";
import {
  issueSubscriptionToken,
  SUBSCRIPTION_COOKIE,
} from "@/infrastructure/auth/subscriptionToken";
import { isSupabaseConfigured } from "@/infrastructure/supabase/client";
import { activateInstitutePlan } from "@/infrastructure/supabase/InstituteRepository";
import { createRepositories } from "@/infrastructure/supabase/InMemoryStore";

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
    const paidOk = valid && status.toLowerCase() === "success";

    if (!paidOk) {
      const q = new URLSearchParams({
        payment: valid ? "failed" : "invalid",
        txnid,
      });
      return NextResponse.redirect(`${appUrl}/settings?${q.toString()}`, 303);
    }

    let accessUntil = new Date();
    accessUntil.setDate(accessUntil.getDate() + 30);

    if (isSupabaseConfigured()) {
      try {
        const result = await activateInstitutePlan({
          instituteId: udf1 || undefined,
          txnid,
          mihpayid,
          amount,
          status,
          days: 30,
        });
        accessUntil = result.accessUntil;
      } catch (e) {
        console.error("[payu] supabase activate failed, fallback memory", e);
        const repos = createRepositories();
        await repos.institute.update({
          plan: "basic",
          trialEndsAt: undefined,
          subscriptionEndsAt: accessUntil.toISOString(),
        });
      }
    } else {
      const repos = createRepositories();
      await repos.institute.update({
        plan: "basic",
        trialEndsAt: undefined,
        subscriptionEndsAt: accessUntil.toISOString(),
      });
    }

    const token = issueSubscriptionToken({
      instituteId: udf1 || "a0000000-0000-4000-8000-000000000001",
      plan: "basic",
      accessUntil,
    });

    console.log("[payu] plan activated", {
      txnid,
      mihpayid,
      until: accessUntil.toISOString().slice(0, 10),
      supabase: isSupabaseConfigured(),
    });

    const q = new URLSearchParams({ payment: "success", txnid });
    const res = NextResponse.redirect(`${appUrl}/settings?${q.toString()}`, 303);
    res.cookies.set(SUBSCRIPTION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      expires: accessUntil,
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
