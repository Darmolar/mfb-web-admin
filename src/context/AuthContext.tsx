/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react'
import { login as adminLogin, verifyAdminMfa, type AdminLoginData, type AdminSession } from '../api'

interface AuthUser {
  adminId: string
  email: string
  name: string
  role: string
  accessToken: string
  tokenType: string
}

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  pendingTwoFactor: boolean
  pendingLogin: AdminLoginData | null
  login: (email: string, password: string) => Promise<void>
  verifyTwoFactor: (code: string) => Promise<void>
  logout: () => void
}

const AUTH_KEY = 'mfb_auth'
const PENDING_KEY = 'mfb_admin_pre_auth'

function mapSession(session: AdminSession): AuthUser {
  return {
    adminId: session.adminId,
    email: session.email,
    name: session.adminName,
    role: session.role,
    accessToken: session.accessToken,
    tokenType: session.tokenType,
  }
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [pendingLogin, setPendingLogin] = useState<AdminLoginData | null>(() => {
    try {
      const stored = sessionStorage.getItem(PENDING_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const login = async (email: string, password: string) => {
    const { data } = await adminLogin({ email, password })
    setPendingLogin(data)
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(data))
  }

  const verifyTwoFactor = async (code: string) => {
    if (!pendingLogin?.preAuthToken) throw new Error('Please sign in again to continue.')
    const { data } = await verifyAdminMfa({ preAuthToken: pendingLogin.preAuthToken, otp: code })
    const authUser = mapSession(data)
    setUser(authUser)
    setPendingLogin(null)
    sessionStorage.removeItem(PENDING_KEY)
    localStorage.setItem(AUTH_KEY, JSON.stringify(authUser))
  }

  const logout = () => {
    setUser(null)
    setPendingLogin(null)
    sessionStorage.removeItem(PENDING_KEY)
    localStorage.removeItem(AUTH_KEY)
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, pendingTwoFactor: !!pendingLogin, pendingLogin, login, verifyTwoFactor, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
