import { NextRequest, NextResponse } from "next/server";
import {
  SUBSCRIPTION_COOKIE,
  verifySubscriptionToken,
  issueSubscriptionToken,
  type PlanType,
} from "@/infrastructure/auth/subscriptionToken";
import { createRepositories } from "@/infrastructure/supabase/InMemoryStore";

/**
 * GET /api/subscription/status
 * Reads cookie JWT (or rebuilds from in-memory institute for demo).
 * Returns whether app features should be fully unlocked.
 */
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

  // Fallback: institute record (trial) — issue token if still valid
  const repos = createRepositories();
  const institute = await repos.institute.getCurrent();

  let accessUntil: Date | null = null;
  let plan: PlanType = "expired";

  if (
    institute.subscriptionEndsAt &&
    new Date(institute.subscriptionEndsAt) > new Date()
  ) {
    accessUntil = new Date(institute.subscriptionEndsAt);
    plan = institute.plan === "pro" ? "pro" : "basic";
  } else if (
    institute.plan === "trial" &&
    institute.trialEndsAt &&
    new Date(institute.trialEndsAt) > new Date()
  ) {
    accessUntil = new Date(institute.trialEndsAt);
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
      source: "institute",
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

  return NextResponse.json({
    active: false,
    plan: "expired",
    accessUntil: null,
    reason: verified.reason || "expired",
  });
}
