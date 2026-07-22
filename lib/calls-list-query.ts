export type CallsCardKind = "total" | "answered" | "unanswered"

/** KPI inbound universe: same scope as summary.totalInbound. */
export function isKpiInboundDirection(direction: string | undefined | null) {
  return (direction ?? "").toLowerCase() === "inbound"
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
  return p
}
