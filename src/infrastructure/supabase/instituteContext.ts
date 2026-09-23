/**
 * Active institute for the current browser session.
 * Tenants MUST have fm_institute_id set after login — never fall back to demo seed.
 * Demo id is only for unauthenticated / memory mode previews.
 */
export const DEMO_INSTITUTE_ID = "a0000000-0000-4000-8000-000000000001";

export function getActiveInstituteId(): string | null {
  if (typeof window !== "undefined") {
    try {
      const id = localStorage.getItem("fm_institute_id");
      if (id && id.length > 10) return id;
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** Used by repos — throws if missing so we don't leak demo data */
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
  }
}

export function clearActiveInstituteId() {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("fm_institute_id");
    } catch {
      /* ignore */
    }
  }
}
