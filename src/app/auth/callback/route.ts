import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/infrastructure/supabase/client";

/**
 * OAuth callback: exchange code → session cookies, ensure institute row exists.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/";
  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin;

  if (!code || !isSupabaseConfigured()) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Browser-like client to exchange code (PKCE)
  const supabase = createClient(supabaseUrl, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session || !data.user) {
    console.error("[auth/callback]", error);
    return NextResponse.redirect(`${origin}/login?error=callback`);
  }

  const user = data.user;
  const email = user.email || "";
  const name =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    email.split("@")[0] ||
    "Teacher";

  // First-time: create institute linked to this user
  try {
    const admin = getSupabaseAdmin();
    const { data: existing } = await admin
      .from("institutes")
      .select("id")
      .eq("owner_user_id", user.id)
      .maybeSingle();

    if (!existing) {
      const trialEnds = new Date();
      trialEnds.setDate(trialEnds.getDate() + 7);

      await admin.from("institutes").insert({
        name: `${name}'s Tuition`,
        owner_name: name,
        phone: "",
        email: email || null,
        plan: "trial",
        trial_ends_at: trialEnds.toISOString(),
        owner_user_id: user.id,
      });
    }
  } catch (e) {
    console.error("[auth/callback] institute seed", e);
    // Still allow login — column may not exist until migration
  }

  const res = NextResponse.redirect(`${origin}${next}`);

  // Persist session for the browser client (simple approach: set access tokens via cookies for middleware later)
  // Supabase SSR cookies — store in a readable way for client getSession after redirect
  const maxAge = 60 * 60 * 24 * 7;
  res.cookies.set("sb-access-token", data.session.access_token, {
    path: "/",
    maxAge,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  res.cookies.set("sb-refresh-token", data.session.refresh_token, {
    path: "/",
    maxAge,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return res;
}
