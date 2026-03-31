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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import {
  MessageCircleIcon,
  MailIcon,
  UsersIcon,
  ClockIcon,
  TrendingUpIcon,
  TagIcon,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import {
  getWhatsAppSummary,
  getWhatsAppAgentsRanking,
  getWhatsAppSessionsHourly,
  getWhatsAppSessionsDaily,
  getWhatsAppMessagesHourly,
  getWhatsAppMessagesDaily,
  getWhatsAppTags,
  getWhatsAppTagsHourly,
  getWhatsAppTagComparison,
  type WhatsAppSummary,
  type WhatsAppAgentsRanking,
  type WhatsAppSessionsHourly,
  type WhatsAppSessionsDaily,
  type WhatsAppMessagesHourly,
  type WhatsAppMessagesDaily,
  type WhatsAppTags,
  type WhatsAppTagsHourly,
  type WhatsAppTagComparison,
  type WhatsAppTag,
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

// ── Drilldown types ──

type WhatsAppDrilldownKind =
  | "wa-conversations"
  | "wa-messages"
  | "wa-ranking"
  | "wa-session-peaks"
  | "wa-message-peaks"
  | "wa-tags-bar"
  | "wa-tags-comparison"

// ── Daily Table ──

function DailyTable<T extends { date: string }>({
  rows,
  loading,
  error,
  valueKey,
  valueLabel,
}: {
  rows: T[] | null
  loading: boolean
  error: string | null
  valueKey: keyof T
  valueLabel: string
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
  if (!rows) return null

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead className="text-right">{valueLabel}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.date}>
            <TableCell>{row.date}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatNumber(row[valueKey] as number)}
            </TableCell>
          </TableRow>
        ))}
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={2} className="text-center text-muted-foreground">
              Nenhum registro no período
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}

// ── Hourly Table (generic) ──

