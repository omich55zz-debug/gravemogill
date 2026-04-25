// Catalog of buyable items. Each item has a luxury score used to evaluate order quality.

export type ItemCategory = "tombstone" | "flower" | "fence" | "lantern" | "statue";

export interface CatalogItem {
  id: string;
  name: string;
  category: ItemCategory;
  cost: number;
  luxury: number;
  // Key used by the sprite generator to draw the item.
  sprite: string;
}

export const CATALOG: CatalogItem[] = [
  // Tombstones — required on every grave.
  { id: "wood_cross",     name: "Деревянный крест",    category: "tombstone", cost: 30,  luxury: 5,  sprite: "tomb_wood"   },
  { id: "stone_slab",     name: "Каменная плита",      category: "tombstone", cost: 80,  luxury: 15, sprite: "tomb_stone"  },
  { id: "marble_stone",   name: "Мраморное надгробие", category: "tombstone", cost: 180, luxury: 35, sprite: "tomb_marble" },
  { id: "granite_obelisk",name: "Гранитный обелиск",   category: "tombstone", cost: 320, luxury: 65, sprite: "tomb_obelisk"},

  // Flowers — small decor, stacks multiplicatively.
  { id: "daisy",     name: "Ромашки",       category: "flower", cost: 8,  luxury: 3,  sprite: "flower_white"  },
  { id: "rose",      name: "Розы",          category: "flower", cost: 20, luxury: 9,  sprite: "flower_red"    },
  { id: "lily",      name: "Лилии",         category: "flower", cost: 35, luxury: 16, sprite: "flower_yellow" },
  { id: "orchid",    name: "Орхидеи",       category: "flower", cost: 60, luxury: 28, sprite: "flower_purple" },

  // Fences — surround graves.
  { id: "wood_fence",  name: "Дер. оградка",  category: "fence", cost: 25,  luxury: 6,  sprite: "fence_wood"  },
  { id: "iron_fence",  name: "Кованая оградка", category: "fence", cost: 90, luxury: 22, sprite: "fence_iron"  },

  // Lanterns — ambient.
  { id: "oil_lantern", name: "Масляный фонарь", category: "lantern", cost: 40,  luxury: 14, sprite: "lantern_oil"  },
  { id: "brass_lantern", name: "Латунный фонарь", category: "lantern", cost: 110, luxury: 30, sprite: "lantern_brass"},

  // Statues — centrepieces.
  { id: "angel_statue", name: "Статуя ангела", category: "statue", cost: 250, luxury: 55, sprite: "statue_angel" },
];

export function itemById(id: string): CatalogItem | undefined {
  return CATALOG.find(i => i.id === id);
}
