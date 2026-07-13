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
  SearchIcon,
} from "lucide-react"

import {
  getBranches,
  getBudgetFollowUpDrilldown,
  getEmployees,
  type Branch,
  type Employee,
  type FollowUpDrilldownRow,
} from "@/lib/api"
import {
  getNextSort,
  sortRows,
  type SortState,
} from "@/lib/table-sorting"
import { useAuth } from "@/lib/auth-context"
import { AppSidebar } from "@/components/app-sidebar"
import { SortableTableHead } from "@/components/sortable-table-head"
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
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function toYMD(date: Date) {
  return format(date, "yyyy-MM-dd")
}

function clampToday(date: Date) {
  const now = new Date()
  return date > now ? now : date
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value)
}

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-")
  return `${day}/${month}/${year}`
}

const BUDGET_STATUS_LABELS: Record<
  string,
  {
    label: string
    variant: "default" | "secondary" | "destructive" | "outline"
  }
> = {
  WON: { label: "Convertido", variant: "default" },
  OPEN: { label: "Em Aberto", variant: "secondary" },
  LOST: { label: "Cancelado", variant: "destructive" },
}

const FOLLOWUP_WINDOW_LABELS: Record<string, string> = {
  within24h: "≤ 24h",
  after24h: "> 24h",
}

const FOLLOWUP_STATUS_LABELS: Record<
  string,
  {
    label: string
    variant: "default" | "secondary" | "destructive" | "outline"
  }
> = {
  converted: { label: "Convertido", variant: "default" },
  lost: { label: "Não Convertido", variant: "destructive" },
  open: { label: "Não Executado", variant: "secondary" },
}

const WINDOW_FILTER_OPTIONS = [
  { value: "all", label: "Todas Janelas" },
  { value: "within24h", label: "Até 24h" },
  { value: "after24h", label: "Pós 24h" },
]

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Todos Follow-up" },
  { value: "converted", label: "Convertidos" },
  { value: "lost", label: "Não Convertidos" },
  { value: "open", label: "Não Executados" },
]

const PAGE_SIZE = 25

type FollowUpSortColumn =
  | "date"
  | "customer"
  | "seller"
  | "budgetStatus"
  | "window"
  | "followUpStatus"
  | "channel"
  | "branch"
  | "value"
  | "dav"

