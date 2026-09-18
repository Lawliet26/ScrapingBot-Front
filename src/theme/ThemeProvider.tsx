import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemeMode = 'light' | 'standard' | 'dark'

const STORAGE_KEY = 'theme'
const DEFAULT_MODE: ThemeMode = 'standard'

interface ThemeContextValue {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStoredMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'standard' || stored === 'dark') return stored
  } catch {
    // localStorage puede no estar disponible (modo privado)
  }
  return DEFAULT_MODE
}

function applyMode(mode: ThemeMode) {
  document.documentElement.setAttribute('data-theme', mode)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode)

  useEffect(() => {
    applyMode(mode)
  }, [mode])

  function setMode(next: ThemeMode) {
    setModeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // no es crítico si no se puede persistir
    }
  }

  return <ThemeContext.Provider value={{ mode, setMode }}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>')
  return ctx
}
