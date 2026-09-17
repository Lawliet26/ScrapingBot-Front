/**
 * Fusiona por id en vez de reemplazar: el poll no siempre devuelve la lista
 * completa (p. ej. notas), así que nunca hay que pisar lo que ya se mostró.
 */
export function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  if (incoming.length === 0) return existing

  const map = new Map(existing.map((item) => [item.id, item]))
  let changed = false

  for (const item of incoming) {
    const prev = map.get(item.id)
    if (!prev || JSON.stringify(prev) !== JSON.stringify(item)) {
      map.set(item.id, item)
      changed = true
    }
  }

  return changed ? Array.from(map.values()) : existing
}