export default function FollowUpPage() {
  const { session } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  React.useEffect(() => {
    if (!session) router.replace("/login")
  }, [session, router])

  const queryFrom = searchParams.get("from")
  const queryTo = searchParams.get("to")
  const querySellerId = searchParams.get("sellerId")
  const queryReferenceAt = searchParams.get("referenceAt")
  const queryFollowUpWindow = searchParams.get("followUpWindow")
  const queryFollowUpStatus = searchParams.get("followUpStatus")

  const now = new Date()

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
        : queryFrom ?? toYMD(startOfMonth(now))
  const to =
    filterMode === "month"
      ? toYMD(clampToday(endOfMonth(month)))
      : rangeTo
        ? toYMD(rangeTo)
        : queryTo ?? toYMD(clampToday(endOfMonth(now)))

  const referenceAt = queryReferenceAt ?? `${to}T23:59:59-03:00`

  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string>(
    querySellerId ?? "all",
  )

  const [branches, setBranches] = React.useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = React.useState<string>("all")

  React.useEffect(() => {
    if (!session) return

    getEmployees({ token: session.accessToken, tenantId: session.tenantId })
      .then(setEmployees)
      .catch(() => {})
    getBranches({ token: session.accessToken, tenantId: session.tenantId })
      .then(setBranches)
      .catch(() => {})
  }, [session])

  const selectedEmployee =
    selectedEmployeeId !== "all"
      ? employees.find((employee) => String(employee.id) === selectedEmployeeId)
      : undefined
  const sellerId = selectedEmployee
    ? String(selectedEmployee.erpId)
    : querySellerId ?? undefined
  const branchId = selectedBranchId !== "all" ? selectedBranchId : undefined

  const [followUpWindow, setFollowUpWindow] = React.useState<string>(
    queryFollowUpWindow ?? "all",
  )
  const [followUpStatus, setFollowUpStatus] = React.useState<string>(
    queryFollowUpStatus ?? "all",
  )
  const [search, setSearch] = React.useState("")

  const [rows, setRows] = React.useState<FollowUpDrilldownRow[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [page, setPage] = React.useState(0)
  const [sort, setSort] = React.useState<SortState<FollowUpSortColumn>>({
    column: "date",
    direction: "desc",
  })

  const fetchKey = React.useRef(0)

  React.useEffect(() => {
    if (!session) return

    const key = ++fetchKey.current
    setLoading(true)
    setError(null)
    setPage(0)

    getBudgetFollowUpDrilldown({
      token: session.accessToken,
      tenantId: session.tenantId,
      from,
      to,
      referenceAt,
      sellerId,
      branchId,
      followUpWindow: followUpWindow !== "all" ? followUpWindow : undefined,
      followUpStatus: followUpStatus !== "all" ? followUpStatus : undefined,
    })
      .then((data) => {
        if (key !== fetchKey.current) return
        setRows(data.rows)
      })
      .catch((fetchError: Error) => {
        if (key !== fetchKey.current) return
        setError(fetchError.message)
      })
      .finally(() => {
        if (key !== fetchKey.current) return
        setLoading(false)
      })
  }, [
    session,
    from,
    to,
    referenceAt,
    sellerId,
    branchId,
    followUpWindow,
    followUpStatus,
  ])

  const filtered = React.useMemo(() => {
    if (!search.trim()) return rows

    const query = search.toLowerCase()
    return rows.filter(
      (row) =>
        row.customerName?.toLowerCase().includes(query) ||
        row.sellerName?.toLowerCase().includes(query) ||
        row.davId?.toLowerCase().includes(query) ||
        row.cpfCnpj?.includes(query),
    )
  }, [rows, search])

  const sorted = React.useMemo(
    () =>
      sortRows(filtered, sort, {
        date: (row) => row.budgetDate,
        customer: (row) => row.customerName,
        seller: (row) => row.sellerName,
        budgetStatus: (row) =>
          BUDGET_STATUS_LABELS[row.statusNormalized]?.label ??
          row.statusNormalized,
        window: (row) => (row.followUpWindow === "within24h" ? 0 : 1),
        followUpStatus: (row) =>
          FOLLOWUP_STATUS_LABELS[row.followUpStatus]?.label ??
          row.followUpStatus,
        channel: (row) => row.channel,
        branch: (row) => row.branchName,
        value: (row) => Number(row.valueAmount),
        dav: (row) => row.davId,
      }),
    [filtered, sort],
  )

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const totals = React.useMemo(() => {
    return filtered.reduce(
      (accumulator, row) => ({
        count: accumulator.count + 1,
        value: accumulator.value + Number(row.valueAmount),
      }),
      { count: 0, value: 0 },
    )
  }, [filtered])

  function handleSort(column: FollowUpSortColumn) {
    setSort((current) => getNextSort(current, column))
    setPage(0)
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
                      Follow-up de Orçamentos
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Detalhamento de follow-up no período
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="tabular-nums">
                    {formatNumber(totals.count)} registros
                  </Badge>
                  <Badge variant="secondary" className="tabular-nums">
                    {formatCurrency(totals.value)}
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
                  onValueChange={setSelectedEmployeeId}
                >
                  <SelectTrigger className="h-8 w-[200px] text-xs">
                    <SelectValue placeholder="Todos Vendedores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Vendedores</SelectItem>
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
                      <SelectItem key={branch.id} value={String(branch.erpId)}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={followUpWindow}
                  onValueChange={setFollowUpWindow}
                >
                  <SelectTrigger className="h-8 w-[160px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WINDOW_FILTER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={followUpStatus}
                  onValueChange={setFollowUpStatus}
                >
                  <SelectTrigger className="h-8 w-[180px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_FILTER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative ml-auto">
                  <SearchIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cliente, vendedor..."
                    className="h-8 w-[220px] pl-8 text-xs"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value)
                      setPage(0)
                    }}
                  />
                </div>
              </div>

              <div className="rounded-lg border bg-card">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <SortableTableHead
                          column="date"
                          sort={sort}
                          onToggle={handleSort}
                          className="w-[100px]"
                        >
                          Data
                        </SortableTableHead>
                        <SortableTableHead
                          column="customer"
                          sort={sort}
                          onToggle={handleSort}
                        >
                          Cliente
                        </SortableTableHead>
                        <SortableTableHead
                          column="seller"
                          sort={sort}
                          onToggle={handleSort}
                        >
                          Vendedor
                        </SortableTableHead>
                        <SortableTableHead
                          column="budgetStatus"
                          sort={sort}
                          onToggle={handleSort}
                          className="w-[100px]"
                        >
                          Status Orç.
                        </SortableTableHead>
                        <SortableTableHead
                          column="window"
                          sort={sort}
                          onToggle={handleSort}
                          className="w-[80px]"
                        >
                          Janela
                        </SortableTableHead>
                        <SortableTableHead
                          column="followUpStatus"
                          sort={sort}
                          onToggle={handleSort}
                          className="w-[120px]"
                        >
                          Follow-up
                        </SortableTableHead>
                        <SortableTableHead
                          column="channel"
                          sort={sort}
                          onToggle={handleSort}
                        >
                          Canal
                        </SortableTableHead>
                        <SortableTableHead
                          column="branch"
                          sort={sort}
                          onToggle={handleSort}
                        >
                          Filial
                        </SortableTableHead>
                        <SortableTableHead
                          column="value"
                          sort={sort}
                          onToggle={handleSort}
                          className="w-[130px] text-right"
                          align="right"
                        >
                          Valor
                        </SortableTableHead>
                        <SortableTableHead
                          column="dav"
                          sort={sort}
                          onToggle={handleSort}
                          className="w-[90px]"
                        >
                          DAV
                        </SortableTableHead>
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

                      {!loading && !error && paginated.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={10}
                            className="py-8 text-center text-muted-foreground"
                          >
                            Nenhum registro de follow-up encontrado no período
                          </TableCell>
                        </TableRow>
                      )}

                      {!loading &&
                        paginated.map((row) => {
                          const budgetStatus =
                            BUDGET_STATUS_LABELS[row.statusNormalized] ?? {
                              label: row.statusNormalized,
                              variant: "outline" as const,
                            }
                          const followUpStatusConfig =
                            FOLLOWUP_STATUS_LABELS[row.followUpStatus] ?? {
                              label: row.followUpStatus,
                              variant: "outline" as const,
                            }

                          return (
                            <TableRow key={row.id}>
                              <TableCell className="text-xs tabular-nums">
                                {formatDate(row.budgetDate)}
                              </TableCell>
                              <TableCell
                                className="max-w-[200px] truncate text-xs"
                                title={row.customerName}
                              >
                                {row.customerName}
                              </TableCell>
                              <TableCell className="text-xs">
                                {row.sellerName}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={budgetStatus.variant}
                                  className="text-xs"
                                >
                                  {budgetStatus.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs">
                                {FOLLOWUP_WINDOW_LABELS[row.followUpWindow] ??
                                  row.followUpWindow}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={followUpStatusConfig.variant}
                                  className="text-xs"
                                >
                                  {followUpStatusConfig.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs">
                                {row.channel ?? "—"}
                              </TableCell>
                              <TableCell className="text-xs">
                                {row.branchName}
                              </TableCell>
                              <TableCell className="text-right text-xs font-medium tabular-nums">
                                {formatCurrency(Number(row.valueAmount))}
                              </TableCell>
                              <TableCell className="text-xs tabular-nums">
                                {row.davId ?? "—"}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                    </TableBody>
                  </Table>
                </div>

                {!loading && sorted.length > PAGE_SIZE && (
                  <div className="flex items-center justify-between border-t px-4 py-3">
                    <span className="text-xs text-muted-foreground">
                      Página {page + 1} de {totalPages} ·{" "}
                      {formatNumber(sorted.length)} registros
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={page === 0}
                        onClick={() => setPage(0)}
                      >
                        <ChevronsLeftIcon className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={page === 0}
                        onClick={() => setPage((current) => current - 1)}
                      >
                        <ChevronLeftIcon className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage((current) => current + 1)}
                      >
                        <ChevronRightIcon className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage(totalPages - 1)}
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
