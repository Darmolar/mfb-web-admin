import { createContext, useContext, useState, type ReactNode } from 'react'

interface AuthUser {
  email: string
  name: string
  role: string
}

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  pendingTwoFactor: boolean
  login: (email: string, password: string) => Promise<void>
  verifyTwoFactor: (code: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem('mfb_auth')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [pendingTwoFactor, setPendingTwoFactor] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')

  const login = async (email: string, _password: string) => {
    setPendingEmail(email)
    setPendingTwoFactor(true)
  }

  const verifyTwoFactor = async (_code: string) => {
    const authUser: AuthUser = {
      email: pendingEmail || 'admin@memphismfb.com',
      name: 'Super Admin',
      role: 'Super Admin',
    }
    setUser(authUser)
    setPendingTwoFactor(false)
    localStorage.setItem('mfb_auth', JSON.stringify(authUser))
  }

  const logout = () => {
    setUser(null)
    setPendingTwoFactor(false)
    localStorage.removeItem('mfb_auth')
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, pendingTwoFactor, login, verifyTwoFactor, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
