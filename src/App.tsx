import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthProvider'
import { LoginPage } from '@/auth/LoginPage'
import { RequireStaff } from '@/auth/RequireStaff'
import { AppShell } from '@/components/layout/AppShell'
import { AgentPromptPage } from '@/features/agent/AgentPromptPage'
import { ConversationsPage } from '@/features/conversations/ConversationsPage'
import { ProductsPage } from '@/features/products/ProductsPage'
import { WebSocketProvider } from '@/realtime/WebSocketProvider'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<RequireStaff />}>
          <Route element={<WebSocketProvider><Outlet /></WebSocketProvider>}>
            <Route element={<AppShell />}>
              <Route index element={<Navigate to="/productos" replace />} />
              <Route path="/productos" element={<ProductsPage />} />
              <Route path="/conversaciones" element={<ConversationsPage />} />
              <Route path="/conversaciones/:conversationId" element={<ConversationsPage />} />
              <Route path="/agente" element={<AgentPromptPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
