import type { BudgetDrilldownRow } from "./api"

const CSV_HEADERS = [
  "Data",
  "Cliente",
  "Vendedor",
  "Status",
  "Canal",
  "Filial",
  "Valor",
  "DAV",
  "CPF/CNPJ",
  "Data/Hora",
]

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-")
  return `${day}/${month}/${year}`
}

function formatDatetime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  })
}

function formatAmount(value: string) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(Number(value))
    .replace(/\u00A0/g, " ")
}

function escapeCsvValue(value: string) {
  if (/[;"\r\n]/.test(value)) {
    return `"${value.replace(/"/g, "\"\"")}"`
  }
  return value
}

function toCsvLine(values: string[]) {
  return values.map(escapeCsvValue).join(";")
}

export function buildBudgetExportCsv(rows: BudgetDrilldownRow[]) {
  const lines = [
    toCsvLine(CSV_HEADERS),
    ...rows.map((row) =>
      toCsvLine([
        formatDate(row.budgetDate),
        row.customerName ?? "",
        row.sellerName ?? "",
        row.statusNormalized ?? "",
        row.channel ?? "",
        row.branchName ?? "",
        formatAmount(row.valueAmount),
        row.davId ?? "",
        row.cpfCnpj ?? "",
        formatDatetime(row.budgetDatetime),
      ]),
    ),
  ]

  return `\uFEFF${lines.join("\r\n")}`
}

export function buildBudgetExportFilename(from: string, to: string) {
  return `orcamentos-${from}-a-${to}.csv`
}
