"use client";

import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { googleColor, inkOn } from "@/lib/domain/color";
import type { Member } from "@/lib/domain/types";

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

export function MemberAvatar({ member, className }: { member: Member; className?: string }) {
  return (
    <Avatar className={className} title={member.displayName}>
      <AvatarFallback style={{ backgroundColor: googleColor(member.userId), color: inkOn(googleColor(member.userId)) }}>
        {initials(member.displayName)}
      </AvatarFallback>
    </Avatar>
  );
}

export function timeAgo(iso: string): string {
  return formatDistanceToNow(new Date(iso), { locale: es, addSuffix: true });
}

export function memberName(members: Member[], userId: string | null): string {
  if (!userId) {
    return "Sin asignar";
  }
  return members.find((member) => member.userId === userId)?.displayName ?? "Alguien";
}

export function currency(value: number | null): string {
  if (value === null) {
    return "Sin presupuesto";
  }
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}
