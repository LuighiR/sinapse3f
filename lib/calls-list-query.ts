export type CallsCardKind =
  | "total"
  | "answered"
  | "unanswered"
  | "unansweredWithoutEmployee"
  /** Status bruto `answered` + outcome Não Atendidas (mesmo filtro da listagem). */
  | "unansweredAnswered"

/** KPI inbound universe: same scope as summary.totalInbound. */
export function isKpiInboundDirection(direction: string | undefined | null) {
  return (direction ?? "").toLowerCase() === "inbound"
}

/** Filtros do card "Ligações não atendidas": status answered + outcome Não Atendidas. */
export function unansweredAnsweredFilters(input: {
  from: string
  to: string
  employeeId?: string
  branchId?: string
}) {
  return {
    from: input.from,
    to: input.to,
    direction: "inbound",
    isInboundToCompany: "true",
    status: "answered",
    outcome: "UNANSWERED",
    ...(input.employeeId ? { employeeId: input.employeeId } : {}),
    ...(input.branchId ? { branchId: input.branchId } : {}),
  }
}

export function buildCallsListSearchParams(input: {
  kind: CallsCardKind
  from: string
  to: string
  employeeId?: string
  branchId?: string
}): URLSearchParams {
  const p = new URLSearchParams({
    from: input.from,
    to: input.to,
    direction: "inbound",
    isInboundToCompany: "true",
  })
  if (input.branchId) p.set("branchId", input.branchId)
  if (input.kind === "answered") {
    p.set("outcome", "ANSWERED")
    if (input.employeeId) p.set("employeeId", input.employeeId)
  }
  if (input.kind === "unanswered") {
    p.set("outcome", "UNANSWERED")
    if (input.employeeId) p.set("employeeId", input.employeeId)
  }
  if (input.kind === "unansweredWithoutEmployee") {
    p.set("outcome", "UNANSWERED")
    p.set("withoutEmployee", "true")
  }
  if (input.kind === "unansweredAnswered") {
    const filters = unansweredAnsweredFilters(input)
    p.set("status", filters.status)
    p.set("outcome", filters.outcome)
    if (filters.employeeId) p.set("employeeId", filters.employeeId)
  }
  return p
}
