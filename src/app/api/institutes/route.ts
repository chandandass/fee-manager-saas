import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
} from "@/infrastructure/supabase/client";
import { isPlatformOwner } from "@/lib/platform";

/** Create institute — platform owner can attach teacher email for later claim */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  try {
    const body = await req.json();
    const actorEmail = String(body.actorEmail || "").toLowerCase();
    const actorUserId = String(body.actorUserId || "");
    const name = String(body.name || "").trim().slice(0, 120);
    const ownerName = String(body.ownerName || "").trim().slice(0, 80);
    const phone = String(body.phone || "").replace(/\D/g, "").slice(-10);
    const teacherEmail = String(body.email || body.teacherEmail || "")
      .trim()
      .toLowerCase();
    const ownerUserId = body.ownerUserId
      ? String(body.ownerUserId)
      : actorUserId;

    if (!name) {
      return NextResponse.json(
        { ok: false, error: "Name required" },
        { status: 400 }
      );
    }

    const owner = isPlatformOwner(actorEmail);
    if (!owner && ownerUserId !== actorUserId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Only platform owner can pre-assign a teacher email without linking user yet
    if (teacherEmail && !owner) {
      return NextResponse.json(
        { ok: false, error: "Only platform owner can set teacher email" },
        { status: 403 }
      );
    }

    const admin = getSupabaseAdmin();

    if (teacherEmail) {
      const { data: taken } = await admin
        .from("institutes")
        .select("id, name")
        .eq("email", teacherEmail)
        .maybeSingle();
      if (taken) {
        return NextResponse.json(
          {
            ok: false,
            error: `Email already linked to "${taken.name}"`,
          },
          { status: 409 }
        );
      }
    }

    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 7);

    const insert: Record<string, unknown> = {
      name,
      owner_name: ownerName || name,
      phone: phone || "",
      plan: "trial",
      trial_ends_at: trialEnds.toISOString(),
      // Owner-created for a teacher: leave owner_user_id null until they sign in
      owner_user_id: teacherEmail ? null : ownerUserId || null,
      email: teacherEmail || null,
    };

    const { data, error } = await admin
      .from("institutes")
      .insert(insert)
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

  try {
    const body = await req.json();
    const actorEmail = String(body.actorEmail || "").toLowerCase();
    const actorUserId = String(body.actorUserId || "");
    const instituteId = String(body.instituteId || "");
    if (!instituteId) {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const owner = isPlatformOwner(actorEmail);

    if (!owner) {
      const { data: row } = await admin
        .from("institutes")
        .select("owner_user_id")
        .eq("id", instituteId)
        .maybeSingle();
      if (!row || row.owner_user_id !== actorUserId) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.name !== undefined) patch.name = String(body.name).trim().slice(0, 120);
    if (body.ownerName !== undefined)
      patch.owner_name = String(body.ownerName).trim().slice(0, 80);
    if (body.phone !== undefined)
      patch.phone = String(body.phone).replace(/\D/g, "").slice(-10);

    // Only platform owner can change / set teacher email
    if (body.email !== undefined || body.teacherEmail !== undefined) {
      if (!owner) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const teacherEmail = String(body.email || body.teacherEmail || "")
        .trim()
        .toLowerCase();
      patch.email = teacherEmail || null;
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
