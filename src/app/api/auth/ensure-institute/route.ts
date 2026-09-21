import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/infrastructure/supabase/client";

/** Create institute on first Google login (server, service role). */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, reason: "no_supabase" }, { status: 503 });
  }

  try {
    const body = await req.json();
    const userId = String(body.userId || "");
    const email = String(body.email || "");
    const name = String(body.name || "Teacher");
    if (!userId) {
      return NextResponse.json({ ok: false, reason: "no_user" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: existing } = await admin
      .from("institutes")
      .select("id")
      .eq("owner_user_id", userId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, instituteId: existing.id, created: false });
    }

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
      // Column may be missing — still return ok so user can use app
      console.error("[ensure-institute]", error);
      return NextResponse.json({ ok: false, reason: error.message }, { status: 200 });
    }

    return NextResponse.json({ ok: true, instituteId: data.id, created: true });
  } catch (e) {
    console.error("[ensure-institute]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
