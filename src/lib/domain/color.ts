const LEGACY_COLORS: Record<string, string> = {
  "#6e8b74": "#34A853",
  "#c4622d": "#4285F4",
  "#3d7a8c": "#FBBC04",
  "#b7893a": "#EA4335",
  "#8a6278": "#4285F4",
  "#3e4a59": "#34A853",
  "#b85c6a": "#FBBC04",
  "#7c8640": "#EA4335",
};

export function inkOn(hex: string): string {
  const value = hex.replace("#", "");
  if (value.length !== 6) {
    return "#ffffff";
  }
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
  return luminance > 170 ? "#1d1d1f" : "#ffffff";
}

export function googleColor(seed: string): string {
  const palette = ["#4285F4", "#EA4335", "#FBBC04", "#34A853"];
  let total = 0;
  for (const char of seed) {
    total += char.charCodeAt(0);
  }
  return palette[total % palette.length] ?? palette[0];
}

export function migrateProjectColor(color: string): string {
  return LEGACY_COLORS[color.toLowerCase()] ?? color;
}
