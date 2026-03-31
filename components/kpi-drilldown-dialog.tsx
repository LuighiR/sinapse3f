"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
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
import { Skeleton } from "@/components/ui/skeleton"
import type { DailySeries, KpiOpts } from "@/lib/api"
import { getBudgetDaily, getSalesDaily, getFollowUpDailySeries } from "@/lib/api"

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
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

export type DrilldownKind =
  | "budgets-total"
  | "budgets-won"
  | "budgets-open"
  | "budgets-lost"
  | "sales-total"
  | "sales-active-with-budget"
  | "sales-active-without-budget"
  | "sales-canceled"
  | "followup-within24h-converted"
  | "followup-within24h-lost"
  | "followup-within24h-open"
  | "followup-after24h-converted"
  | "followup-after24h-lost"
  | "followup-after24h-open"

interface DrilldownConfig {
  title: string
  description: string
  fetcher: (opts: KpiOpts) => Promise<DailySeries>
  status?: string
  hasLinkedBudget?: string
  followUpWindow?: string
  followUpStatus?: string
}

const DRILLDOWN_CONFIG: Record<DrilldownKind, DrilldownConfig> = {
  "budgets-total": {
    title: "Orçamentos — Total",
    description: "Série diária de orçamentos no período",
    fetcher: getBudgetDaily,
  },
  "budgets-won": {
    title: "Orçamentos — Convertidos (Baixados)",
    description: "Série diária de orçamentos convertidos",
    fetcher: getBudgetDaily,
    status: "Baixado",
  },
  "budgets-open": {
    title: "Orçamentos — Em Aberto",
    description: "Série diária de orçamentos pendentes",
    fetcher: getBudgetDaily,
    status: "Pendente",
  },
  "budgets-lost": {
    title: "Orçamentos — Cancelados",
    description: "Série diária de orçamentos cancelados",
    fetcher: getBudgetDaily,
    status: "Cancelado",
  },
  "sales-total": {
    title: "Vendas — Total",
    description: "Série diária de vendas no período",
    fetcher: getSalesDaily,
  },
  "sales-active-with-budget": {
    title: "Vendas Ativas — Com Orçamento",
    description: "Série diária de vendas ativas com orçamento vinculado",
    fetcher: getSalesDaily,
    status: "Ativa",
    hasLinkedBudget: "true",
  },
  "sales-active-without-budget": {
    title: "Vendas Ativas — Sem Orçamento",
    description: "Série diária de vendas ativas sem orçamento vinculado",
    fetcher: getSalesDaily,
    status: "Ativa",
    hasLinkedBudget: "false",
  },
  "sales-canceled": {
    title: "Vendas — Canceladas",
    description: "Série diária de vendas canceladas",
    fetcher: getSalesDaily,
    status: "Cancelada",
  },
  "followup-within24h-converted": {
    title: "Follow-up ≤ 24h — Convertidos",
    description: "Série diária de follow-up convertidos na janela de 24h",
    fetcher: (opts) => getFollowUpDailySeries(opts as KpiOpts & { referenceAt: string }, "within24h", "converted"),
    followUpWindow: "within24h",
    followUpStatus: "converted",
  },
  "followup-within24h-lost": {
    title: "Follow-up ≤ 24h — Não Convertidos",
    description: "Série diária de follow-up não convertidos na janela de 24h",
    fetcher: (opts) => getFollowUpDailySeries(opts as KpiOpts & { referenceAt: string }, "within24h", "lost"),
    followUpWindow: "within24h",
    followUpStatus: "lost",
  },
  "followup-within24h-open": {
    title: "Follow-up ≤ 24h — Não Executados",
    description: "Série diária de follow-up não executados na janela de 24h",
    fetcher: (opts) => getFollowUpDailySeries(opts as KpiOpts & { referenceAt: string }, "within24h", "open"),
    followUpWindow: "within24h",
    followUpStatus: "open",
  },
  "followup-after24h-converted": {
    title: "Follow-up > 24h — Convertidos",
    description: "Série diária de follow-up convertidos pós 24h",
    fetcher: (opts) => getFollowUpDailySeries(opts as KpiOpts & { referenceAt: string }, "after24h", "converted"),
    followUpWindow: "after24h",
    followUpStatus: "converted",
  },
  "followup-after24h-lost": {
    title: "Follow-up > 24h — Não Convertidos",
    description: "Série diária de follow-up não convertidos pós 24h",
    fetcher: (opts) => getFollowUpDailySeries(opts as KpiOpts & { referenceAt: string }, "after24h", "lost"),
    followUpWindow: "after24h",
    followUpStatus: "lost",
  },
  "followup-after24h-open": {
    title: "Follow-up > 24h — Não Executados",
    description: "Série diária de follow-up não executados pós 24h",
    fetcher: (opts) => getFollowUpDailySeries(opts as KpiOpts & { referenceAt: string }, "after24h", "open"),
    followUpWindow: "after24h",
    followUpStatus: "open",
  },
}

