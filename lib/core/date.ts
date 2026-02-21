export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayKey(): string {
  return formatDateKey(new Date());
}

export function hasDayRolledOver(previousDayKey: string, now: Date = new Date()): boolean {
  return previousDayKey !== formatDateKey(now);
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

export function getYearDayKeys(year: number): string[] {
  const total = daysInYear(year);
  const start = new Date(year, 0, 1);
  return Array.from({ length: total }, (_, index) => {
    const d = new Date(start);
    d.setDate(start.getDate() + index);
    return formatDateKey(d);
  });
}
