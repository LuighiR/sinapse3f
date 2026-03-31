const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"

type RequestOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>
  token?: string
  tenantId?: string
}

export async function api<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const { token, tenantId, headers: extraHeaders, ...rest } = opts

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extraHeaders,
  }

  if (token) headers["Authorization"] = `Bearer ${token}`
  if (tenantId) headers["X-Tenant-Id"] = tenantId

  const res = await fetch(`${API_BASE}${path}`, { headers, ...rest })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body.message ?? res.statusText)
  }

  return res.json() as Promise<T>
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

// ── Auth ──

export interface LoginResponse {
  tokenType: string
  accessToken: string
  refreshToken: string
  expiresInSeconds: number
  user: { id: string; email: string; name: string }
  tenants: {
    id: string
    name: string
    slug: string
    role: string
    backendClientId: string
  }[]
}

export interface RefreshResponse {
  tokenType: string
  accessToken: string
  refreshToken: string
  expiresInSeconds: number
}

export function login(email: string, password: string) {
  return api<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
}

export function refreshTokens(refreshToken: string) {
  return api<RefreshResponse>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  })
}

// ── Company ──

export interface Employee {
  id: number
  erpId: number
  name: string
  branchId: number
  extensionNumber: string | null
  extensionUuid: string | null
  chatId: string | null
}

export function getEmployees(opts: { token: string; tenantId: string }) {
  return api<Employee[]>("/companies/current/employees", {
    token: opts.token,
    tenantId: opts.tenantId,
  })
}

// ── KPI Types ──

export interface KpiPeriod {
  from: string
  to: string
  key: string
}

export interface BudgetSummary {
  period: KpiPeriod
  total: { count: number; value: string }
  open: { count: number; value: string }
  won: { count: number; value: string }
  lost: { count: number; value: string }
}

export interface SalesSummary {
  period: KpiPeriod
  total: { count: number; value: string }
  active: { count: number; value: string }
  canceled: { count: number; value: string }
  averageDaily: { count: string; value: string }
  averageTicket: { value: string }
}

export interface DailySeries {
  period: KpiPeriod
  series: { date: string; count: number; value: string }[]
}

export interface FollowUpSummary {
  period: KpiPeriod
  total: { count: number; value: string }
  within24h: {
    total: { count: number; value: string }
    converted: { count: number; value: string; percentage: string }
    lost: { count: number; value: string; percentage: string }
    open: { count: number; value: string; percentage: string }
  }
  after24h: {
    total: { count: number; value: string }
    converted: { count: number; value: string; percentage: string }
    lost: { count: number; value: string; percentage: string }
    open: { count: number; value: string; percentage: string }
  }
}

// ── KPI Fetchers ──

export interface KpiOpts {
  token: string
  tenantId: string
  from: string
  to: string
  sellerId?: string
  status?: string
  orderType?: string
  referenceAt?: string
  hasLinkedBudget?: string
  extensionUuid?: string
  extensionNumber?: string
  chatId?: string
}

function kpiParams(opts: KpiOpts) {
  const p: Record<string, string> = { from: opts.from, to: opts.to }
  if (opts.sellerId) p.sellerId = opts.sellerId
  if (opts.status) p.status = opts.status
  if (opts.orderType) p.orderType = opts.orderType
  if (opts.hasLinkedBudget) p.hasLinkedBudget = opts.hasLinkedBudget
  if (opts.extensionUuid) p.extensionUuid = opts.extensionUuid
  if (opts.extensionNumber) p.extensionNumber = opts.extensionNumber
  if (opts.chatId) p.chatId = opts.chatId
  return new URLSearchParams(p)
}

export function getBudgetSummary(opts: KpiOpts) {
  return api<BudgetSummary>(`/kpis/budgets/summary?${kpiParams(opts)}`, {
    token: opts.token,
    tenantId: opts.tenantId,
  })
}

export function getBudgetDaily(opts: KpiOpts) {
  return api<DailySeries>(`/kpis/budgets/daily?${kpiParams(opts)}`, {
    token: opts.token,
    tenantId: opts.tenantId,
  })
}

export interface BudgetDrilldownRow {
  id: string
  sourceTable: string
  sourceRecordId: number
  budgetDate: string
  budgetDatetime: string
  closingDate: string | null
  cancellationDate: string | null
  cancelationTime: string | null
  branchId: number
  branchName: string
  sellerId: number
  sellerName: string
  statusNormalized: string
  channel: string | null
  customerName: string
  cpfCnpj: string | null
  valueAmount: string
  sequential: string | null
  davId: string | null
  sequentialLinkedSale: string | null
}

