import Phaser from "phaser";

// Persistent progress store: daily login streak + unlocked achievements.
// All data lives in localStorage under a single namespaced key so that no
// server is required (it's a local single-player game).

const STORAGE_KEY = "gravemogill.progress.v1";

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string; // single-character glyph for the UI
  rewardCoins: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first_login",
    title: "Первый день",
    description: "Зайти в игру первый раз.",
    icon: "☀",
    rewardCoins: 25,
  },
  {
    id: "first_order",
    title: "Первая скорбящая душа",
    description: "Принять свой первый заказ.",
    icon: "✉",
    rewardCoins: 30,
  },
  {
    id: "first_grave",
    title: "Яма готова",
    description: "Выкопать свою первую могилу.",
    icon: "⛏",
    rewardCoins: 20,
  },
  {
    id: "first_decor",
    title: "С душой",
    description: "Установить первое украшение на могиле.",
    icon: "✿",
    rewardCoins: 20,
  },
  {
    id: "first_complete",
    title: "Дело сделано",
    description: "Сдать первый заказ.",
    icon: "✓",
    rewardCoins: 50,
  },
  {
    id: "path_builder",
    title: "Аллея Королёва",
    description: "Проложить первую дорожку.",
    icon: "▣",
    rewardCoins: 15,
  },
  {
    id: "crystal_finder",
    title: "Кристальный охотник",
    description: "Собрать первый кристалл с помощью кошки.",
    icon: "♦",
    rewardCoins: 20,
  },
  {
    id: "tycoon_100",
    title: "Сотня в кармане",
    description: "Накопить 100₽.",
    icon: "₽",
    rewardCoins: 25,
  },
  {
    id: "tycoon_1000",
    title: "Тысячник",
    description: "Накопить 1000₽.",
    icon: "★",
    rewardCoins: 200,
  },
  {
    id: "five_graves",
    title: "Небольшое кладбище",
    description: "Сдать 5 заказов.",
    icon: "☗",
    rewardCoins: 100,
  },
  {
    id: "streak_3",
    title: "Постоянный клиент",
    description: "Заходить в игру 3 дня подряд.",
    icon: "✦",
    rewardCoins: 75,
  },
  {
    id: "streak_7",
    title: "Неделя скорби",
    description: "Заходить в игру 7 дней подряд.",
    icon: "✧",
    rewardCoins: 200,
  },
  {
    id: "rare_crystal",
    title: "Редкая находка",
    description: "Кошка нашла редкий фиолетовый кристалл.",
    icon: "❖",
    rewardCoins: 150,
  },
  {
    id: "three_perfect",
    title: "Безупречный гробовщик",
    description: "Сдать 3 заказа с вердиктом «Идеально!».",
    icon: "❀",
    rewardCoins: 150,
  },
  {
    id: "twenty_graves",
    title: "Мастер некрополя",
    description: "Сдать 20 заказов.",
    icon: "☠",
    rewardCoins: 400,
  },
];

// Daily rewards: escalate during a streak, reset if a day is missed.
// Index = day in streak (1..7+, capped at 7).
export const DAILY_REWARDS: number[] = [0, 30, 50, 75, 100, 150, 200, 300];

interface ProgressState {
  lastLoginISODate: string | null;
  streak: number;
  unlocked: Record<string, number>; // id -> unlock timestamp
  counters: Record<string, number>; // e.g. ordersCompleted, crystalsCollected
}

function defaultState(): ProgressState {
  return {
    lastLoginISODate: null,
    streak: 0,
    unlocked: {},
    counters: {},
  };
}

function isoDate(d: Date): string {
  // YYYY-MM-DD in local time (not UTC) so "a day" aligns with wall-clock day.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayDiff(a: string, b: string): number {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

export class Progress extends Phaser.Events.EventEmitter {
  private state: ProgressState;

  constructor() {
    super();
    this.state = this.load();
  }

  private load(): ProgressState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw) as Partial<ProgressState>;
      return { ...defaultState(), ...parsed };
    } catch {
      return defaultState();
    }
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      /* ignore (private-mode / quota) */
    }
  }

  /**
   * Register a login. Returns the bonus to award this session (if any), the
   * current streak length, and whether this is a brand-new day (so the UI
   * can show the daily-reward toast).
   */
  registerLogin(now = new Date()): { bonus: number; streak: number; newDay: boolean } {
    const today = isoDate(now);
    const last = this.state.lastLoginISODate;

    let bonus = 0;
    let newDay = false;
    if (last === today) {
      // Already logged in today — no change, no new toast.
      return { bonus: 0, streak: this.state.streak, newDay: false };
    }

    newDay = true;
    if (last == null) {
      this.state.streak = 1;
    } else {
      const diff = dayDiff(last, today);
      if (diff === 1) this.state.streak += 1;
      else if (diff > 1) this.state.streak = 1;
      // diff == 0 handled above; diff < 0 (clock rewound) keep streak.
    }

    this.state.lastLoginISODate = today;
    const idx = Math.min(this.state.streak, DAILY_REWARDS.length - 1);
    bonus = DAILY_REWARDS[idx];
    this.save();

    // Check streak-based achievements.
    if (this.state.streak >= 3) this.unlock("streak_3");
    if (this.state.streak >= 7) this.unlock("streak_7");
    this.unlock("first_login");

    return { bonus, streak: this.state.streak, newDay };
  }

  getStreak(): number {
    return this.state.streak;
  }

  /** Increment a named counter (e.g. "ordersCompleted"). */
  bump(counter: string, delta = 1): number {
    this.state.counters[counter] = (this.state.counters[counter] ?? 0) + delta;
    this.save();
    return this.state.counters[counter];
  }

  getCounter(counter: string): number {
    return this.state.counters[counter] ?? 0;
  }

  /** Mark an achievement unlocked. Emits "unlocked" with the def if it's new. */
  unlock(id: string): AchievementDef | null {
    if (this.state.unlocked[id]) return null;
    const def = ACHIEVEMENTS.find((a) => a.id === id);
    if (!def) return null;
    this.state.unlocked[id] = Date.now();
    this.save();
    this.emit("unlocked", def);
    return def;
  }

  isUnlocked(id: string): boolean {
    return !!this.state.unlocked[id];
  }

  /** Returns list of achievements with their unlock status, preserving order. */
  list(): Array<AchievementDef & { unlocked: boolean; unlockedAt: number | null }> {
    return ACHIEVEMENTS.map((a) => ({
      ...a,
      unlocked: !!this.state.unlocked[a.id],
      unlockedAt: this.state.unlocked[a.id] ?? null,
    }));
  }

  /** Total count of unlocked achievements. */
  unlockedCount(): number {
    return Object.keys(this.state.unlocked).length;
  }
}

// Shared singleton — one store per browser session.
export const progress = new Progress();
