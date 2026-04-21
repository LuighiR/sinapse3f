"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeftIcon,
  LoaderCircleIcon,
  PencilIcon,
  PlusIcon,
  RefreshCcwIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  createTenantUser,
  getTenantUsers,
  type TenantUser,
  type TenantUserRole,
  updateTenantUser,
} from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { canManageTenantUsers } from "@/lib/tenant-permissions"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const ROLE_OPTIONS: Array<{ value: TenantUserRole; label: string }> = [
  { value: "OWNER", label: "Owner" },
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "VIEWER", label: "Viewer" },
]

type CreateFormState = {
  email: string
  name: string
  password: string
  role: TenantUserRole
  isActive: boolean
}

type EditFormState = {
  name: string
  password: string
  role: TenantUserRole
  isActive: boolean
  membershipIsActive: boolean
}

const CREATE_FORM_INITIAL_STATE: CreateFormState = {
  email: "",
  name: "",
  password: "",
  role: "VIEWER",
  isActive: true,
}

function getRoleLabel(role: string) {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role
}

function getRoleBadgeVariant(role: TenantUserRole): "default" | "secondary" | "outline" {
  if (role === "OWNER" || role === "ADMIN") return "default"
  if (role === "MANAGER") return "secondary"
  return "outline"
}

function buildEditFormState(user: TenantUser): EditFormState {
  return {
    name: user.name ?? "",
    password: "",
    role: user.role,
    isActive: user.isActive,
    membershipIsActive: user.membershipIsActive,
  }
}

