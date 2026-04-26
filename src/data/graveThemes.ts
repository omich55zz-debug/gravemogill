// Themes match against placed catalog ids — see catalog.ts for the full list.

/**
 * Grave themes — special story-driven order variants.
 *
 * Each theme tells the player what kind of decor + tombstone the family
 * expects. If the completed grave matches the theme requirements at the time
 * of completion, the order pays out a bonus and grants extra reputation.
 *
 * Matching is intentionally fuzzy: themes are categorical (e.g. "any flower"),
 * never strict on a specific catalog id, so the player has freedom in what
 * they place — as long as the *kind* of items match.
 */
export type ThemeId = "regular" | "dream" | "horror" | "quiet" | "rich";

export interface ThemeSpec {
  id: ThemeId;
  name: string;       // Russian short name shown in HUD
  description: string;// One-line description shown in order card
  badge: string;      // Single emoji-like glyph for the badge
  badgeColor: number; // Hex color tint for the badge background
  /** Bonus payout multiplier applied when match() returns true. */
  payoutBonus: number;
  /** Extra reputation points awarded when match() returns true. */
  repBonus: number;
}

export const THEMES: Record<ThemeId, ThemeSpec> = {
  regular: {
    id: "regular",
    name: "Обычная",
    description: "Семья хочет достойные простые проводы.",
    badge: "·",
    badgeColor: 0x4a3a22,
    payoutBonus: 0,
    repBonus: 0,
  },
  dream: {
    id: "dream",
    name: "Могила-Мечта",
    description: "Покойный мечтал о светлой памяти. Цветы, букеты, ангел или мрамор.",
    badge: "✿",
    badgeColor: 0x6a4d8a,
    payoutBonus: 0.30,
    repBonus: 4,
  },
  horror: {
    id: "horror",
    name: "Могила-Ужас",
    description: "Семья просит зловещую тему. Череп, кости, мрачное надгробие.",
    badge: "☠",
    badgeColor: 0x6a1a1a,
    payoutBonus: 0.40,
    repBonus: 5,
  },
  quiet: {
    id: "quiet",
    name: "Тихий покой",
    description: "Минимум, но с уважением. Свеча, библия, скромная плита.",
    badge: "✝",
    badgeColor: 0x2a4a3e,
    payoutBonus: 0.18,
    repBonus: 3,
  },
  rich: {
    id: "rich",
    name: "Богатая могила",
    description: "Знатная семья — мрамор/обелиск, кованая ограда, минимум 3 декора.",
    badge: "◆",
    badgeColor: 0x8a6a1a,
    payoutBonus: 0.55,
    repBonus: 6,
  },
};

/** Random theme rollout. Most orders are regular; specials are rarer. */
export function pickTheme(): ThemeId {
  const r = Math.random();
  if (r < 0.55) return "regular";
  if (r < 0.70) return "dream";
  if (r < 0.82) return "horror";
  if (r < 0.92) return "quiet";
  return "rich";
}

export interface PlacedGrave {
  tombstoneId?: string;
  decorations: string[];
  fence?: string;
}

const FLOWER_IDS = new Set([
  "daisy", "rose", "lily", "marigold", "bluebell", "peony", "orchid",
  "ghost_lily", "crimson_rose",
]);

/**
 * Returns true if the placed grave satisfies the theme's qualitative
 * requirements. Always true for "regular".
 */
export function matchesTheme(themeId: ThemeId, grave: PlacedGrave): boolean {
  const tomb = grave.tombstoneId ?? "";
  const ids = new Set(grave.decorations);
  const flowers = grave.decorations.filter(d => FLOWER_IDS.has(d)).length;
  switch (themeId) {
    case "regular":
      return true;
    case "dream":
      // Wants angel/marble headstone OR at least two flowers placed.
      return tomb === "marble_stone" || tomb === "angel_headstone" || flowers >= 2;
    case "horror":
      // Wants a celtic/broken/sarco/cross tombstone AND a wreath decor.
      const darkTomb = tomb === "celtic_cross" || tomb === "broken_stone" ||
                       tomb === "sarcophagus" || tomb === "wood_cross";
      return darkTomb && ids.has("wreath");
    case "quiet":
      // Wants a candle AND a bible on a simple stone/wood headstone.
      const simpleTomb = tomb === "stone_slab" || tomb === "wood_cross";
      return simpleTomb && ids.has("candle") && ids.has("bible");
    case "rich":
      // Wants marble/obelisk/sarco + iron/stone fence + 3+ decor items.
      const richTomb = tomb === "marble_stone" || tomb === "granite_obelisk" ||
                       tomb === "sarcophagus" || tomb === "angel_headstone";
      const fenceOk = grave.fence === "iron_fence" || grave.fence === "stone_fence";
      return richTomb && fenceOk && grave.decorations.length >= 3;
  }
}
