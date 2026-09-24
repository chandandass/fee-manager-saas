import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
} from "@/infrastructure/supabase/client";
import {
  getVerifiedUser,
  unauthorized,
  forbidden,
  canAccessInstitute,
} from "@/infrastructure/supabase/serverAuth";

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const user = await getVerifiedUser();
  if (!user) return unauthorized();

  // Only platform owner creates centres for others
  if (!user.isOwner) {
    return forbidden("Only platform owner can create centres here");
  }

  try {
    const body = await req.json();
    const name = String(body.name || "").trim().slice(0, 120);
    const ownerName = String(body.ownerName || "").trim().slice(0, 80);
    const phone = String(body.phone || "").replace(/\D/g, "").slice(-10);
    const teacherEmail = String(body.email || body.teacherEmail || "")
      .trim()
      .toLowerCase();

    if (!name) {
      return NextResponse.json(
        { ok: false, error: "Name required" },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();

    if (teacherEmail) {
      const { data: all } = await admin
        .from("institutes")
        .select("id, name, email")
        .not("email", "is", null);
      const taken = (all || []).find(
        (r) => String(r.email || "").toLowerCase().trim() === teacherEmail
      );
      if (taken) {
        return NextResponse.json(
          { ok: false, error: `Email already linked to "${taken.name}"` },
          { status: 409 }
        );
      }
    }

    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 7);

    const { data, error } = await admin
      .from("institutes")
      .insert({
        name,
        owner_name: ownerName || name,
        phone: phone || "",
        plan: "trial",
        trial_ends_at: trialEnds.toISOString(),
        owner_user_id: null, // teacher claims on login
        email: teacherEmail || null,
      })
      .select("id, name, owner_name, phone, plan, email")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, institute: data });
  } catch (e) {
    console.error("[institutes POST]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const user = await getVerifiedUser();
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const instituteId = String(body.instituteId || "");
    if (!instituteId) {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    }

    const allowed = await canAccessInstitute(user, instituteId);
    if (!allowed) return forbidden();

    // Teacher email only platform owner
    if (
      (body.email !== undefined || body.teacherEmail !== undefined) &&
      !user.isOwner
    ) {
      return forbidden("Only platform owner can set teacher email");
    }

    const admin = getSupabaseAdmin();
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.name !== undefined) patch.name = String(body.name).trim().slice(0, 120);
    if (body.ownerName !== undefined)
      patch.owner_name = String(body.ownerName).trim().slice(0, 80);
    if (body.phone !== undefined)
      patch.phone = String(body.phone).replace(/\D/g, "").slice(-10);
    if (user.isOwner && (body.email !== undefined || body.teacherEmail !== undefined)) {
      patch.email =
        String(body.email || body.teacherEmail || "")
          .trim()
          .toLowerCase() || null;
    }

    const { data, error } = await admin
      .from("institutes")
      .update(patch)
      .eq("id", instituteId)
      .select("id, name, owner_name, phone, plan, email")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, institute: data });
  } catch (e) {
    console.error("[institutes PATCH]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
