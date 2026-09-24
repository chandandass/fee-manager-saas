import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
} from "@/infrastructure/supabase/client";
import { isPlatformOwner } from "@/lib/platform";

/**
 * Resolve institute for this Google user:
 * 1) Already linked by owner_user_id
 * 2) Pre-created by platform owner with matching email → claim it
 * 3) Else create new blank + onboarding
 */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, needsOnboarding: true, reason: "no_supabase" },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const userId = String(body.userId || "");
    const email = String(body.email || "").toLowerCase().trim();
    const name = String(body.name || "Teacher").slice(0, 80);
    if (!userId) {
      return NextResponse.json(
        { ok: false, needsOnboarding: true, reason: "no_user" },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();

    // 1) Already owns a centre
    const { data: existing, error: findErr } = await admin
      .from("institutes")
      .select("id, name, phone, owner_name, email")
      .eq("owner_user_id", userId)
      .maybeSingle();

    if (findErr) {
      console.error("[ensure-institute] find", findErr);
      return NextResponse.json({
        ok: false,
        needsOnboarding: true,
        reason: findErr.message,
      });
    }

    if (existing) {
      const needsOnboarding =
        !isPlatformOwner(email) &&
        (!existing.name ||
          String(existing.name).trim() === "" ||
          String(existing.name).endsWith("'s Tuition"));

      return NextResponse.json({
        ok: true,
        instituteId: existing.id,
        created: false,
        claimed: false,
        needsOnboarding,
      });
    }

    // 2) Platform owner pre-created centre with this email → claim
    if (email && !isPlatformOwner(email)) {
      const { data: precreated } = await admin
        .from("institutes")
        .select("id, name, phone, owner_name, email, owner_user_id")
        .eq("email", email)
        .maybeSingle();

      if (precreated) {
        // Only claim if not already taken by another user
        if (
          !precreated.owner_user_id ||
          precreated.owner_user_id === userId
        ) {
          const { error: claimErr } = await admin
            .from("institutes")
            .update({
              owner_user_id: userId,
              owner_name: precreated.owner_name || name,
              updated_at: new Date().toISOString(),
            })
            .eq("id", precreated.id);

          if (claimErr) {
            console.error("[ensure-institute] claim", claimErr);
          } else {
            // Real name from admin → skip full onboarding
            const needsOnboarding =
              !precreated.name ||
              String(precreated.name).trim() === "" ||
              String(precreated.name).endsWith("'s Tuition");

            return NextResponse.json({
              ok: true,
              instituteId: precreated.id,
              created: false,
              claimed: true,
              needsOnboarding,
            });
          }
        }
      }
    }

    // 3) Brand-new self-serve user
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 7);

    const { data, error } = await admin
      .from("institutes")
      .insert({
        name: `${name}'s Tuition`,
        owner_name: name,
        phone: "",
        email: email || null,
        plan: "trial",
        trial_ends_at: trialEnds.toISOString(),
        owner_user_id: userId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[ensure-institute] insert", error);
      return NextResponse.json({
        ok: false,
        needsOnboarding: true,
        reason: error.message,
      });
    }

    return NextResponse.json({
      ok: true,
      instituteId: data.id,
      created: true,
      claimed: false,
      needsOnboarding: !isPlatformOwner(email),
    });
  } catch (e) {
    console.error("[ensure-institute]", e);
    return NextResponse.json(
      { ok: false, needsOnboarding: true },
      { status: 500 }
    );
  }
}
