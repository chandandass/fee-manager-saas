import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
} from "@/infrastructure/supabase/client";

/** Save institute name + optional phone after first Google login. */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  try {
    const body = await req.json();
    const userId = String(body.userId || "");
    const instituteName = String(body.instituteName || "").trim().slice(0, 120);
    const phone = String(body.phone || "")
      .replace(/\D/g, "")
      .slice(-10);
    const ownerName = String(body.ownerName || "").trim().slice(0, 80);

    if (!userId || !instituteName) {
      return NextResponse.json(
        { ok: false, error: "Institute name is required" },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    const patch: Record<string, unknown> = {
      name: instituteName,
      updated_at: new Date().toISOString(),
    };
    if (phone) patch.phone = phone;
    if (ownerName) patch.owner_name = ownerName;

    const { data, error } = await admin
      .from("institutes")
      .update(patch)
      .eq("owner_user_id", userId)
      .select("id, name, phone")
      .maybeSingle();

    if (error) {
      console.error("[onboarding]", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, error: "Institute not found for user" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, institute: data });
  } catch (e) {
    console.error("[onboarding]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
