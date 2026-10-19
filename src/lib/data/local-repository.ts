import { createSeedBundle } from "@/lib/domain/seed";
import type { Bundle } from "@/lib/domain/types";
import type { InvitationResult, LifeMapRepository, SignUpResult } from "@/lib/data/repository";

const STORAGE_KEY = "our-life-map.v1";

function isBundle(value: unknown): value is Bundle {
  if (!value || typeof value !== "object") {
    return false;
  }
  const bundle = value as Partial<Bundle>;
  return Boolean(
    bundle.workspace &&
      typeof bundle.workspace.id === "string" &&
      Array.isArray(bundle.projects) &&
      Array.isArray(bundle.tasks) &&
      Array.isArray(bundle.connections) &&
      Array.isArray(bundle.layouts) &&
      Array.isArray(bundle.history) &&
      Array.isArray(bundle.members) &&
      Array.isArray(bundle.invitations) &&
      typeof bundle.viewerId === "string",
  );
}

/**
 * Temporary adapter. Data stays in this browser's localStorage.
 * It does not sync between people and it is not Supabase Realtime.
 */
export class LocalRepository implements LifeMapRepository {
  readonly mode = "local" as const;

  async load(): Promise<Bundle> {
    if (typeof window === "undefined") {
      return createSeedBundle();
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = createSeedBundle();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isBundle(parsed)) {
        throw new Error("Formato local inválido.");
      }
      return parsed;
    } catch {
      const seed = createSeedBundle();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
  }

  async save(next: Bundle): Promise<Bundle> {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
    return next;
  }

  subscribe(): () => void {
    return () => undefined;
  }

  async signIn(): Promise<void> {
    throw new Error("El inicio de sesión real necesita Supabase. Este modo es solo local.");
  }

  async signUp(): Promise<SignUpResult> {
    throw new Error("Crear una cuenta necesita Supabase. Este modo es solo local.");
  }

  async signOut(): Promise<void> {
    return undefined;
  }

  async acceptInvitation(): Promise<InvitationResult> {
    return "local-unavailable";
  }
}

export function resetLocalMap(): Bundle {
  const seed = createSeedBundle();
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  }
  return seed;
}
