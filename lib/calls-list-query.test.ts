import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { buildCallsListSearchParams } from "./calls-list-query.ts"

describe("buildCallsListSearchParams", () => {
  it("total card: inbound + period, no employee", () => {
    const p = buildCallsListSearchParams({
      kind: "total",
      from: "2026-07-01",
      to: "2026-07-22",
    })
    assert.equal(p.get("direction"), "inbound")
    assert.equal(p.get("from"), "2026-07-01")
    assert.equal(p.get("outcome"), null)
    assert.equal(p.get("employeeId"), null)
  })

  it("answered card: includes outcome + employeeId", () => {
    const p = buildCallsListSearchParams({
      kind: "answered",
      from: "2026-07-01",
      to: "2026-07-22",
      employeeId: "7",
    })
    assert.equal(p.get("outcome"), "ANSWERED")
    assert.equal(p.get("employeeId"), "7")
    assert.equal(p.get("direction"), "inbound")
  })

  it("unanswered card: UNANSWERED + employeeId + branchId", () => {
    const p = buildCallsListSearchParams({
      kind: "unanswered",
      from: "2026-07-01",
      to: "2026-07-22",
      employeeId: "7",
      branchId: "12",
    })
    assert.equal(p.get("outcome"), "UNANSWERED")
    assert.equal(p.get("branchId"), "12")
  })

  it("geral omits branchId", () => {
    const p = buildCallsListSearchParams({
      kind: "total",
      from: "2026-07-01",
      to: "2026-07-22",
    })
    assert.equal(p.get("branchId"), null)
  })
})
