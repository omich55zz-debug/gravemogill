// Simple shop: permanent shovel upgrades persisted to localStorage.
// Higher tier shovels reduce dig cost and (in the future) speed up digging.

const STORAGE_KEY = "gravemogill.shop.v1";

export type ShovelTier = "wood" | "bronze" | "steel" | "mythril";

export interface ShovelDef {
  tier: ShovelTier;
  name: string;
  cost: number;
  digCostMultiplier: number; // applied to CONFIG.DIG_COST
  description: string;
  icon: string;
}

export const SHOVELS: ShovelDef[] = [
  { tier: "wood",    name: "Деревянная лопата",  cost: 0,    digCostMultiplier: 1.0,  description: "Стартовая.", icon: "⛏" },
  { tier: "bronze",  name: "Бронзовая лопата",   cost: 150,  digCostMultiplier: 0.8,  description: "−20% стоимость копки.", icon: "⛏" },
  { tier: "steel",   name: "Стальная лопата",    cost: 500,  digCostMultiplier: 0.6,  description: "−40% стоимость копки.", icon: "⛏" },
  { tier: "mythril", name: "Мифриловая лопата",  cost: 1500, digCostMultiplier: 0.35, description: "−65% стоимость копки.", icon: "❖" },
];

export interface HelperDef {
  id: string;
  name: string;
  cost: number;
  monthlyFee: number; // deducted once per in-game day
  description: string;
  icon: string;
}

export const HELPERS: HelperDef[] = [
  { id: "digger",  name: "Помощник-землекоп",   cost: 250, monthlyFee: 20, description: "Самостоятельно копает 1 могилу в день.", icon: "⛏" },
  { id: "florist", name: "Помощник-флорист",    cost: 200, monthlyFee: 15, description: "Приносит цветы даром (1/день).", icon: "✿" },
];

interface ShopState {
  tier: ShovelTier;
  helpers: string[]; // ids of hired helpers
}

function defaultState(): ShopState {
  return { tier: "wood", helpers: [] };
}

function load(): ShopState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    return defaultState();
  }
}

function persist(s: ShopState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

class Shop {
  private state: ShopState = load();

  get tier(): ShovelTier { return this.state.tier; }
  get helpers(): string[] { return [...this.state.helpers]; }

  getShovel(): ShovelDef {
    return SHOVELS.find(s => s.tier === this.state.tier) ?? SHOVELS[0];
  }

  digCostMultiplier(): number {
    return this.getShovel().digCostMultiplier;
  }

  /** Set shovel tier. Returns true if an actual change happened. */
  setTier(t: ShovelTier): boolean {
    if (this.state.tier === t) return false;
    this.state.tier = t;
    persist(this.state);
    return true;
  }

  hasHelper(id: string): boolean { return this.state.helpers.includes(id); }

  hireHelper(id: string): boolean {
    if (this.hasHelper(id)) return false;
    this.state.helpers.push(id);
    persist(this.state);
    return true;
  }
}

export const shop = new Shop();
