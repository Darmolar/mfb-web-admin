import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LoginPage } from './components/auth/LoginPage'
import { TwoFactorPage } from './components/auth/TwoFactorPage'
import { AppShell } from './components/layout/AppShell'

function AppRouter() {
  const { isAuthenticated, pendingTwoFactor } = useAuth()

  if (!isAuthenticated && !pendingTwoFactor) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  if (!isAuthenticated && pendingTwoFactor) {
    return (
      <Routes>
        <Route path="/verify" element={<TwoFactorPage />} />
        <Route path="*" element={<Navigate to="/verify" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/overview" replace />} />
      <Route path="/login" element={<Navigate to="/overview" replace />} />
      <Route path="/verify" element={<Navigate to="/overview" replace />} />
      <Route path="/:section" element={<AppShell />} />
      <Route path="*" element={<Navigate to="/overview" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  )
}
