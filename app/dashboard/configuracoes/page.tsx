"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"

import { useAuth } from "@/lib/auth-context"
import { canManageTenantUsers } from "@/lib/tenant-permissions"
import { AppSidebar } from "@/components/app-sidebar"
import { TenantUsersSection } from "@/components/configuracoes/tenant-users-section"
import { SiteHeader } from "@/components/site-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MANAGER: "Manager",
  VIEWER: "Viewer",
}

function getRoleLabel(role: string) {
  return ROLE_LABELS[role] ?? role
}

export default function ConfiguracoesPage() {
  const { session } = useAuth()
  const router = useRouter()
  const canManageUsers = canManageTenantUsers(session?.tenantRole)

  React.useEffect(() => {
    if (!session) {
      router.replace("/login")
      return
    }

    if (!canManageUsers) {
      router.replace("/dashboard")
    }
  }, [canManageUsers, router, session])

  if (!session || !canManageUsers) return null

  const roleLabel = getRoleLabel(session.tenantRole)

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Configuracoes" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push("/dashboard")}
                  >
                    <ArrowLeftIcon className="size-4" />
                  </Button>
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                      Configuracoes do tenant
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Gerencie usuarios e permissoes da empresa atual.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Perfil atual: {roleLabel}</Badge>
                  <Badge variant="outline">Tenant: {session.tenantName}</Badge>
                </div>
              </div>

              <TenantUsersSection
                token={session.accessToken}
                tenantId={session.tenantId}
              />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
