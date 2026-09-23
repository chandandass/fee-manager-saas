import {
  getSupabaseBrowser,
  isSupabaseConfigured,
} from "@/infrastructure/supabase/client";
import { clearActiveInstituteId } from "@/infrastructure/supabase/instituteContext";

export async function logoutUser() {
  try {
    if (isSupabaseConfigured()) {
      const sb = getSupabaseBrowser();
      await sb.auth.signOut();
    }
  } catch (e) {
    console.warn("[logout]", e);
  }
  clearActiveInstituteId();
  try {
    localStorage.removeItem("fm_plan_active_until");
  } catch {
    /* ignore */
  }
  window.location.href = "/login";
}
