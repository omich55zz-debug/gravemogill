// Pool of plausible Russian-style names for generated clients / deceased.

const FIRST_M = ["Иван", "Пётр", "Сергей", "Алексей", "Николай", "Дмитрий", "Михаил", "Фёдор", "Василий", "Григорий", "Андрей", "Игорь", "Константин", "Борис"];
const FIRST_F = ["Мария", "Анна", "Елена", "Ольга", "Татьяна", "Ирина", "Людмила", "Галина", "Наталья", "Валентина", "Зинаида", "Лидия", "Екатерина"];
const LAST_M = ["Иванов", "Петров", "Смирнов", "Соколов", "Кузнецов", "Попов", "Васильев", "Павлов", "Семёнов", "Голубев", "Виноградов", "Богданов", "Воробьёв"];
const LAST_F = ["Иванова", "Петрова", "Смирнова", "Соколова", "Кузнецова", "Попова", "Васильева", "Павлова", "Семёнова", "Голубева", "Виноградова", "Богданова", "Воробьёва"];
const PATR_M = ["Иванович", "Петрович", "Сергеевич", "Алексеевич", "Николаевич", "Дмитриевич", "Михайлович", "Фёдорович"];
const PATR_F = ["Ивановна", "Петровна", "Сергеевна", "Алексеевна", "Николаевна", "Дмитриевна", "Михайловна", "Фёдоровна"];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface GeneratedPerson {
  firstName: string;
  patronymic: string;
  lastName: string;
  full: string;
  age: number;
  gender: "m" | "f";
}

export function generatePerson(): GeneratedPerson {
  const gender = Math.random() < 0.5 ? "m" : "f";
  if (gender === "m") {
    const f = pick(FIRST_M);
    const p = pick(PATR_M);
    const l = pick(LAST_M);
    return { firstName: f, patronymic: p, lastName: l, full: `${l} ${f} ${p}`, age: 45 + Math.floor(Math.random() * 50), gender };
  } else {
    const f = pick(FIRST_F);
    const p = pick(PATR_F);
    const l = pick(LAST_F);
    return { firstName: f, patronymic: p, lastName: l, full: `${l} ${f} ${p}`, age: 45 + Math.floor(Math.random() * 50), gender };
  }
}

export function generateClientName(): string {
  return generatePerson().full;
}
