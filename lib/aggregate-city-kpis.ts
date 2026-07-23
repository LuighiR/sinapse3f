import type {
  CallsAgentRow,
  CallsComparisonRow,
  CallsHourlyRow,
  WhatsAppAgentRow,
  WhatsAppMessagesHourlyRow,
  WhatsAppSessionsHourlyRow,
  WhatsAppTagComparisonRow,
} from "./api.ts"
import type { CityKpiData } from "./gerencia-kpi-types.ts"
import { emptyCityKpi } from "./empty-city-kpi.ts"

/** Parse a money string into integer cents (2 decimal places, half-up). */
function toCents(value: string): number {
  const n = Number.parseFloat(value || "0")
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100)
}

/** Serialize integer cents back to a money string without trailing zeros noise. */
function fromCents(cents: number): string {
  const whole = Math.trunc(cents / 100)
  const frac = Math.abs(cents % 100)
  if (frac === 0) return String(whole)
  if (frac % 10 === 0) return `${whole}.${frac / 10}`
  return `${whole}.${String(frac).padStart(2, "0")}`
}

function sumMoney(a: string, b: string): string {
  return fromCents(toCents(a) + toCents(b))
}

function pct(part: number, total: number): string {
  if (total === 0) return "0"
  return ((part / total) * 100).toFixed(1)
}

function daysInclusive(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number)
  const [ty, tm, td] = to.split("-").map(Number)
  const start = Date.UTC(fy, fm - 1, fd)
  const end = Date.UTC(ty, tm - 1, td)
  return Math.floor((end - start) / 86_400_000) + 1
}

function sumCountValue(
  a: { count: number; value: string },
  b: { count: number; value: string },
): { count: number; value: string } {
  return { count: a.count + b.count, value: sumMoney(a.value, b.value) }
}

function withPct(
  part: { count: number; value: string },
  groupTotal: number,
): { count: number; value: string; percentage: string } {
  return {
    count: part.count,
    value: part.value,
    percentage: pct(part.count, groupTotal),
  }
}

function mergeHourlyByKey<T extends { hour: string }>(
  rowsLists: T[][],
  merge: (a: T, b: T) => T,
): T[] {
  const map = new Map<string, T>()
  for (const rows of rowsLists) {
    for (const row of rows) {
      const existing = map.get(row.hour)
      map.set(row.hour, existing ? merge(existing, row) : { ...row })
    }
  }
  return [...map.values()].sort((a, b) => a.hour.localeCompare(b.hour))
}

function mergeCallsHourly(rowsLists: CallsHourlyRow[][]): CallsHourlyRow[] {
  return mergeHourlyByKey(rowsLists, (a, b) => ({
    hour: a.hour,
    receivedCount: a.receivedCount + b.receivedCount,
    lostCount: a.lostCount + b.lostCount,
    totalInboundCount: a.totalInboundCount + b.totalInboundCount,
  }))
}

function mergeCallsComparison(rowsLists: CallsComparisonRow[][]): CallsComparisonRow[] {
  return mergeHourlyByKey(rowsLists, (a, b) => ({
    hour: a.hour,
    receivedCount: a.receivedCount + b.receivedCount,
    lostCount: a.lostCount + b.lostCount,
    telemarketingBudgetCount: a.telemarketingBudgetCount + b.telemarketingBudgetCount,
  }))
}

function mergeSessionsHourly(
  rowsLists: WhatsAppSessionsHourlyRow[][],
): WhatsAppSessionsHourlyRow[] {
  return mergeHourlyByKey(rowsLists, (a, b) => ({
    hour: a.hour,
    sessionsCount: a.sessionsCount + b.sessionsCount,
  }))
}

function mergeMessagesHourly(
  rowsLists: WhatsAppMessagesHourlyRow[][],
): WhatsAppMessagesHourlyRow[] {
  return mergeHourlyByKey(rowsLists, (a, b) => ({
    hour: a.hour,
    receivedMessagesCount: a.receivedMessagesCount + b.receivedMessagesCount,
  }))
}

function mergeTagComparisonRows(
  rowsLists: WhatsAppTagComparisonRow[][],
): WhatsAppTagComparisonRow[] {
  return mergeHourlyByKey(rowsLists, (a, b) => ({
    hour: a.hour,
    tagSessionsCount: a.tagSessionsCount + b.tagSessionsCount,
    openBudgetsCount: a.openBudgetsCount + b.openBudgetsCount,
  }))
}

