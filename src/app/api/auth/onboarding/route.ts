import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
} from "@/infrastructure/supabase/client";

/**
 * Save centre details after first Google login.
 * If institute row is missing (ensure-institute failed), CREATE it.
 * Otherwise UPDATE by owner_user_id.
 */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  }

  try {
    const body = await req.json();
    const userId = String(body.userId || "");
    const email = String(body.email || "").trim().toLowerCase();
    const instituteName = String(body.instituteName || "").trim().slice(0, 120);
    const phone = String(body.phone || "")
      .replace(/\D/g, "")
      .slice(-10);
    const ownerName = String(body.ownerName || "").trim().slice(0, 80);

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Not signed in" },
        { status: 401 }
      );
    }
    if (!instituteName) {
      return NextResponse.json(
        { ok: false, error: "Institute name is required" },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 7);

    // Find existing centre for this Google user
    const { data: existing, error: findErr } = await admin
      .from("institutes")
      .select("id")
      .eq("owner_user_id", userId)
      .maybeSingle();

    if (findErr) {
      console.error("[onboarding] find", findErr);
      return NextResponse.json(
        { ok: false, error: findErr.message },
        { status: 500 }
      );
    }

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
        .select("id, name, phone, owner_name")
        .single();

      if (error) {
        console.error("[onboarding] update", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, institute: data, created: false });
    }

    // No row yet → create (this fixes "Institute not found for user")
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
      console.error("[onboarding] insert", error);
      // Common: missing owner_user_id column
      if (error.message?.includes("owner_user_id")) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "DB missing owner_user_id. Run supabase/auth_migration.sql in SQL Editor.",
          },
          { status: 500 }
        );
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, institute: data, created: true });
  } catch (e) {
    console.error("[onboarding]", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
