import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
} from "@/infrastructure/supabase/client";
import { isPlatformOwner } from "@/lib/platform";

export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ institutes: [], role: "none" });
  }

  const email = (req.nextUrl.searchParams.get("email") || "").toLowerCase();
  const userId = req.nextUrl.searchParams.get("userId") || "";

  const admin = getSupabaseAdmin();
  const owner = isPlatformOwner(email);

  if (owner) {
    const { data, error } = await admin
      .from("institutes")
      .select(
        "id, name, owner_name, phone, plan, trial_ends_at, subscription_ends_at, owner_user_id, email"
      )
      .order("name");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({
      role: "platform_owner",
      institutes: data || [],
    });
  }

  if (!userId && !email) {
    return NextResponse.json({ role: "tenant", institutes: [] });
  }

  // Tenant: centres they own OR pre-assigned to their email (not yet claimed)
  let q = admin
    .from("institutes")
    .select(
      "id, name, owner_name, phone, plan, trial_ends_at, subscription_ends_at, owner_user_id, email"
    )
    .order("name");

  if (userId && email) {
    q = q.or(`owner_user_id.eq.${userId},email.ilike.${email}`);
  } else if (userId) {
    q = q.eq("owner_user_id", userId);
  } else {
    q = q.ilike("email", email);
  }

  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    role: "tenant",
    institutes: data || [],
  });
}
