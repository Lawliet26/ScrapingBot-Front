/** Fechas relativas al momento de carga, para que la UI siempre muestre "hoy". */
export function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

export function hoursAgo(hours: number): string {
  return minutesAgo(hours * 60)
}

export function daysAgo(days: number): string {
  return hoursAgo(days * 24)
}
