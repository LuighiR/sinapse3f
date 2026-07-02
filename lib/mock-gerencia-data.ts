import type {
  BudgetSummary,
  FollowUpSummary,
  SalesSummary,
  CallsSummary,
  CallsHourly,
  CallsAgentsRanking,
  CallsHourlyComparison,
  CallsAgentRow,
  WhatsAppSummary,
  WhatsAppAgentsRanking,
  WhatsAppSessionsHourly,
  WhatsAppMessagesHourly,
  WhatsAppTagComparison,
  WhatsAppAgentRow,
} from "@/lib/api"

export const CITIES = ["Pelotas", "Santa Maria", "Rio Grande"] as const
export type CityName = (typeof CITIES)[number]

export interface CallsKpiData {
  summary: CallsSummary
  hourly: CallsHourly
  ranking: CallsAgentsRanking
  comparison: CallsHourlyComparison
}

export interface WhatsAppKpiData {
  summary: WhatsAppSummary
  ranking: WhatsAppAgentsRanking
  sessionsHourly: WhatsAppSessionsHourly
  messagesHourly: WhatsAppMessagesHourly
  tagComparison: WhatsAppTagComparison
}

export interface CityKpiData {
  budgets: BudgetSummary
  sales: SalesSummary
  salesWithBudget: Pick<SalesSummary, "active">
  salesWithoutBudget: Pick<SalesSummary, "active">
  followUp: FollowUpSummary
  calls: CallsKpiData
  whatsapp: WhatsAppKpiData
}

const PERIOD = {
  from: "2026-07-01",
  to: "2026-07-01",
  key: "2026-07",
}

function budget(
  total: [number, number],
  won: [number, number],
  open: [number, number],
  lost: [number, number],
): BudgetSummary {
  return {
    period: PERIOD,
    total: { count: total[0], value: String(total[1]) },
    won: { count: won[0], value: String(won[1]) },
    open: { count: open[0], value: String(open[1]) },
    lost: { count: lost[0], value: String(lost[1]) },
  }
}

function sales(
  total: [number, number],
  withBudget: [number, number],
  withoutBudget: [number, number],
  canceled: [number, number],
  avgDaily: [string, number],
): {
  sales: SalesSummary
  salesWithBudget: Pick<SalesSummary, "active">
  salesWithoutBudget: Pick<SalesSummary, "active">
} {
  const activeCount = withBudget[0] + withoutBudget[0]
  const activeValue = withBudget[1] + withoutBudget[1]
  const avgTicket = activeCount > 0 ? activeValue / activeCount : 0

  return {
    sales: {
      period: PERIOD,
      total: { count: total[0], value: String(total[1]) },
      active: { count: activeCount, value: String(activeValue) },
      canceled: { count: canceled[0], value: String(canceled[1]) },
      averageDaily: { count: avgDaily[0], value: String(avgDaily[1]) },
      averageTicket: { value: String(avgTicket.toFixed(2)) },
    },
    salesWithBudget: {
      active: { count: withBudget[0], value: String(withBudget[1]) },
    },
    salesWithoutBudget: {
      active: { count: withoutBudget[0], value: String(withoutBudget[1]) },
    },
  }
}

function followUpBlock(
  totalCount: number,
  totalValue: number,
  within: {
    total: [number, number]
    converted: [number, number, number]
    lost: [number, number, number]
    open: [number, number, number]
  },
  after: {
    total: [number, number]
    converted: [number, number, number]
    lost: [number, number, number]
    open: [number, number, number]
  },
): FollowUpSummary {
  const mk = (t: [number, number, number]) => ({
    count: t[0],
    value: String(t[1]),
    percentage: String(t[2]),
  })

  return {
    period: PERIOD,
    total: { count: totalCount, value: String(totalValue) },
    within24h: {
      total: { count: within.total[0], value: String(within.total[1]) },
      converted: mk(within.converted),
      lost: mk(within.lost),
      open: mk(within.open),
    },
    after24h: {
      total: { count: after.total[0], value: String(after.total[1]) },
      converted: mk(after.converted),
      lost: mk(after.lost),
      open: mk(after.open),
    },
  }
}

const HOUR_WEIGHTS = [0.06, 0.08, 0.11, 0.1, 0.07, 0.08, 0.12, 0.11, 0.13, 0.09, 0.05]
const BUSINESS_HOURS = ["08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18"]

