import { LocalRepository } from "@/lib/data/local-repository";
import type { LifeMapRepository } from "@/lib/data/repository";
import { SupabaseRepository } from "@/lib/data/supabase-repository";
import { isSupabaseConfigured } from "@/lib/supabase/env";

let repository: LifeMapRepository | null = null;

export function getRepository(): LifeMapRepository {
  if (!repository) {
    repository = isSupabaseConfigured() ? new SupabaseRepository() : new LocalRepository();
  }
  return repository;
}