function HourlyGenericTable<T extends { hour: string }>({
  rows,
  loading,
  error,
  columns,
  sortKey,
}: {
  rows: T[] | null
  loading: boolean
  error: string | null
  columns: { key: keyof T; label: string }[]
  sortKey?: keyof T
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
  if (!rows) return null

  const sorted = sortKey
    ? [...rows].sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number))
    : rows

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Hora</TableHead>
          {columns.map((c) => (
            <TableHead key={String(c.key)} className="text-right">
              {c.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((row) => (
          <TableRow key={row.hour}>
            <TableCell>{row.hour}:00</TableCell>
            {columns.map((c) => (
              <TableCell key={String(c.key)} className="text-right tabular-nums">
                {formatNumber(row[c.key] as number)}
              </TableCell>
            ))}
          </TableRow>
        ))}
        {sorted.length === 0 && (
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

// ── Agents Ranking Dialog Content ──

function WaAgentsRankingContent({
  data,
  loading,
  error,
}: {
  data: WhatsAppAgentsRanking | null
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
          <TableHead className="text-right">Sessões</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.rows.map((row, idx) => (
          <TableRow key={row.agentKey}>
            <TableCell className="font-medium">{idx + 1}</TableCell>
            <TableCell>{row.agentLabel}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatNumber(row.sessionsCount)}
            </TableCell>
          </TableRow>
        ))}
        {data.rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={3} className="text-center text-muted-foreground">
              Nenhum registro no período
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}

// ── Tags Bar Chart Content ──

const tagsBarConfig = {
  sessions: { label: "Sessões da Tag", color: "var(--color-chart-4)" },
} satisfies ChartConfig

function TagsBarChartContent({
  data,
  loading,
  error,
}: {
  data: WhatsAppTagsHourly | null
  loading: boolean
  error: string | null
}) {
  if (loading) return <Skeleton className="h-64 w-full" />
  if (error) return <p className="text-sm text-destructive text-center py-4">{error}</p>
  if (!data) return null

  const chartData = data.rows.map((r) => ({
    hour: `${r.hour}h`,
    sessions: r.sessionsCount,
  }))

  return (
    <ChartContainer config={tagsBarConfig} className="aspect-[16/9] w-full">
      <BarChart data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="hour" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={40} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="sessions" fill="var(--color-sessions)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}

// ── Tags vs Budgets Comparison Line Chart Content ──

const tagComparisonConfig = {
  tagSessions: { label: "Sessões da Tag", color: "var(--color-chart-4)" },
  budgets: { label: "Orçamentos Abertos", color: "var(--color-chart-3)" },
} satisfies ChartConfig

function TagComparisonContent({
  data,
  loading,
  error,
}: {
  data: WhatsAppTagComparison | null
  loading: boolean
  error: string | null
}) {
  if (loading) return <Skeleton className="h-64 w-full" />
  if (error) return <p className="text-sm text-destructive text-center py-4">{error}</p>
  if (!data) return null

  const chartData = data.rows.map((r) => ({
    hour: `${r.hour}h`,
    tagSessions: r.tagSessionsCount,
    budgets: r.openBudgetsCount,
  }))

  return (
    <ChartContainer config={tagComparisonConfig} className="aspect-[16/9] w-full">
      <LineChart data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="hour" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={40} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line type="monotone" dataKey="tagSessions" stroke="var(--color-tagSessions)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="budgets" stroke="var(--color-budgets)" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartContainer>
  )
}

// ── Main Drilldown Dialog ──

interface WaDrilldownDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: WhatsAppDrilldownKind | null
  token: string
  tenantId: string
  from: string
  to: string
  chatId?: string
  sellerId?: string
  tags: WhatsAppTag[]
  selectedTagId: string
  onTagChange: (tagId: string) => void
}

function WaDrilldownDialog({
  open,
  onOpenChange,
  kind,
  token,
  tenantId,
  from,
  to,
  chatId,
  sellerId,
  tags,
  selectedTagId,
  onTagChange,
}: WaDrilldownDialogProps) {
  const [sessionsDaily, setSessionsDaily] = React.useState<WhatsAppSessionsDaily | null>(null)
  const [messagesDaily, setMessagesDaily] = React.useState<WhatsAppMessagesDaily | null>(null)
  const [rankingData, setRankingData] = React.useState<WhatsAppAgentsRanking | null>(null)
  const [sessionsHourly, setSessionsHourly] = React.useState<WhatsAppSessionsHourly | null>(null)
  const [messagesHourly, setMessagesHourly] = React.useState<WhatsAppMessagesHourly | null>(null)
  const [tagsHourly, setTagsHourly] = React.useState<WhatsAppTagsHourly | null>(null)
  const [tagComparison, setTagComparison] = React.useState<WhatsAppTagComparison | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open || !kind) return

    const opts: KpiOpts = { token, tenantId, from, to, chatId }
    setLoading(true)
    setError(null)
    setSessionsDaily(null)
    setMessagesDaily(null)
    setRankingData(null)
    setSessionsHourly(null)
    setMessagesHourly(null)
    setTagsHourly(null)
    setTagComparison(null)

    if (kind === "wa-conversations") {
      getWhatsAppSessionsDaily(opts)
        .then(setSessionsDaily)
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading(false))
    } else if (kind === "wa-messages") {
      getWhatsAppMessagesDaily(opts)
        .then(setMessagesDaily)
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading(false))
    } else if (kind === "wa-ranking") {
      getWhatsAppAgentsRanking(opts)
        .then(setRankingData)
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading(false))
    } else if (kind === "wa-session-peaks") {
      getWhatsAppSessionsHourly(opts)
        .then(setSessionsHourly)
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading(false))
    } else if (kind === "wa-message-peaks") {
      getWhatsAppMessagesHourly(opts)
        .then(setMessagesHourly)
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading(false))
    } else if (kind === "wa-tags-bar") {
      if (selectedTagId) {
        getWhatsAppTagsHourly({ ...opts, tagId: selectedTagId })
          .then(setTagsHourly)
          .catch((e: Error) => setError(e.message))
          .finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    } else if (kind === "wa-tags-comparison") {
      if (selectedTagId) {
        getWhatsAppTagComparison({ ...opts, tagId: selectedTagId, sellerId })
          .then(setTagComparison)
          .catch((e: Error) => setError(e.message))
          .finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    }
  }, [open, kind, token, tenantId, from, to, selectedTagId, chatId, sellerId])

  const titles: Record<WhatsAppDrilldownKind, { title: string; desc: string }> = {
    "wa-conversations": {
      title: "Total de Conversas — Por Dia",
      desc: "Detalhamento diário de conversas/sessões",
    },
    "wa-messages": {
      title: "Mensagens Recebidas — Por Dia",
      desc: "Detalhamento diário de mensagens recebidas",
    },
    "wa-ranking": {
      title: "Ranking de Atendentes",
      desc: "Todos os atendentes ordenados por sessões",
    },
    "wa-session-peaks": {
      title: "Picos de Sessões por Hora",
      desc: "Todas as horas ordenadas por volume de sessões",
    },
    "wa-message-peaks": {
      title: "Picos de Mensagens por Hora",
      desc: "Todas as horas ordenadas por volume de mensagens",
    },
    "wa-tags-bar": {
      title: "Tags por Hora",
      desc: "Gráfico de barras — sessões da tag selecionada por hora",
    },
    "wa-tags-comparison": {
      title: "Tag vs Orçamentos por Hora",
      desc: "Comparativo entre sessões da tag e orçamentos abertos",
    },
  }

  const config = kind ? titles[kind] : null
  const needsTag = kind === "wa-tags-bar" || kind === "wa-tags-comparison"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{config?.title ?? "Detalhamento"}</DialogTitle>
          <DialogDescription>{config?.desc ?? ""}</DialogDescription>
        </DialogHeader>

        {needsTag && tags.length > 0 && (
          <div className="flex items-center gap-2 pb-2">
            <span className="text-sm text-muted-foreground">Tag:</span>
            <Select value={selectedTagId} onValueChange={onTagChange}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Selecione uma tag" />
              </SelectTrigger>
              <SelectContent>
                {tags.map((t) => (
                  <SelectItem key={t.tagId} value={t.tagId}>
                    {t.tagName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {kind === "wa-conversations" && (
            <DailyTable
              rows={sessionsDaily?.rows ?? null}
              loading={loading}
              error={error}
              valueKey="sessionsCount"
              valueLabel="Conversas"
            />
          )}
          {kind === "wa-messages" && (
            <DailyTable
              rows={messagesDaily?.rows ?? null}
              loading={loading}
              error={error}
              valueKey="receivedMessagesCount"
              valueLabel="Mensagens"
            />
          )}
          {kind === "wa-ranking" && (
            <WaAgentsRankingContent data={rankingData} loading={loading} error={error} />
          )}
          {kind === "wa-session-peaks" && (
            <HourlyGenericTable
              rows={sessionsHourly?.rows ?? null}
              loading={loading}
              error={error}
              columns={[{ key: "sessionsCount", label: "Sessões" }]}
              sortKey="sessionsCount"
            />
          )}
          {kind === "wa-message-peaks" && (
            <HourlyGenericTable
              rows={messagesHourly?.rows ?? null}
              loading={loading}
              error={error}
              columns={[{ key: "receivedMessagesCount", label: "Mensagens" }]}
              sortKey="receivedMessagesCount"
            />
          )}
          {kind === "wa-tags-bar" && (
            needsTag && !selectedTagId ? (
              <p className="text-sm text-muted-foreground text-center py-8">Selecione uma tag acima</p>
            ) : (
              <TagsBarChartContent data={tagsHourly} loading={loading} error={error} />
            )
          )}
          {kind === "wa-tags-comparison" && (
            needsTag && !selectedTagId ? (
              <p className="text-sm text-muted-foreground text-center py-8">Selecione uma tag acima</p>
            ) : (
              <TagComparisonContent data={tagComparison} loading={loading} error={error} />
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Section Component ──

export function WhatsAppSection({
  refreshKey = 0,
  from,
  to,
  chatId,
  sellerId,
}: {
  refreshKey?: number
  from: string
  to: string
  chatId?: string
  sellerId?: string
}) {
  const { session } = useAuth()
  const [summary, setSummary] = React.useState<WhatsAppSummary | null>(null)
  const [ranking, setRanking] = React.useState<WhatsAppAgentsRanking | null>(null)
  const [sessionsHourly, setSessionsHourly] = React.useState<WhatsAppSessionsHourly | null>(null)
  const [messagesHourly, setMessagesHourly] = React.useState<WhatsAppMessagesHourly | null>(null)
  const [tags, setTags] = React.useState<WhatsAppTag[]>([])
  const [selectedTagId, setSelectedTagId] = React.useState("")
  const [loading, setLoading] = React.useState(true)

  const [drilldownOpen, setDrilldownOpen] = React.useState(false)
  const [drilldownKind, setDrilldownKind] = React.useState<WhatsAppDrilldownKind | null>(null)

  React.useEffect(() => {
    if (!session) return
    const opts: KpiOpts = { token: session.accessToken, tenantId: session.tenantId, from, to, chatId }

    setLoading(true)
    Promise.all([
      getWhatsAppSummary(opts).then(setSummary).catch((e) => console.error("[KPI] whatsapp summary", e)),
      getWhatsAppAgentsRanking(opts).then(setRanking).catch((e) => console.error("[KPI] whatsapp ranking", e)),
      getWhatsAppSessionsHourly(opts).then(setSessionsHourly).catch((e) => console.error("[KPI] whatsapp sessions hourly", e)),
      getWhatsAppMessagesHourly(opts).then(setMessagesHourly).catch((e) => console.error("[KPI] whatsapp messages hourly", e)),
      getWhatsAppTags(opts).then((t) => {
        setTags(t.tags)
        if (t.tags.length > 0 && !selectedTagId) {
          setSelectedTagId(t.tags[0].tagId)
        }
      }).catch((e) => console.error("[KPI] whatsapp tags", e)),
    ]).finally(() => setLoading(false))
  }, [session, from, to, refreshKey, chatId])

  function openDrilldown(kind: WhatsAppDrilldownKind) {
    setDrilldownKind(kind)
    setDrilldownOpen(true)
  }

  const skeletons = Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)

  // Top 3 session peaks sorted by sessionsCount
  const topSessionPeaks = React.useMemo(() => {
    if (!sessionsHourly) return []
    return [...sessionsHourly.rows].sort((a, b) => b.sessionsCount - a.sessionsCount).slice(0, 3)
  }, [sessionsHourly])

  // Top 3 message peaks sorted by receivedMessagesCount
  const topMessagePeaks = React.useMemo(() => {
    if (!messagesHourly) return []
    return [...messagesHourly.rows].sort((a, b) => b.receivedMessagesCount - a.receivedMessagesCount).slice(0, 3)
  }, [messagesHourly])

  // Top 3 agents
  const topAgents = React.useMemo(() => {
    if (!ranking) return []
    return ranking.rows.slice(0, 3)
  }, [ranking])

  // Preview data for tags bar chart (limited hours)
  const tagsBarPreviewData = React.useMemo(() => {
    if (!sessionsHourly) return []
    const businessHours = sessionsHourly.rows.filter((r) => {
      const h = parseInt(r.hour, 10)
      return h >= 8 && h <= 18
    })
    return businessHours.map((r) => ({ hour: `${r.hour}h`, sessions: r.sessionsCount }))
  }, [sessionsHourly])

  return (
    <>
      <div className="flex flex-col gap-4" id="whatsapp">
        <div className="flex items-center gap-2">
          <MessageCircleIcon className="size-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">WhatsApp</h2>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-5 dark:*:data-[slot=card]:bg-card">
          {loading ? (
            skeletons
          ) : summary ? (
            <>
              {/* Total de Conversas */}
              <Card
                className="@container/card cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => openDrilldown("wa-conversations")}
              >
                <CardHeader>
                  <CardDescription>Total de Conversas</CardDescription>
                  <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                    {formatNumber(summary.totalConversations.count)}
                  </CardTitle>
                  <CardAction>
                    <Badge variant="outline">
                      <MessageCircleIcon className="size-3" />
                      Sessões
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                  <div className="line-clamp-1 flex gap-2 font-medium">
                    <TrendingUpIcon className="size-4" />
                    Conversas no período
                  </div>
                  <div className="text-muted-foreground">
                    Clique para ver por dia
                  </div>
                </CardFooter>
              </Card>

              {/* Mensagens Recebidas */}
              <Card
                className="@container/card cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => openDrilldown("wa-messages")}
              >
                <CardHeader>
                  <CardDescription>Mensagens Recebidas</CardDescription>
                  <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                    {formatNumber(summary.receivedMessages.count)}
                  </CardTitle>
                  <CardAction>
                    <Badge variant="outline">
                      <MailIcon className="size-3" />
                      Recebidas
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                  <div className="line-clamp-1 flex gap-2 font-medium">
                    <TrendingUpIcon className="size-4" />
                    Total recebidas
                  </div>
                  <div className="text-muted-foreground">
                    Clique para ver por dia
                  </div>
                </CardFooter>
              </Card>

              {/* Ranking — Top 3 */}
              <Card
                className="@container/card cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => openDrilldown("wa-ranking")}
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
                        <span className="font-medium">{formatNumber(a.sessionsCount)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground">Sem dados</div>
                  )}
                </CardFooter>
              </Card>

              {/* Picos de Sessões — Top 3 */}
              <Card
                className="@container/card cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => openDrilldown("wa-session-peaks")}
              >
                <CardHeader>
                  <CardDescription>Picos de Sessões</CardDescription>
                  <CardTitle className="text-lg font-semibold">
                    Top 3 Horários
                  </CardTitle>
                  <CardAction>
                    <Badge variant="outline">
                      <ClockIcon className="size-3" />
                      Sessões
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                  {topSessionPeaks.length > 0 ? (
                    topSessionPeaks.map((p) => (
                      <div key={p.hour} className="flex w-full justify-between gap-2 tabular-nums">
                        <span>{p.hour}:00</span>
                        <span className="font-medium">{formatNumber(p.sessionsCount)} sessões</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground">Sem dados</div>
                  )}
                </CardFooter>
              </Card>

              {/* Picos de Mensagens — Top 3 */}
              <Card
                className="@container/card cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => openDrilldown("wa-message-peaks")}
              >
                <CardHeader>
                  <CardDescription>Picos de Mensagens</CardDescription>
                  <CardTitle className="text-lg font-semibold">
                    Top 3 Horários
                  </CardTitle>
                  <CardAction>
                    <Badge variant="outline">
                      <ClockIcon className="size-3" />
                      Mensagens
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                  {topMessagePeaks.length > 0 ? (
                    topMessagePeaks.map((p) => (
                      <div key={p.hour} className="flex w-full justify-between gap-2 tabular-nums">
                        <span>{p.hour}:00</span>
                        <span className="font-medium">{formatNumber(p.receivedMessagesCount)} msg</span>
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
            {/* Tags Bar Chart */}
            <Card
              className="@container/card cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => openDrilldown("wa-tags-bar")}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TagIcon className="size-4" />
                  Tags por Hora
                </CardTitle>
                <CardDescription>Sessões da tag selecionada — gráfico de barras</CardDescription>
              </CardHeader>
              <CardContent>
                {tagsBarPreviewData.length > 0 ? (
                  <ChartContainer config={tagsBarConfig} className="aspect-[2/1] w-full">
                    <BarChart data={tagsBarPreviewData}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="hour" tickLine={false} axisLine={false} fontSize={11} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="sessions" fill="var(--color-sessions)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                    Sem dados de sessões
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tag vs Budget Comparison */}
            <Card
              className="@container/card cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => openDrilldown("wa-tags-comparison")}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TagIcon className="size-4" />
                  Tag vs Orçamentos
                </CardTitle>
                <CardDescription>Comparativo por hora — sessões da tag vs orçamentos</CardDescription>
              </CardHeader>
              <CardContent>
                <TagComparisonPreview token={session!.accessToken} tenantId={session!.tenantId} from={from} to={to} tagId={selectedTagId} chatId={chatId} sellerId={sellerId} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {session && (
        <WaDrilldownDialog
          open={drilldownOpen}
          onOpenChange={setDrilldownOpen}
          kind={drilldownKind}
          token={session.accessToken}
          tenantId={session.tenantId}
          from={from}
          to={to}
          chatId={chatId}
          sellerId={sellerId}
          tags={tags}
          selectedTagId={selectedTagId}
          onTagChange={setSelectedTagId}
        />
      )}
    </>
  )
}

// Small preview for tag comparison line chart
function TagComparisonPreview({
  token,
  tenantId,
  from,
  to,
  tagId,
  chatId,
  sellerId,
}: {
  token: string
  tenantId: string
  from: string
  to: string
  tagId: string
  chatId?: string
  sellerId?: string
}) {
  const [data, setData] = React.useState<WhatsAppTagComparison | null>(null)

  React.useEffect(() => {
    if (!tagId) return
    getWhatsAppTagComparison({ token, tenantId, from, to, tagId, chatId, sellerId })
      .then(setData)
      .catch(() => {})
  }, [token, tenantId, from, to, tagId, chatId, sellerId])

  if (!tagId) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
        Nenhuma tag disponível
      </div>
    )
  }

  if (!data) return <Skeleton className="h-40 w-full" />

  const chartData = data.rows
    .filter((r) => {
      const h = parseInt(r.hour, 10)
      return h >= 8 && h <= 18
    })
    .map((r) => ({
      hour: `${r.hour}h`,
      tagSessions: r.tagSessionsCount,
      budgets: r.openBudgetsCount,
    }))

  return (
    <ChartContainer config={tagComparisonConfig} className="aspect-[2/1] w-full">
      <LineChart data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="hour" tickLine={false} axisLine={false} fontSize={11} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line type="monotone" dataKey="tagSessions" stroke="var(--color-tagSessions)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="budgets" stroke="var(--color-budgets)" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartContainer>
  )
}
