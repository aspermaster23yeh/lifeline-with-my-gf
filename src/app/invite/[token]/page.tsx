import { Suspense } from "react";

import { InviteClient } from "@/components/auth/invite-client";

async function InviteGate({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InviteClient token={token} />;
}

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<p className="grid min-h-dvh place-items-center text-sm text-muted-foreground">Abriendo invitación…</p>}>
      <InviteGate params={params} />
    </Suspense>
  );
}
