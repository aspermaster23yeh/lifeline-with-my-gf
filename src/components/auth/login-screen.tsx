"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getRepository } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function LoginScreen({ onSuccess }: { onSuccess?: () => void }) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const configured = isSupabaseConfigured();
  const router = useRouter();

  if (!configured) {
    return (
      <div className="grid min-h-dvh place-items-center px-6">
        <div className="max-w-md space-y-3 text-center">
          <p className="font-display text-4xl">Our Life Map</p>
          <p className="text-sm text-muted-foreground">
            Supabase no está configurado. El mapa funciona en modo local, sin cuentas ni sincronización.
          </p>
          <Button type="button" onClick={() => router.push("/")}>
            Volver al mapa
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <form
        className="w-full max-w-sm space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          setMessage(null);
          const repo = getRepository();
          const action =
            mode === "in"
              ? repo.signIn(email, password)
              : repo.signUp(email, password, name || email.split("@")[0] || "Tú");
          void action
            .then((result) => {
              if (mode === "up" && result && "needsConfirmation" in result && result.needsConfirmation) {
                setMessage("Revisa el correo para confirmar la cuenta. Después ya puedes entrar.");
                return;
              }
              onSuccess?.();
              if (!onSuccess) {
                router.push("/");
              }
            })
            .catch((error: unknown) => {
              setMessage(error instanceof Error ? error.message : "No se pudo entrar.");
            })
            .finally(() => setPending(false));
        }}
      >
        <p className="font-display text-4xl">Our Life Map</p>
        <p className="text-sm text-muted-foreground">Entren los dos con el mismo espacio.</p>
        {mode === "up" ? (
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Cómo te llamas" aria-label="Nombre" />
        ) : null}
        <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Correo" aria-label="Correo" />
        <Input type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Contraseña" aria-label="Contraseña" />
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        <Button type="submit" disabled={pending} className="w-full">
          {mode === "in" ? "Entrar" : "Crear cuenta"}
        </Button>
        <button
          type="button"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => setMode(mode === "in" ? "up" : "in")}
        >
          {mode === "in" ? "Crear una cuenta" : "Ya tengo cuenta"}
        </button>
      </form>
    </div>
  );
}
