import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  buildCallsExportCsv,
  buildCallsExportFilename,
} from "./calls-export.ts"
import type { CallsDrilldownRow } from "./api.ts"

function sampleRow(overrides: Partial<CallsDrilldownRow> = {}): CallsDrilldownRow {
  return {
    id: "1",
    startedAt: "2026-07-15T14:30:00.000Z",
    endedAt: "2026-07-15T14:31:00.000Z",
    durationSeconds: "60",
    direction: "inbound",
    status: "completed",
    outcome: "ANSWERED",
    callerNumber: "11999998888",
    destinationNumber: "1133334444",
    extensionUuid: "ext-uuid",
    agentExtensionNumber: "1001",
    isInboundToCompany: true,
    isReceived: true,
    isLost: false,
    branchId: 12,
    branchName: "Filial Centro",
    employeeId: 7,
    employeeName: "Maria Silva",
    ...overrides,
  }
}

describe("buildCallsExportCsv", () => {
  it("includes headers and row values", () => {
    const csv = buildCallsExportCsv([sampleRow()])
    assert.ok(csv.startsWith("\uFEFF"))
    const lines = csv.slice(1).split("\r\n")
    assert.equal(
      lines[0],
      "Data/Hora;Direção;Status;Outcome;Origem;Destino;Ramal;Atendente;Duração(s);Filial",
    )
    assert.match(lines[1], /^15\/07\/2026/)
    assert.match(lines[1], /inbound/)
    assert.match(lines[1], /completed/)
    assert.match(lines[1], /ANSWERED/)
    assert.match(lines[1], /11999998888/)
    assert.match(lines[1], /1133334444/)
    assert.match(lines[1], /1001/)
    assert.match(lines[1], /Maria Silva/)
    assert.match(lines[1], /60/)
    assert.match(lines[1], /Filial Centro/)
  })

  it("escapes semicolons and quotes", () => {
    const csv = buildCallsExportCsv([
      sampleRow({
        employeeName: 'João "Júnior"; Silva',
        branchName: "Filial; Norte",
      }),
    ])
    const dataLine = csv.slice(1).split("\r\n")[1]
    assert.match(dataLine, /"João ""Júnior""; Silva"/)
    assert.match(dataLine, /"Filial; Norte"/)
  })

  it("handles null optional fields as empty strings", () => {
    const csv = buildCallsExportCsv([
      sampleRow({
        callerNumber: null,
        destinationNumber: null,
        agentExtensionNumber: null,
        employeeName: null,
        branchName: null,
      }),
    ])
    const dataLine = csv.slice(1).split("\r\n")[1]
    const parts = dataLine.split(";")
    assert.equal(parts[4], "")
    assert.equal(parts[5], "")
    assert.equal(parts[6], "")
    assert.equal(parts[7], "")
    assert.equal(parts[9], "")
  })
})

describe("buildCallsExportFilename", () => {
  it("builds ligacoes filename with date range", () => {
    assert.equal(
      buildCallsExportFilename("2026-07-01", "2026-07-22"),
      "ligacoes-2026-07-01-a-2026-07-22.csv",
    )
  })
})
