import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "./client";
import { isPlatformOwner } from "@/lib/platform";

export type AuthUser = {
  id: string;
  email: string;
  isOwner: boolean;
};

/**
 * Verified Google/Supabase user from httpOnly session cookies.
 * Uses getUser() (validates JWT with Supabase) — never trust body userId.
 */
export async function getVerifiedUser(): Promise<AuthUser | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const cookieStore = await cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          /* Server Component — ignore */
        }
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const email = (data.user.email || "").toLowerCase().trim();
  return {
    id: data.user.id,
    email,
    isOwner: isPlatformOwner(email),
  };
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ ok: false, error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ ok: false, error: message }, { status: 403 });
}

/**
 * Can this user read/write this institute?
 * - Platform owner: yes
 * - owner_user_id match: yes
 * - email match (assigned teacher): yes
 */
export async function canAccessInstitute(
  user: AuthUser,
  instituteId: string
): Promise<boolean> {
  if (!instituteId) return false;
  if (user.isOwner) return true;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("institutes")
    .select("id, owner_user_id, email")
    .eq("id", instituteId)
    .maybeSingle();

  if (error || !data) return false;
  if (data.owner_user_id === user.id) return true;
  if (
    data.email &&
    String(data.email).toLowerCase().trim() === user.email
  ) {
    return true;
  }
  return false;
}

export async function requireUser(): Promise<
  { user: AuthUser } | { response: NextResponse }
> {
  const user = await getVerifiedUser();
  if (!user) return { response: unauthorized() };
  return { user };
}

export async function requireInstituteAccess(
  instituteId: string
): Promise<
  { user: AuthUser } | { response: NextResponse }
> {
  const user = await getVerifiedUser();
  if (!user) return { response: unauthorized() };
  const ok = await canAccessInstitute(user, instituteId);
  if (!ok) return { response: forbidden("Not your centre") };
  return { user };
}