export interface BudgetDrilldown {
  period: KpiPeriod
  filters: {
    sellerId?: number
    status?: string
    branchId?: number
    branchName?: string
  }
  rows: BudgetDrilldownRow[]
}

export function getBudgetDrilldown(opts: KpiOpts) {
  return api<BudgetDrilldown>(`/kpis/budgets/drilldown?${kpiParams(opts)}`, {
    token: opts.token,
    tenantId: opts.tenantId,
  })
}

export function getBudgetFollowUp(opts: KpiOpts & { referenceAt: string }) {
  const p = kpiParams(opts)
  p.set("referenceAt", opts.referenceAt)
  return api<FollowUpSummary>(
    `/kpis/budgets/follow-up/summary?${p}`,
    { token: opts.token, tenantId: opts.tenantId },
  )
}

// ── Follow-up Daily ──

export interface FollowUpDailyRow {
  date: string
  window: string
  status: string
  count: number
  value: string
}

export interface FollowUpDaily {
  period: KpiPeriod
  rows: FollowUpDailyRow[]
}

export function getBudgetFollowUpDaily(opts: KpiOpts & { referenceAt: string }) {
  const p = kpiParams(opts)
  p.set("referenceAt", opts.referenceAt)
  return api<FollowUpDaily>(`/kpis/budgets/follow-up/daily?${p}`, {
    token: opts.token,
    tenantId: opts.tenantId,
  })
}

/** Returns a DailySeries-compatible shape filtered by window + status */
export async function getFollowUpDailySeries(
  opts: KpiOpts & { referenceAt: string },
  window: string,
  fStatus: string,
): Promise<DailySeries> {
  const data = await getBudgetFollowUpDaily(opts)
  return {
    period: data.period,
    series: data.rows
      .filter((r) => r.window === window && r.status === fStatus)
      .map((r) => ({ date: r.date, count: r.count, value: r.value })),
  }
}

// ── Follow-up Drilldown ──

export interface FollowUpDrilldownRow {
  id: string
  sourceTable: string
  sourceRecordId: number
  budgetDate: string
  budgetDatetime: string
  closingDate: string | null
  cancellationDate: string | null
  cancelationTime: string | null
  branchId: number
  branchName: string
  sellerId: number
  sellerName: string
  statusNormalized: string
  channel: string | null
  customerName: string
  cpfCnpj: string | null
  valueAmount: string
  sequential: string | null
  davId: string | null
  sequentialLinkedSale: string | null
  followUpWindow: string
  followUpStatus: string
}

export interface FollowUpDrilldown {
  period: KpiPeriod
  filters: {
    referenceAt?: string
    date?: string
    followUpWindow?: string
    followUpStatus?: string
    sellerId?: number
    orderType?: string
  }
  rows: FollowUpDrilldownRow[]
}

export function getBudgetFollowUpDrilldown(
  opts: KpiOpts & {
    referenceAt: string
    date?: string
    followUpWindow?: string
    followUpStatus?: string
  },
) {
  const p = kpiParams(opts)
  p.set("referenceAt", opts.referenceAt)
  if (opts.date) p.set("date", opts.date)
  if (opts.followUpWindow) p.set("followUpWindow", opts.followUpWindow)
  if (opts.followUpStatus) p.set("followUpStatus", opts.followUpStatus)
  return api<FollowUpDrilldown>(`/kpis/budgets/follow-up/drilldown?${p}`, {
    token: opts.token,
    tenantId: opts.tenantId,
  })
}

export function getSalesSummary(opts: KpiOpts) {
  return api<SalesSummary>(`/kpis/sales/summary?${kpiParams(opts)}`, {
    token: opts.token,
    tenantId: opts.tenantId,
  })
}

export function getSalesDaily(opts: KpiOpts) {
  return api<DailySeries>(`/kpis/sales/daily?${kpiParams(opts)}`, {
    token: opts.token,
    tenantId: opts.tenantId,
  })
}

export interface TicketAverage {
  period: KpiPeriod
  overall: { count: number; value: string; averageTicket: string }
  channels: {
    orderType: string
    count: number
    value: string
    averageTicket: string
  }[]
}

export function getSalesTicketAverage(opts: KpiOpts) {
  return api<TicketAverage>(`/kpis/sales/ticket-average?${kpiParams(opts)}`, {
    token: opts.token,
    tenantId: opts.tenantId,
  })
}

