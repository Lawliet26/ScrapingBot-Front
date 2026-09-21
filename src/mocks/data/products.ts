import type { Oferta, Product, ProductsConfig } from '@/api/types'
import { formatOfertasSummary } from '@/lib/format'
import { daysAgo } from './time'

interface ProductSeed {
  nombre: string
  descripcion: string
  precio: number
  ofertas?: Oferta[]
  /** Semilla para la imagen; sin semilla, el producto no tiene foto. */
  image?: string
}

const SEEDS: ProductSeed[] = [
  {
    nombre: 'Audífonos Bluetooth Pro',
    descripcion: 'Cancelación de ruido activa, 30 h de batería.\nEstuche de carga rápida incluido.',
    precio: 129900,
    ofertas: [
      { cantidad: 1, total: 129900 },
      { cantidad: 2, total: 219900 },
    ],
    image: 'earbuds',
  },
  {
    nombre: 'Reloj inteligente Fit',
    descripcion: 'Monitor de ritmo cardíaco, oxígeno en sangre y sueño. Resistente al agua.',
    precio: 189900,
    ofertas: [{ cantidad: 1, total: 189900 }],
    image: 'watch',
  },
  {
    nombre: 'Lámpara LED de escritorio',
    descripcion: 'Tres temperaturas de luz, brazo articulado y puerto USB para cargar el celular.',
    precio: 79900,
    ofertas: [
      { cantidad: 1, total: 79900 },
      { cantidad: 2, total: 139900 },
      { cantidad: 3, total: 189900 },
    ],
    image: 'lamp',
  },
  {
    nombre: 'Cargador inalámbrico 15W',
    descripcion: 'Compatible con iPhone y Android. Indicador LED de carga.',
    precio: 49900,
    image: 'charger',
  },
  {
    nombre: 'Botella térmica 750 ml',
    descripcion: 'Acero inoxidable, mantiene frío 24 h y caliente 12 h.',
    precio: 59900,
    ofertas: [
      { cantidad: 1, total: 59900 },
      { cantidad: 2, total: 99900 },
    ],
    image: 'bottle',
  },
  {
    nombre: 'Mochila antirrobo urbana',
    descripcion: 'Cierre oculto, puerto USB externo y compartimento acolchado para portátil de 15".',
    precio: 149900,
    image: 'backpack',
  },
  {
    nombre: 'Parlante portátil Bass+',
    descripcion: 'Sonido 360°, resistente a salpicaduras, 12 h de reproducción.',
    precio: 99900,
    ofertas: [{ cantidad: 1, total: 99900 }],
    image: 'speaker',
  },
  {
    nombre: 'Teclado mecánico compacto',
    descripcion: 'Switches rojos, retroiluminación RGB, formato 65%.',
    precio: 219900,
    image: 'keyboard',
  },
  {
    nombre: 'Soporte plegable para portátil',
    descripcion: 'Aluminio, 6 niveles de altura, cabe en cualquier maleta.',
    precio: 69900,
    ofertas: [
      { cantidad: 1, total: 69900 },
      { cantidad: 2, total: 119900 },
    ],
  },
  {
    nombre: 'Cámara de seguridad WiFi',
    descripcion: 'Visión nocturna, detección de movimiento y audio bidireccional.',
    precio: 139900,
    image: 'camera',
  },
  {
    nombre: 'Set de cuchillos de chef',
    descripcion: 'Seis piezas en acero alemán con bloque de madera.',
    precio: 179900,
    image: 'knives',
  },
  {
    nombre: 'Masajeador cervical',
    descripcion: 'Calor infrarrojo y tres modos de intensidad. Recargable.',
    precio: 119900,
    ofertas: [
      { cantidad: 1, total: 119900 },
      { cantidad: 2, total: 199900 },
    ],
    image: 'massager',
  },
  {
    nombre: 'Aspiradora de mano inalámbrica',
    descripcion: 'Potencia de succión 12 kPa, filtro HEPA lavable.',
    precio: 159900,
  },
  {
    nombre: 'Cafetera de prensa francesa',
    descripcion: 'Vidrio borosilicato de 1 L, filtro de acero de triple capa.',
    precio: 64900,
    image: 'coffee',
  },
  {
    nombre: 'Tapete de yoga antideslizante',
    descripcion: 'TPE ecológico, 6 mm de grosor, incluye correa de transporte.',
    precio: 54900,
    ofertas: [
      { cantidad: 1, total: 54900 },
      { cantidad: 2, total: 94900 },
    ],
    image: 'yoga',
  },
  {
    nombre: 'Hub USB-C 7 en 1',
    descripcion: 'HDMI 4K, 3 puertos USB 3.0, lector SD y carga PD de 100 W.',
    precio: 109900,
    image: 'hub',
  },
  {
    nombre: 'Organizador de cables magnético',
    descripcion: 'Pack de 3, adhesivo reutilizable.',
    precio: 24900,
    ofertas: [
      { cantidad: 1, total: 24900 },
      { cantidad: 3, total: 59900 },
    ],
  },
  {
    nombre: 'Balanza digital de cocina',
    descripcion: 'Precisión de 1 g hasta 5 kg, pantalla LCD retroiluminada.',
    precio: 39900,
    image: 'scale',
  },
  {
    nombre: 'Auriculares gamer con micrófono',
    descripcion: 'Sonido envolvente 7.1, almohadillas de memoria, micrófono desmontable.',
    precio: 169900,
    image: 'headset',
  },
  {
    nombre: 'Difusor de aromas ultrasónico',
    descripcion: '300 ml, luz LED de 7 colores, apagado automático.',
    precio: 74900,
    image: 'diffuser',
  },
  {
    nombre: 'Trípode flexible para celular',
    descripcion: 'Patas ajustables, control remoto Bluetooth incluido.',
    precio: 44900,
    ofertas: [
      { cantidad: 1, total: 44900 },
      { cantidad: 2, total: 79900 },
    ],
  },
  {
    nombre: 'Manta eléctrica térmica',
    descripcion: 'Tres niveles de calor, apagado automático a las 3 h, lavable.',
    precio: 134900,
    image: 'blanket',
  },
  {
    nombre: 'Mini proyector portátil',
    descripcion: '1080p nativo, WiFi y Bluetooth, parlante integrado.',
    precio: 389900,
    image: 'projector',
  },
]

function imageUrl(seed: string, size = 480): string {
  return `https://picsum.photos/seed/${seed}/${size}/${size}`
}

export function buildProducts(): Product[] {
  return SEEDS.map((seed, index) => {
    const imagenes = seed.image ? [imageUrl(seed.image), imageUrl(`${seed.image}-2`)] : []
    const ofertas = seed.ofertas ?? []
    return {
      id: `prod-${String(index + 1).padStart(3, '0')}`,
      nombre: seed.nombre,
      descripcion: seed.descripcion,
      precio: seed.precio.toFixed(2),
      ofertas,
      ofertas_summary: formatOfertasSummary(ofertas),
      imagenes,
      imagen_url: imagenes[0] ?? '',
      created_at: daysAgo(40 - index),
      updated_at: daysAgo(Math.max(0, 10 - index)),
    }
  })
}

export const INITIAL_PRODUCTS_CONFIG: ProductsConfig = {
  agent_visible_fields: ['nombre', 'precio'],
}
