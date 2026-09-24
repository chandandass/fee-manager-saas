import { NextRequest, NextResponse } from "next/server";
import {
  generateReverseHash,
  getPayUConfig,
} from "@/infrastructure/payments/payu";
import {
  issueSubscriptionToken,
  SUBSCRIPTION_COOKIE,
} from "@/infrastructure/auth/subscriptionToken";
import {
  isSupabaseConfigured,
  getSupabaseAdmin,
} from "@/infrastructure/supabase/client";
import { activateInstitutePlan } from "@/infrastructure/supabase/InstituteRepository";

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
      // Log failure attempt when possible
      if (isSupabaseConfigured() && txnid) {
        try {
          const sb = getSupabaseAdmin();
          await sb.from("payment_events").upsert(
            {
              institute_id: udf1 || null,
              txnid,
              mihpayid: mihpayid || null,
              amount,
              status: valid ? status || "failed" : "invalid_hash",
              source: "redirect",
            },
            { onConflict: "txnid" }
          );
        } catch (e) {
          console.warn("[payu] log failure", e);
        }
      }
      const q = new URLSearchParams({
        payment: valid ? "failed" : "invalid",
        txnid,
      });
      return NextResponse.redirect(`${appUrl}/settings?${q.toString()}`, 303);
    }

    if (!udf1) {
      return NextResponse.redirect(
        `${appUrl}/settings?payment=error&reason=no_institute`,
        303
      );
    }

    let accessUntil = new Date();
    accessUntil.setDate(accessUntil.getDate() + 30);

    if (isSupabaseConfigured()) {
      let expectedAmount: number | undefined;
      try {
        const sb = getSupabaseAdmin();
        const { data: inst } = await sb
          .from("institutes")
          .select("monthly_price_inr")
          .eq("id", udf1)
          .maybeSingle();
        if (inst?.monthly_price_inr) {
          expectedAmount = Number(inst.monthly_price_inr);
        }
      } catch {
        /* ignore */
      }

      try {
        const result = await activateInstitutePlan({
          instituteId: udf1,
          txnid,
          mihpayid,
          amount,
          status,
          days: 30,
          source: "redirect",
          expectedAmountInr: expectedAmount,
        });
        accessUntil = result.accessUntil;
        if (result.duplicate) {
          console.log("[payu] already activated", txnid);
        }
      } catch (e) {
        console.error("[payu] activate failed", e);
        return NextResponse.redirect(
          `${appUrl}/settings?payment=error&reason=activate`,
          303
        );
      }
    }

    const token = issueSubscriptionToken({
      instituteId: udf1,
      plan: "basic",
      accessUntil,
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
