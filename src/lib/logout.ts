import { getSupabaseBrowser, isSupabaseConfigured } from "@/infrastructure/supabase/client";

/** Clear session + local institute scope, then go to login. */
export async function logoutUser() {
  try {
    if (isSupabaseConfigured()) {
      const sb = getSupabaseBrowser();
      await sb.auth.signOut();
    }
  } catch (e) {
    console.warn("[logout]", e);
  }
  try {
    localStorage.removeItem("fm_institute_id");
    localStorage.removeItem("fm_plan_active_until");
  } catch {
    /* ignore */
  }
  window.location.href = "/login";
}