function mergeCallsRanking(rowsLists: CallsAgentRow[][]): CallsAgentRow[] {
  const map = new Map<string, CallsAgentRow>()
  for (const rows of rowsLists) {
    for (const row of rows) {
      const existing = map.get(row.agentKey)
      if (!existing) {
        map.set(row.agentKey, { ...row })
        continue
      }
      map.set(row.agentKey, {
        ...existing,
        receivedCount: existing.receivedCount + row.receivedCount,
        lostCount: existing.lostCount + row.lostCount,
        totalInboundCount: existing.totalInboundCount + row.totalInboundCount,
      })
    }
  }
  return [...map.values()].sort((a, b) => b.totalInboundCount - a.totalInboundCount)
}

function mergeWhatsAppRanking(rowsLists: WhatsAppAgentRow[][]): WhatsAppAgentRow[] {
  const map = new Map<string, WhatsAppAgentRow>()
  for (const rows of rowsLists) {
    for (const row of rows) {
      const existing = map.get(row.agentKey)
      if (!existing) {
        map.set(row.agentKey, { ...row })
        continue
      }
      map.set(row.agentKey, {
        ...existing,
        sessionsCount: existing.sessionsCount + row.sessionsCount,
      })
    }
  }
  return [...map.values()].sort((a, b) => b.sessionsCount - a.sessionsCount)
}

function peakHourFrom(rows: CallsHourlyRow[]): { hour: string; totalInboundCount: number } {
  if (rows.length === 0) return { hour: "", totalInboundCount: 0 }
  let best = rows[0]
  for (const row of rows) {
    if (row.totalInboundCount > best.totalInboundCount) best = row
  }
  return { hour: best.hour, totalInboundCount: best.totalInboundCount }
}

function averageTicketValue(total: { count: number; value: string }): string {
  if (total.count === 0) return "0"
  return fromCents(Math.round(toCents(total.value) / total.count))
}

function averageDailyFrom(
  total: { count: number; value: string },
  days: number,
): { count: string; value: string } {
  if (days <= 0) return { count: "0", value: "0" }
  return {
    count: String(total.count / days),
    value: fromCents(Math.round(toCents(total.value) / days)),
  }
}

