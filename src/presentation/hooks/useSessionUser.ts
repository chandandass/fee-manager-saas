"use client";

import { useEffect, useState } from "react";
import {
  getSupabaseBrowser,
  isSupabaseConfigured,
} from "@/infrastructure/supabase/client";
import { isPlatformOwner } from "@/lib/platform";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  isOwner: boolean;
};

/** Single session read — no extra network beyond Supabase auth storage */
export function useSessionUser() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    const sb = getSupabaseBrowser();
    sb.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (u) {
        const email = u.email || "";
        setUser({
          id: u.id,
          email,
          name:
            (u.user_metadata?.full_name as string) ||
            (u.user_metadata?.name as string) ||
            email.split("@")[0] ||
            "Teacher",
          isOwner: isPlatformOwner(email),
        });
      }
      setLoading(false);
    });
  }, []);

  return { user, loading };
}
