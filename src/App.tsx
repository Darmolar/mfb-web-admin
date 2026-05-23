import { AuthProvider, useAuth } from './context/AuthContext'
import { LoginPage } from './components/auth/LoginPage'
import { TwoFactorPage } from './components/auth/TwoFactorPage'
import { AppShell } from './components/layout/AppShell'

function AppRouter() {
  const { isAuthenticated, pendingTwoFactor } = useAuth()

  if (isAuthenticated) return <AppShell />
  if (pendingTwoFactor) return <TwoFactorPage />
  return <LoginPage />
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  )
}
