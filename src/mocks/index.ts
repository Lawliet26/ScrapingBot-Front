/**
 * API simulada para desarrollo sin backend.
 *
 * Se activa con VITE_MOCK_API=true y solo existe en modo dev: `import.meta.env.DEV`
 * es false en producción, así que la flag queda inerte aunque alguien la deje puesta.
 *
 * Intercepta en `api/client.ts` (un único punto): hooks, páginas y mutaciones no
 * saben que los datos son falsos. El estado vive en memoria y se reinicia al recargar.
 */
import './handlers/auth'
import './handlers/products'
import './handlers/conversations'
import './handlers/agent'

export const MOCK_API = import.meta.env.DEV && import.meta.env.VITE_MOCK_API === 'true'

export { dispatch as mockRequest, type MockResponse } from './router'
