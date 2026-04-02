"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { refreshTokens } from "@/lib/api"

interface Session {
  accessToken: string
  refreshToken: string
  user: { id: string; email: string; name: string }
  tenantId: string
  tenantName: string
  expiresAt: number
}

interface AuthContextValue {
  session: Session | null
  setSession: (session: Session | null) => void
  logout: () => void
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined)

const STORAGE_KEY = "sinapse_session"

/** Try to refresh tokens this many ms before the access token expires */
const REFRESH_MARGIN_MS = 60_000

function getSessionDurationMs(): number {
  const envSeconds = Number(process.env.NEXT_PUBLIC_SESSION_DURATION_SECONDS)
  return (envSeconds > 0 ? envSeconds : 3600) * 1000
}

function loadSession(): Session | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as Session
    if (!session.expiresAt || Date.now() >= session.expiresAt) {
      sessionStorage.removeItem(STORAGE_KEY)
      return null
    }
    return session
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
  const router = useRouter()
  const refreshTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const loggedOutRef = React.useRef(false)

  const clearRefreshTimer = React.useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }, [])

  const logout = React.useCallback(() => {
    loggedOutRef.current = true
    clearRefreshTimer()
    _setSession(null)
    saveSession(null)
    router.replace("/login")
  }, [clearRefreshTimer, router])

  const setSession = React.useCallback((s: Session | null) => {
    if (s) loggedOutRef.current = false
    _setSession(s)
    saveSession(s)
  }, [])

  const scheduleRefresh = React.useCallback(
    (s: Session) => {
      clearRefreshTimer()
      const msUntilExpiry = s.expiresAt - Date.now()

      if (msUntilExpiry <= 0) {
        logout()
        return
      }

      const msUntilRefresh = Math.max(msUntilExpiry - REFRESH_MARGIN_MS, 0)

      refreshTimerRef.current = setTimeout(async () => {
        try {
          const res = await refreshTokens(s.refreshToken)
          if (loggedOutRef.current) return
          const durationMs = res.expiresInSeconds
            ? res.expiresInSeconds * 1000
            : getSessionDurationMs()
          const refreshed: Session = {
            ...s,
            accessToken: res.accessToken,
            refreshToken: res.refreshToken,
            expiresAt: Date.now() + durationMs,
          }
          setSession(refreshed)
        } catch {
          logout()
        }
      }, msUntilRefresh)
    },
    [clearRefreshTimer, logout, setSession],
  )

  // Schedule refresh whenever session changes
  React.useEffect(() => {
    if (session) {
      scheduleRefresh(session)
    } else {
      clearRefreshTimer()
    }
  }, [session, scheduleRefresh, clearRefreshTimer])

  // Listen for 401 events dispatched by api.ts
  React.useEffect(() => {
    const handler = () => logout()
    window.addEventListener("session-expired", handler)
    return () => window.removeEventListener("session-expired", handler)
  }, [logout])

  // Re-check session validity when tab becomes visible again
  React.useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible" && session) {
        if (Date.now() >= session.expiresAt) {
          logout()
        }
      }
    }
    document.addEventListener("visibilitychange", handler)
    return () => document.removeEventListener("visibilitychange", handler)
  }, [session, logout])

  // Hydrate from sessionStorage
  React.useEffect(() => {
    _setSession(loadSession())
    setHydrated(true)
  }, [])

  if (!hydrated) return null

  return (
    <AuthContext value={{ session, setSession, logout }}>
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
