import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
} from "@/infrastructure/supabase/client";
import { isPlatformOwner } from "@/lib/platform";

function isPlaceholderName(name: string | null | undefined): boolean {
  if (!name || !String(name).trim()) return true;
  const n = String(name).trim();
  // Only pure auto-generated placeholders, not real centres named "X Tuition"
  return /^.+'s Tuition$/i.test(n);
}

/**
 * Teacher email on institutes row = source of truth for assignment.
 * Matching Google email always gets that centre (claim / re-claim).
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

    // ——— 1) Match teacher email (admin assigned) — FORCE claim ———
    if (email && !isPlatformOwner(email)) {
      const { data: rows, error: listErr } = await admin
        .from("institutes")
        .select("id, name, phone, owner_name, email, owner_user_id");

      if (listErr) {
        console.error("[ensure-institute] list", listErr);
        return NextResponse.json({
          ok: false,
          needsOnboarding: true,
          reason: listErr.message,
        });
      }

      const byEmail = (rows || []).find(
        (r) => String(r.email || "").toLowerCase().trim() === email
      );

      console.log(
        "[ensure-institute] lookup",
        email,
        "matches",
        byEmail?.id || null,
        "name",
        byEmail?.name || null
      );

      if (byEmail) {
        // Always attach this Google user to the email-matched centre
        const { error: claimErr } = await admin
          .from("institutes")
          .update({
            owner_user_id: userId,
            email,
            updated_at: new Date().toISOString(),
          })
          .eq("id", byEmail.id);

        if (claimErr) {
          console.error("[ensure-institute] claim update", claimErr);
        } else {
          console.log("[ensure-institute] CLAIMED", byEmail.id, "→", userId);
        }

        // Real centre name from admin → go Home, no onboarding form
        const needsOnboarding = isPlaceholderName(byEmail.name);

        return NextResponse.json({
          ok: true,
          instituteId: byEmail.id,
          created: false,
          claimed: true,
          needsOnboarding,
        });
      }
    }

    // ——— 2) Already linked by user id ———
    const { data: existingList, error: findErr } = await admin
      .from("institutes")
      .select("id, name, phone, owner_name, email")
      .eq("owner_user_id", userId);

    if (findErr) {
      console.error("[ensure-institute] find", findErr);
      return NextResponse.json({
        ok: false,
        needsOnboarding: true,
        reason: findErr.message,
      });
    }

    const existing = (existingList || [])[0];
    if (existing) {
      return NextResponse.json({
        ok: true,
        instituteId: existing.id,
        created: false,
        claimed: false,
        needsOnboarding:
          !isPlatformOwner(email) && isPlaceholderName(existing.name),
      });
    }

    // ——— 3) Self-serve new ———
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
