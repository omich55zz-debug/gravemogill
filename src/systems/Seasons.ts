/**
 * 4-season rotation tied to the in-game day counter.
 *
 * Each season lasts SEASON_LEN_DAYS and visually re-tints the world
 * (grass, leaves, pond surface). The Weather system stays independent
 * — rain can still happen in any season.
 */

export type Season = "summer" | "autumn" | "winter" | "spring";

export const SEASONS: Season[] = ["summer", "autumn", "winter", "spring"];
export const SEASON_LEN_DAYS = 5;

export const SEASON_NAMES_RU: Record<Season, string> = {
  summer: "Лето",
  autumn: "Осень",
  winter: "Зима",
  spring: "Весна",
};

export const SEASON_ICONS: Record<Season, string> = {
  summer: "☀",
  autumn: "🍂",
  winter: "❄",
  spring: "🌸",
};

/** Day 1-5 summer, 6-10 autumn, 11-15 winter, 16-20 spring, wraps. */
export function seasonForDay(day: number): Season {
  const idx = Math.floor(((day - 1) % (SEASONS.length * SEASON_LEN_DAYS)) / SEASON_LEN_DAYS);
  return SEASONS[Math.max(0, idx)];
}

/** Days remaining in the current season (inclusive of today). */
export function daysLeftInSeason(day: number): number {
  const within = ((day - 1) % SEASON_LEN_DAYS) + 1;
  return SEASON_LEN_DAYS - within + 1;
}
