import type { ConversationListItem, ConversationNote, Message } from '@/api/types'
import { daysAgo, minutesAgo } from './time'

/** Estados de conversación tal como los resuelve el backend (label + color). */
export const LABELS = {
  nuevo: { label: 'Nuevo', color: '#2a5ee8' },
  interesado: { label: 'Interesado', color: '#f2b955' },
  confirmado: { label: 'Confirmado', color: '#22c1a6' },
  sinRespuesta: { label: 'Sin respuesta', color: '#9aa0ad' },
  cancelado: { label: 'Cancelado', color: '#f0546b' },
  humano: { label: 'Atención humana', color: '#a855f7' },
} as const

export interface ConversationRecord {
  summary: ConversationListItem
  messages: Message[]
  notes: ConversationNote[]
  idle_warning: boolean
}

interface MessageSeed {
  from: 'cliente' | 'bot'
  text?: string
  image?: string
  minutesAgo: number
  failed?: boolean
}

function msg(id: string, seed: MessageSeed): Message {
  return {
    id,
    direction: seed.from === 'bot' ? 'outbound' : 'inbound',
    type: seed.image ? 'image' : 'text',
    content: seed.text ?? '',
    status: seed.failed ? 'failed' : 'sent',
    media_id: '',
    mime: seed.image ? 'image/jpeg' : '',
    audio_url: '',
    image_url: seed.image ? `https://picsum.photos/seed/${seed.image}/640/480` : '',
    created_at: minutesAgo(seed.minutesAgo),
  }
}

function note(id: string, content: string, minutes: number, seen = true): ConversationNote {
  return { id, content, seen, created_at: minutesAgo(minutes) }
}

function record(
  id: string,
  summary: Omit<ConversationListItem, 'id' | 'last_message' | 'last_message_at'>,
  messages: Message[],
  notes: ConversationNote[],
  idle_warning = false,
): ConversationRecord {
  const last = messages[messages.length - 1]
  return {
    summary: {
      id,
      ...summary,
      last_message: last?.type === 'image' ? '📷 Imagen' : (last?.content ?? ''),
      last_message_at: last?.created_at ?? daysAgo(1),
    },
    messages,
    notes,
    idle_warning,
  }
}