function distribute(total: number, weights = HOUR_WEIGHTS): number[] {
  const values = weights.map((w) => Math.round(total * w))
  const diff = total - values.reduce((a, b) => a + b, 0)
  if (diff !== 0) values[values.length - 1] += diff
  return values
}

function callsAgent(
  label: string,
  ext: string,
  received: number,
  lost: number,
): CallsAgentRow {
  return {
    agentType: "extension",
    agentKey: ext,
    agentLabel: label,
    employeeName: label,
    extensionNumber: ext,
    receivedCount: received,
    lostCount: lost,
    totalInboundCount: received + lost,
  }
}

function waAgent(label: string, sessions: number): WhatsAppAgentRow {
  return {
    agentKey: label.toLowerCase().replace(/\s/g, "-"),
    agentLabel: label,
    employeeId: null,
    employeeName: label,
    employeeChatId: null,
    assignedUserName: label,
    assignedUserEmail: null,
    sessionsCount: sessions,
  }
}

function callsBlock(
  received: number,
  lost: number,
  telemarketingOpenBudgets: number,
  agents: [string, string, number, number][],
): CallsKpiData {
  const receivedByHour = distribute(received)
  const lostByHour = distribute(lost)
  const budgetsByHour = distribute(telemarketingOpenBudgets)

  const rows = BUSINESS_HOURS.map((hour, i) => ({
    hour,
    receivedCount: receivedByHour[i],
    lostCount: lostByHour[i],
    totalInboundCount: receivedByHour[i] + lostByHour[i],
  }))

  const peak = [...rows].sort(
    (a, b) => b.totalInboundCount - a.totalInboundCount,
  )[0]

  const rankingRows = agents
    .map(([label, ext, r, l]) => callsAgent(label, ext, r, l))
    .sort((a, b) => b.totalInboundCount - a.totalInboundCount)

  return {
    summary: {
      period: PERIOD,
      received: { count: received },
      lost: { count: lost },
      totalInbound: { count: received + lost },
      telemarketingOpenBudgets: { count: telemarketingOpenBudgets },
      peakHour: {
        hour: peak.hour,
        totalInboundCount: peak.totalInboundCount,
      },
    },
    hourly: { period: PERIOD, rows },
    ranking: { period: PERIOD, rows: rankingRows },
    comparison: {
      period: PERIOD,
      rows: rows.map((r, i) => ({
        hour: r.hour,
        receivedCount: r.receivedCount,
        lostCount: r.lostCount,
        telemarketingBudgetCount: budgetsByHour[i],
      })),
    },
  }
}

function whatsappBlock(
  conversations: number,
  messages: number,
  agents: [string, number][],
): WhatsAppKpiData {
  const sessionsByHour = distribute(conversations)
  const messagesByHour = distribute(messages)
  const tagSessionsByHour = distribute(Math.round(conversations * 0.62))
  const openBudgetsByHour = distribute(Math.round(conversations * 0.18))

  const sessionRows = BUSINESS_HOURS.map((hour, i) => ({
    hour,
    sessionsCount: sessionsByHour[i],
  }))

  const messageRows = BUSINESS_HOURS.map((hour, i) => ({
    hour,
    receivedMessagesCount: messagesByHour[i],
  }))

  const rankingRows = agents
    .map(([label, sessions]) => waAgent(label, sessions))
    .sort((a, b) => b.sessionsCount - a.sessionsCount)

  return {
    summary: {
      period: PERIOD,
      totalConversations: { count: conversations },
      receivedMessages: { count: messages },
    },
    ranking: { period: PERIOD, rows: rankingRows },
    sessionsHourly: { period: PERIOD, rows: sessionRows },
    messagesHourly: { period: PERIOD, rows: messageRows },
    tagComparison: {
      period: PERIOD,
      tagId: "mock-orcamento",
      rows: BUSINESS_HOURS.map((hour, i) => ({
        hour,
        tagSessionsCount: tagSessionsByHour[i],
        openBudgetsCount: openBudgetsByHour[i],
      })),
    },
  }
}

