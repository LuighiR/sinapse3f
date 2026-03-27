"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { LoginForm } from "@/components/login-form"
import { useAuth } from "@/lib/auth-context"
import { BrainCircuitIcon } from "lucide-react"

export default function LoginPage() {
  const { session } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (session) router.replace("/dashboard")
  }, [session, router])

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center gap-2 self-center font-medium">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BrainCircuitIcon className="size-4" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Sinapse</span>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
