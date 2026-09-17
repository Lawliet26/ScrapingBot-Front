const pesosFormatter = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 0,
})

/** "79900.00" -> "79.900" (punto como separador de miles, sin decimales) */
export function formatPesos(value: string | number): string {
  const numeric = typeof value === 'string' ? Number.parseFloat(value) : value
  if (Number.isNaN(numeric)) return '—'
  return pesosFormatter.format(numeric)
}

export interface Oferta {
  cantidad: number
  total: number
}

/** [{cantidad:1,total:79900}] -> "1x $79.900 · 2x $105.900"; vacío -> "—" */
export function formatOfertasSummary(ofertas: Oferta[] | null | undefined): string {
  if (!ofertas || ofertas.length === 0) return '—'
  return ofertas.map((o) => `${o.cantidad}x $${formatPesos(o.total)}`).join(' · ')
}

/** Convierte líneas "1=79900" del textarea al texto plano que espera el multipart */
export function ofertasLinesToPayload(lines: string): string {
  return lines
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n')
}

/** [{cantidad,total}] -> líneas "1=79900" para prefill del textarea al editar */
export function ofertasToLines(ofertas: Oferta[] | null | undefined): string {
  if (!ofertas || ofertas.length === 0) return ''
  return ofertas.map((o) => `${o.cantidad}=${o.total}`).join('\n')
}

/** hora local HH:mm, para la lista de conversaciones */
export function formatTimeHHmm(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
}

/** dd/mm HH:mm, para las notas IA */
export function formatDateDDMMHHmm(iso: string): string {
  const date = new Date(iso)
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const time = date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${dd}/${mm} ${time}`
}

/** m:ss para el timer del grabador de nota de voz */
export function formatDurationMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = Math.floor(totalSeconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** \n -> párrafos, preservando saltos de línea de la descripción del producto */
export function descriptionLines(text: string | null | undefined): string[] {
  if (!text) return []
  return text.split('\n')
}
