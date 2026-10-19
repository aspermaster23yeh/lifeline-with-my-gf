import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Car,
  Compass,
  Heart,
  House,
  KeyRound,
  Languages,
  PiggyBank,
  Plane,
  Sprout,
  Sun,
  Wallet,
} from "lucide-react";

import type { IconId } from "@/lib/domain/types";

export const PROJECT_ICONS: Record<IconId, LucideIcon> = {
  House,
  PiggyBank,
  Plane,
  Languages,
  Briefcase,
  Sun,
  Car,
  KeyRound,
  Heart,
  Sprout,
  Wallet,
  Compass,
};

export function ProjectIcon({ icon, className }: { icon: string; className?: string }) {
  const Glyph = PROJECT_ICONS[icon as IconId] ?? Compass;
  return <Glyph className={className} aria-hidden />;
}
