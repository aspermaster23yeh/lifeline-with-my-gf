import type { Bundle } from "@/lib/domain/types";

export class ConflictError extends Error {
  constructor(message = "El mapa cambió en otro lugar.") {
    super(message);
    this.name = "ConflictError";
  }
}

export class AuthRequiredError extends Error {
  constructor() {
    super("Necesitas entrar para abrir este mapa.");
    this.name = "AuthRequiredError";
  }
}

export type InvitationResult =
  | "accepted"
  | "local-unavailable"
  | "not-found"
  | "email-mismatch"
  | "expired";

export type SignUpResult = { needsConfirmation: boolean };

export interface LifeMapRepository {
  readonly mode: "local" | "supabase";
  load(): Promise<Bundle>;
  save(next: Bundle, baseline: Bundle): Promise<Bundle>;
  subscribe(workspaceId: string, onRemote: () => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string, displayName: string): Promise<SignUpResult>;
  signOut(): Promise<void>;
  acceptInvitation(token: string): Promise<InvitationResult>;
}