interface KpiDrilldownDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: DrilldownKind | null
  token: string
  tenantId: string
  from: string
  to: string
  sellerId?: string
  referenceAt?: string
}

export function KpiDrilldownDialog({
  open,
  onOpenChange,
  kind,
  token,
  tenantId,
  from,
  to,
  sellerId,
  referenceAt,
}: KpiDrilldownDialogProps) {
  const router = useRouter()
  const [data, setData] = React.useState<DailySeries | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const isBudgetKind = kind?.startsWith("budgets-") ?? false
  const isSalesKind = kind?.startsWith("sales-") ?? false
  const isFollowUpKind = kind?.startsWith("followup-") ?? false
  const isClickable = isBudgetKind || isSalesKind || isFollowUpKind

  function navigateToDay(date: string) {
    if (!kind || !isClickable) return
    const config = DRILLDOWN_CONFIG[kind]
    const params = new URLSearchParams({ from: date, to: date })
    if (sellerId) params.set("sellerId", sellerId)
    if (config.status) params.set("status", config.status)
    if (config.hasLinkedBudget) params.set("hasLinkedBudget", config.hasLinkedBudget)
    onOpenChange(false)
    if (isBudgetKind) {
      router.push(`/dashboard/orcamentos?${params}`)
    } else if (isSalesKind) {
      router.push(`/dashboard/vendas?${params}`)
    } else if (isFollowUpKind) {
      if (referenceAt) params.set("referenceAt", referenceAt)
      if (config.followUpWindow) params.set("followUpWindow", config.followUpWindow)
      if (config.followUpStatus) params.set("followUpStatus", config.followUpStatus)
      router.push(`/dashboard/followup?${params}`)
    }
  }

  React.useEffect(() => {
    if (!open || !kind) return

    const config = DRILLDOWN_CONFIG[kind]
    setLoading(true)
    setError(null)
    setData(null)

    config
      .fetcher({ token, tenantId, from, to, status: config.status, hasLinkedBudget: config.hasLinkedBudget, sellerId, referenceAt })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [open, kind, token, tenantId, from, to, sellerId, referenceAt])

  const config = kind ? DRILLDOWN_CONFIG[kind] : null

  const totals = React.useMemo(() => {
    if (!data?.series) return { count: 0, value: 0 }
    return data.series.reduce(
      (acc, row) => ({
        count: acc.count + row.count,
        value: acc.value + Number(row.value),
      }),
      { count: 0, value: 0 },
    )
  }, [data])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{config?.title ?? "Detalhamento"}</DialogTitle>
          <DialogDescription>
            {config?.description ?? ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {loading && (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive text-center py-4">
              {error}
            </p>
          )}

          {data && !loading && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.series.map((row) => (
                  <TableRow
                    key={row.date}
                    className={isClickable ? "cursor-pointer hover:bg-muted/50" : ""}
                    onClick={() => isClickable && navigateToDay(row.date)}
                  >
                    <TableCell>
                      {formatDate(row.date)}
                      {isClickable && (
                        <span className="ml-1.5 text-muted-foreground text-xs">→</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.count)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(Number(row.value))}
                    </TableCell>
                  </TableRow>
                ))}
                {data.series.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Nenhum registro no período
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              {data.series.length > 0 && (
                <tfoot>
                  <TableRow className="font-semibold border-t-2">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(totals.count)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(totals.value)}
                    </TableCell>
                  </TableRow>
                </tfoot>
              )}
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
