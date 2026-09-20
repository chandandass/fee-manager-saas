import { createRepositories as createInMemory } from "@/infrastructure/supabase/InMemoryStore";
import { isSupabaseConfigured } from "@/infrastructure/supabase/client";
import { SupabaseInstituteRepository } from "@/infrastructure/supabase/InstituteRepository";
import { SupabaseBatchRepository } from "@/infrastructure/supabase/BatchRepository";
import { SupabaseStudentRepository } from "@/infrastructure/supabase/StudentRepository";
import { SupabaseFeeRepository } from "@/infrastructure/supabase/FeeRepository";

/**
 * Single entry for all app data access.
 * When Supabase env is set → full DB.
 * Otherwise → in-memory (local demo without keys).
 */
export function createRepositories() {
  if (!isSupabaseConfigured()) {
    return createInMemory();
  }

  return {
    institute: new SupabaseInstituteRepository(),
    batches: new SupabaseBatchRepository(),
    students: new SupabaseStudentRepository(),
    fees: new SupabaseFeeRepository(),
    attendance: createInMemory().attendance,
  };
}
