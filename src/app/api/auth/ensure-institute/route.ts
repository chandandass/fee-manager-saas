import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
} from "@/infrastructure/supabase/client";
import {
  getVerifiedUser,
  unauthorized,
} from "@/infrastructure/supabase/serverAuth";

function isPlaceholderName(name: string | null | undefined): boolean {
  if (!name || !String(name).trim()) return true;
  return /^.+'s Tuition$/i.test(String(name).trim());
}

/**
 * Session-verified only. Body userId/email ignored for identity.
 */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, needsOnboarding: true, reason: "no_supabase" },
      { status: 503 }
    );
  }

  const user = await getVerifiedUser();
  if (!user) return unauthorized();

  try {
    // Optional display name only — never identity
    let name = "Teacher";
    try {
      const body = await req.json();
      if (body?.name) name = String(body.name).slice(0, 80);
    } catch {
      /* no body */
    }

    const userId = user.id;
    const email = user.email;
    const admin = getSupabaseAdmin();

    // 1) Admin-assigned email → claim
    if (email && !user.isOwner) {
      const { data: rows, error: listErr } = await admin
        .from("institutes")
        .select("id, name, phone, owner_name, email, owner_user_id");

      if (listErr) {
        return NextResponse.json({
          ok: false,
          needsOnboarding: true,
          reason: listErr.message,
        });
      }

      const byEmail = (rows || []).find(
        (r) => String(r.email || "").toLowerCase().trim() === email
      );

      if (byEmail) {
        await admin
          .from("institutes")
          .update({
            owner_user_id: userId,
            email,
            updated_at: new Date().toISOString(),
          })
          .eq("id", byEmail.id);

        return NextResponse.json({
          ok: true,
          instituteId: byEmail.id,
          created: false,
          claimed: true,
          needsOnboarding: isPlaceholderName(byEmail.name),
        });
      }
    }

    // 2) Already owns
    const { data: existingList, error: findErr } = await admin
      .from("institutes")
      .select("id, name, phone, owner_name, email")
      .eq("owner_user_id", userId);

    if (findErr) {
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
        needsOnboarding: !user.isOwner && isPlaceholderName(existing.name),
      });
    }

    // 3) Self-serve
    if (user.isOwner) {
      return NextResponse.json({
        ok: true,
        instituteId: null,
        created: false,
        needsOnboarding: false,
        reason: "owner_use_centres_menu",
      });
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
