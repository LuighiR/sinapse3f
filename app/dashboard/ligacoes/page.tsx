"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  endOfMonth,
  format,
  isFuture,
  isToday,
  startOfMonth,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  ArrowLeftIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  DownloadIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  getBranches,
  getCallsDrilldown,
  getCallsFilterOptions,
  getEmployees,
  type Branch,
  type CallOutcome,
  type CallsDrilldownRow,
  type Employee,
} from "@/lib/api"
import {
  buildCallsExportCsv,
  buildCallsExportFilename,
} from "@/lib/calls-export"
import { fetchAllCallsDrilldown } from "@/lib/fetch-all-calls-drilldown"
import { isKpiInboundDirection } from "@/lib/calls-list-query"
import { useAuth } from "@/lib/auth-context"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const PAGE_SIZE = 50

const OUTCOME_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Todos Resultados" },
  { value: "ANSWERED", label: "Atendidas" },
  { value: "UNANSWERED", label: "Não Atendidas" },
  { value: "UNCLASSIFIED", label: "Não Classificadas" },
]

const OUTCOME_LABELS: Record<CallOutcome, string> = {
  ANSWERED: "Atendida",
  UNANSWERED: "Não Atendida",
  UNCLASSIFIED: "Não Classificada",
}

const DIRECTION_LABELS: Record<string, string> = {
  inbound: "Entrada",
  outbound: "Saída",
}

function toYMD(date: Date) {
  return format(date, "yyyy-MM-dd")
}

function clampToday(date: Date) {
  const now = new Date()
  return date > now ? now : date
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value)
}

function formatDatetime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  })
}

function formatDuration(seconds: string) {
  const total = Number(seconds)
  if (!Number.isFinite(total) || total < 0) return seconds || "—"
  const mins = Math.floor(total / 60)
  const secs = total % 60
  if (mins === 0) return `${secs}s`
  return `${mins}:${String(secs).padStart(2, "0")}`
}

function formatDirection(direction: string | null | undefined) {
  if (!direction) return "—"
  return DIRECTION_LABELS[direction.toLowerCase()] ?? direction
}

