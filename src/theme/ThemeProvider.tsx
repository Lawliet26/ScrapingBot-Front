import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'theme'
const DEFAULT_MODE: ThemeMode = 'dark'

interface ThemeContextValue {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggleMode: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStoredMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
    // 'standard' existió como tercer tema; quien lo tenía guardado pasa a oscuro.
  } catch {
    // localStorage puede no estar disponible (modo privado)
  }
  return DEFAULT_MODE
}

function applyMode(mode: ThemeMode) {
  document.documentElement.setAttribute('data-theme', mode)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const initial = readStoredMode()
    applyMode(initial)
    return initial
  })

  // Red de seguridad si algo externo pisa el atributo; el cambio real se aplica en setMode.
  useEffect(() => {
    applyMode(mode)
  }, [mode])

  function setMode(next: ThemeMode) {
    // Síncrono a propósito: los hijos que leen tokens vía getComputedStyle durante
    // el render (AppBackground) tienen que ver el tema nuevo, no el anterior.
    applyMode(next)
    setModeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // no es crítico si no se puede persistir
    }
  }

  function toggleMode() {
    setMode(mode === 'dark' ? 'light' : 'dark')
  }

  return <ThemeContext.Provider value={{ mode, setMode, toggleMode }}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>')
  return ctx
}
