import type { CallsDrilldownRow } from "./api"

const CSV_HEADERS = [
  "Data/Hora",
  "Direção",
  "Status",
  "Outcome",
  "Origem",
  "Destino",
  "Ramal",
  "Atendente",
  "Duração(s)",
  "Filial",
]

function formatDatetime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  })
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

export function buildCallsExportCsv(rows: CallsDrilldownRow[]) {
  const lines = [
    toCsvLine(CSV_HEADERS),
    ...rows.map((row) =>
      toCsvLine([
        formatDatetime(row.startedAt),
        row.direction,
        row.status,
        row.outcome,
        row.callerNumber ?? "",
        row.destinationNumber ?? "",
        row.agentExtensionNumber ?? "",
        row.employeeName ?? "",
        row.durationSeconds,
        row.branchName ?? "",
      ]),
    ),
  ]

  return `\uFEFF${lines.join("\r\n")}`
}

export function buildCallsExportFilename(from: string, to: string) {
  return `ligacoes-${from}-a-${to}.csv`
}
