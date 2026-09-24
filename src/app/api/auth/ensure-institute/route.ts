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
 *  1) Centre with matching teacher email (admin assigned) → auto-claim
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

    // ——— 1) Match by teacher email (admin pre-created) ———
    if (email && !isPlatformOwner(email)) {
      // Fetch candidates with email set; match case-insensitive in JS (reliable)
      const { data: rows, error: emailErr } = await admin
        .from("institutes")
        .select("id, name, phone, owner_name, email, owner_user_id")
        .not("email", "is", null);

      if (emailErr) {
        console.error("[ensure-institute] email list", emailErr);
        // Column missing? common if migration not run
        if (
          emailErr.message?.includes("owner_user_id") ||
          emailErr.message?.includes("does not exist")
        ) {
          return NextResponse.json({
            ok: false,
            needsOnboarding: true,
            reason:
              "DB missing columns. Run supabase/auth_migration.sql in SQL Editor.",
          });
        }
      }

      const byEmail = (rows || []).find(
        (r) => String(r.email || "").toLowerCase().trim() === email
      );

      if (byEmail) {
        const free =
          !byEmail.owner_user_id || byEmail.owner_user_id === userId;

        if (free) {
          const { data: claimed, error: claimErr } = await admin
            .from("institutes")
            .update({
              owner_user_id: userId,
              email,
              owner_name: byEmail.owner_name || name,
              updated_at: new Date().toISOString(),
            })
            .eq("id", byEmail.id)
            .select("id, name")
            .single();

          if (claimErr) {
            console.error("[ensure-institute] claim failed", claimErr);
            // Still return this institute id so UI opens it even if update partially failed
            return NextResponse.json({
              ok: true,
              instituteId: byEmail.id,
              created: false,
              claimed: false,
              needsOnboarding: isPlaceholderName(byEmail.name),
              warn: claimErr.message,
            });
          }

          console.log("[ensure-institute] CLAIMED", claimed?.id, email);
          return NextResponse.json({
            ok: true,
            instituteId: byEmail.id,
            created: false,
            claimed: true,
            needsOnboarding: isPlaceholderName(byEmail.name),
          });
        }

        console.warn(
          "[ensure-institute] email taken by other user",
          byEmail.owner_user_id
        );
      } else {
        console.log("[ensure-institute] no institute with email", email);
      }
    }

    // ——— 2) Already linked by user id ———
    const { data: existingList, error: findErr } = await admin
      .from("institutes")
      .select("id, name, phone, owner_name, email")
      .eq("owner_user_id", userId);

    if (findErr) {
      console.error("[ensure-institute] find", findErr);
      if (findErr.message?.includes("owner_user_id")) {
        return NextResponse.json({
          ok: false,
          needsOnboarding: true,
          reason:
            "DB missing owner_user_id. Run supabase/auth_migration.sql",
        });
      }
      return NextResponse.json({
        ok: false,
        needsOnboarding: true,
        reason: findErr.message,
      });
    }

    const existing = (existingList || [])[0];
    if (existing) {
      if (email && String(existing.email || "").toLowerCase() !== email) {
        await admin.from("institutes").update({ email }).eq("id", existing.id);
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
