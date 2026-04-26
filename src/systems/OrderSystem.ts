import Phaser from "phaser";
import { generatePerson } from "../data/names";
import { reputation } from "./Reputation";
import { pickTheme, THEMES, matchesTheme, type ThemeId, type PlacedGrave } from "../data/graveThemes";

export type OrderTier = "modest" | "decent" | "lavish";

export interface Order {
  id: string;
  deceasedName: string;
  gender: "m" | "f";
  portraitIdx: number;
  // Client pays this if the grave's luxury score lands in [minLuxury, maxLuxury].
  budget: number;
  minLuxury: number;
  maxLuxury: number;
  tier: OrderTier;
  daysAllowed: number;
  dayAccepted: number;
  deadlineDay: number;    // dayAccepted + daysAllowed
  pathBonusTiles: number; // path tiles adjacent at completion
  completed: boolean;
  failed: boolean;
  graveCol?: number;
  graveRow?: number;
  flavor: string;
  theme: ThemeId;
  themeMatched?: boolean;
}

const FLAVORS = [
  "Родственники просят достойные проводы. Уложитесь в смету.",
  "Семья скромная, но желает похоронить с уважением.",
  "Вдова настаивает на аккуратном, но не кричащем оформлении.",
  "Купеческая семья: хотят заметно, но не чересчур.",
  "Просят соответствовать статусу покойного, но не переусердствовать.",
  "Дети покойного строго следят за сметой — лишнего не прощают.",
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

let _seq = 1;

export class OrderSystem extends Phaser.Events.EventEmitter {
  pending: Order[] = [];
  active: Order[] = [];
  history: Order[] = [];

  generate(currentDay: number): Order {
    const tier: OrderTier = pick<OrderTier>(["modest", "modest", "decent", "decent", "lavish"]);
    const person = generatePerson();
    let budget: number, minLuxury: number, maxLuxury: number, daysAllowed: number;
    if (tier === "modest") {
      budget = 110 + Math.floor(Math.random() * 60);     // 110–170
      minLuxury = 8;  maxLuxury = 28;  daysAllowed = 3;
    } else if (tier === "decent") {
      budget = 220 + Math.floor(Math.random() * 90);     // 220–310
      minLuxury = 25; maxLuxury = 60;  daysAllowed = 4;
    } else {
      budget = 480 + Math.floor(Math.random() * 180);    // 480–660
      minLuxury = 55; maxLuxury = 110; daysAllowed = 5;
    }
    const theme = pickTheme();
    const order: Order = {
      id: `o${_seq++}`,
      deceasedName: person.full,
      gender: person.gender,
      portraitIdx: Math.floor(Math.random() * 8),
      budget,
      minLuxury,
      maxLuxury,
      tier,
      daysAllowed,
      dayAccepted: currentDay,
      deadlineDay: currentDay + daysAllowed,
      pathBonusTiles: 0,
      completed: false,
      failed: false,
      flavor: theme === "regular" ? pick(FLAVORS) : THEMES[theme].description,
      theme,
    };
    this.pending.push(order);
    this.emit("offered", order);
    return order;
  }

  accept(order: Order) {
    this.pending = this.pending.filter(o => o.id !== order.id);
    this.active.push(order);
    this.emit("accepted", order);
  }

  decline(order: Order) {
    this.pending = this.pending.filter(o => o.id !== order.id);
    this.emit("declined", order);
  }

  complete(order: Order, actualLuxury: number, pathBonusTiles: number, currentDay: number, grave?: PlacedGrave): {
    payout: number;
    verdict: "perfect" | "under" | "over" | "late";
    themeBonus: number;
  } {
    order.pathBonusTiles = pathBonusTiles;
    let verdict: "perfect" | "under" | "over" | "late" = "perfect";
    let payout = order.budget;
    if (currentDay > order.deadlineDay) {
      verdict = "late";
      payout = Math.floor(order.budget * 0.4);
    } else if (actualLuxury < order.minLuxury) {
      verdict = "under";
      payout = Math.floor(order.budget * 0.55);
    } else if (actualLuxury > order.maxLuxury) {
      // Too lavish — clients can't pay full; you lose the excess margin.
      verdict = "over";
      const overshoot = actualLuxury - order.maxLuxury;
      const penalty = Math.min(0.6, overshoot / 80);
      payout = Math.floor(order.budget * (1 - penalty));
    }
    // Path bonus: each path tile adjacent to the grave gives +3.
    payout += pathBonusTiles * 3;
    // Special-grave theme bonus — paid only if the placed grave matches the
    // theme's requirements at the time of completion.
    let themeBonus = 0;
    if (order.theme && order.theme !== "regular" && grave) {
      const matched = matchesTheme(order.theme, grave);
      order.themeMatched = matched;
      if (matched && verdict !== "late") {
        const spec = THEMES[order.theme];
        themeBonus = Math.floor(payout * spec.payoutBonus);
        payout += themeBonus;
        reputation.awardSpecialGrave(order.theme);
      }
    }
    // Reputation rank gives a flat payout multiplier on perfect / under / over.
    if (verdict !== "late") {
      payout = Math.floor(payout * reputation.multiplier());
    }
    order.completed = true;
    this.active = this.active.filter(o => o.id !== order.id);
    this.history.push(order);
    // Reputation gain depends on verdict.
    if (verdict === "perfect") reputation.awardCompleted(2);
    else if (verdict === "under" || verdict === "over") reputation.awardCompleted(1);
    else reputation.penalizeFailed(1); // "late"
    this.emit("completed", { order, payout, verdict, themeBonus });
    return { payout, verdict, themeBonus };
  }

  checkDeadlines(currentDay: number) {
    for (const o of [...this.active]) {
      if (currentDay > o.deadlineDay && !o.completed) {
        o.failed = true;
        this.active = this.active.filter(x => x.id !== o.id);
        this.history.push(o);
        reputation.penalizeFailed(2);
        this.emit("failed", o);
      }
    }
  }
}
