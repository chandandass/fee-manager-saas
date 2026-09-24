import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
} from "@/infrastructure/supabase/client";
import {
  getVerifiedUser,
  unauthorized,
} from "@/infrastructure/supabase/serverAuth";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ institutes: [], role: "none" });
  }

  const user = await getVerifiedUser();
  if (!user) return unauthorized();

  const admin = getSupabaseAdmin();
  const cols =
    "id, name, owner_name, phone, plan, trial_ends_at, subscription_ends_at, owner_user_id, email, monthly_price_inr";

  if (user.isOwner) {
    const { data, error } = await admin
      .from("institutes")
      .select(cols)
      .order("name");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({
      role: "platform_owner",
      institutes: data || [],
    });
  }

  const { data: all, error } = await admin.from("institutes").select(cols).order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const institutes = (all || []).filter((row) => {
    if (row.owner_user_id === user.id) return true;
    if (row.email && String(row.email).toLowerCase().trim() === user.email) {
      return true;
    }
    return false;
  });

  return NextResponse.json({
    role: "tenant",
    institutes,
  });
}
