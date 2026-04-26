/**
 * Player customization — choose the Ancient Elf-Mage's robe color, cap style,
 * and staff orb color before starting a new game. Persists in localStorage so
 * the same look carries across save slots until the player changes it.
 */

export type RobeId = "violet" | "crimson" | "moss" | "midnight" | "ash";
export type HoodId = "down" | "up" | "wizard" | "circlet";
export type OrbId  = "azure" | "emerald" | "amber" | "rose" | "void";

export const ROBES: { id: RobeId; name: string; primary: number; trim: number }[] = [
  { id: "violet",   name: "Аметистовая мантия",  primary: 0x3a1f54, trim: 0x8c6a36 },
  { id: "crimson",  name: "Кровавая мантия",     primary: 0x4a1418, trim: 0xa07a30 },
  { id: "moss",     name: "Изумрудная мантия",   primary: 0x224028, trim: 0x9a8a44 },
  { id: "midnight", name: "Тёмная мантия",       primary: 0x141828, trim: 0x6a7a90 },
  { id: "ash",      name: "Пепельная мантия",    primary: 0x4a4a52, trim: 0xb8a880 },
];

export const HOODS: { id: HoodId; name: string }[] = [
  { id: "down",    name: "Капюшон опущен" },
  { id: "up",      name: "Капюшон поднят" },
  { id: "wizard",  name: "Островерхая шляпа" },
  { id: "circlet", name: "Обруч мага" },
];

export const ORBS: { id: OrbId; name: string; color: number; emissive: number }[] = [
  { id: "azure",   name: "Лазурный кристалл",   color: 0x6fc8ff, emissive: 0x6fc8ff },
  { id: "emerald", name: "Изумрудный кристалл", color: 0x6fffa0, emissive: 0x4ade80 },
  { id: "amber",   name: "Янтарный кристалл",   color: 0xffb04a, emissive: 0xffa346 },
  { id: "rose",    name: "Розовый кристалл",    color: 0xff80c0, emissive: 0xff4090 },
  { id: "void",    name: "Кристалл бездны",     color: 0xa080ff, emissive: 0x6028a8 },
];

export interface CharSpec {
  robe: RobeId;
  hood: HoodId;
  orb: OrbId;
}

const DEFAULT: CharSpec = { robe: "violet", hood: "down", orb: "azure" };
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
