import { NextRequest, NextResponse } from "next/server";
import {
  createTxnId,
  generatePaymentHash,
  getPayUConfig,
} from "@/infrastructure/payments/payu";

/**
 * POST /api/payments/payu/initiate
 * Body: { firstname, email, phone }
 * Returns PayU form fields + paymentUrl for client-side POST redirect.
 */
export async function POST(req: NextRequest) {
  try {
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
    const firstname = String(body.firstname || "Teacher").slice(0, 60);
    const email = String(body.email || "teacher@example.com").slice(0, 100);
    const phone = String(body.phone || "9999999999").replace(/\D/g, "").slice(-10);

    const txnid = createTxnId();
    const amount = Number(config.amount).toFixed(2);
    const productinfo = "FeeManager Basic - 1 month";

    // udf1 = institute id (placeholder until auth)
    const udf1 = String(body.instituteId || "inst1");

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
      fields: {
        key: config.key,
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        phone: phone || "9999999999",
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