export function aggregateCityKpis(
  cities: CityKpiData[],
  from: string,
  to: string,
): CityKpiData {
  if (cities.length === 0) return emptyCityKpi(from, to)

  const period = { from, to, key: `${from}_${to}` }
  const days = daysInclusive(from, to)

  let budgetsTotal = { count: 0, value: "0" }
  let budgetsOpen = { count: 0, value: "0" }
  let budgetsWon = { count: 0, value: "0" }
  let budgetsLost = { count: 0, value: "0" }

  let salesTotal = { count: 0, value: "0" }
  let salesActive = { count: 0, value: "0" }
  let salesCanceled = { count: 0, value: "0" }
  let salesWithBudgetActive = { count: 0, value: "0" }
  let salesWithoutBudgetActive = { count: 0, value: "0" }

  let followUpTotal = { count: 0, value: "0" }
  let withinTotal = { count: 0, value: "0" }
  let withinConverted = { count: 0, value: "0" }
  let withinLost = { count: 0, value: "0" }
  let withinOpen = { count: 0, value: "0" }
  let afterTotal = { count: 0, value: "0" }
  let afterConverted = { count: 0, value: "0" }
  let afterLost = { count: 0, value: "0" }
  let afterOpen = { count: 0, value: "0" }

  let callsReceived = 0
  let callsLost = 0
  let callsLostWithoutEmployee = 0
  let callsTotalInbound = 0
  let callsTelemarketing = 0

  let waConversations = 0
  let waMessages = 0

  const callsHourlyLists: CallsHourlyRow[][] = []
  const callsComparisonLists: CallsComparisonRow[][] = []
  const callsRankingLists: CallsAgentRow[][] = []
  const waSessionsLists: WhatsAppSessionsHourlyRow[][] = []
  const waMessagesLists: WhatsAppMessagesHourlyRow[][] = []
  const waRankingLists: WhatsAppAgentRow[][] = []
  const tagRowsLists: WhatsAppTagComparisonRow[][] = []
  const tagIds: string[] = []

  for (const city of cities) {
    budgetsTotal = sumCountValue(budgetsTotal, city.budgets.total)
    budgetsOpen = sumCountValue(budgetsOpen, city.budgets.open)
    budgetsWon = sumCountValue(budgetsWon, city.budgets.won)
    budgetsLost = sumCountValue(budgetsLost, city.budgets.lost)

    salesTotal = sumCountValue(salesTotal, city.sales.total)
    salesActive = sumCountValue(salesActive, city.sales.active)
    salesCanceled = sumCountValue(salesCanceled, city.sales.canceled)
    salesWithBudgetActive = sumCountValue(salesWithBudgetActive, city.salesWithBudget.active)
    salesWithoutBudgetActive = sumCountValue(
      salesWithoutBudgetActive,
      city.salesWithoutBudget.active,
    )

    followUpTotal = sumCountValue(followUpTotal, city.followUp.total)
    withinTotal = sumCountValue(withinTotal, city.followUp.within24h.total)
    withinConverted = sumCountValue(withinConverted, city.followUp.within24h.converted)
    withinLost = sumCountValue(withinLost, city.followUp.within24h.lost)
    withinOpen = sumCountValue(withinOpen, city.followUp.within24h.open)
    afterTotal = sumCountValue(afterTotal, city.followUp.after24h.total)
    afterConverted = sumCountValue(afterConverted, city.followUp.after24h.converted)
    afterLost = sumCountValue(afterLost, city.followUp.after24h.lost)
    afterOpen = sumCountValue(afterOpen, city.followUp.after24h.open)

    callsReceived += city.calls.summary.received.count
    callsLost += city.calls.summary.lost.count
    callsLostWithoutEmployee += city.calls.summary.lostWithoutEmployee.count
    callsTotalInbound += city.calls.summary.totalInbound.count
    callsTelemarketing += city.calls.summary.telemarketingOpenBudgets.count

    waConversations += city.whatsapp.summary.totalConversations.count
    waMessages += city.whatsapp.summary.receivedMessages.count

    callsHourlyLists.push(city.calls.hourly.rows)
    callsComparisonLists.push(city.calls.comparison.rows)
    callsRankingLists.push(city.calls.ranking.rows)
    waSessionsLists.push(city.whatsapp.sessionsHourly.rows)
    waMessagesLists.push(city.whatsapp.messagesHourly.rows)
    waRankingLists.push(city.whatsapp.ranking.rows)
    tagRowsLists.push(city.whatsapp.tagComparison.rows)
    tagIds.push(city.whatsapp.tagComparison.tagId)
  }

  const mergedHourly = mergeCallsHourly(callsHourlyLists)
  const sameTag =
    tagIds.length > 0 && tagIds.every((id) => id !== "" && id === tagIds[0])
  const tagId = sameTag ? tagIds[0] : ""
  const tagRows = sameTag ? mergeTagComparisonRows(tagRowsLists) : []

  return {
    budgets: {
      period,
      total: budgetsTotal,
      open: budgetsOpen,
      won: budgetsWon,
      lost: budgetsLost,
    },
    sales: {
      period,
      total: salesTotal,
      active: salesActive,
      canceled: salesCanceled,
      averageDaily: averageDailyFrom(salesTotal, days),
      averageTicket: { value: averageTicketValue(salesTotal) },
    },
    salesWithBudget: { active: salesWithBudgetActive },
    salesWithoutBudget: { active: salesWithoutBudgetActive },
    followUp: {
      period,
      total: followUpTotal,
      within24h: {
        total: withinTotal,
        converted: withPct(withinConverted, withinTotal.count),
        lost: withPct(withinLost, withinTotal.count),
        open: withPct(withinOpen, withinTotal.count),
      },
      after24h: {
        total: afterTotal,
        converted: withPct(afterConverted, afterTotal.count),
        lost: withPct(afterLost, afterTotal.count),
        open: withPct(afterOpen, afterTotal.count),
      },
    },
    calls: {
      summary: {
        period,
        received: { count: callsReceived },
        lost: { count: callsLost },
        lostWithoutEmployee: { count: callsLostWithoutEmployee },
        totalInbound: { count: callsTotalInbound },
        telemarketingOpenBudgets: { count: callsTelemarketing },
        peakHour: peakHourFrom(mergedHourly),
      },
      hourly: { period, rows: mergedHourly },
      ranking: { period, rows: mergeCallsRanking(callsRankingLists) },
      comparison: { period, rows: mergeCallsComparison(callsComparisonLists) },
    },
    whatsapp: {
      summary: {
        period,
        totalConversations: { count: waConversations },
        receivedMessages: { count: waMessages },
      },
      ranking: { period, rows: mergeWhatsAppRanking(waRankingLists) },
      sessionsHourly: { period, rows: mergeSessionsHourly(waSessionsLists) },
      messagesHourly: { period, rows: mergeMessagesHourly(waMessagesLists) },
      tagComparison: { period, tagId, rows: tagRows },
    },
  }
}
