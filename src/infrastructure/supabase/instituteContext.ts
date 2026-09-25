/**
 * Active institute for the current browser session.
 * Client: localStorage + cookie (so API routes can read it).
 * Server: read cookie only — never localStorage.
 */
export const DEMO_INSTITUTE_ID = "a0000000-0000-4000-8000-000000000001";
export const INSTITUTE_COOKIE = "fm_institute_id";

export function getActiveInstituteId(): string | null {
  if (typeof window !== "undefined") {
    try {
      const id = localStorage.getItem("fm_institute_id");
      if (id && id.length > 10) return id;
    } catch {
      /* ignore */
    }
    // Fallback cookie
    try {
      const m = document.cookie.match(/(?:^|; )fm_institute_id=([^;]*)/);
      if (m?.[1]) return decodeURIComponent(m[1]);
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** Server: pass cookie value from NextRequest */
export function instituteIdFromCookieHeader(
  cookieHeader: string | null | undefined
): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const p of parts) {
    const [k, ...rest] = p.trim().split("=");
    if (k === INSTITUTE_COOKIE) {
      const v = decodeURIComponent(rest.join("=") || "");
      if (v.length > 10) return v;
    }
  }
  return null;
}

export function requireActiveInstituteId(): string {
  const id = getActiveInstituteId();
  if (!id) {
    throw new Error("NO_INSTITUTE");
  }
  return id;
}

export function setActiveInstituteId(id: string) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("fm_institute_id", id);
    } catch {
      /* ignore */
    }
    // Readable by server API routes (not httpOnly so client can set it)
    const maxAge = 60 * 60 * 24 * 180;
    document.cookie = `${INSTITUTE_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }
}

export function clearActiveInstituteId() {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("fm_institute_id");
      localStorage.removeItem("fm_cached_institute_data");
    } catch {
      /* ignore */
    }
    document.cookie = `${INSTITUTE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  }
}

export const CACHED_INSTITUTE_KEY = "fm_cached_institute_data";

export function getCachedInstitute(): any | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHED_INSTITUTE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.id && parsed.name) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function setCachedInstitute(inst: any) {
  if (typeof window === "undefined" || !inst) return;
  try {
    localStorage.setItem(CACHED_INSTITUTE_KEY, JSON.stringify(inst));
    if (inst.id) {
      setActiveInstituteId(inst.id);
    }
  } catch {
    /* ignore */
  }
}

