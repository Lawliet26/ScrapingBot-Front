/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WS_URL?: string
  /** 'true' salta el login en desarrollo (sin backend). Inerte en producción. */
  readonly VITE_AUTH_BYPASS?: string
  /** 'true' responde la API con datos de prueba en memoria (src/mocks). Inerte en producción. */
  readonly VITE_MOCK_API?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
