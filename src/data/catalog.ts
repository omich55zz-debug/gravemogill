// Catalog of buyable items. Each item has a luxury score used to evaluate order quality.

export type ItemCategory = "tombstone" | "flower" | "fence" | "lantern" | "statue";

/** Rarity of a catalog entry — also used as the tint of loot-box glow. */
export type Rarity = "common" | "rare" | "epic" | "legendary";

export const RARITY_COLORS: Record<Rarity, number> = {
  common:    0xc8cfd6,
  rare:      0x5a9dff,
  epic:      0xb469ff,
  legendary: 0xffb63a,
};

export const RARITY_NAMES: Record<Rarity, string> = {
  common:    "Обычное",
  rare:      "Редкое",
  epic:      "Эпическое",
  legendary: "Легендарное",
};

export interface CatalogItem {
  id: string;
  name: string;
  category: ItemCategory;
  cost: number;
  luxury: number;
  // Key used by the sprite generator to draw the item.
  sprite: string;
  /** Rarity — defaults to common for existing shop entries. */
  rarity?: Rarity;
  /** True if this item can only be obtained from loot boxes (not from shop). */
  lootOnly?: boolean;
}

export const CATALOG: CatalogItem[] = [
  // Tombstones — required on every grave.
  { id: "wood_cross",      name: "Деревянный крест",    category: "tombstone", cost: 30,  luxury: 5,  sprite: "tomb_wood"        },
  { id: "stone_slab",      name: "Каменная плита",      category: "tombstone", cost: 80,  luxury: 15, sprite: "tomb_stone"       },
  { id: "celtic_cross",    name: "Кельтский крест",     category: "tombstone", cost: 130, luxury: 26, sprite: "tomb_celtic"      },
  { id: "broken_stone",    name: "Разбитый камень",     category: "tombstone", cost: 140, luxury: 28, sprite: "tomb_broken"      },
  { id: "marble_stone",    name: "Мраморное надгробие", category: "tombstone", cost: 180, luxury: 35, sprite: "tomb_marble",      rarity: "rare" },
  { id: "sarcophagus",     name: "Саркофаг",            category: "tombstone", cost: 260, luxury: 52, sprite: "tomb_sarcophagus", rarity: "rare" },
  { id: "granite_obelisk", name: "Гранитный обелиск",   category: "tombstone", cost: 320, luxury: 65, sprite: "tomb_obelisk",     rarity: "epic" },
  { id: "angel_headstone", name: "Ангельское надгробие",category: "tombstone", cost: 420, luxury: 82, sprite: "tomb_angel",       rarity: "epic" },

  // Flowers — small decor, stacks multiplicatively.
  { id: "daisy",    name: "Ромашки",  category: "flower", cost: 8,  luxury: 3,  sprite: "flower_white"  },
  { id: "rose",     name: "Розы",     category: "flower", cost: 20, luxury: 9,  sprite: "flower_red"    },
  { id: "lily",     name: "Лилии",    category: "flower", cost: 35, luxury: 16, sprite: "flower_yellow" },
  { id: "marigold", name: "Бархатцы", category: "flower", cost: 42, luxury: 19, sprite: "flower_orange" },
  { id: "bluebell", name: "Колокольчики", category: "flower", cost: 48, luxury: 22, sprite: "flower_blue" },
  { id: "peony",    name: "Пионы",    category: "flower", cost: 55, luxury: 25, sprite: "flower_pink"   },
  { id: "orchid",   name: "Орхидеи",  category: "flower", cost: 60, luxury: 28, sprite: "flower_purple" },
  { id: "ghost_lily", name: "Призрачная лилия", category: "flower", cost: 120, luxury: 50, sprite: "flower_ghost" },
  { id: "crimson_rose", name: "Алая роза", category: "flower", cost: 150, luxury: 62, sprite: "flower_rose" },
  { id: "wreath",   name: "Венок",    category: "flower", cost: 85, luxury: 36, sprite: "decor_wreath"  },
  { id: "candle",   name: "Свеча",    category: "flower", cost: 28, luxury: 12, sprite: "decor_candle"  },
  { id: "bible",    name: "Библия",   category: "flower", cost: 45, luxury: 18, sprite: "decor_bible"   },

  // Fences — surround graves.
  { id: "wood_fence",  name: "Дер. оградка",    category: "fence", cost: 25, luxury: 6,  sprite: "fence_wood" },
  { id: "iron_fence",  name: "Кованая оградка", category: "fence", cost: 90, luxury: 22, sprite: "fence_iron" },
  { id: "stone_fence", name: "Каменная стена",  category: "fence", cost: 170, luxury: 42, sprite: "fence_stone" },

  // Lanterns — ambient.
  { id: "oil_lantern",   name: "Масляный фонарь", category: "lantern", cost: 40,  luxury: 14, sprite: "lantern_oil"   },
  { id: "brass_lantern", name: "Латунный фонарь", category: "lantern", cost: 110, luxury: 30, sprite: "lantern_brass" },

  // Statues — centrepieces.
  { id: "angel_statue", name: "Статуя ангела", category: "statue", cost: 250, luxury: 55, sprite: "statue_angel" },

  // ----- Loot-only exclusives -----
  // Legendary: pulled from Gold chests almost exclusively. Much more luxurious
  // than shop tier, priced as if they went on sale but can't be bought.
  { id: "obsidian_cross",  name: "Обсидиановый крест", category: "tombstone", cost: 900,  luxury: 180, sprite: "tomb_obsidian", rarity: "legendary", lootOnly: true },
  { id: "skull_throne",    name: "Трон из черепов",    category: "statue",    cost: 1200, luxury: 240, sprite: "statue_throne", rarity: "legendary", lootOnly: true },
  { id: "phoenix_lantern", name: "Фонарь-феникс",      category: "lantern",   cost: 600,  luxury: 140, sprite: "lantern_phoenix", rarity: "legendary", lootOnly: true },
  { id: "bone_fence",      name: "Костяная ограда",    category: "fence",     cost: 500,  luxury: 110, sprite: "fence_bone", rarity: "epic", lootOnly: true },
  { id: "eternal_rose",    name: "Вечная роза",        category: "flower",    cost: 280,  luxury: 95,  sprite: "flower_eternal", rarity: "epic", lootOnly: true },
];

/** Effective rarity for an item — common if not explicitly tagged. */
export function rarityOf(item: CatalogItem): Rarity {
  return item.rarity ?? "common";
}

export function itemById(id: string): CatalogItem | undefined {
  return CATALOG.find(i => i.id === id);
}
