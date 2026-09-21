/** Client: institute id from login; server falls back to demo only if unset */
export const DEMO_INSTITUTE_ID = "a0000000-0000-4000-8000-000000000001";

export function getActiveInstituteId(): string {
  if (typeof window !== "undefined") {
    try {
      const id = localStorage.getItem("fm_institute_id");
      if (id) return id;
    } catch {
      /* ignore */
    }
  }
  return DEMO_INSTITUTE_ID;
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