export function buildConversations(): ConversationRecord[] {
  return [
    record(
      'conv-001',
      {
        customer: 'Valentina Ríos',
        phone: '+57 310 555 0142',
        llm_enabled: true,
        confirmed: false,
        ...LABELS.interesado,
        active_product: 'Audífonos Bluetooth Pro',
        unseen_messages_count: 2,
        unseen_notes_count: 1,
      },
      [
        msg('m-001-1', { from: 'cliente', text: 'Hola! Vi los audífonos en Instagram, ¿todavía tienen?', minutesAgo: 48 }),
        msg('m-001-2', { from: 'bot', text: '¡Hola Valentina! Sí, los Audífonos Bluetooth Pro están disponibles. Tienen cancelación de ruido y 30 h de batería. ¿Querés que te cuente los precios?', minutesAgo: 47 }),
        msg('m-001-3', { from: 'cliente', text: 'Dale, y si compro dos hay descuento?', minutesAgo: 45 }),
        msg('m-001-4', { from: 'bot', text: 'Claro: 1 unidad $129.900 · 2 unidades $219.900. El envío es gratis en ambos casos.', minutesAgo: 44 }),
        msg('m-001-5', { from: 'cliente', text: 'Listo, quiero los dos. ¿Me los pueden mandar a Medellín?', minutesAgo: 6 }),
        msg('m-001-6', { from: 'cliente', text: 'Los necesito antes del viernes', minutesAgo: 5 }),
      ],
      [
        note('n-001-1', 'Cliente interesada en 2 unidades. Preguntó por descuento por cantidad, se le ofreció la oferta 2x.', 44),
        note('n-001-2', 'Pide entrega en Medellín antes del viernes. Confirmar tiempos con logística antes de cerrar.', 5, false),
      ],
    ),
    record(
      'conv-002',
      {
        customer: 'Andrés Cardona',
        phone: '+57 315 555 0198',
        llm_enabled: false,
        confirmed: false,
        ...LABELS.humano,
        active_product: 'Mini proyector portátil',
        unseen_messages_count: 1,
        unseen_notes_count: 0,
      },
      [
        msg('m-002-1', { from: 'cliente', text: 'Buenas, el proyector sirve para ver fútbol en la pared del patio?', minutesAgo: 130 }),
        msg('m-002-2', { from: 'bot', text: '¡Hola Andrés! El Mini proyector portátil es 1080p nativo con WiFi y Bluetooth. Para exteriores funciona mejor de noche o con poca luz.', minutesAgo: 129 }),
        msg('m-002-3', { from: 'cliente', text: 'Y la garantía? Prefiero hablar con una persona', minutesAgo: 120 }),
        msg('m-002-4', { from: 'bot', text: 'Entendido, te paso con una persona del equipo. En un momento te escriben.', minutesAgo: 119 }),
        msg('m-002-5', { from: 'cliente', text: 'Sigo esperando...', minutesAgo: 22 }),
      ],
      [note('n-002-1', 'Cliente pidió atención humana por dudas de garantía. Bot desactivado automáticamente.', 119)],
    ),
    record(
      'conv-003',
      {
        customer: 'Camila Torres',
        phone: '+57 301 555 0233',
        llm_enabled: true,
        confirmed: true,
        ...LABELS.confirmado,
        active_product: 'Lámpara LED de escritorio',
        unseen_messages_count: 0,
        unseen_notes_count: 0,
      },
      [
        msg('m-003-1', { from: 'cliente', text: 'Quiero la lámpara LED, la de 3 tonos', minutesAgo: 300 }),
        msg('m-003-2', { from: 'bot', text: '¡Excelente elección! La Lámpara LED de escritorio cuesta $79.900. ¿A qué nombre y dirección la enviamos?', minutesAgo: 299 }),
        msg('m-003-3', { from: 'cliente', text: 'Camila Torres, Cra 15 #93-40 apto 502, Bogotá', minutesAgo: 296 }),
        msg('m-003-4', { from: 'bot', text: 'Perfecto Camila. Pedido confirmado: 1 Lámpara LED de escritorio por $79.900, pago contra entrega. Llega en 2 a 4 días hábiles. 🙌', minutesAgo: 295 }),
        msg('m-003-5', { from: 'cliente', text: 'Gracias!!', minutesAgo: 290 }),
      ],
      [note('n-003-1', 'Pedido confirmado. Dirección completa recibida. Pago contra entrega.', 295)],
    ),
    record(
      'conv-004',
      {
        customer: 'Juan Pablo Mejía',
        phone: '+57 320 555 0077',
        llm_enabled: true,
        confirmed: false,
        ...LABELS.nuevo,
        active_product: null,
        unseen_messages_count: 1,
        unseen_notes_count: 0,
      },
      [msg('m-004-1', { from: 'cliente', text: 'Hola, qué productos tienen?', minutesAgo: 2 })],
      [],
    ),
    record(
      'conv-005',
      {
        customer: 'Laura Gómez',
        phone: '+57 312 555 0311',
        llm_enabled: true,
        confirmed: false,
        ...LABELS.interesado,
        active_product: 'Reloj inteligente Fit',
        unseen_messages_count: 0,
        unseen_notes_count: 2,
      },
      [
        msg('m-005-1', { from: 'cliente', text: 'El reloj mide el oxígeno?', minutesAgo: 95 }),
        msg('m-005-2', { from: 'bot', text: '¡Hola Laura! Sí, el Reloj inteligente Fit mide ritmo cardíaco, oxígeno en sangre y sueño. Además es resistente al agua.', minutesAgo: 94 }),
        msg('m-005-3', { from: 'cliente', image: 'wrist-photo', text: 'Esta es mi muñeca, me quedaría bien?', minutesAgo: 90 }),
        msg('m-005-4', { from: 'bot', text: 'La correa es ajustable de 14 a 21 cm, así que te queda perfecto. ¿Te lo reservo?', minutesAgo: 89 }),
        msg('m-005-5', { from: 'cliente', text: 'Déjame pensarlo, te escribo mañana', minutesAgo: 85 }),
      ],
      [
        note('n-005-1', 'Cliente envió foto para consultar talla. Se le informó rango de la correa.', 89, false),
        note('n-005-2', 'Indecisa, dijo que responde mañana. Sugerido: recordatorio en 24 h.', 85, false),
      ],
    ),
    record(
      'conv-006',
      {
        customer: 'Santiago Herrera',
        phone: '+57 318 555 0456',
        llm_enabled: true,
        confirmed: false,
        ...LABELS.sinRespuesta,
        active_product: 'Parlante portátil Bass+',
        unseen_messages_count: 0,
        unseen_notes_count: 0,
      },
      [
        msg('m-006-1', { from: 'cliente', text: 'Cuánto vale el parlante?', minutesAgo: 60 * 30 }),
        msg('m-006-2', { from: 'bot', text: '¡Hola Santiago! El Parlante portátil Bass+ cuesta $99.900, con sonido 360° y 12 h de batería. ¿Querés que te lo envíe?', minutesAgo: 60 * 30 - 1 }),
        msg('m-006-3', { from: 'bot', text: '¿Seguís interesado en el parlante? Tengo unidades disponibles hoy. 😊', minutesAgo: 60 * 26, failed: true }),
      ],
      [note('n-006-1', 'Sin respuesta del cliente hace más de un día. Mensaje de seguimiento falló al enviarse.', 60 * 26)],
      true,
    ),
    record(
      'conv-007',
      {
        customer: 'María Fernanda López',
        phone: '+57 300 555 0609',
        llm_enabled: true,
        confirmed: false,
        ...LABELS.cancelado,
        active_product: 'Mochila antirrobo urbana',
        unseen_messages_count: 0,
        unseen_notes_count: 0,
      },
      [
        msg('m-007-1', { from: 'cliente', text: 'Quería la mochila pero ya la conseguí en otro lado', minutesAgo: 60 * 50 }),
        msg('m-007-2', { from: 'bot', text: 'Entendido María Fernanda, ¡gracias por avisar! Si necesitás algo más, acá estamos.', minutesAgo: 60 * 50 - 1 }),
      ],
      [note('n-007-1', 'Cliente canceló: compró en otro lado.', 60 * 50)],
    ),
    record(
      'conv-008',
      {
        customer: 'Daniel Ospina',
        phone: '+57 311 555 0870',
        llm_enabled: true,
        confirmed: true,
        ...LABELS.confirmado,
        active_product: 'Teclado mecánico compacto',
        unseen_messages_count: 0,
        unseen_notes_count: 0,
      },
      [
        msg('m-008-1', { from: 'cliente', text: 'El teclado es de switches rojos?', minutesAgo: 60 * 8 }),
        msg('m-008-2', { from: 'bot', text: '¡Hola Daniel! Sí, el Teclado mecánico compacto trae switches rojos, RGB y formato 65%. Cuesta $219.900.', minutesAgo: 60 * 8 - 1 }),
        msg('m-008-3', { from: 'cliente', text: 'Lo quiero. Daniel Ospina, Calle 10 #43-21, Cali', minutesAgo: 60 * 7 }),
        msg('m-008-4', { from: 'bot', text: 'Pedido confirmado, Daniel. Te llega en 2 a 4 días hábiles, pago contra entrega. 🎉', minutesAgo: 60 * 7 + 1 }),
      ],
      [note('n-008-1', 'Pedido confirmado con dirección en Cali.', 60 * 7)],
    ),
  ].map((r) => ({
    ...r,
    messages: [...r.messages].sort((a, b) => a.created_at.localeCompare(b.created_at)),
  }))
}

/** Respuestas del "cliente" cuando el staff escribe en modo mock. */
export const AUTO_REPLIES = [
  'Dale, perfecto 👍',
  'Listo, gracias por la info',
  '¿Y cuánto demora el envío?',
  'Ok, lo pienso y te aviso',
  'Súper, entonces lo confirmo',
]
