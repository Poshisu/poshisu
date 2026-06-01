const istCalendarFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export type MealTargetSlot = "breakfast" | "lunch" | "dinner" | "snack" | "beverage" | "other";

const representativeIstTimeBySlot: Record<MealTargetSlot, string> = {
  breakfast: "08:30:00.000",
  lunch: "13:30:00.000",
  dinner: "21:00:00.000",
  snack: "17:00:00.000",
  beverage: "16:00:00.000",
  other: "12:00:00.000",
};

export function getIstCalendarDate(date: Date = new Date()) {
  return istCalendarFormatter.format(date);
}

export function isValidIstCalendarDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00+05:30`);
  return !Number.isNaN(parsed.getTime()) && getIstCalendarDate(parsed) === value;
}

export function getSelectedIstCalendarDate(dateParam: string | undefined, fallbackDate: Date = new Date()) {
  return isValidIstCalendarDate(dateParam) ? dateParam : getIstCalendarDate(fallbackDate);
}

export function getRelativeIstCalendarDate(offsetDays: number, from: Date = new Date()) {
  const today = getIstCalendarDate(from);
  const baseNoonUtc = new Date(`${today}T12:00:00+05:30`);
  baseNoonUtc.setUTCDate(baseNoonUtc.getUTCDate() + offsetDays);
  return getIstCalendarDate(baseNoonUtc);
}

export function targetLoggedAtForIstDate(calendarDate: string, mealSlot: MealTargetSlot = "other") {
  if (!isValidIstCalendarDate(calendarDate)) {
    throw new Error("Invalid target local date");
  }

  const time = representativeIstTimeBySlot[mealSlot] ?? representativeIstTimeBySlot.other;
  return new Date(`${calendarDate}T${time}+05:30`).toISOString();
}
