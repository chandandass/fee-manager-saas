import { createRepositories as createInMemory } from "./InMemoryStore";
import { isSupabaseConfigured } from "./client";
import { SupabaseInstituteRepository } from "./InstituteRepository";

/**
 * Prefer Supabase for institute (plan persistence).
 * Students/batches/fees stay in-memory until those repos are migrated.
 */
export function createRepositories() {
  const memory = createInMemory();

  if (!isSupabaseConfigured()) {
    return memory;
  }

  return {
    ...memory,
    institute: new SupabaseInstituteRepository(),
  };
}
