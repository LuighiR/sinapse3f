"use client"

import * as React from "react"
import {
  LoaderCircleIcon,
  PencilIcon,
  PlusIcon,
  RefreshCcwIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  createEmployee,
  getBranches,
  getEmployees,
  updateEmployee,
  type Branch,
  type Employee,
} from "@/lib/api"
import {
  buildCreateEmployeeBody,
  buildUpdateEmployeeBody,
  formFromEmployee,
  snapshotFromEmployee,
  type EmployeeFormFields,
} from "@/lib/employee-admin"
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
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const CREATE_FORM_INITIAL_STATE: EmployeeFormFields = {
  name: "",
  branchId: 0,
  erpId: 0,
  extensionNumber: "",
  extensionUuid: "",
  chatId: "",
  isNonCommercial: false,
  isActive: true,
}

type EmployeesSectionProps = {
  token: string
  tenantId: string
}

export function EmployeesSection({ token, tenantId }: EmployeesSectionProps) {
  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [branches, setBranches] = React.useState<Branch[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [search, setSearch] = React.useState("")
  const [branchFilter, setBranchFilter] = React.useState<string>("all")

  const [createOpen, setCreateOpen] = React.useState(false)
  const [createSubmitting, setCreateSubmitting] = React.useState(false)
  const [createForm, setCreateForm] = React.useState<EmployeeFormFields>(
    CREATE_FORM_INITIAL_STATE,
  )

  const [editing, setEditing] = React.useState<Employee | null>(null)
  const [editSubmitting, setEditSubmitting] = React.useState(false)
  const [editForm, setEditForm] = React.useState<EmployeeFormFields | null>(null)

  const load = React.useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      try {
        const branchId = branchFilter === "all" ? undefined : Number(branchFilter)
        const [branchRows, employeeRows] = await Promise.all([
          getBranches({ token, tenantId }),
          getEmployees({
            token,
            tenantId,
            includeInactive: true,
            search: search.trim() || undefined,
            branchId: Number.isFinite(branchId) ? branchId : undefined,
          }),
        ])
        setBranches(branchRows)
        setEmployees(employeeRows)
        setError(null)
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Nao foi possivel carregar os colaboradores."
        setError(message)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [branchFilter, search, tenantId, token],
  )

  React.useEffect(() => {
    void load()
  }, [load])

  React.useEffect(() => {
    if (!editing) {
      setEditForm(null)
      return
    }

    setEditForm(formFromEmployee(editing))
  }, [editing])

  function getBranchName(branchId: number) {
    return branches.find((branch) => branch.id === branchId)?.name ?? `Filial ${branchId}`
  }

  async function handleCreateEmployee(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const body = buildCreateEmployeeBody(createForm)
    if (!body.name || !body.branchId || !body.erpId) {
      toast.error("Preencha nome, filial e ERP ID para criar o colaborador.")
      return
    }

    setCreateSubmitting(true)
    try {
      await createEmployee({ token, tenantId, ...body })
      toast.success("Colaborador criado com sucesso.")
      setCreateForm(CREATE_FORM_INITIAL_STATE)
      setCreateOpen(false)
      await load(true)
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Nao foi possivel criar o colaborador.",
      )
    } finally {
      setCreateSubmitting(false)
    }
  }

  async function handleEditEmployee(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!editing || !editForm) return

    const payload = buildUpdateEmployeeBody(snapshotFromEmployee(editing), editForm)
    if (Object.keys(payload).length === 0) {
      toast.error("Altere pelo menos um campo antes de salvar.")
      return
    }

    setEditSubmitting(true)
    try {
      await updateEmployee({
        token,
        tenantId,
        employeeId: editing.id,
        ...payload,
      })
      toast.success("Colaborador atualizado com sucesso.")
      setEditing(null)
      await load(true)
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Nao foi possivel atualizar o colaborador.",
      )
    } finally {
      setEditSubmitting(false)
    }
  }

  function patchForm(
    setForm: React.Dispatch<React.SetStateAction<EmployeeFormFields | null>>,
    patch: Partial<EmployeeFormFields>,
  ) {
    setForm((current) => (current ? { ...current, ...patch } : current))
  }

  function renderEmployeeFields(
    form: EmployeeFormFields,
    onPatch: (patch: Partial<EmployeeFormFields>) => void,
    disabled: boolean,
    idPrefix: string,
  ) {
    return (
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-name`}>Nome</FieldLabel>
          <Input
            id={`${idPrefix}-name`}
            value={form.name}
            onChange={(e) => onPatch({ name: e.target.value })}
            required
            disabled={disabled}
          />
        </Field>

        <Field>
          <FieldLabel>Filial</FieldLabel>
          <Select
            value={form.branchId ? String(form.branchId) : undefined}
            onValueChange={(value) => onPatch({ branchId: Number(value) })}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione a filial" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={String(branch.id)}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor={`${idPrefix}-erpId`}>ERP ID</FieldLabel>
          <Input
            id={`${idPrefix}-erpId`}
            type="number"
            value={form.erpId || ""}
            onChange={(e) => onPatch({ erpId: Number(e.target.value) || 0 })}
            required
            disabled={disabled}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={`${idPrefix}-extensionNumber`}>Ramal</FieldLabel>
          <Input
            id={`${idPrefix}-extensionNumber`}
            value={form.extensionNumber}
            onChange={(e) => onPatch({ extensionNumber: e.target.value })}
            disabled={disabled}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={`${idPrefix}-extensionUuid`}>
            UUID do ramal
          </FieldLabel>
          <Input
            id={`${idPrefix}-extensionUuid`}
            value={form.extensionUuid}
            onChange={(e) => onPatch({ extensionUuid: e.target.value })}
            disabled={disabled}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={`${idPrefix}-chatId`}>Chat ID</FieldLabel>
          <Input
            id={`${idPrefix}-chatId`}
            value={form.chatId}
            onChange={(e) => onPatch({ chatId: e.target.value })}
            disabled={disabled}
          />
        </Field>

        <Field orientation="horizontal">
          <Checkbox
            checked={form.isNonCommercial}
            onCheckedChange={(checked) =>
              onPatch({ isNonCommercial: checked === true })
            }
            disabled={disabled}
          />
          <FieldLabel>Nao comercial</FieldLabel>
        </Field>

        <Field orientation="horizontal">
          <Checkbox
            checked={form.isActive}
            onCheckedChange={(checked) =>
              onPatch({ isActive: checked === true })
            }
            disabled={disabled}
          />
          <FieldLabel>Colaborador ativo</FieldLabel>
        </Field>
      </FieldGroup>
    )
  }

  function renderTableBody() {
    if (loading) {
      return Array.from({ length: 5 }).map((_, rowIndex) => (
        <TableRow key={`loading-${rowIndex}`}>
          {Array.from({ length: 8 }).map((_, cellIndex) => (
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
          <TableCell colSpan={8} className="py-8 text-center text-destructive">
            {error}
          </TableCell>
        </TableRow>
      )
    }

    if (employees.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
            Nenhum colaborador encontrado.
          </TableCell>
        </TableRow>
      )
    }

    return employees.map((employee) => (
      <TableRow key={employee.id}>
        <TableCell>
          <div className="flex flex-col">
            <span className="font-medium">{employee.name}</span>
            <span className="text-xs text-muted-foreground">{employee.id}</span>
          </div>
        </TableCell>
        <TableCell>{getBranchName(employee.branchId)}</TableCell>
        <TableCell>{employee.erpId}</TableCell>
        <TableCell>{employee.extensionNumber || "—"}</TableCell>
        <TableCell>{employee.chatId || "—"}</TableCell>
        <TableCell>
          <Badge variant={employee.isNonCommercial ? "outline" : "secondary"}>
            {employee.isNonCommercial ? "Nao comercial" : "Comercial"}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge variant={employee.isActive ? "secondary" : "outline"}>
            {employee.isActive ? "Ativo" : "Inativo"}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <Button variant="outline" size="sm" onClick={() => setEditing(employee)}>
            <PencilIcon className="size-4" />
            Editar
          </Button>
        </TableCell>
      </TableRow>
    ))
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Colaboradores</CardTitle>
            <CardDescription>
              Integrado aos endpoints de listagem, criacao e atualizacao de
              colaboradores do backend.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => void load(true)}
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
                setCreateForm({
                  ...CREATE_FORM_INITIAL_STATE,
                  branchId: branches[0]?.id ?? 0,
                })
                setCreateOpen(true)
              }}
            >
              <PlusIcon className="size-4" />
              Novo colaborador
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && error.includes("requires owner or admin membership") ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Seu usuario autenticado nao tem permissao suficiente no backend para
              administrar colaboradores deste tenant.
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="sm:w-[220px]">
                <SelectValue placeholder="Filial" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as filiais</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={String(branch.id)}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead>ERP ID</TableHead>
                  <TableHead>Ramal</TableHead>
                  <TableHead>Chat ID</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{renderTableBody()}</TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo colaborador</DialogTitle>
            <DialogDescription>
              Cadastre um colaborador no tenant atual.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateEmployee} className="space-y-6">
            {renderEmployeeFields(
              createForm,
              (patch) => setCreateForm((current) => ({ ...current, ...patch })),
              createSubmitting,
              "employee-create",
            )}

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
                Criar colaborador
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editing && !!editForm}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar colaborador</DialogTitle>
            <DialogDescription>
              Ajuste os dados do colaborador no tenant atual.
            </DialogDescription>
          </DialogHeader>

          {editing && editForm ? (
            <form onSubmit={handleEditEmployee} className="space-y-6">
              {renderEmployeeFields(
                editForm,
                (patch) => patchForm(setEditForm, patch),
                editSubmitting,
                "employee-edit",
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(null)}
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
    </>
  )
}