const PELOTAS: CityKpiData = {
  budgets: budget([45, 892500], [18, 425000], [15, 312000], [12, 155500]),
  ...sales([35, 652000], [22, 512000], [8, 98000], [5, 42000], ["1.4", 27727.27]),
  followUp: followUpBlock(
    45,
    892500,
    {
      total: [28, 455000],
      converted: [12, 245000, 42.86],
      lost: [8, 98000, 28.57],
      open: [8, 112000, 28.57],
    },
    {
      total: [17, 268000],
      converted: [6, 118000, 35.29],
      lost: [5, 42000, 29.41],
      open: [6, 108000, 35.29],
    },
  ),
  calls: callsBlock(312, 48, 9, [
    ["Ana Souza", "201", 118, 14],
    ["Bruno Lima", "202", 102, 18],
    ["Carla Mendes", "203", 92, 16],
  ]),
  whatsapp: whatsappBlock(420, 1840, [
    ["Ana Souza", 148],
    ["Bruno Lima", 132],
    ["Carla Mendes", 118],
  ]),
}

const SANTA_MARIA: CityKpiData = {
  budgets: budget([38, 756000], [14, 328000], [12, 268000], [12, 160000]),
  ...sales([29, 519000], [18, 398000], [7, 86000], [4, 35000], ["1.1", 22000]),
  followUp: followUpBlock(
    38,
    756000,
    {
      total: [22, 368000],
      converted: [9, 198000, 40.91],
      lost: [6, 72000, 27.27],
      open: [7, 98000, 31.82],
    },
    {
      total: [16, 224000],
      converted: [5, 89000, 31.25],
      lost: [5, 48000, 31.25],
      open: [6, 87000, 37.5],
    },
  ),
  calls: callsBlock(268, 42, 7, [
    ["Diego Alves", "301", 98, 12],
    ["Elena Rocha", "302", 88, 16],
    ["Fábio Nunes", "303", 82, 14],
  ]),
  whatsapp: whatsappBlock(356, 1520, [
    ["Diego Alves", 126],
    ["Elena Rocha", 114],
    ["Fábio Nunes", 102],
  ]),
}

const RIO_GRANDE: CityKpiData = {
  budgets: budget([32, 624000], [11, 278000], [10, 214000], [11, 132000]),
  ...sales([25, 434000], [15, 324000], [6, 72000], [4, 38000], ["1.0", 18000]),
  followUp: followUpBlock(
    32,
    624000,
    {
      total: [19, 296000],
      converted: [7, 156000, 36.84],
      lost: [5, 58000, 26.32],
      open: [7, 82000, 36.84],
    },
    {
      total: [13, 176000],
      converted: [4, 72000, 30.77],
      lost: [4, 38000, 30.77],
      open: [5, 66000, 38.46],
    },
  ),
  calls: callsBlock(224, 36, 6, [
    ["Gabriela Dias", "401", 82, 10],
    ["Henrique Pires", "402", 76, 14],
    ["Isabel Costa", "403", 66, 12],
  ]),
  whatsapp: whatsappBlock(298, 1280, [
    ["Gabriela Dias", 108],
    ["Henrique Pires", 96],
    ["Isabel Costa", 88],
  ]),
}

export const CITY_DATA: Record<CityName, CityKpiData> = {
  Pelotas: PELOTAS,
  "Santa Maria": SANTA_MARIA,
  "Rio Grande": RIO_GRANDE,
}

export const GERAL_DATA: CityKpiData = {
  budgets: budget([115, 2272500], [43, 1031000], [37, 794000], [35, 447500]),
  ...sales([89, 1605000], [55, 1234000], [21, 256000], [13, 115000], ["3.5", 65454.55]),
  followUp: followUpBlock(
    115,
    2272500,
    {
      total: [69, 1119000],
      converted: [28, 599000, 40.58],
      lost: [19, 228000, 27.54],
      open: [22, 292000, 31.88],
    },
    {
      total: [46, 668000],
      converted: [15, 279000, 32.61],
      lost: [14, 128000, 30.43],
      open: [17, 261000, 36.96],
    },
  ),
  calls: callsBlock(804, 126, 22, [
    ["Ana Souza", "201", 118, 14],
    ["Diego Alves", "301", 98, 12],
    ["Bruno Lima", "202", 102, 18],
  ]),
  whatsapp: whatsappBlock(1074, 4640, [
    ["Ana Souza", 148],
    ["Diego Alves", 126],
    ["Elena Rocha", 114],
  ]),
}
