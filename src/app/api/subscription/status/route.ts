import { NextRequest, NextResponse } from "next/server";
import {
  SUBSCRIPTION_COOKIE,
  verifySubscriptionToken,
  issueSubscriptionToken,
  type PlanType,
} from "@/infrastructure/auth/subscriptionToken";
import { isSupabaseConfigured, getSupabaseAdmin } from "@/infrastructure/supabase/client";
import { instituteIdFromCookieHeader } from "@/infrastructure/supabase/instituteContext";
import {
  getVerifiedUser,
  canAccessInstitute,
} from "@/infrastructure/supabase/serverAuth";

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get(SUBSCRIPTION_COOKIE)?.value;
  const verified = verifySubscriptionToken(cookie);

  if (verified.ok) {
    return NextResponse.json({
      active: true,
      plan: verified.claims.plan,
      accessUntil: verified.claims.accessUntil,
      source: "token",
    });
  }

  const user = await getVerifiedUser();
  // Not signed in → soft inactive (no data leak)
  if (!user) {
    return NextResponse.json({
      active: false,
      plan: "expired",
      accessUntil: null,
      reason: "no_session",
    });
  }

  const instituteId =
    instituteIdFromCookieHeader(req.headers.get("cookie")) ||
    req.nextUrl.searchParams.get("instituteId");

  if (!instituteId || !isSupabaseConfigured()) {
    return NextResponse.json({
      active: false,
      plan: "expired",
      accessUntil: null,
      reason: "no_institute",
    });
  }

  // Must own / be assigned this centre (or platform owner)
  const allowed = await canAccessInstitute(user, instituteId);
  if (!allowed) {
    return NextResponse.json({
      active: false,
      plan: "expired",
      accessUntil: null,
      reason: "forbidden",
    });
  }

  try {
    const sb = getSupabaseAdmin();
    const { data: institute, error } = await sb
      .from("institutes")
      .select("id, plan, trial_ends_at, subscription_ends_at")
      .eq("id", instituteId)
      .maybeSingle();

    if (error || !institute) {
      return NextResponse.json({
        active: false,
        plan: "expired",
        accessUntil: null,
        reason: "not_found",
      });
    }

    let accessUntil: Date | null = null;
    let plan: PlanType = "expired";

    if (
      institute.subscription_ends_at &&
      new Date(institute.subscription_ends_at) > new Date()
    ) {
      accessUntil = new Date(institute.subscription_ends_at);
      plan = institute.plan === "pro" ? "pro" : "basic";
    } else if (
      institute.plan === "trial" &&
      institute.trial_ends_at &&
      new Date(institute.trial_ends_at) > new Date()
    ) {
      accessUntil = new Date(institute.trial_ends_at);
      plan = "trial";
    }

    if (accessUntil) {
      const token = issueSubscriptionToken({
        instituteId: institute.id,
        plan,
        accessUntil,
      });
      const res = NextResponse.json({
        active: true,
        plan,
        accessUntil: accessUntil.toISOString(),
        source: "supabase",
      });
      res.cookies.set(SUBSCRIPTION_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        expires: accessUntil,
      });
      return res;
    }
  } catch (e) {
    console.error("[subscription/status]", e);
  }

  return NextResponse.json({
    active: false,
    plan: "expired",
    accessUntil: null,
    reason: verified.reason || "expired",
  });
}
