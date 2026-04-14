import assert from "node:assert/strict"

import { buildBudgetExportCsv, buildBudgetExportFilename } from "./budget-export.ts"

const sampleRows = [
  {
    id: "1",
    sourceTable: "budgets",
    sourceRecordId: 101,
    budgetDate: "2026-04-01",
    budgetDatetime: "2026-04-01T14:30:00-03:00",
    closingDate: null,
    cancellationDate: null,
    cancelationTime: null,
    branchId: 10,
    branchName: "Matriz",
    sellerId: 20,
    sellerName: "Ana Souza",
    statusNormalized: "OPEN",
    channel: "WhatsApp",
    customerName: "Cliente \"VIP\"; Centro",
    cpfCnpj: "12345678900",
    valueAmount: "1234.56",
    sequential: null,
    davId: "DAV001",
    sequentialLinkedSale: null,
  },
  {
    id: "2",
    sourceTable: "budgets",
    sourceRecordId: 102,
    budgetDate: "2026-04-02",
    budgetDatetime: "2026-04-02T09:15:00-03:00",
    closingDate: null,
    cancellationDate: null,
    cancelationTime: null,
    branchId: 11,
    branchName: "Filial Sul",
    sellerId: 21,
    sellerName: "Bruno Lima",
    statusNormalized: "WON",
    channel: null,
    customerName: "Maria Silva",
    cpfCnpj: null,
    valueAmount: "50",
    sequential: null,
    davId: null,
    sequentialLinkedSale: null,
  },
]

const csv = buildBudgetExportCsv(sampleRows)

assert.ok(
  csv.startsWith(
    "\uFEFFData;Cliente;Vendedor;Status;Canal;Filial;Valor;DAV;CPF/CNPJ;Data/Hora",
  ),
)

const lines = csv.trim().split(/\r?\n/)

assert.equal(lines.length, 3)
assert.match(lines[1], /"Cliente ""VIP""; Centro"/)
assert.match(lines[1], /Ana Souza/)
assert.match(lines[1], /OPEN/)
assert.match(lines[1], /1234,56|1\.234,56/)
assert.match(lines[2], /Maria Silva/)
assert.match(lines[2], /WON/)
assert.match(lines[2], /Filial Sul/)

assert.equal(
  buildBudgetExportFilename("2026-04-01", "2026-04-14"),
  "orcamentos-2026-04-01-a-2026-04-14.csv",
)

console.log("budget-export checks passed")
