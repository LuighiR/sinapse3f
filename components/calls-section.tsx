"use client"

import * as React from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import {
  PhoneIncomingIcon,
  PhoneMissedIcon,
  PhoneIcon,
  UsersIcon,
  FileSpreadsheetIcon,
  ClockIcon,
  TrendingUpIcon,
  TrendingDownIcon,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import {
  getCallsSummary,
  getCallsHourly,
  getCallsAgentsRanking,
  getCallsHourlyComparison,
  type CallsSummary,
  type CallsHourly,
  type CallsAgentsRanking,
  type CallsHourlyComparison,
  type KpiOpts,
} from "@/lib/api"

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value)
}

function CardSkeleton() {
  return (
    <Card className="@container/card">
      <CardHeader>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-24 mt-1" />
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-28" />
      </CardFooter>
    </Card>
  )
}

// ── Drilldown Dialogs ──

type CallsDrilldownKind =
  | "calls-lost"
  | "calls-received"
  | "calls-ranking"
  | "calls-peak"
  | "calls-bar-chart"
  | "calls-comparison"

function HourlyTable({
  data,
  loading,
  error,
  columns,
}: {
  data: CallsHourly | null
  loading: boolean
  error: string | null
  columns: { key: keyof CallsHourly["rows"][number]; label: string }[]
}) {
  if (loading)
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    )
  if (error) return <p className="text-sm text-destructive text-center py-4">{error}</p>
  if (!data) return null

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Hora</TableHead>
          {columns.map((c) => (
            <TableHead key={c.key} className="text-right">
              {c.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.rows.map((row) => (
          <TableRow key={row.hour}>
            <TableCell>{row.hour}:00</TableCell>
            {columns.map((c) => (
              <TableCell key={c.key} className="text-right tabular-nums">
                {formatNumber(row[c.key] as number)}
              </TableCell>
            ))}
          </TableRow>
        ))}
        {data.rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground">
              Nenhum registro no período
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}

// ── Bar Chart Dialog ──

const barChartConfig = {
  received: { label: "Recebidas", color: "var(--color-chart-1)" },
  lost: { label: "Perdidas", color: "var(--color-chart-2)" },
} satisfies ChartConfig

function CallsBarChartContent({
  data,
  loading,
  error,
}: {
  data: CallsHourly | null
  loading: boolean
  error: string | null
}) {
  if (loading) return <Skeleton className="h-64 w-full" />
  if (error) return <p className="text-sm text-destructive text-center py-4">{error}</p>
  if (!data) return null

  const chartData = data.rows.map((r) => ({
    hour: `${r.hour}h`,
    received: r.receivedCount,
    lost: r.lostCount,
  }))

  return (
    <ChartContainer config={barChartConfig} className="aspect-[16/9] w-full">
      <BarChart data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="hour" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={40} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="received" fill="var(--color-received)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="lost" fill="var(--color-lost)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}

// ── Comparison Line Chart Dialog ──

const comparisonChartConfig = {
  received: { label: "Recebidas", color: "var(--color-chart-1)" },
  lost: { label: "Perdidas", color: "var(--color-chart-2)" },
  budgets: { label: "Orçamentos Televendas", color: "var(--color-chart-3)" },
} satisfies ChartConfig

function CallsComparisonContent({
  data,
  loading,
  error,
}: {
  data: CallsHourlyComparison | null
  loading: boolean
  error: string | null
}) {
  if (loading) return <Skeleton className="h-64 w-full" />
  if (error) return <p className="text-sm text-destructive text-center py-4">{error}</p>
  if (!data) return null

  const chartData = data.rows.map((r) => ({
    hour: `${r.hour}h`,
    received: r.receivedCount,
    lost: r.lostCount,
    budgets: r.telemarketingBudgetCount,
  }))

  return (
    <ChartContainer config={comparisonChartConfig} className="aspect-[16/9] w-full">
      <LineChart data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="hour" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={40} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line type="monotone" dataKey="received" stroke="var(--color-received)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="lost" stroke="var(--color-lost)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="budgets" stroke="var(--color-budgets)" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartContainer>
  )
}

// ── Agents Ranking Dialog ──

function AgentsRankingContent({
  data,
  loading,
  error,
}: {
  data: CallsAgentsRanking | null
  loading: boolean
  error: string | null
}) {
  if (loading)
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    )
  if (error) return <p className="text-sm text-destructive text-center py-4">{error}</p>
  if (!data) return null

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>#</TableHead>
          <TableHead>Atendente</TableHead>
          <TableHead>Ramal</TableHead>
          <TableHead className="text-right">Recebidas</TableHead>
          <TableHead className="text-right">Perdidas</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.rows.map((row, idx) => (
          <TableRow key={row.agentKey}>
            <TableCell className="font-medium">{idx + 1}</TableCell>
            <TableCell>{row.agentLabel}</TableCell>
            <TableCell>{row.extensionNumber}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatNumber(row.receivedCount)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatNumber(row.lostCount)}
            </TableCell>
          </TableRow>
        ))}
        {data.rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">
              Nenhum registro no período
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}

// ── Main Dialog ──

interface CallsDrilldownDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: CallsDrilldownKind | null
  token: string
  tenantId: string
  from: string
  to: string
  extensionUuid?: string
  extensionNumber?: string
  branchId?: string
}

function CallsDrilldownDialog({
  open,
  onOpenChange,
  kind,
  token,
  tenantId,
  from,
  to,
  extensionUuid,
  extensionNumber,
  branchId,
}: CallsDrilldownDialogProps) {
  const [hourlyData, setHourlyData] = React.useState<CallsHourly | null>(null)
  const [rankingData, setRankingData] = React.useState<CallsAgentsRanking | null>(null)
  const [comparisonData, setComparisonData] = React.useState<CallsHourlyComparison | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open || !kind) return

    const opts: KpiOpts = { token, tenantId, from, to, extensionUuid, extensionNumber, branchId }
    setLoading(true)
    setError(null)
    setHourlyData(null)
    setRankingData(null)
    setComparisonData(null)

    if (kind === "calls-ranking") {
      getCallsAgentsRanking(opts)
        .then(setRankingData)
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading(false))
    } else if (kind === "calls-comparison") {
      getCallsHourlyComparison(opts)
        .then(setComparisonData)
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading(false))
    } else {
      getCallsHourly(opts)
        .then(setHourlyData)
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading(false))
    }
  }, [open, kind, token, tenantId, from, to, branchId])

  const titles: Record<CallsDrilldownKind, { title: string; desc: string }> = {
    "calls-lost": {
      title: "Ligações Perdidas — Por Hora",
      desc: "Detalhamento horário de ligações perdidas",
    },
    "calls-received": {
      title: "Ligações Recebidas — Por Hora",
      desc: "Detalhamento horário de ligações recebidas",
    },
    "calls-ranking": {
      title: "Ranking de Atendentes",
      desc: "Todos os atendentes ordenados por volume de ligações",
    },
    "calls-peak": {
      title: "Picos de Ligação por Horário",
      desc: "Todas as horas ordenadas por volume total de ligações",
    },
    "calls-bar-chart": {
      title: "Ligações por Hora",
      desc: "Gráfico de barras — Recebidas vs Perdidas por hora",
    },
    "calls-comparison": {
      title: "Comparativo por Hora",
      desc: "Ligações recebidas, perdidas e orçamentos televendas",
    },
  }

  const config = kind ? titles[kind] : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{config?.title ?? "Detalhamento"}</DialogTitle>
          <DialogDescription>{config?.desc ?? ""}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {kind === "calls-lost" && (
            <HourlyTable
              data={hourlyData}
              loading={loading}
              error={error}
              columns={[{ key: "lostCount", label: "Perdidas" }]}
            />
          )}
          {kind === "calls-received" && (
            <HourlyTable
              data={hourlyData}
              loading={loading}
              error={error}
              columns={[{ key: "receivedCount", label: "Recebidas" }]}
            />
          )}
          {kind === "calls-peak" && (
            <HourlyTable
              data={
                hourlyData
                  ? {
                      ...hourlyData,
                      rows: [...hourlyData.rows].sort(
                        (a, b) => b.totalInboundCount - a.totalInboundCount,
                      ),
                    }
                  : null
              }
              loading={loading}
              error={error}
              columns={[
                { key: "receivedCount", label: "Recebidas" },
                { key: "lostCount", label: "Perdidas" },
              ]}
            />
          )}
          {kind === "calls-ranking" && (
            <AgentsRankingContent data={rankingData} loading={loading} error={error} />
          )}
          {kind === "calls-bar-chart" && (
            <CallsBarChartContent data={hourlyData} loading={loading} error={error} />
          )}
          {kind === "calls-comparison" && (
            <CallsComparisonContent data={comparisonData} loading={loading} error={error} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Section Component ──

export function CallsSection({
  refreshKey = 0,
  from,
  to,
  extensionUuid,
  extensionNumber,
  branchId,
}: {
  refreshKey?: number
  from: string
  to: string
  extensionUuid?: string
  extensionNumber?: string
  branchId?: string
}) {
  const { session } = useAuth()
  const [summary, setSummary] = React.useState<CallsSummary | null>(null)
  const [hourly, setHourly] = React.useState<CallsHourly | null>(null)
  const [ranking, setRanking] = React.useState<CallsAgentsRanking | null>(null)
  const [loading, setLoading] = React.useState(true)

  const [drilldownOpen, setDrilldownOpen] = React.useState(false)
  const [drilldownKind, setDrilldownKind] = React.useState<CallsDrilldownKind | null>(null)

  React.useEffect(() => {
    if (!session) return
    const opts: KpiOpts = { token: session.accessToken, tenantId: session.tenantId, from, to, extensionUuid, extensionNumber, branchId }

    setLoading(true)
    Promise.all([
      getCallsSummary(opts).then(setSummary).catch((e) => console.error("[KPI] calls summary", e)),
      getCallsHourly(opts).then(setHourly).catch((e) => console.error("[KPI] calls hourly", e)),
      getCallsAgentsRanking(opts).then(setRanking).catch((e) => console.error("[KPI] calls ranking", e)),
    ]).finally(() => setLoading(false))
  }, [session, from, to, refreshKey, extensionUuid, extensionNumber, branchId])

  function openDrilldown(kind: CallsDrilldownKind) {
    setDrilldownKind(kind)
    setDrilldownOpen(true)
  }

  const skeletons = Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)

  // Top 3 peak hours sorted by total inbound
  const topPeaks = React.useMemo(() => {
    if (!hourly) return []
    return [...hourly.rows].sort((a, b) => b.totalInboundCount - a.totalInboundCount).slice(0, 3)
  }, [hourly])

  // Top 3 agents
  const topAgents = React.useMemo(() => {
    if (!ranking) return []
    return ranking.rows.slice(0, 3)
  }, [ranking])

  const lostPct =
    summary && summary.totalInbound.count > 0
      ? ((summary.lost.count / summary.totalInbound.count) * 100).toFixed(1)
      : "0"

  const receivedPct =
    summary && summary.totalInbound.count > 0
      ? ((summary.received.count / summary.totalInbound.count) * 100).toFixed(1)
      : "0"

  return (
    <>
      <div className="flex flex-col gap-4" id="ligacoes">
        <div className="flex items-center gap-2">
          <PhoneIcon className="size-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Ligações</h2>
        </div>

        {/* KPI Cards — row 1 */}
        <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-5">
          {loading ? (
            skeletons
          ) : summary ? (
            <>
              {/* Ligações Perdidas */}
              <Card
                className="@container/card cursor-pointer transition-shadow hover:shadow-md bg-rose-50 dark:bg-rose-950/30 border-rose-200/60 dark:border-rose-800/60"
                onClick={() => openDrilldown("calls-lost")}
              >
                <CardHeader>
                  <CardDescription>Ligações Perdidas</CardDescription>
                  <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                    {formatNumber(summary.lost.count)}
                  </CardTitle>
                  <CardAction>
                    <Badge variant="outline">
                      <PhoneMissedIcon className="size-3" />
                      {lostPct}%
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                  <div className="line-clamp-1 flex gap-2 font-medium">
                    <TrendingDownIcon className="size-4" />
                    Do total inbound
                  </div>
                  <div className="text-muted-foreground">
                    Clique para ver por hora
                  </div>
                </CardFooter>
              </Card>

              {/* Ligações Recebidas */}
              <Card
                className="@container/card cursor-pointer transition-shadow hover:shadow-md bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/60"
                onClick={() => openDrilldown("calls-received")}
              >
                <CardHeader>
                  <CardDescription>Ligações Recebidas</CardDescription>
                  <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                    {formatNumber(summary.received.count)}
                  </CardTitle>
                  <CardAction>
                    <Badge variant="outline">
                      <PhoneIncomingIcon className="size-3" />
                      {receivedPct}%
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                  <div className="line-clamp-1 flex gap-2 font-medium">
                    <TrendingUpIcon className="size-4" />
                    Do total inbound
                  </div>
                  <div className="text-muted-foreground">
                    Clique para ver por hora
                  </div>
                </CardFooter>
              </Card>

              {/* Ranking — Top 3 */}
              <Card
                className="@container/card cursor-pointer transition-shadow hover:shadow-md bg-sky-50 dark:bg-sky-950/30 border-sky-200/60 dark:border-sky-800/60"
                onClick={() => openDrilldown("calls-ranking")}
              >
                <CardHeader>
                  <CardDescription>Ranking de Atendentes</CardDescription>
                  <CardTitle className="text-lg font-semibold">
                    Top 3
                  </CardTitle>
                  <CardAction>
                    <Badge variant="outline">
                      <UsersIcon className="size-3" />
                      Atendentes
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                  {topAgents.length > 0 ? (
                    topAgents.map((a, i) => (
                      <div key={a.agentKey} className="flex w-full justify-between gap-2 tabular-nums">
                        <span className="truncate">
                          {i + 1}. {a.agentLabel}
                        </span>
                        <span className="font-medium">{formatNumber(a.totalInboundCount)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground">Sem dados</div>
                  )}
                </CardFooter>
              </Card>

              {/* Orçamentos em Aberto via Ligação */}
              <Card className="@container/card bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/60">
                <CardHeader>
                  <CardDescription>Orç. Abertos Televendas</CardDescription>
                  <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                    {formatNumber(summary.telemarketingOpenBudgets.count)}
                  </CardTitle>
                  <CardAction>
                    <Badge variant="outline">
                      <FileSpreadsheetIcon className="size-3" />
                      Televendas
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                  <div className="line-clamp-1 flex gap-2 font-medium">
                    Orçamentos abertos via ligação
                  </div>
                  <div className="text-muted-foreground">
                    Canal Pedido Televendas
                  </div>
                </CardFooter>
              </Card>

              {/* Picos — Top 3 */}
              <Card
                className="@container/card cursor-pointer transition-shadow hover:shadow-md bg-sky-50 dark:bg-sky-950/30 border-sky-200/60 dark:border-sky-800/60"
                onClick={() => openDrilldown("calls-peak")}
              >
                <CardHeader>
                  <CardDescription>Picos por Horário</CardDescription>
                  <CardTitle className="text-lg font-semibold">
                    Pico: {summary.peakHour.hour}h
                  </CardTitle>
                  <CardAction>
                    <Badge variant="outline">
                      <ClockIcon className="size-3" />
                      {formatNumber(summary.peakHour.totalInboundCount)}
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                  {topPeaks.length > 0 ? (
                    topPeaks.map((p) => (
                      <div key={p.hour} className="flex w-full justify-between gap-2 tabular-nums">
                        <span>{p.hour}:00</span>
                        <span className="font-medium">{formatNumber(p.totalInboundCount)} lig.</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground">Sem dados</div>
                  )}
                </CardFooter>
              </Card>
            </>
          ) : null}
        </div>

        {/* Charts row */}
        {!loading && summary && (
          <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
            {/* Bar chart card */}
            <Card
              className="@container/card cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => openDrilldown("calls-bar-chart")}
            >
              <CardHeader>
                <CardTitle>Ligações por Hora</CardTitle>
                <CardDescription>Recebidas vs Perdidas — gráfico de barras</CardDescription>
              </CardHeader>
              <CardContent>
                {hourly && (
                  <ChartContainer config={barChartConfig} className="aspect-[2/1] w-full">
                    <BarChart
                      data={hourly.rows.map((r) => ({
                        hour: `${r.hour}h`,
                        received: r.receivedCount,
                        lost: r.lostCount,
                      }))}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="hour" tickLine={false} axisLine={false} fontSize={11} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="received" fill="var(--color-received)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="lost" fill="var(--color-lost)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Comparison line chart card */}
            <Card
              className="@container/card cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => openDrilldown("calls-comparison")}
            >
              <CardHeader>
                <CardTitle>Comparativo por Hora</CardTitle>
                <CardDescription>Ligações vs Orçamentos Televendas</CardDescription>
              </CardHeader>
              <CardContent>
                <ComparisonPreview token={session!.accessToken} tenantId={session!.tenantId} from={from} to={to} extensionUuid={extensionUuid} extensionNumber={extensionNumber} branchId={branchId} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {session && (
        <CallsDrilldownDialog
          open={drilldownOpen}
          onOpenChange={setDrilldownOpen}
          kind={drilldownKind}
          token={session.accessToken}
          tenantId={session.tenantId}
          from={from}
          to={to}
          extensionUuid={extensionUuid}
          extensionNumber={extensionNumber}
          branchId={branchId}
        />
      )}
    </>
  )
}

// Small preview for the comparison line chart card
function ComparisonPreview({
  token,
  tenantId,
  from,
  to,
  extensionUuid,
  extensionNumber,
  branchId,
}: {
  token: string
  tenantId: string
  from: string
  to: string
  extensionUuid?: string
  extensionNumber?: string
  branchId?: string
}) {
  const [data, setData] = React.useState<CallsHourlyComparison | null>(null)

  React.useEffect(() => {
    getCallsHourlyComparison({ token, tenantId, from, to, extensionUuid, extensionNumber, branchId })
      .then(setData)
      .catch(() => {})
  }, [token, tenantId, from, to, extensionUuid, extensionNumber, branchId])

  if (!data) return <Skeleton className="h-40 w-full" />

  const chartData = data.rows.map((r) => ({
    hour: `${r.hour}h`,
    received: r.receivedCount,
    lost: r.lostCount,
    budgets: r.telemarketingBudgetCount,
  }))

  return (
    <ChartContainer config={comparisonChartConfig} className="aspect-[2/1] w-full">
      <LineChart data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="hour" tickLine={false} axisLine={false} fontSize={11} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line type="monotone" dataKey="received" stroke="var(--color-received)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="lost" stroke="var(--color-lost)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="budgets" stroke="var(--color-budgets)" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartContainer>
  )
}
