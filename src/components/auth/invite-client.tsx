"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { LoginScreen } from "@/components/auth/login-screen";
import { Button } from "@/components/ui/button";
import { getRepository } from "@/lib/data";
import type { InvitationResult } from "@/lib/data/repository";

const COPY: Record<InvitationResult, string> = {
  accepted: "Listo. Ya puedes ver el mapa compartido.",
  "local-unavailable":
    "Esta invitación está guardada solo en el navegador de quien la creó. Sin Supabase no hay sincronización ni forma real de aceptarla.",
  "not-found": "No encontramos esa invitación.",
  "email-mismatch": "Entra con el correo al que se envió la invitación.",
  expired: "La invitación ya no está vigente.",
};

export function InviteClient({ token }: { token: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const mode = getRepository().mode;

  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="w-full max-w-md space-y-4 text-center">
        <p className="font-display text-4xl">Invitación</p>
        <p className="text-sm text-muted-foreground">
          {mode === "local"
            ? "El mapa está en modo local. Un enlace no une dos navegadores."
            : "Acepta para entrar al espacio compartido."}
        </p>
        {message ? <p className="text-sm">{message}</p> : null}
        {needsLogin ? <LoginScreen onSuccess={() => setNeedsLogin(false)} /> : null}
        {!needsLogin ? (
          <Button
            type="button"
            onClick={() => {
              void getRepository()
                .acceptInvitation(token)
                .then((result) => {
                  setMessage(COPY[result]);
                  if (result === "accepted") {
                    router.push("/");
                  }
                })
                .catch((error: unknown) => {
                  if (error instanceof Error && error.name === "AuthRequiredError") {
                    setNeedsLogin(true);
                    setMessage("Entra con el correo invitado.");
                    return;
                  }
                  setMessage(error instanceof Error ? error.message : "No se pudo aceptar.");
                });
            }}
          >
            Aceptar invitación
          </Button>
        ) : null}
      </div>
    </div>
  );
}
