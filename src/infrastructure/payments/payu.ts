import crypto from "crypto";

export type PayUMode = "test" | "live";

export function getPayUConfig() {
  const key = process.env.PAYU_MERCHANT_KEY || "";
  const salt = process.env.PAYU_MERCHANT_SALT || "";
  const mode = (process.env.PAYU_MODE || "test") as PayUMode;
  const amount = process.env.PAYU_PLAN_AMOUNT || "249";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return {
    key,
    salt,
    mode,
    amount,
    appUrl,
    paymentUrl:
      mode === "live"
        ? "https://secure.payu.in/_payment"
        : "https://test.payu.in/_payment",
    isConfigured: Boolean(key && salt),
  };
}

/**
 * Payment hash (server-only):
 * sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
 */
export function generatePaymentHash(params: {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  salt: string;
}): string {
  const {
    key,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    salt,
    udf1 = "",
    udf2 = "",
    udf3 = "",
    udf4 = "",
    udf5 = "",
  } = params;

  const sequence = [
    key,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    udf1,
    udf2,
    udf3,
    udf4,
    udf5,
    "",
    "",
    "",
    "",
    "",
    salt,
  ].join("|");

  return crypto.createHash("sha512").update(sequence).digest("hex");
}

/**
 * Reverse hash from PayU response:
 * sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 */
export function generateReverseHash(params: {
  salt: string;
  status: string;
  email: string;
  firstname: string;
  productinfo: string;
  amount: string;
  txnid: string;
  key: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
}): string {
  const {
    salt,
    status,
    email,
    firstname,
    productinfo,
    amount,
    txnid,
    key,
    udf1 = "",
    udf2 = "",
    udf3 = "",
    udf4 = "",
    udf5 = "",
  } = params;

  const sequence = [
    salt,
    status,
    "",
    "",
    "",
    "",
    "",
    udf5,
    udf4,
    udf3,
    udf2,
    udf1,
    email,
    firstname,
    productinfo,
    amount,
    txnid,
    key,
  ].join("|");

  return crypto.createHash("sha512").update(sequence).digest("hex");
}

export function createTxnId(prefix = "FM"): string {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}