export interface SalesDrilldownRow {
  id: string
  sourceTable: string
  sourceRecordId: number
  saleDate: string
  saleDatetime: string
  branchId: number
  branchName: string
  sellerId: number
  sellerName: string
  statusNormalized: string
  channel: string | null
  hasLinkedBudget: boolean
  linkedBudgetSourceRecordId: number | null
  customerName: string
  cpfCnpj: string | null
  valueAmount: string
  sequential: string | null
  invoiceSerie: string | null
  invoiceNumeric: string | null
  listDavsId: string | null
}

export interface SalesDrilldown {
  period: KpiPeriod
  filters: {
    sellerId?: number
    status?: string
    orderType?: string
  }
  rows: SalesDrilldownRow[]
}

export function getSalesDrilldown(opts: KpiOpts) {
  return api<SalesDrilldown>(`/kpis/sales/drilldown?${kpiParams(opts)}`, {
    token: opts.token,
    tenantId: opts.tenantId,
  })
}

// ── Calls KPI Types ──

export interface CallsSummary {
  period: KpiPeriod
  received: { count: number }
  lost: { count: number }
  totalInbound: { count: number }
  telemarketingOpenBudgets: { count: number }
  peakHour: { hour: string; totalInboundCount: number }
}

export interface CallsHourlyRow {
  hour: string
  receivedCount: number
  lostCount: number
  totalInboundCount: number
}

export interface CallsHourly {
  period: KpiPeriod
  rows: CallsHourlyRow[]
}

export interface CallsAgentRow {
  agentType: string
  agentKey: string
  agentLabel: string
  employeeName: string | null
  extensionNumber: string
  receivedCount: number
  lostCount: number
  totalInboundCount: number
}

export interface CallsAgentsRanking {
  period: KpiPeriod
  rows: CallsAgentRow[]
}

export interface CallsComparisonRow {
  hour: string
  receivedCount: number
  lostCount: number
  telemarketingBudgetCount: number
}

export interface CallsHourlyComparison {
  period: KpiPeriod
  rows: CallsComparisonRow[]
}

// ── KPI Refresh ──

export interface RefreshResult {
  clientId: string
  from: string
  to: string
  calculationRunId: string
  recordsRead: number
  snapshotsCreated: number
  breakdownsCreated: number
  availabilityEnabled: boolean
}

export function refreshBudgets(opts: KpiOpts) {
  return api<RefreshResult>(`/kpis/budgets/refresh?${kpiParams(opts)}`, {
    method: "POST",
    token: opts.token,
    tenantId: opts.tenantId,
  })
}

export function refreshSales(opts: KpiOpts) {
  return api<RefreshResult>(`/kpis/sales/refresh?${kpiParams(opts)}`, {
    method: "POST",
    token: opts.token,
    tenantId: opts.tenantId,
  })
}

export function refreshCalls(opts: KpiOpts) {
  return api<RefreshResult>(`/kpis/calls/refresh?${kpiParams(opts)}`, {
    method: "POST",
    token: opts.token,
    tenantId: opts.tenantId,
  })
}

// ── Calls KPI Fetchers ──

export function getCallsSummary(opts: KpiOpts) {
  return api<CallsSummary>(`/kpis/calls/summary?${kpiParams(opts)}`, {
    token: opts.token,
    tenantId: opts.tenantId,
  })
}

export function getCallsHourly(opts: KpiOpts) {
  return api<CallsHourly>(`/kpis/calls/hourly?${kpiParams(opts)}`, {
    token: opts.token,
    tenantId: opts.tenantId,
  })
}

export function getCallsAgentsRanking(opts: KpiOpts) {
  return api<CallsAgentsRanking>(`/kpis/calls/agents/ranking?${kpiParams(opts)}`, {
    token: opts.token,
    tenantId: opts.tenantId,
  })
}

export function getCallsHourlyComparison(opts: KpiOpts) {
  return api<CallsHourlyComparison>(`/kpis/calls/hourly/comparison?${kpiParams(opts)}`, {
    token: opts.token,
    tenantId: opts.tenantId,
  })
}

// ── WhatsApp KPI Types ──

export interface WhatsAppSummary {
  period: KpiPeriod
  totalConversations: { count: number }
  receivedMessages: { count: number }
}

export interface WhatsAppAgentRow {
  agentKey: string
  agentLabel: string
  employeeId: string | null
  employeeName: string | null
  employeeChatId: string | null
  assignedUserName: string | null
  assignedUserEmail: string | null
  sessionsCount: number
}

