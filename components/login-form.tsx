"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { login, ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { LoaderCircleIcon } from "lucide-react"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const { setSession } = useAuth()
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const email = form.get("email") as string
    const password = form.get("password") as string

    try {
      const res = await login(email, password)

      const tenant = res.tenants[0]
      if (!tenant) {
        setError("Nenhum tenant disponível para este usuário.")
        setLoading(false)
        return
      }

      const envSeconds = Number(process.env.NEXT_PUBLIC_SESSION_DURATION_SECONDS)
      const durationMs = (res.expiresInSeconds || (envSeconds > 0 ? envSeconds : 3600)) * 1000

      setSession({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        user: res.user,
        tenantId: tenant.id,
        tenantName: tenant.name,
        expiresAt: Date.now() + durationMs,
      })

      router.push("/dashboard")
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 401
            ? "E-mail ou senha incorretos."
            : err.message,
        )
      } else {
        setError("Erro de conexão. Verifique se a API está rodando.")
      }
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Bem-vindo de volta</CardTitle>
          <CardDescription>
            Entre com suas credenciais para acessar o painel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              <Field>
                <FieldLabel htmlFor="email">E-mail</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  required
                  autoComplete="email"
                  disabled={loading}
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Senha</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto text-sm underline-offset-4 hover:underline"
                  >
                    Esqueceu a senha?
                  </a>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  disabled={loading}
                />
              </Field>
              <Field>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && (
                    <LoaderCircleIcon className="size-4 animate-spin" />
                  )}
                  Entrar
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
