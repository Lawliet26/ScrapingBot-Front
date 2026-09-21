import { lazy, Suspense, useMemo } from 'react'
import { useTheme, type ThemeMode } from '@/theme/ThemeProvider'

// Carga diferida: vgpu + shaders no tienen por qué frenar el primer render.
const ShapeWaves = lazy(() => import('./ShapeWaves'))

interface Palette {
  backgroundColor: string
  color: string
  hoverColor: string
}

/** Lee los tokens del tema activo para que las formas vivan sobre el MISMO canvas del neumorfismo. */
function readPalette(): Palette {
  const styles = getComputedStyle(document.documentElement)
  const token = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback
  return {
    backgroundColor: token('--canvas', '#101012'),
    color: token('--border-strong', '#3a3a41'),
    hoverColor: token('--accent', '#34d399'),
  }
}

const SETTINGS_BY_MODE: Record<ThemeMode, { brightness: number; glow: number; contrast: number }> = {
  // En claro las formas son más oscuras que el fondo: menos brillo para que no ensucien.
  light: { brightness: 0.28, glow: 0.15, contrast: 1.1 },
  dark: { brightness: 0.4, glow: 0.35, contrast: 1 },
}

/**
 * Fondo animado (Shape Waves) detrás de toda la interfaz. Requiere WebGPU; si el
 * navegador no lo soporta, el componente falla en silencio y queda el canvas liso.
 */
export function AppBackground() {
  const { mode } = useTheme()
  // ThemeProvider aplica data-theme de forma síncrona antes de re-renderizar, así que
  // leer los tokens durante el render ya devuelve los del tema nuevo.
  const palette = useMemo(() => readPalette(), [mode])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <Suspense fallback={null}>
        <ShapeWaves
          key={mode}
          shapes="mixed"
          cellSize={12}
          dotSize={0.7}
          speed={0.6}
          scale={1.1}
          fade={0.3}
          flow={0.15}
          splashRadius={44}
          splashStrength={0.35}
          introDuration={1.4}
          {...palette}
          {...SETTINGS_BY_MODE[mode]}
        />
      </Suspense>
    </div>
  )
}
