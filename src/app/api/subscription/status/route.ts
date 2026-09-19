import { NextRequest, NextResponse } from "next/server";
import {
  SUBSCRIPTION_COOKIE,
  verifySubscriptionToken,
  issueSubscriptionToken,
  type PlanType,
} from "@/infrastructure/auth/subscriptionToken";
import { isSupabaseConfigured } from "@/infrastructure/supabase/client";
import { SupabaseInstituteRepository } from "@/infrastructure/supabase/InstituteRepository";
import { createRepositories } from "@/infrastructure/supabase/InMemoryStore";

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

  try {
    const institute = isSupabaseConfigured()
      ? await new SupabaseInstituteRepository().getCurrent()
      : await createRepositories().institute.getCurrent();

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
        source: isSupabaseConfigured() ? "supabase" : "memory",
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
