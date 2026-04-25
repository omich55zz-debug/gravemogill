export type Lang = "ru" | "en";

const STORAGE_KEY = "gravemogill.lang.v1";

const DICT: Record<Lang, Record<string, string>> = {
  ru: {
    settings: "Настройки",
    shop: "Магазин",
    achievements: "Достижения",
    close: "Закрыть",
    master_volume: "Громкость",
    music: "Музыка",
    sfx: "Эффекты",
    language: "Язык",
    export_save: "Экспорт сохранения",
    import_save: "Импорт сохранения",
    shovel_upgrades: "Апгрейды лопаты",
    helpers: "Помощники",
    buy: "Купить",
    hire: "Нанять",
    owned: "Куплено",
    current: "Текущая",
    weather: "Погода",
    day: "День",
  },
  en: {
    settings: "Settings",
    shop: "Shop",
    achievements: "Achievements",
    close: "Close",
    master_volume: "Master Volume",
    music: "Music",
    sfx: "SFX",
    language: "Language",
    export_save: "Export Save",
    import_save: "Import Save",
    shovel_upgrades: "Shovel Upgrades",
    helpers: "Helpers",
    buy: "Buy",
    hire: "Hire",
    owned: "Owned",
    current: "Current",
    weather: "Weather",
    day: "Day",
  },
};

class I18n {
  lang: Lang = "ru";

  constructor() {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === "ru" || v === "en") this.lang = v;
    } catch { /* ignore */ }
  }

  setLang(l: Lang) {
    this.lang = l;
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
  }

  t(key: string): string {
    return DICT[this.lang][key] ?? DICT.ru[key] ?? key;
  }
}

export const i18n = new I18n();