export default function LigacoesPage() {
  const { session } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  React.useEffect(() => {
    if (!session) router.replace("/login")
  }, [session, router])

  const queryFrom = searchParams.get("from")
  const queryTo = searchParams.get("to")
  const queryEmployeeId = searchParams.get("employeeId")
  const queryBranchId = searchParams.get("branchId")
  const queryStatus = searchParams.get("status")
  const queryDirection = searchParams.get("direction")
  const queryOutcome = searchParams.get("outcome")
  const queryWithoutEmployee = searchParams.get("withoutEmployee")
  const queryCallerNumber = searchParams.get("callerNumber")
  const queryDestinationNumber = searchParams.get("destinationNumber")

  const now = new Date()
  const defaultFrom = queryFrom ?? toYMD(startOfMonth(now))
  const defaultTo = queryTo ?? toYMD(clampToday(endOfMonth(now)))

  const [filterMode, setFilterMode] = React.useState<"month" | "range">(
    queryFrom && queryTo ? "range" : "month",
  )
  const [month, setMonth] = React.useState(() => {
    if (queryFrom) return new Date(`${queryFrom}T12:00:00`)
    return now
  })
  const [rangeFrom, setRangeFrom] = React.useState<Date | undefined>(
    queryFrom ? new Date(`${queryFrom}T12:00:00`) : undefined,
  )
  const [rangeTo, setRangeTo] = React.useState<Date | undefined>(
    queryTo ? new Date(`${queryTo}T12:00:00`) : undefined,
  )

  const from =
    filterMode === "month"
      ? toYMD(startOfMonth(month))
      : rangeFrom
        ? toYMD(rangeFrom)
        : defaultFrom
  const to =
    filterMode === "month"
      ? toYMD(clampToday(endOfMonth(month)))
      : rangeTo
        ? toYMD(rangeTo)
        : defaultTo

  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string>(
    queryEmployeeId ?? "all",
  )

  const [branches, setBranches] = React.useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = React.useState<string>(
    queryBranchId ?? "all",
  )

  const [status, setStatus] = React.useState<string>(queryStatus ?? "all")
  const [direction, setDirection] = React.useState<string>(
    queryDirection ?? "all",
  )
  const [outcome, setOutcome] = React.useState<string>(queryOutcome ?? "all")
  const [withoutEmployee, setWithoutEmployee] = React.useState(
    queryWithoutEmployee === "true",
  )
  const [callerNumber, setCallerNumber] = React.useState(
    queryCallerNumber ?? "",
  )
  const [destinationNumber, setDestinationNumber] = React.useState(
    queryDestinationNumber ?? "",
  )
  const [debouncedCallerNumber, setDebouncedCallerNumber] = React.useState(
    callerNumber,
  )
  const [debouncedDestinationNumber, setDebouncedDestinationNumber] =
    React.useState(destinationNumber)

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedCallerNumber(callerNumber), 400)
    return () => clearTimeout(timer)
  }, [callerNumber])

  React.useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedDestinationNumber(destinationNumber),
      400,
    )
    return () => clearTimeout(timer)
  }, [destinationNumber])

  const [statusOptions, setStatusOptions] = React.useState<string[]>([])
  const [directionOptions, setDirectionOptions] = React.useState<string[]>([])

  const [rows, setRows] = React.useState<CallsDrilldownRow[]>([])
  const [total, setTotal] = React.useState(0)
  const [totalPages, setTotalPages] = React.useState(1)
  const [page, setPage] = React.useState(1)
  const [loading, setLoading] = React.useState(false)
  const [exporting, setExporting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const branchId = selectedBranchId !== "all" ? selectedBranchId : undefined
  const employeeId =
    withoutEmployee || selectedEmployeeId === "all"
      ? undefined
      : selectedEmployeeId
  const statusFilter = status !== "all" ? status : undefined
  const directionFilter = direction !== "all" ? direction : undefined
  const outcomeFilter = outcome !== "all" ? outcome : undefined
  const withoutEmployeeFilter = withoutEmployee ? "true" : undefined
  const isInboundToCompanyFilter = isKpiInboundDirection(directionFilter)
    ? "true"
    : undefined
  const callerFilter = debouncedCallerNumber.trim() || undefined
  const destinationFilter = debouncedDestinationNumber.trim() || undefined

  const filterKey = React.useMemo(
    () =>
      [
        from,
        to,
        employeeId,
        branchId,
        statusFilter,
        directionFilter,
        outcomeFilter,
        withoutEmployeeFilter,
        isInboundToCompanyFilter,
        callerFilter,
        destinationFilter,
      ].join("|"),
    [
      from,
      to,
      employeeId,
      branchId,
      statusFilter,
      directionFilter,
      outcomeFilter,
      withoutEmployeeFilter,
      isInboundToCompanyFilter,
      callerFilter,
      destinationFilter,
    ],
  )

  React.useEffect(() => {
    setPage(1)
  }, [filterKey])

  React.useEffect(() => {
    if (!session) return

    getEmployees({ token: session.accessToken, tenantId: session.tenantId })
      .then(setEmployees)
      .catch(() => {})
    getBranches({ token: session.accessToken, tenantId: session.tenantId })
      .then(setBranches)
      .catch(() => {})
  }, [session])

  const filterOptionsKey = React.useRef(0)

  React.useEffect(() => {
    if (!session) return

    const key = ++filterOptionsKey.current

    getCallsFilterOptions({
      token: session.accessToken,
      tenantId: session.tenantId,
      from,
      to,
      branchId,
    })
      .then((data) => {
        if (key !== filterOptionsKey.current) return
        setStatusOptions(data.statuses.filter((value): value is string => Boolean(value)))
        setDirectionOptions(
          data.directions.filter((value): value is string => Boolean(value)),
        )
      })
      .catch(() => {})
  }, [session, from, to, branchId])

  const fetchKey = React.useRef(0)

  React.useEffect(() => {
    if (!session) return

    const key = ++fetchKey.current
    setLoading(true)
    setError(null)

    getCallsDrilldown({
      token: session.accessToken,
      tenantId: session.tenantId,
      from,
      to,
      employeeId,
      branchId,
      status: statusFilter,
      direction: directionFilter,
      outcome: outcomeFilter,
      withoutEmployee: withoutEmployeeFilter,
      isInboundToCompany: isInboundToCompanyFilter,
      callerNumber: callerFilter,
      destinationNumber: destinationFilter,
      page: String(page),
      pageSize: String(PAGE_SIZE),
    })
      .then((data) => {
        if (key !== fetchKey.current) return
        setRows(data.rows)
        setTotal(data.pagination.total)
        setTotalPages(Math.max(1, data.pagination.totalPages))
      })
      .catch((fetchError: Error) => {
        if (key !== fetchKey.current) return
        setError(fetchError.message)
        setRows([])
        setTotal(0)
        setTotalPages(1)
      })
      .finally(() => {
        if (key !== fetchKey.current) return
        setLoading(false)
      })
  }, [
    session,
    from,
    to,
    employeeId,
    branchId,
    statusFilter,
    directionFilter,
    outcomeFilter,
    withoutEmployeeFilter,
    isInboundToCompanyFilter,
    callerFilter,
    destinationFilter,
    page,
  ])

  async function handleExportCsv() {
    if (!session || total === 0) {
      toast.error("Nenhuma ligação filtrada para exportar")
      return
    }

    setExporting(true)
    try {
      const allRows = await fetchAllCallsDrilldown({
        token: session.accessToken,
        tenantId: session.tenantId,
        from,
        to,
        employeeId,
        branchId,
        status: statusFilter,
        direction: directionFilter,
        outcome: outcomeFilter,
        withoutEmployee: withoutEmployeeFilter,
        isInboundToCompany: isInboundToCompanyFilter,
        callerNumber: callerFilter,
        destinationNumber: destinationFilter,
      })

      const csv = buildCallsExportCsv(allRows)
      const filename = buildCallsExportFilename(from, to)
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")

      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()

      setTimeout(() => URL.revokeObjectURL(url), 0)

      toast.success(
        `${formatNumber(allRows.length)} ligação${allRows.length === 1 ? "" : "ões"} exportada${allRows.length === 1 ? "" : "s"}`,
      )
    } catch (exportError) {
      toast.error(
        exportError instanceof Error
          ? exportError.message
          : "Erro ao exportar ligações",
      )
    } finally {
      setExporting(false)
    }
  }

  if (!session) return null

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
        <SiteHeader />
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
                      Ligações
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Detalhamento de ligações no período
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={handleExportCsv}
                    disabled={loading || exporting || total === 0}
                  >
                    <DownloadIcon className="size-4" />
                    Exportar CSV
                  </Button>
                  <Badge variant="outline" className="tabular-nums">
                    {formatNumber(total)} registros
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-md border">
                  <Button
                    size="sm"
                    variant={filterMode === "month" ? "default" : "ghost"}
                    className="h-8 rounded-r-none text-xs"
                    onClick={() => setFilterMode("month")}
                  >
                    MÊS
                  </Button>
                  <Button
                    size="sm"
                    variant={filterMode === "range" ? "default" : "ghost"}
                    className="h-8 rounded-l-none text-xs"
                    onClick={() => setFilterMode("range")}
                  >
                    RANGE
                  </Button>
                </div>

                {filterMode === "month" ? (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        setMonth(
                          (current) =>
                            new Date(
                              current.getFullYear(),
                              current.getMonth() - 1,
                              1,
                            ),
                        )
                      }
                    >
                      <ChevronLeftIcon className="size-4" />
                    </Button>
                    <span className="min-w-[110px] text-center text-sm font-medium capitalize">
                      {format(month, "MMMM yyyy", { locale: ptBR })}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={isFuture(
                        startOfMonth(
                          new Date(
                            month.getFullYear(),
                            month.getMonth() + 1,
                            1,
                          ),
                        ),
                      )}
                      onClick={() =>
                        setMonth(
                          (current) =>
                            new Date(
                              current.getFullYear(),
                              current.getMonth() + 1,
                              1,
                            ),
                        )
                      }
                    >
                      <ChevronRightIcon className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                      >
                        <CalendarIcon className="size-3.5" />
                        {rangeFrom && rangeTo
                          ? `${format(rangeFrom, "dd/MM")} – ${format(rangeTo, "dd/MM/yyyy")}`
                          : "Selecionar período"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        locale={ptBR}
                        selected={
                          rangeFrom
                            ? { from: rangeFrom, to: rangeTo }
                            : undefined
                        }
                        onSelect={(range) => {
                          setRangeFrom(range?.from)
                          setRangeTo(range?.to)
                        }}
                        disabled={(date) => isFuture(date) && !isToday(date)}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                )}

                <Select
                  value={selectedEmployeeId}
                  onValueChange={(value) => {
                    setSelectedEmployeeId(value)
                    if (value !== "all") setWithoutEmployee(false)
                  }}
                  disabled={withoutEmployee}
                >
                  <SelectTrigger className="h-8 w-[200px] text-xs">
                    <SelectValue placeholder="Todos Atendentes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Atendentes</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={String(employee.id)}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={selectedBranchId}
                  onValueChange={setSelectedBranchId}
                >
                  <SelectTrigger className="h-8 w-[180px] text-xs">
                    <SelectValue placeholder="Todas Filiais" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Filiais</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={String(branch.id)}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-8 w-[180px] text-xs">
                    <SelectValue placeholder="Todos Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Status</SelectItem>
                    {statusOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={direction} onValueChange={setDirection}>
                  <SelectTrigger className="h-8 w-[180px] text-xs">
                    <SelectValue placeholder="Todas Direções" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Direções</SelectItem>
                    {directionOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {formatDirection(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={outcome} onValueChange={setOutcome}>
                  <SelectTrigger className="h-8 w-[200px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTCOME_FILTER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={withoutEmployee ? "true" : "false"}
                  onValueChange={(value) => {
                    const enabled = value === "true"
                    setWithoutEmployee(enabled)
                    if (enabled) setSelectedEmployeeId("all")
                  }}
                >
                  <SelectTrigger className="h-8 w-[200px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Com ou sem atendente</SelectItem>
                    <SelectItem value="true">Sem atendente</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Número origem"
                  className="h-8 w-[150px] text-xs"
                  value={callerNumber}
                  onChange={(event) => setCallerNumber(event.target.value)}
                />

                <Input
                  placeholder="Número destino"
                  className="h-8 w-[150px] text-xs"
                  value={destinationNumber}
                  onChange={(event) => setDestinationNumber(event.target.value)}
                />
              </div>

              <div className="rounded-lg border bg-card">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[150px]">Data/Hora</TableHead>
                        <TableHead className="w-[90px]">Direção</TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                        <TableHead className="w-[110px]">Resultado</TableHead>
                        <TableHead>Origem</TableHead>
                        <TableHead>Destino</TableHead>
                        <TableHead className="w-[80px]">Ramal</TableHead>
                        <TableHead>Atendente</TableHead>
                        <TableHead className="w-[80px] text-right">
                          Duração
                        </TableHead>
                        <TableHead>Filial</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading &&
                        Array.from({ length: 10 }).map((_, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {Array.from({ length: 10 }).map((_, cellIndex) => (
                              <TableCell key={cellIndex}>
                                <Skeleton className="h-4 w-full" />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}

                      {error && (
                        <TableRow>
                          <TableCell
                            colSpan={10}
                            className="py-8 text-center text-destructive"
                          >
                            {error}
                          </TableCell>
                        </TableRow>
                      )}

                      {!loading && !error && rows.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={10}
                            className="py-8 text-center text-muted-foreground"
                          >
                            Nenhuma ligação encontrada no período
                          </TableCell>
                        </TableRow>
                      )}

                      {!loading &&
                        rows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="text-xs tabular-nums">
                              {formatDatetime(row.startedAt)}
                            </TableCell>
                            <TableCell className="text-xs">
                              {formatDirection(row.direction)}
                            </TableCell>
                            <TableCell className="text-xs">
                              {row.status}
                            </TableCell>
                            <TableCell className="text-xs">
                              {OUTCOME_LABELS[row.outcome] ?? row.outcome}
                            </TableCell>
                            <TableCell className="text-xs tabular-nums">
                              {row.callerNumber ?? "—"}
                            </TableCell>
                            <TableCell className="text-xs tabular-nums">
                              {row.destinationNumber ?? "—"}
                            </TableCell>
                            <TableCell className="text-xs tabular-nums">
                              {row.agentExtensionNumber ?? "—"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {row.employeeName ?? "—"}
                            </TableCell>
                            <TableCell className="text-right text-xs tabular-nums">
                              {formatDuration(row.durationSeconds)}
                            </TableCell>
                            <TableCell className="text-xs">
                              {row.branchName ?? "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>

                {!loading && totalPages > 1 && (
                  <div className="flex items-center justify-between border-t px-4 py-3">
                    <span className="text-xs text-muted-foreground">
                      Página {page} de {totalPages} ·{" "}
                      {formatNumber(total)} registros
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={page <= 1}
                        onClick={() => setPage(1)}
                      >
                        <ChevronsLeftIcon className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={page <= 1}
                        onClick={() => setPage((current) => current - 1)}
                      >
                        <ChevronLeftIcon className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={page >= totalPages}
                        onClick={() => setPage((current) => current + 1)}
                      >
                        <ChevronRightIcon className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={page >= totalPages}
                        onClick={() => setPage(totalPages)}
                      >
                        <ChevronsRightIcon className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
