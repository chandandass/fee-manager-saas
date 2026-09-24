import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
} from "@/infrastructure/supabase/client";
import { isPlatformOwner } from "@/lib/platform";

function isPlaceholderName(name: string | null | undefined): boolean {
  if (!name || !String(name).trim()) return true;
  return String(name).trim().endsWith("'s Tuition");
}

/**
 * Resolve institute for Google user.
 * Priority:
 *  1) Centre pre-created by platform owner with this email (claim)
 *  2) Centre already linked by owner_user_id
 *  3) Create new + onboarding
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

    // ——— 1) Admin pre-assigned this Gmail ———
    if (email && !isPlatformOwner(email)) {
      const { data: byEmail, error: emailErr } = await admin
        .from("institutes")
        .select("id, name, phone, owner_name, email, owner_user_id")
        .ilike("email", email)
        .maybeSingle();

      if (emailErr) {
        console.error("[ensure-institute] email lookup", emailErr);
      }

      if (byEmail) {
        const free =
          !byEmail.owner_user_id || byEmail.owner_user_id === userId;

        if (free) {
          const { error: claimErr } = await admin
            .from("institutes")
            .update({
              owner_user_id: userId,
              email: email, // normalize
              owner_name: byEmail.owner_name || name,
              updated_at: new Date().toISOString(),
            })
            .eq("id", byEmail.id);

          if (claimErr) {
            console.error("[ensure-institute] claim", claimErr);
          } else {
            // Optional: user also has a leftover self-serve placeholder — ignore it
            return NextResponse.json({
              ok: true,
              instituteId: byEmail.id,
              created: false,
              claimed: true,
              needsOnboarding: isPlaceholderName(byEmail.name),
            });
          }
        } else {
          // Email already claimed by someone else
          console.warn(
            "[ensure-institute] email already owned",
            byEmail.owner_user_id
          );
        }
      }
    }

    // ——— 2) Already linked by user id ———
    const { data: existing, error: findErr } = await admin
      .from("institutes")
      .select("id, name, phone, owner_name, email")
      .eq("owner_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
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
      // Keep email in sync for future admin tools
      if (email && existing.email !== email) {
        await admin
          .from("institutes")
          .update({ email })
          .eq("id", existing.id);
      }

      return NextResponse.json({
        ok: true,
        instituteId: existing.id,
        created: false,
        claimed: false,
        needsOnboarding:
          !isPlatformOwner(email) && isPlaceholderName(existing.name),
      });
    }

    // ——— 3) Brand-new self-serve ———
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
