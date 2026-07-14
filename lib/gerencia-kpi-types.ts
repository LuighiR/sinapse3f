import type {
  BudgetSummary,
  FollowUpSummary,
  SalesSummary,
  CallsSummary,
  CallsHourly,
  CallsAgentsRanking,
  CallsHourlyComparison,
  WhatsAppSummary,
  WhatsAppAgentsRanking,
  WhatsAppSessionsHourly,
  WhatsAppMessagesHourly,
  WhatsAppTagComparison,
  Branch,
  WhatsAppCity,
} from "@/lib/api"

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

export interface BranchKpiData {
  branch: Branch
  data: CityKpiData
}

export interface WhatsAppCityKpiData {
  city: WhatsAppCity
  data: WhatsAppKpiData
}

export interface GerenciaKpiBundle {
  geral: CityKpiData
  branches: BranchKpiData[]
  /** WhatsApp zona: cidades de GET /whatsapp-cities (independente de branches). */
  whatsappCities: WhatsAppCityKpiData[]
}
