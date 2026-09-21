import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
} from "@/infrastructure/supabase/client";

/**
 * One institute per Google user.
 * - New Gmail → create empty trial institute → needsOnboarding: true
 * - Existing → return their institute only (never the demo seed)
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
    const email = String(body.email || "");
    const name = String(body.name || "Teacher").slice(0, 80);
    if (!userId) {
      return NextResponse.json(
        { ok: false, needsOnboarding: true, reason: "no_user" },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();

    const { data: existing, error: findErr } = await admin
      .from("institutes")
      .select("id, name, phone, owner_name")
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
      const incomplete =
        !existing.name ||
        String(existing.name).trim() === "" ||
        String(existing.name).endsWith("'s Tuition") ||
        !existing.phone ||
        String(existing.phone).trim() === "";

      return NextResponse.json({
        ok: true,
        instituteId: existing.id,
        created: false,
        // Phone optional: only force onboarding if name still placeholder
        needsOnboarding:
          !existing.name ||
          String(existing.name).trim() === "" ||
          String(existing.name).endsWith("'s Tuition"),
        incomplete,
      });
    }

    // Brand-new Google account → own blank institute (NOT demo data)
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
      needsOnboarding: true,
    });
  } catch (e) {
    console.error("[ensure-institute]", e);
    return NextResponse.json(
      { ok: false, needsOnboarding: true },
      { status: 500 }
    );
  }
}
