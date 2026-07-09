import type { CityKpiData } from "./gerencia-kpi-types"

export function emptyCityKpi(from: string, to: string): CityKpiData {
  const period = { from, to, key: `${from}_${to}` }
  const zeroCountValue = { count: 0, value: "0" }
  const zeroCount = { count: 0 }

  return {
    budgets: {
      period,
      total: zeroCountValue,
      open: zeroCountValue,
      won: zeroCountValue,
      lost: zeroCountValue,
    },
    sales: {
      period,
      total: zeroCountValue,
      active: zeroCountValue,
      canceled: zeroCountValue,
      averageDaily: { count: "0", value: "0" },
      averageTicket: { value: "0" },
    },
    salesWithBudget: { active: zeroCountValue },
    salesWithoutBudget: { active: zeroCountValue },
    followUp: {
      period,
      total: zeroCountValue,
      within24h: {
        total: zeroCountValue,
        converted: { count: 0, value: "0", percentage: "0" },
        lost: { count: 0, value: "0", percentage: "0" },
        open: { count: 0, value: "0", percentage: "0" },
      },
      after24h: {
        total: zeroCountValue,
        converted: { count: 0, value: "0", percentage: "0" },
        lost: { count: 0, value: "0", percentage: "0" },
        open: { count: 0, value: "0", percentage: "0" },
      },
    },
    calls: {
      summary: {
        period,
        received: zeroCount,
        lost: zeroCount,
        totalInbound: zeroCount,
        telemarketingOpenBudgets: zeroCount,
        peakHour: { hour: "", totalInboundCount: 0 },
      },
      hourly: { period, rows: [] },
      ranking: { period, rows: [] },
      comparison: { period, rows: [] },
    },
    whatsapp: {
      summary: {
        period,
        totalConversations: zeroCount,
        receivedMessages: zeroCount,
      },
      ranking: { period, rows: [] },
      sessionsHourly: { period, rows: [] },
      messagesHourly: { period, rows: [] },
      tagComparison: { period, tagId: "", rows: [] },
    },
  }
}
