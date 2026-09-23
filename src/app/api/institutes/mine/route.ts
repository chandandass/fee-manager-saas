import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
} from "@/infrastructure/supabase/client";
import { isPlatformOwner } from "@/lib/platform";

/**
 * GET ?email=&userId=
 * - Platform owner → all institutes (one query)
 * - Tenant → only rows where owner_user_id = userId
 */
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
      .select("id, name, owner_name, phone, plan, trial_ends_at, subscription_ends_at, owner_user_id, email")
      .order("name");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({
      role: "platform_owner",
      institutes: data || [],
    });
  }

  if (!userId) {
    return NextResponse.json({ role: "tenant", institutes: [] });
  }

  const { data, error } = await admin
    .from("institutes")
    .select("id, name, owner_name, phone, plan, trial_ends_at, subscription_ends_at, owner_user_id, email")
    .eq("owner_user_id", userId)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    role: "tenant",
    institutes: data || [],
  });
}
