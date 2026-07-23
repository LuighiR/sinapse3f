"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"

import { useAuth } from "@/lib/auth-context"
import {
  canAccessConfiguracoes,
  canManageEmployees,
  canManageTenantUsers,
} from "@/lib/tenant-permissions"
import { AppSidebar } from "@/components/app-sidebar"
import { EmployeesSection } from "@/components/configuracoes/employees-section"
import { TenantUsersSection } from "@/components/configuracoes/tenant-users-section"
import { SiteHeader } from "@/components/site-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MANAGER: "Manager",
  VIEWER: "Viewer",
}

function getRoleLabel(role: string) {
  return ROLE_LABELS[role] ?? role
}

function getSubtitle(showUsers: boolean, showEmployees: boolean) {
  if (showUsers && showEmployees) {
    return "Gerencie usuarios e colaboradores da empresa atual."
  }
  if (showUsers) {
    return "Gerencie usuarios e permissoes da empresa atual."
  }
  return "Gerencie colaboradores da empresa atual."
}

export default function ConfiguracoesPage() {
  const { session } = useAuth()
  const router = useRouter()
  const canAccess = canAccessConfiguracoes(session?.tenantRole)
  const showUsers = canManageTenantUsers(session?.tenantRole)
  const showEmployees = canManageEmployees(session?.tenantRole)
  const defaultTab = showUsers ? "usuarios" : "colaboradores"

  React.useEffect(() => {
    if (!session) {
      router.replace("/login")
      return
    }

    if (!canAccess) {
      router.replace("/dashboard")
    }
  }, [canAccess, router, session])

  if (!session || !canAccess) return null

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
                      {getSubtitle(showUsers, showEmployees)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Perfil atual: {roleLabel}</Badge>
                  <Badge variant="outline">Tenant: {session.tenantName}</Badge>
                </div>
              </div>

              <Tabs defaultValue={defaultTab}>
                <TabsList>
                  {showUsers ? (
                    <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
                  ) : null}
                  {showEmployees ? (
                    <TabsTrigger value="colaboradores">Colaboradores</TabsTrigger>
                  ) : null}
                </TabsList>
                {showUsers ? (
                  <TabsContent value="usuarios">
                    <TenantUsersSection
                      token={session.accessToken}
                      tenantId={session.tenantId}
                    />
                  </TabsContent>
                ) : null}
                {showEmployees ? (
                  <TabsContent value="colaboradores">
                    <EmployeesSection
                      token={session.accessToken}
                      tenantId={session.tenantId}
                    />
                  </TabsContent>
                ) : null}
              </Tabs>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
