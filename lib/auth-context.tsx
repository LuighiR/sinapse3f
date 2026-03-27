"use client"

import * as React from "react"

interface Session {
  accessToken: string
  refreshToken: string
  user: { id: string; email: string; name: string }
  tenantId: string
  tenantName: string
}

interface AuthContextValue {
  session: Session | null
  setSession: (session: Session | null) => void
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined)

const STORAGE_KEY = "sinapse_session"

function loadSession(): Session | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

function saveSession(session: Session | null) {
  if (typeof window === "undefined") return
  if (session) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } else {
    sessionStorage.removeItem(STORAGE_KEY)
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, _setSession] = React.useState<Session | null>(null)
  const [hydrated, setHydrated] = React.useState(false)

  React.useEffect(() => {
    _setSession(loadSession())
    setHydrated(true)
  }, [])

  const setSession = React.useCallback((s: Session | null) => {
    _setSession(s)
    saveSession(s)
  }, [])

  if (!hydrated) return null

  return (
    <AuthContext value={{ session, setSession }}>
      {children}
    </AuthContext>
  )
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}

export function useRequireAuth() {
  const { session } = useAuth()
  if (!session) throw new Error("Not authenticated")
  return session
}