export interface WhatsAppAgentsRanking {
  period: KpiPeriod
  rows: WhatsAppAgentRow[]
}

export interface WhatsAppSessionsHourlyRow {
  hour: string
  sessionsCount: number
}

export interface WhatsAppSessionsHourly {
  period: KpiPeriod
  rows: WhatsAppSessionsHourlyRow[]
}

export interface WhatsAppSessionsDailyRow {
  date: string
  sessionsCount: number
}

export interface WhatsAppSessionsDaily {
  period: KpiPeriod
  rows: WhatsAppSessionsDailyRow[]
}

export interface WhatsAppMessagesHourlyRow {
  hour: string
  receivedMessagesCount: number
}

export interface WhatsAppMessagesHourly {
  period: KpiPeriod
  rows: WhatsAppMessagesHourlyRow[]
}

export interface WhatsAppMessagesDailyRow {
  date: string
  receivedMessagesCount: number
}

export interface WhatsAppMessagesDaily {
  period: KpiPeriod
  rows: WhatsAppMessagesDailyRow[]
}

export interface WhatsAppTag {
  tagId: string
  tagName: string
  color: string
}

export interface WhatsAppTags {
  tags: WhatsAppTag[]
}

export interface WhatsAppTagsHourlyRow {
  hour: string
  sessionsCount: number
}

export interface WhatsAppTagsHourly {
  period: KpiPeriod
  tagId: string
  rows: WhatsAppTagsHourlyRow[]
}

export interface WhatsAppTagComparisonRow {
  hour: string
  tagSessionsCount: number
  openBudgetsCount: number
}

export interface WhatsAppTagComparison {
  period: KpiPeriod
  tagId: string
  rows: WhatsAppTagComparisonRow[]
}

// ── WhatsApp KPI Fetchers ──

export function getWhatsAppSummary(opts: KpiOpts) {
  return api<WhatsAppSummary>(`/kpis/whatsapp/summary?${kpiParams(opts)}`, {
    token: opts.token,
    tenantId: opts.tenantId,
  })
}

export function getWhatsAppAgentsRanking(opts: KpiOpts) {
  return api<WhatsAppAgentsRanking>(`/kpis/whatsapp/agents/ranking?${kpiParams(opts)}`, {
    token: opts.token,
    tenantId: opts.tenantId,
  })
}

export function getWhatsAppSessionsHourly(opts: KpiOpts) {
  return api<WhatsAppSessionsHourly>(`/kpis/whatsapp/sessions/hourly?${kpiParams(opts)}`, {
    token: opts.token,
    tenantId: opts.tenantId,
  })
}

export function getWhatsAppSessionsDaily(opts: KpiOpts) {
  return api<WhatsAppSessionsDaily>(`/kpis/whatsapp/sessions/daily?${kpiParams(opts)}`, {
    token: opts.token,
    tenantId: opts.tenantId,
  })
}

export function getWhatsAppMessagesHourly(opts: KpiOpts) {
  return api<WhatsAppMessagesHourly>(`/kpis/whatsapp/messages/hourly?${kpiParams(opts)}`, {
    token: opts.token,
    tenantId: opts.tenantId,
  })
}

export function getWhatsAppMessagesDaily(opts: KpiOpts) {
  return api<WhatsAppMessagesDaily>(`/kpis/whatsapp/messages/daily?${kpiParams(opts)}`, {
    token: opts.token,
    tenantId: opts.tenantId,
  })
}

export function getWhatsAppTags(opts: KpiOpts) {
  return api<WhatsAppTags>(`/kpis/whatsapp/tags?${kpiParams(opts)}`, {
    token: opts.token,
    tenantId: opts.tenantId,
  })
}

export function getWhatsAppTagsHourly(opts: KpiOpts & { tagId: string }) {
  const p = kpiParams(opts)
  p.set("tagId", opts.tagId)
  return api<WhatsAppTagsHourly>(`/kpis/whatsapp/tags/hourly?${p}`, {
    token: opts.token,
    tenantId: opts.tenantId,
  })
}

export function getWhatsAppTagComparison(opts: KpiOpts & { tagId: string }) {
  const p = kpiParams(opts)
  p.set("tagId", opts.tagId)
  return api<WhatsAppTagComparison>(`/kpis/whatsapp/tags/hourly/comparison?${p}`, {
    token: opts.token,
    tenantId: opts.tenantId,
  })
}
