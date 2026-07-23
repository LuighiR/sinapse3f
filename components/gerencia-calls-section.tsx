"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
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
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
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
import {
  buildCallsListSearchParams,
  type CallsCardKind,
} from "@/lib/calls-list-query"
import type { CallsKpiData } from "@/lib/gerencia-kpi-types"

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value)
}

const barChartConfig = {
  received: { label: "Recebidas", color: "var(--color-chart-1)" },
  lost: { label: "Perdidas", color: "var(--color-chart-2)" },
} satisfies ChartConfig

const comparisonChartConfig = {
  received: { label: "Recebidas", color: "var(--color-chart-1)" },
  lost: { label: "Perdidas", color: "var(--color-chart-2)" },
  budgets: { label: "Orçamentos Televendas", color: "var(--color-chart-3)" },
} satisfies ChartConfig

type Props = {
  data: CallsKpiData
  /** employee = Gerência (novos cards + click); overview = Diretoria (UI atual) */
  variant?: "employee" | "overview"
  from?: string
  to?: string
  employeeId?: string
  branchId?: string
}

function CallsCharts({
  barChartData,
  comparisonChartData,
}: {
  barChartData: { hour: string; received: number; lost: number }[]
  comparisonChartData: {
    hour: string
    received: number
    lost: number
    budgets: number
  }[]
}) {
  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Ligações por Hora</CardTitle>
          <CardDescription>Recebidas vs Perdidas — gráfico de barras</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={barChartConfig} className="aspect-[2/1] w-full">
            <BarChart data={barChartData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="hour" tickLine={false} axisLine={false} fontSize={11} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="received" fill="var(--color-received)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="lost" fill="var(--color-lost)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Comparativo por Hora</CardTitle>
          <CardDescription>Ligações vs Orçamentos Televendas</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={comparisonChartConfig} className="aspect-[2/1] w-full">
            <LineChart data={comparisonChartData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="hour" tickLine={false} axisLine={false} fontSize={11} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="received" stroke="var(--color-received)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="lost" stroke="var(--color-lost)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="budgets" stroke="var(--color-budgets)" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}

export function GerenciaCallsSection({
  data,
  variant = "overview",
  from,
  to,
  employeeId,
  branchId,
}: Props) {
  const router = useRouter()
  const { summary, hourly, ranking, comparison } = data

  const topPeaks = React.useMemo(
    () =>
      [...hourly.rows]
        .sort((a, b) => b.totalInboundCount - a.totalInboundCount)
        .slice(0, 3),
    [hourly.rows],
  )

  const topAgents = ranking.rows.slice(0, 3)

  const barChartData = hourly.rows.map((r) => ({
    hour: `${r.hour}h`,
    received: r.receivedCount,
    lost: r.lostCount,
  }))

  const comparisonChartData = comparison.rows.map((r) => ({
    hour: `${r.hour}h`,
    received: r.receivedCount,
    lost: r.lostCount,
    budgets: r.telemarketingBudgetCount,
  }))

  function openList(kind: CallsCardKind) {
    if (!from || !to) return
    const params = buildCallsListSearchParams({
      kind,
      from,
      to,
      employeeId:
        kind === "total" || kind === "unansweredWithoutEmployee"
          ? undefined
          : employeeId,
      branchId,
    })
    router.push(`/dashboard/ligacoes?${params}`)
  }

  function handleCardKeyDown(
    event: React.KeyboardEvent,
    kind: CallsCardKind,
  ) {
    if (event.key === "Enter" || event.key === " ") {
      if (event.key === " ") event.preventDefault()
      openList(kind)
    }
  }

  if (variant === "employee") {
    const attendantTotal = summary.received.count + summary.lost.count

    const answeredPct =
      attendantTotal > 0
        ? ((summary.received.count / attendantTotal) * 100).toFixed(1)
        : "0"

    const unansweredPct =
      attendantTotal > 0
        ? ((summary.lost.count / attendantTotal) * 100).toFixed(1)
        : "0"

    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-5">
          <Card
            className="@container/card cursor-pointer bg-sky-50 dark:bg-sky-950/30 border-sky-200/60 dark:border-sky-800/60"
            role="button"
            tabIndex={0}
            onClick={() => openList("total")}
            onKeyDown={(e) => handleCardKeyDown(e, "total")}
          >
            <CardHeader>
              <CardDescription>Total de ligações</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {formatNumber(summary.totalInbound.count)}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <PhoneIcon className="size-3" />
                  Inbound
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Todas as ligações recebidas
              </div>
              <div className="text-muted-foreground">Clique para ver listagem</div>
            </CardFooter>
          </Card>

          <Card
            className="@container/card cursor-pointer bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/60"
            role="button"
            tabIndex={0}
            onClick={() => openList("answered")}
            onKeyDown={(e) => handleCardKeyDown(e, "answered")}
          >
            <CardHeader>
              <CardDescription>Atendidas</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {formatNumber(summary.received.count)}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <PhoneIncomingIcon className="size-3" />
                  {answeredPct}%
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                <TrendingUpIcon className="size-4" />
                Do total do atendente
              </div>
              <div className="text-muted-foreground">Clique para ver listagem</div>
            </CardFooter>
          </Card>

          <Card
            className="@container/card cursor-pointer bg-rose-50 dark:bg-rose-950/30 border-rose-200/60 dark:border-rose-800/60"
            role="button"
            tabIndex={0}
            onClick={() => openList("unanswered")}
            onKeyDown={(e) => handleCardKeyDown(e, "unanswered")}
          >
            <CardHeader>
              <CardDescription>Não atendidas</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {formatNumber(summary.lost.count)}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <PhoneMissedIcon className="size-3" />
                  {unansweredPct}%
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                <TrendingDownIcon className="size-4" />
                Do total do atendente
              </div>
              <div className="text-muted-foreground">Clique para ver listagem</div>
            </CardFooter>
          </Card>

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
              <div className="text-muted-foreground">Canal Pedido Televendas</div>
            </CardFooter>
          </Card>

          <Card className="@container/card bg-sky-50 dark:bg-sky-950/30 border-sky-200/60 dark:border-sky-800/60">
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
              {topPeaks.map((p) => (
                <div
                  key={p.hour}
                  className="flex w-full justify-between gap-2 tabular-nums"
                >
                  <span>{p.hour}:00</span>
                  <span className="font-medium">
                    {formatNumber(p.totalInboundCount)} lig.
                  </span>
                </div>
              ))}
            </CardFooter>
          </Card>
        </div>

        <CallsCharts
          barChartData={barChartData}
          comparisonChartData={comparisonChartData}
        />
      </div>
    )
  }

  const lostPct =
    summary.totalInbound.count > 0
      ? ((summary.lost.count / summary.totalInbound.count) * 100).toFixed(1)
      : "0"

  const receivedPct =
    summary.totalInbound.count > 0
      ? ((summary.received.count / summary.totalInbound.count) * 100).toFixed(1)
      : "0"

  const lostWithoutEmployeeCount = summary.lostWithoutEmployee.count
  const lostWithoutEmployeePct =
    summary.lost.count > 0
      ? ((lostWithoutEmployeeCount / summary.lost.count) * 100).toFixed(1)
      : "0"

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <Card
          className="@container/card cursor-pointer bg-sky-50 dark:bg-sky-950/30 border-sky-200/60 dark:border-sky-800/60"
          role="button"
          tabIndex={0}
          onClick={() => openList("total")}
          onKeyDown={(e) => handleCardKeyDown(e, "total")}
        >
          <CardHeader>
            <CardDescription>Total de ligações</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {formatNumber(summary.totalInbound.count)}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <PhoneIcon className="size-3" />
                Inbound
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Todas as ligações recebidas
            </div>
            <div className="text-muted-foreground">Clique para ver listagem</div>
          </CardFooter>
        </Card>

        <Card
          className="@container/card cursor-pointer bg-rose-50 dark:bg-rose-950/30 border-rose-200/60 dark:border-rose-800/60"
          role="button"
          tabIndex={0}
          onClick={() => openList("unanswered")}
          onKeyDown={(e) => handleCardKeyDown(e, "unanswered")}
        >
          <CardHeader>
            <CardDescription>Ligações Não Atendidas</CardDescription>
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
            <div className="text-muted-foreground">Clique para ver listagem</div>
          </CardFooter>
        </Card>

        <Card
          className="@container/card cursor-pointer bg-orange-50 dark:bg-orange-950/30 border-orange-200/60 dark:border-orange-800/60"
          role="button"
          tabIndex={0}
          onClick={() => openList("unansweredWithoutEmployee")}
          onKeyDown={(e) => handleCardKeyDown(e, "unansweredWithoutEmployee")}
        >
          <CardHeader>
            <CardDescription>Não atendidas sem Atendentes</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {formatNumber(lostWithoutEmployeeCount)}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <UsersIcon className="size-3" />
                {lostWithoutEmployeePct}%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Sem employee unico
            </div>
            <div className="text-muted-foreground">Clique para ver listagem</div>
          </CardFooter>
        </Card>

        <Card
          className="@container/card cursor-pointer bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/60"
          role="button"
          tabIndex={0}
          onClick={() => openList("answered")}
          onKeyDown={(e) => handleCardKeyDown(e, "answered")}
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
            <div className="text-muted-foreground">Clique para ver listagem</div>
          </CardFooter>
        </Card>

        <Card className="@container/card bg-sky-50 dark:bg-sky-950/30 border-sky-200/60 dark:border-sky-800/60">
          <CardHeader>
            <CardDescription>Ranking de Atendentes</CardDescription>
            <CardTitle className="text-lg font-semibold">Top 3</CardTitle>
            <CardAction>
              <Badge variant="outline">
                <UsersIcon className="size-3" />
                Atendentes
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            {topAgents.map((a, i) => (
              <div
                key={a.agentKey}
                className="flex w-full justify-between gap-2 tabular-nums"
              >
                <span className="truncate">
                  {i + 1}. {a.agentLabel}
                </span>
                <span className="font-medium">
                  {formatNumber(a.totalInboundCount)}
                </span>
              </div>
            ))}
          </CardFooter>
        </Card>

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
            <div className="text-muted-foreground">Canal Pedido Televendas</div>
          </CardFooter>
        </Card>

        <Card className="@container/card bg-sky-50 dark:bg-sky-950/30 border-sky-200/60 dark:border-sky-800/60">
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
            {topPeaks.map((p) => (
              <div
                key={p.hour}
                className="flex w-full justify-between gap-2 tabular-nums"
              >
                <span>{p.hour}:00</span>
                <span className="font-medium">
                  {formatNumber(p.totalInboundCount)} lig.
                </span>
              </div>
            ))}
          </CardFooter>
        </Card>
      </div>

      <CallsCharts
        barChartData={barChartData}
        comparisonChartData={comparisonChartData}
      />
    </div>
  )
}