export default function ConfiguracoesPage() {
  const { session } = useAuth()
  const router = useRouter()
  const canManageUsers = canManageTenantUsers(session?.tenantRole)

  const [users, setUsers] = React.useState<TenantUser[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [createOpen, setCreateOpen] = React.useState(false)
  const [createSubmitting, setCreateSubmitting] = React.useState(false)
  const [createForm, setCreateForm] = React.useState<CreateFormState>(
    CREATE_FORM_INITIAL_STATE,
  )

  const [editingUser, setEditingUser] = React.useState<TenantUser | null>(null)
  const [editSubmitting, setEditSubmitting] = React.useState(false)
  const [editForm, setEditForm] = React.useState<EditFormState | null>(null)

  const loadUsers = React.useCallback(
    async (showRefreshState = false) => {
      if (!session) return

      if (showRefreshState) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      try {
        const data = await getTenantUsers({
          token: session.accessToken,
          tenantId: session.tenantId,
        })
        setUsers(data)
        setError(null)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Nao foi possivel carregar os usuarios."
        setError(message)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [session],
  )

  React.useEffect(() => {
    if (!session) {
      router.replace("/login")
      return
    }

    if (!canManageUsers) {
      router.replace("/dashboard")
      return
    }

    void loadUsers()
  }, [canManageUsers, loadUsers, router, session])

  React.useEffect(() => {
    if (!editingUser) {
      setEditForm(null)
      return
    }

    setEditForm(buildEditFormState(editingUser))
  }, [editingUser])

  if (!session || !canManageUsers) return null

  async function handleCreateUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!session) return

    if (!createForm.email.trim() || !createForm.password.trim()) {
      toast.error("Preencha e-mail e senha para criar o usuario.")
      return
    }

    setCreateSubmitting(true)
    try {
      await createTenantUser({
        token: session.accessToken,
        tenantId: session.tenantId,
        email: createForm.email.trim(),
        name: createForm.name.trim() || undefined,
        password: createForm.password,
        role: createForm.role,
        isActive: createForm.isActive,
      })
      toast.success("Usuario criado com sucesso.")
      setCreateForm(CREATE_FORM_INITIAL_STATE)
      setCreateOpen(false)
      await loadUsers(true)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Nao foi possivel criar o usuario.",
      )
    } finally {
      setCreateSubmitting(false)
    }
  }

  async function handleEditUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!session || !editingUser || !editForm) return

    const payload: {
      name?: string
      password?: string
      role?: TenantUserRole
      isActive?: boolean
      membershipIsActive?: boolean
    } = {}

    const trimmedName = editForm.name.trim()
    if ((editingUser.name ?? "") !== trimmedName) payload.name = trimmedName || undefined
    if (editForm.password.trim()) payload.password = editForm.password
    if (editingUser.role !== editForm.role) payload.role = editForm.role
    if (editingUser.isActive !== editForm.isActive) payload.isActive = editForm.isActive
    if (editingUser.membershipIsActive !== editForm.membershipIsActive) {
      payload.membershipIsActive = editForm.membershipIsActive
    }

    if (Object.keys(payload).length === 0) {
      toast.error("Altere pelo menos um campo antes de salvar.")
      return
    }

    setEditSubmitting(true)
    try {
      await updateTenantUser({
        token: session.accessToken,
        tenantId: session.tenantId,
        userId: editingUser.id,
        ...payload,
      })
      toast.success("Usuario atualizado com sucesso.")
      setEditingUser(null)
      await loadUsers(true)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Nao foi possivel atualizar o usuario.",
      )
    } finally {
      setEditSubmitting(false)
    }
  }

  function renderTableBody() {
    if (loading) {
      return Array.from({ length: 5 }).map((_, rowIndex) => (
        <TableRow key={`loading-${rowIndex}`}>
          {Array.from({ length: 6 }).map((_, cellIndex) => (
            <TableCell key={`loading-${rowIndex}-${cellIndex}`}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))
    }

    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-8 text-center text-destructive">
            {error}
          </TableCell>
        </TableRow>
      )
    }

    if (users.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
            Nenhum usuario vinculado a este tenant.
          </TableCell>
        </TableRow>
      )
    }

    return users.map((user) => (
      <TableRow key={user.id}>
        <TableCell>
          <div className="flex flex-col">
            <span className="font-medium">{user.name || "Sem nome"}</span>
            <span className="text-xs text-muted-foreground">{user.id}</span>
          </div>
        </TableCell>
        <TableCell>{user.email}</TableCell>
        <TableCell>
          <Badge variant={getRoleBadgeVariant(user.role)}>{getRoleLabel(user.role)}</Badge>
        </TableCell>
        <TableCell>
          <Badge variant={user.isActive ? "secondary" : "outline"}>
            {user.isActive ? "Ativo" : "Inativo"}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge variant={user.membershipIsActive ? "secondary" : "outline"}>
            {user.membershipIsActive ? "Ativa" : "Inativa"}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <Button variant="outline" size="sm" onClick={() => setEditingUser(user)}>
            <PencilIcon className="size-4" />
            Editar
          </Button>
        </TableCell>
      </TableRow>
    ))
  }

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

              <Card>
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <CardTitle>Usuarios do tenant</CardTitle>
                    <CardDescription>
                      Integrado aos endpoints de listagem, criacao e atualizacao do backend.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => void loadUsers(true)}
                      disabled={refreshing}
                    >
                      {refreshing ? (
                        <LoaderCircleIcon className="size-4 animate-spin" />
                      ) : (
                        <RefreshCcwIcon className="size-4" />
                      )}
                      Atualizar
                    </Button>
                    <Button
                      onClick={() => {
                        setCreateForm(CREATE_FORM_INITIAL_STATE)
                        setCreateOpen(true)
                      }}
                    >
                      <PlusIcon className="size-4" />
                      Novo usuario
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {error && error.includes("requires owner or admin membership") ? (
                    <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      Seu usuario autenticado nao tem permissao suficiente no backend para
                      administrar usuarios deste tenant.
                    </div>
                  ) : null}

                  <div className="rounded-lg border bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Usuario</TableHead>
                          <TableHead>E-mail</TableHead>
                          <TableHead>Perfil</TableHead>
                          <TableHead>Status do usuario</TableHead>
                          <TableHead>Status no tenant</TableHead>
                          <TableHead className="text-right">Acoes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>{renderTableBody()}</TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo usuario</DialogTitle>
            <DialogDescription>
              Crie um usuario novo ou vincule um e-mail existente ao tenant atual.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="tenant-user-email">E-mail</FieldLabel>
                <Input
                  id="tenant-user-email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm((current) => ({ ...current, email: e.target.value }))
                  }
                  required
                  disabled={createSubmitting}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="tenant-user-name">Nome</FieldLabel>
                <Input
                  id="tenant-user-name"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm((current) => ({ ...current, name: e.target.value }))
                  }
                  disabled={createSubmitting}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="tenant-user-password">Senha</FieldLabel>
                <Input
                  id="tenant-user-password"
                  type="password"
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm((current) => ({ ...current, password: e.target.value }))
                  }
                  required
                  disabled={createSubmitting}
                />
              </Field>

              <Field>
                <FieldLabel>Perfil</FieldLabel>
                <Select
                  value={createForm.role}
                  onValueChange={(value) =>
                    setCreateForm((current) => ({
                      ...current,
                      role: value as TenantUserRole,
                    }))
                  }
                  disabled={createSubmitting}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field orientation="horizontal">
                <Checkbox
                  checked={createForm.isActive}
                  onCheckedChange={(checked) =>
                    setCreateForm((current) => ({
                      ...current,
                      isActive: checked === true,
                    }))
                  }
                  disabled={createSubmitting}
                />
                <FieldLabel>Usuario ativo</FieldLabel>
              </Field>
            </FieldGroup>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={createSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createSubmitting}>
                {createSubmitting ? (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                ) : (
                  <PlusIcon className="size-4" />
                )}
                Criar usuario
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingUser && !!editForm}
        onOpenChange={(open) => {
          if (!open) setEditingUser(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
            <DialogDescription>
              Ajuste os dados do usuario e a membership do tenant atual.
            </DialogDescription>
          </DialogHeader>

          {editingUser && editForm ? (
            <form onSubmit={handleEditUser} className="space-y-6">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="tenant-user-edit-email">E-mail</FieldLabel>
                  <Input
                    id="tenant-user-edit-email"
                    value={editingUser.email}
                    disabled
                    readOnly
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="tenant-user-edit-name">Nome</FieldLabel>
                  <Input
                    id="tenant-user-edit-name"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((current) =>
                        current ? { ...current, name: e.target.value } : current,
                      )
                    }
                    disabled={editSubmitting}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="tenant-user-edit-password">
                    Nova senha
                  </FieldLabel>
                  <Input
                    id="tenant-user-edit-password"
                    type="password"
                    value={editForm.password}
                    onChange={(e) =>
                      setEditForm((current) =>
                        current ? { ...current, password: e.target.value } : current,
                      )
                    }
                    disabled={editSubmitting}
                    placeholder="Preencha apenas se quiser alterar"
                  />
                </Field>

                <Field>
                  <FieldLabel>Perfil</FieldLabel>
                  <Select
                    value={editForm.role}
                    onValueChange={(value) =>
                      setEditForm((current) =>
                        current
                          ? { ...current, role: value as TenantUserRole }
                          : current,
                      )
                    }
                    disabled={editSubmitting}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field orientation="horizontal">
                  <Checkbox
                    checked={editForm.isActive}
                    onCheckedChange={(checked) =>
                      setEditForm((current) =>
                        current ? { ...current, isActive: checked === true } : current,
                      )
                    }
                    disabled={editSubmitting}
                  />
                  <FieldLabel>Usuario ativo</FieldLabel>
                </Field>

                <Field orientation="horizontal">
                  <Checkbox
                    checked={editForm.membershipIsActive}
                    onCheckedChange={(checked) =>
                      setEditForm((current) =>
                        current
                          ? { ...current, membershipIsActive: checked === true }
                          : current,
                      )
                    }
                    disabled={editSubmitting}
                  />
                  <FieldLabel>Membership ativa neste tenant</FieldLabel>
                </Field>
              </FieldGroup>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingUser(null)}
                  disabled={editSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={editSubmitting}>
                  {editSubmitting ? (
                    <LoaderCircleIcon className="size-4 animate-spin" />
                  ) : (
                    <PencilIcon className="size-4" />
                  )}
                  Salvar alteracoes
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
