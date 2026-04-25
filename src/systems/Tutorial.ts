// Simple hint-driven tutorial. Stores "seenHints" in localStorage so each
// hint fires at most once across the whole game. GameScene/UIScene call
// `tutorial.trigger(id)` at key moments; if unseen, it returns the text to
// display and marks it seen.

const STORAGE_KEY = "gravemogill.tutorial.v1";

export interface Hint {
  id: string;
  title: string;
  text: string;
}

const HINTS: Record<string, Hint> = {
  welcome: {
    id: "welcome",
    title: "Добро пожаловать!",
    text: "Джойстик слева — передвигает мистера Королёва. Кнопка «Действие» справа — взаимодействие с тем, что под ногами.",
  },
  accept_order: {
    id: "accept_order",
    title: "Приём заказа",
    text: "Слева всплыл новый заказ. Нажми «Принять», чтобы он появился в «Активных заказах» справа.",
  },
  dig_grave: {
    id: "dig_grave",
    title: "Копаем могилу",
    text: "Подойди к участку (размечен верёвкой) и нажми «Действие» → «Копать». Понадобится немного денег.",
  },
  place_tomb: {
    id: "place_tomb",
    title: "Ставим надгробие",
    text: "Над ямой нажми «Действие» и выбери «Надгробие». Тир (скромно/достойно/пышно) должен попасть в запрос клиента.",
  },
  add_decor: {
    id: "add_decor",
    title: "Украшаем",
    text: "Цветы, оградки, фонари и статуи поднимают «шик». Но слишком пышно — тоже плохо: родственники не заплатят.",
  },
  inscribe: {
    id: "inscribe",
    title: "Имя на табличке",
    text: "Перед сдачей впиши имя покойного — без этого заказ не закрыть.",
  },
  complete: {
    id: "complete",
    title: "Сдаём заказ",
    text: "Готово? Снова «Действие» → «Сдать». Деньги пришлют, если попал в тир и уложился в срок.",
  },
  paths: {
    id: "paths",
    title: "Дорожки",
    text: "Пробел / отдельная кнопка — кладёт дорожку у ног. Каждый день они приносят пассивный доход. Соседние дорожки усиливают друг друга.",
  },
  cat: {
    id: "cat",
    title: "Помощница",
    text: "Кошка находит кристаллы — подходи и собирай. Редкие фиолетовые дают в разы больше денег.",
  },
};

interface State {
  seen: Record<string, true>;
}

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { seen: {} };
    return { seen: {}, ...JSON.parse(raw) };
  } catch {
    return { seen: {} };
  }
}

function save(state: State) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

class Tutorial {
  private state: State = load();

  /** Returns the hint if it hasn't been shown yet, else null. Marks it seen. */
  trigger(id: keyof typeof HINTS): Hint | null {
    if (this.state.seen[id]) return null;
    this.state.seen[id] = true;
    save(this.state);
    return HINTS[id] ?? null;
  }

  /** Resets all seen hints (for debug). */
  reset() {
    this.state = { seen: {} };
    save(this.state);
  }
}

export const tutorial = new Tutorial();
