import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
} from "@/infrastructure/supabase/client";
import {
  getVerifiedUser,
  unauthorized,
} from "@/infrastructure/supabase/serverAuth";

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  }

  const user = await getVerifiedUser();
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const instituteName = String(body.instituteName || "").trim().slice(0, 120);
    const phone = String(body.phone || "")
      .replace(/\D/g, "")
      .slice(-10);
    const ownerName = String(body.ownerName || "").trim().slice(0, 80);

    if (!instituteName) {
      return NextResponse.json(
        { ok: false, error: "Institute name is required" },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    const userId = user.id;
    const email = user.email;

    const { data: existing } = await admin
      .from("institutes")
      .select("id")
      .eq("owner_user_id", userId)
      .maybeSingle();

    if (existing?.id) {
      const patch: Record<string, unknown> = {
        name: instituteName,
        updated_at: new Date().toISOString(),
      };
      if (ownerName) patch.owner_name = ownerName;
      if (phone) patch.phone = phone;
      if (email) patch.email = email;

      const { data, error } = await admin
        .from("institutes")
        .update(patch)
        .eq("id", existing.id)
        .eq("owner_user_id", userId) // ownership guard
        .select("id, name, phone, owner_name")
        .single();

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, institute: data, created: false });
    }

    // Also try email-matched centre (admin pre-created)
    if (email) {
      const { data: all } = await admin
        .from("institutes")
        .select("id, email")
        .not("email", "is", null);
      const byEmail = (all || []).find(
        (r) => String(r.email || "").toLowerCase().trim() === email
      );
      if (byEmail) {
        const { data, error } = await admin
          .from("institutes")
          .update({
            name: instituteName,
            owner_name: ownerName || instituteName,
            phone: phone || "",
            owner_user_id: userId,
            email,
            updated_at: new Date().toISOString(),
          })
          .eq("id", byEmail.id)
          .select("id, name, phone, owner_name")
          .single();
        if (error) {
          return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }
        return NextResponse.json({ ok: true, institute: data, created: false });
      }
    }

    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 7);

    const { data, error } = await admin
      .from("institutes")
      .insert({
        name: instituteName,
        owner_name: ownerName || instituteName,
        phone: phone || "",
        email: email || null,
        plan: "trial",
        trial_ends_at: trialEnds.toISOString(),
        owner_user_id: userId,
      })
      .select("id, name, phone, owner_name")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, institute: data, created: true });
  } catch (e) {
    console.error("[onboarding]", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
