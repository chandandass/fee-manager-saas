import { createRepositories as createInMemory } from "@/infrastructure/supabase/InMemoryStore";
import { isSupabaseConfigured } from "@/infrastructure/supabase/client";
import { SupabaseInstituteRepository } from "@/infrastructure/supabase/InstituteRepository";

/**
 * App-wide repositories.
 * Institute → Supabase when configured (plan persists).
 * Students / batches / fees → still in-memory until migrated.
 */
export function createRepositories() {
  const memory = createInMemory();
  if (!isSupabaseConfigured()) return memory;
  return {
    ...memory,
    institute: new SupabaseInstituteRepository(),
  };
}
