export type CallsCardKind = "total" | "answered" | "unanswered"

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
