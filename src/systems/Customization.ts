/**
 * Player customization — pick Дедушки-могильщика coat color, headwear and
 * lantern color before starting a new game. Persists in localStorage so the
 * same look carries across save slots until the player changes it.
 */

export type RobeId = "violet" | "crimson" | "moss" | "midnight" | "ash";
export type HoodId = "down" | "up" | "wizard" | "circlet";
export type OrbId  = "azure" | "emerald" | "amber" | "rose" | "void";

export const ROBES: { id: RobeId; name: string; primary: number; trim: number }[] = [
  { id: "violet",   name: "Бурый рабочий",     primary: 0x6a4a26, trim: 0x8a4a14 },
  { id: "crimson",  name: "Винный кафтан",     primary: 0x4a2218, trim: 0xa07238 },
  { id: "moss",     name: "Лесной зипун",      primary: 0x2c4028, trim: 0x9a8a44 },
  { id: "midnight", name: "Тёмно-синий бушлат", primary: 0x1a2030, trim: 0x6a7a90 },
  { id: "ash",      name: "Серая роба",         primary: 0x4a4a4a, trim: 0xb8a880 },
];

export const HOODS: { id: HoodId; name: string }[] = [
  { id: "down",    name: "Лысина с венчиком" },
  { id: "up",      name: "Кепка-восьмиклинка" },
  { id: "wizard",  name: "Цилиндр" },
  { id: "circlet", name: "Вязаная шапка" },
];

export const ORBS: { id: OrbId; name: string; color: number; emissive: number }[] = [
  { id: "amber",   name: "Тёплый фонарь",   color: 0xffc864, emissive: 0xff8030 },
  { id: "azure",   name: "Холодный фонарь", color: 0x9fd8ff, emissive: 0x4080c8 },
  { id: "emerald", name: "Зелёный фонарь",  color: 0x9fffaa, emissive: 0x40a060 },
  { id: "rose",    name: "Розовый фонарь",  color: 0xff90c0, emissive: 0xc04080 },
  { id: "void",    name: "Лиловый фонарь",  color: 0xb090ff, emissive: 0x5028a0 },
];

export interface CharSpec {
  robe: RobeId;
  hood: HoodId;
  orb: OrbId;
}

const DEFAULT: CharSpec = { robe: "violet", hood: "down", orb: "amber" };
const KEY = "gravemogill.character.v1";

export function loadCharacter(): CharSpec {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as Partial<CharSpec>;
    return {
      robe: (parsed.robe ?? DEFAULT.robe),
      hood: (parsed.hood ?? DEFAULT.hood),
      orb:  (parsed.orb  ?? DEFAULT.orb),
    };
  } catch { return { ...DEFAULT }; }
}

export function saveCharacter(spec: CharSpec) {
  try {
    localStorage.setItem(KEY, JSON.stringify(spec));
  } catch { /* ignore */ }
}

/** Resolve robe ids to the actual scene colors. */
export function robeColors(id: RobeId) {
  return ROBES.find(r => r.id === id) ?? ROBES[0];
}
export function orbColors(id: OrbId) {
  return ORBS.find(o => o.id === id) ?? ORBS[0];
}
