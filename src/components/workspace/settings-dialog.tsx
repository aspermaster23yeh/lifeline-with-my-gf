"use client";

import { useState } from "react";
import { useTheme } from "next-themes";

import { MemberAvatar } from "@/components/people";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getRepository } from "@/lib/data";
import { useUiStore } from "@/lib/store/ui-store";
import { useWorkspaceStore } from "@/lib/store/workspace-store";

export function SettingsDialog() {
  const open = useUiStore((state) => state.settingsOpen);
  const setOpen = useUiStore((state) => state.setSettingsOpen);
  const showOriginal = useUiStore((state) => state.showOriginalDates);
  const setShowOriginal = useUiStore((state) => state.setShowOriginalDates);
  const bundle = useWorkspaceStore((state) => state.bundle);
  const rename = useWorkspaceStore((state) => state.renameWorkspace);
  const invite = useWorkspaceStore((state) => state.invite);
  const restore = useWorkspaceStore((state) => state.restoreExample);
  const signOut = useWorkspaceStore((state) => state.signOut);
  const { theme, setTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const mode = getRepository().mode;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Espacio compartido</DialogTitle>
          <DialogDescription>
            {mode === "local"
              ? "Modo local: los cambios se guardan en este navegador. No hay sincronización entre personas."
              : "Los cambios se guardan en Supabase y se escuchan en tiempo real."}
          </DialogDescription>
        </DialogHeader>
        <label className="block space-y-1 text-sm">
          <span className="text-xs text-muted-foreground">Nombre</span>
          <Input
            defaultValue={bundle?.workspace.name ?? ""}
            key={bundle?.workspace.name}
            onBlur={(event) => rename(event.target.value)}
          />
        </label>
        <div className="space-y-2">
          <p className="text-sm font-medium">Personas</p>
          <ul className="space-y-2">
            {bundle?.members.map((member) => (
              <li key={member.userId} className="flex items-center gap-2 text-sm">
                <MemberAvatar member={member} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{member.displayName}</span>
                  <span className="block truncate text-xs text-muted-foreground">{member.email}</span>
                </span>
                <span className="text-xs text-muted-foreground">{member.role === "owner" ? "Crea el espacio" : "Edita"}</span>
              </li>
            ))}
          </ul>
          {mode === "local" ? (
            <p className="text-xs text-muted-foreground">
              “Pareja” es un participante de ejemplo. No está conectado en vivo.
            </p>
          ) : null}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const token = invite(email);
            if (!token || typeof window === "undefined") {
              return;
            }
            setLink(`${window.location.origin}/invite/${token}`);
            setEmail("");
          }}
        >
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="correo@ejemplo.com"
            aria-label="Invitar por correo"
          />
          <Button type="submit" variant="outline">
            Invitar
          </Button>
        </form>
        {link ? (
          <p className="text-xs break-all text-muted-foreground">
            Enlace de invitación: {link}
            {mode === "local" ? " Aceptarlo requiere Supabase; aquí solo queda registrado." : ""}
          </p>
        ) : null}
        {bundle?.invitations.filter((invitation) => invitation.status === "pending").length ? (
          <ul className="text-xs text-muted-foreground">
            {bundle.invitations
              .filter((invitation) => invitation.status === "pending")
              .map((invitation) => (
                <li key={invitation.id}>Pendiente: {invitation.email}</li>
              ))}
          </ul>
        ) : null}
        <div className="flex items-center justify-between gap-3 text-sm">
          <span>Mostrar la fecha original si el proyecto se reprogramó</span>
          <input
            type="checkbox"
            checked={showOriginal}
            onChange={(event) => setShowOriginal(event.target.checked)}
            aria-label="Mostrar fecha original"
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant={theme === "light" ? "default" : "outline"} onClick={() => setTheme("light")}>
            Claro
          </Button>
          <Button type="button" variant={theme === "dark" ? "default" : "outline"} onClick={() => setTheme("dark")}>
            Oscuro
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">Atajos</p>
          <p>⌘Z deshacer · ⌘⇧Z rehacer · ⌘K buscar · T hoy · N proyecto · 1 mapa · 2 resumen · Esc cerrar</p>
        </div>
        {mode === "local" ? (
          <Button type="button" variant="outline" onClick={restore}>
            Restaurar el ejemplo
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={() => void signOut()}>
            Cerrar sesión
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
