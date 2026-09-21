export function isPast(date: Date): boolean {
  return date.getTime() < Date.now();
}
