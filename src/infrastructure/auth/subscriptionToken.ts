import crypto from "crypto";

export type PlanType = "trial" | "basic" | "pro" | "expired";

export type SubscriptionClaims = {
  sub: string; // institute id
  plan: PlanType;
  /** unix seconds — token expiry */
  exp: number;
  /** ISO end of paid/trial access */
  accessUntil: string;
};

function secret() {
  return (
    process.env.SUBSCRIPTION_JWT_SECRET ||
    process.env.PAYU_MERCHANT_SALT ||
    "dev-fee-manager-secret-change-me"
  );
}

function b64url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlJson(obj: unknown) {
  return b64url(JSON.stringify(obj));
}

function sign(data: string) {
  return crypto
    .createHmac("sha256", secret())
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/** Issue JWT-like token with plan + access window */
export function issueSubscriptionToken(params: {
  instituteId: string;
  plan: PlanType;
  accessUntil: Date;
}): string {
  const header = b64urlJson({ alg: "HS256", typ: "JWT" });
  const exp = Math.floor(params.accessUntil.getTime() / 1000);
  const payload: SubscriptionClaims = {
    sub: params.instituteId,
    plan: params.plan,
    exp,
    accessUntil: params.accessUntil.toISOString(),
  };
  const body = b64urlJson(payload);
  const sig = sign(`${header}.${body}`);
  return `${header}.${body}.${sig}`;
}

export function verifySubscriptionToken(
  token: string | undefined | null
): { ok: true; claims: SubscriptionClaims } | { ok: false; reason: string } {
  if (!token) return { ok: false, reason: "missing" };
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed" };

  const [header, body, sig] = parts;
  const expected = sign(`${header}.${body}`);
  if (sig !== expected) return { ok: false, reason: "bad_signature" };

  try {
    const json = Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
      "utf8"
    );
    const claims = JSON.parse(json) as SubscriptionClaims;
    const now = Math.floor(Date.now() / 1000);
    if (!claims.exp || claims.exp < now) {
      return { ok: false, reason: "expired" };
    }
    if (new Date(claims.accessUntil).getTime() < Date.now()) {
      return { ok: false, reason: "expired" };
    }
    return { ok: true, claims };
  } catch {
    return { ok: false, reason: "malformed" };
  }
}

export const SUBSCRIPTION_COOKIE = "fm_sub_token";
