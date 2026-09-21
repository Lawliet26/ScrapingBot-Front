/**
 * Bypass de autenticación SOLO para desarrollo local sin backend.
 * Se activa con VITE_AUTH_BYPASS=true y nunca aplica en un build de producción:
 * `import.meta.env.DEV` es false ahí, así que la flag queda inerte.
 */
export const AUTH_BYPASS = import.meta.env.DEV && import.meta.env.VITE_AUTH_BYPASS === 'true'
