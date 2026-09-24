import { NextRequest, NextResponse } from "next/server";
import {
  createTxnId,
  generatePaymentHash,
  getPayUConfig,
} from "@/infrastructure/payments/payu";
import {
  getVerifiedUser,
  unauthorized,
  canAccessInstitute,
} from "@/infrastructure/supabase/serverAuth";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
} from "@/infrastructure/supabase/client";

const DEFAULT_PRICE = 249;

/**
 * POST /api/payments/payu/initiate
 * Amount = institute.monthly_price_inr (or 249). Session required.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getVerifiedUser();
    if (!user) return unauthorized();

    const config = getPayUConfig();
    if (!config.isConfigured) {
      return NextResponse.json(
        {
          error:
            "PayU is not configured. Set PAYU_MERCHANT_KEY and PAYU_MERCHANT_SALT in .env",
        },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const instituteId = String(body.instituteId || "");
    if (!instituteId) {
      return NextResponse.json(
        { error: "instituteId required" },
        { status: 400 }
      );
    }

    const allowed = await canAccessInstitute(user, instituteId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let price = DEFAULT_PRICE;
    let firstname = "Teacher";
    let phone = "9999999999";

    if (isSupabaseConfigured()) {
      const admin = getSupabaseAdmin();
      const { data: inst } = await admin
        .from("institutes")
        .select("name, owner_name, phone, monthly_price_inr")
        .eq("id", instituteId)
        .maybeSingle();

      if (inst) {
        const p = Number(inst.monthly_price_inr);
        if (Number.isFinite(p) && p >= 1) price = Math.round(p);
        firstname = String(inst.owner_name || inst.name || "Teacher").slice(0, 60);
        const ph = String(inst.phone || "").replace(/\D/g, "").slice(-10);
        if (ph.length === 10) phone = ph;
      }
    }

    // Client cannot override amount — only DB price
    const email = user.email || "teacher@example.com";
    const txnid = createTxnId();
    const amount = price.toFixed(2);
    const productinfo = `FeeManager - 1 month (₹${price})`;
    const udf1 = instituteId;

    const hash = generatePaymentHash({
      key: config.key,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      udf1,
      salt: config.salt,
    });

    const surl = `${config.appUrl}/api/payments/payu/success`;
    const furl = `${config.appUrl}/api/payments/payu/failure`;

    return NextResponse.json({
      paymentUrl: config.paymentUrl,
      amount: price,
      fields: {
        key: config.key,
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        phone,
        surl,
        furl,
        hash,
        udf1,
        service_provider: "payu_paisa",
      },
    });
  } catch (e) {
    console.error("[payu/initiate]", e);
    return NextResponse.json(
      { error: "Failed to initiate payment" },
      { status: 500 }
    );
  }
}
