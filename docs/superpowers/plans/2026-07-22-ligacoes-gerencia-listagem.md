# Ligações Gerência + Listagem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Na Gerência, trocar os cards de ligações (Total geral inbound / Atendidas / Não atendidas do atendente, sem ranking) e criar `/dashboard/ligacoes` com filtros da central, deep-link a partir dos cards e export CSV completo.

**Architecture:** Reusar `GET /kpis/calls/summary` (escopo misto: `totalInbound` ignora atendente; `received`/`lost` usam `employeeId`), `drilldown` + `filter-options`. Página no padrão de vendas/orçamentos. Clique nos cards monta query params canônicos (`direction`, `outcome`, `employeeId`, `branchId`). Export varre todas as páginas do drilldown.

**Tech Stack:** Next.js App Router, React 19, TypeScript, shadcn/ui, `node --experimental-strip-types --test` para helpers puros, `npm run typecheck`

**Spec:** `docs/superpowers/specs/2026-07-22-ligacoes-gerencia-listagem-design.md`

---

## File map

| File | Responsibility |
|------|----------------|
| `lib/api.ts` | `employeeId` + filtros de drilldown em `KpiOpts`/`kpiParams`; tipos e fetchers `getCallsDrilldown` / `getCallsFilterOptions` |
| `lib/calls-list-query.ts` | Helper puro: montar `URLSearchParams` do clique do card |
| `lib/calls-list-query.test.ts` | Testes do helper de query |
| `lib/calls-export.ts` | CSV + filename de ligações |
| `lib/calls-export.test.ts` | Testes do export |
| `lib/fetch-all-calls-drilldown.ts` | Loop paginado até esgotar `pagination.total` (export) |
| `app/dashboard/ligacoes/page.tsx` | Listagem completa + filtros + export |
| `components/app-sidebar.tsx` | Item **Ligações** |
| `lib/fetch-gerencia-kpis.ts` | `callsOpts` com `employeeId`; pular ranking quando há atendente |
| `components/gerencia-calls-section.tsx` | Cards novos + navegação (só variant employee); overview mantém UI atual |
| `components/gerencia-section-cards.tsx` | Passar `variant`, período, `employeeId`, `branchId` para a section |

**Nota (API):** `docs/api/rest-api.md` — no summary, `totalInbound`/`peakHour` ignoram atendente; `received`/`lost` usam atendente. **Um** `getCallsSummary` com `employeeId` basta (não precisa de dois fetches). Paridade card↔lista: comparar KPI com `pagination.total` do drilldown (mesmos filtros).

---

### Task 1: API client — `employeeId` + drilldown + filter-options

**Files:**
- Modify: `lib/api.ts`

- [ ] **Step 1: Extend `KpiOpts` and `kpiParams`**

Adicionar campos opcionais:

```ts
employeeId?: string
direction?: string
outcome?: string // ANSWERED | UNANSWERED | UNCLASSIFIED
callerNumber?: string
destinationNumber?: string
durationMin?: string
durationMax?: string
page?: string
pageSize?: string
```

Em `kpiParams`, serializar cada um quando presente (`employeeId`, `direction`, `outcome`, `callerNumber`, `destinationNumber`, `durationMin`, `durationMax`, `page`, `pageSize`).

- [ ] **Step 2: Add types + fetchers**

```ts
export type CallOutcome = "ANSWERED" | "UNANSWERED" | "UNCLASSIFIED"

export interface CallsDrilldownRow {
  id: string
  startedAt: string
  endedAt: string | null
  durationSeconds: string
  direction: string
  status: string
  outcome: CallOutcome
  callerNumber: string | null
  destinationNumber: string | null
  extensionUuid: string | null
  agentExtensionNumber: string | null
  isInboundToCompany: boolean
  isReceived: boolean
  isLost: boolean
  branchId: number | null
  branchName: string | null
  employeeId: number | null
  employeeName: string | null
}

export interface CallsDrilldown {
  period: KpiPeriod
  filters: Record<string, unknown>
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  rows: CallsDrilldownRow[]
}

export interface CallsFilterOptions {
  period: KpiPeriod
  filters: { branchId?: number }
  statuses: string[]
  directions: string[]
}

export function getCallsDrilldown(opts: KpiOpts) {
  return api<CallsDrilldown>(`/kpis/calls/drilldown?${kpiParams(opts)}`, {
    token: opts.token,
    tenantId: opts.tenantId,
  })
}

export function getCallsFilterOptions(opts: KpiOpts) {
  return api<CallsFilterOptions>(
    `/kpis/calls/filter-options?${kpiParams(opts)}`,
    { token: opts.token, tenantId: opts.tenantId },
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`  
Expected: exit 0 (ou só erros pré-existentes não relacionados)

- [ ] **Step 4: Commit**

```bash
git add lib/api.ts
git commit -m "feat(api): add calls drilldown client and employeeId filter"
```

---

### Task 2: Helpers puros — query do card + export CSV + fetch-all

**Files:**
- Create: `lib/calls-list-query.ts`
- Create: `lib/calls-list-query.test.ts`
- Create: `lib/calls-export.ts`
- Create: `lib/calls-export.test.ts`
- Create: `lib/fetch-all-calls-drilldown.ts`

- [ ] **Step 1: Write failing tests for query builder**

`lib/calls-list-query.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `node --experimental-strip-types --test lib/calls-list-query.test.ts`  
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `buildCallsListSearchParams`**

```ts
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
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `node --experimental-strip-types --test lib/calls-list-query.test.ts`  
Expected: PASS

- [ ] **Step 5: Write failing tests for CSV export**

Espelhar `lib/budget-export.ts`: headers Data/Hora, Direção, Status, Outcome, Origem, Destino, Ramal, Atendente, Duração(s), Filial; escape `;`/`"`; BOM `\uFEFF`; filename `ligacoes-{from}-a-{to}.csv`.

- [ ] **Step 6: Implement `lib/calls-export.ts` until tests PASS**

- [ ] **Step 7: Implement `fetchAllCallsDrilldown`**

```ts
// lib/fetch-all-calls-drilldown.ts
import { getCallsDrilldown, type CallsDrilldownRow, type KpiOpts } from "./api.ts"

const PAGE_SIZE = 100

export async function fetchAllCallsDrilldown(
  opts: Omit<KpiOpts, "page" | "pageSize">,
): Promise<CallsDrilldownRow[]> {
  const rows: CallsDrilldownRow[] = []
  let page = 1
  let totalPages = 1
  do {
    const res = await getCallsDrilldown({
      ...opts,
      page: String(page),
      pageSize: String(PAGE_SIZE),
    })
    rows.push(...res.rows)
    totalPages = res.pagination.totalPages
    page += 1
  } while (page <= totalPages)
  return rows
}
```

Garantir que o total exportado possa ser conferido com `pagination.total` da primeira página (aceite: totais batem com KPI via mesmo filtro → `pagination.total`).

- [ ] **Step 8: Commit**

```bash
git add lib/calls-list-query.ts lib/calls-list-query.test.ts lib/calls-export.ts lib/calls-export.test.ts lib/fetch-all-calls-drilldown.ts
git commit -m "feat: add calls list query, export CSV, and paginated fetch helpers"
```

---

### Task 3: Página `/dashboard/ligacoes` + sidebar

**Files:**
- Create: `app/dashboard/ligacoes/page.tsx`
- Modify: `components/app-sidebar.tsx`

- [ ] **Step 1: Add sidebar item**

Em `navMain` (após Vendas ou junto às listagens), adicionar:

```ts
{
  title: "Ligações",
  url: "/dashboard/ligacoes",
  icon: <PhoneIcon />, // import de lucide-react
},
```

- [ ] **Step 2: Scaffold page from `app/dashboard/vendas/page.tsx`**

Copiar estrutura (auth gate, sidebar layout, período mês/range, selects, tabela, paginação client `PAGE_SIZE = 25` **somente para UX da tabela** se a API já paginar — preferir **paginação server-side** do drilldown: estado `page` sincronizado com a API, `pageSize=50` ou 25).

Filtros (query params ↔ state):

| UI | Param |
|----|--------|
| Período | `from`, `to` |
| Atendente (Select employees) | `employeeId` (`all` = omitir) |
| Filial | `branchId` |
| Status | `status` (options de `getCallsFilterOptions`) |
| Direção | `direction` |
| Resultado | `outcome` (`all` \| `ANSWERED` \| `UNANSWERED` \| `UNCLASSIFIED`) |
| Origem / Destino | `callerNumber`, `destinationNumber` (inputs contains) |

Fetch:

```ts
getCallsDrilldown({
  token, tenantId, from, to,
  employeeId, branchId, status, direction, outcome,
  callerNumber, destinationNumber,
  page: String(page),
  pageSize: "50",
})
```

Carregar `getCallsFilterOptions({ token, tenantId, from, to, branchId })` quando período/filial mudarem.

Colunas: startedAt, direction, status, outcome, callerNumber, destinationNumber, agentExtensionNumber, employeeName, durationSeconds, branchName.

Botão **Exportar CSV**: chama `fetchAllCallsDrilldown` com os mesmos filtros (sem page), `buildCallsExportCsv`, download; desabilitar se loading ou `pagination.total === 0`; toast com quantidade.

Inicializar state a partir de `useSearchParams()` (deep-link dos cards).

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`  
Expected: exit 0

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/ligacoes/page.tsx components/app-sidebar.tsx
git commit -m "feat: add ligacoes listing page with filters and CSV export"
```

---

### Task 4: Fetch Gerência — `employeeId` e sem ranking

**Files:**
- Modify: `lib/fetch-gerencia-kpis.ts`
- Modify: `lib/api.ts` (se `kpiParams` ainda não manda `employeeId` — já feito na Task 1)

- [ ] **Step 1: Update `callsOpts`**

```ts
function callsOpts(opts: KpiOpts): KpiOpts {
  return {
    ...basePeriodOpts(opts),
    ...(opts.employeeId ? { employeeId: opts.employeeId } : {}),
    // fallback legado se um dia for necessário:
    ...(opts.extensionUuid ? { extensionUuid: opts.extensionUuid } : {}),
    ...(opts.extensionNumber ? { extensionNumber: opts.extensionNumber } : {}),
  }
}
```

- [ ] **Step 2: Pass `employeeId` no fluxo com employee**

No bloco `if (employee)` de `fetchGerenciaKpis`, substituir `ramalOpts` por:

```ts
const callsEmployeeOpts: Pick<KpiOpts, "employeeId"> = {
  employeeId: String(employee.id),
}
```

Passar `...callsEmployeeOpts` em `fetchScopeKpis` (junto com `branchId` / `sellerId`). Remover dependência de `extensionUuid`/`extensionNumber` para calls neste fluxo.

Hourly, comparison e televendas (via summary) continuam no mesmo `callsOpts` — **mesmo `employeeId`**.

- [ ] **Step 3: Skip ranking when `employeeId` is set**

Em `fetchCallsSection`:

```ts
async function fetchCallsSection(opts: KpiOpts): Promise<CallsKpiData> {
  const cOpts = callsOpts(opts)
  const empty = emptyCityKpi(opts.from, opts.to).calls
  try {
    const skipRanking = Boolean(cOpts.employeeId)
    const [summary, hourly, ranking, comparison] = await Promise.all([
      getCallsSummary(cOpts),
      getCallsHourly(cOpts),
      skipRanking
        ? Promise.resolve(empty.ranking)
        : getCallsAgentsRanking(cOpts),
      getCallsHourlyComparison(cOpts),
    ])
    return { summary, hourly, ranking, comparison }
  } catch (e) {
    console.error("[Gerencia] calls KPIs", e)
    return empty
  }
}
```

Diretoria (`overview`, sem employee) continua buscando ranking.

- [ ] **Step 4: Typecheck + commit**

```bash
git add lib/fetch-gerencia-kpis.ts
git commit -m "feat(gerencia): filter calls by employeeId and skip ranking fetch"
```

---

### Task 5: Cards da Gerência + deep-link

**Files:**
- Modify: `components/gerencia-calls-section.tsx`
- Modify: `components/gerencia-section-cards.tsx`

- [ ] **Step 1: Extend `GerenciaCallsSection` props**

```ts
type Props = {
  data: CallsKpiData
  /** employee = Gerência (novos cards + click); overview = Diretoria (UI atual) */
  variant?: "employee" | "overview"
  from?: string
  to?: string
  employeeId?: string
  branchId?: string // omitir no bloco Geral
}
```

- [ ] **Step 2: Overview variant — keep current UI**

Se `variant !== "employee"`, renderizar o layout atual (Perdidas, Recebidas, Ranking Top 3, Televendas, Picos + gráficos). Sem navegação nova.

- [ ] **Step 3: Employee variant — new cards**

Grid (ajustar cols: 4 cards métrica + picos, ou 5 sem ranking):

1. **Total de ligações** → `summary.totalInbound.count` (geral; API ignora atendente)
2. **Atendidas** → `summary.received.count`
3. **Não atendidas** → `summary.lost.count`
4. Orç. Abertos Televendas (igual)
5. Picos por Horário (igual)

Remover card Ranking.

`onClick` (cursor-pointer) com `useRouter`:

```ts
import { buildCallsListSearchParams } from "@/lib/calls-list-query"

function openList(kind: CallsCardKind) {
  if (!from || !to) return
  const params = buildCallsListSearchParams({
    kind,
    from,
    to,
    employeeId: kind === "total" ? undefined : employeeId,
    branchId,
  })
  router.push(`/dashboard/ligacoes?${params}`)
}
```

Percentuais Atendidas/Não atendidas: sobre o total **do atendente** (`received.count + lost.count`), não sobre `totalInbound` geral (escopo misto da API).

Gráficos: manter.

- [ ] **Step 4: Wire props in `gerencia-section-cards.tsx`**

```tsx
<GerenciaCallsSection
  data={data.geral.calls}
  variant={mode === "employee" ? "employee" : "overview"}
  from={from}
  to={to}
  employeeId={selectedEmployee ? String(selectedEmployee.id) : undefined}
/>

<GerenciaCallsSection
  data={branchData.calls}
  variant={mode === "employee" ? "employee" : "overview"}
  from={from}
  to={to}
  employeeId={selectedEmployee ? String(selectedEmployee.id) : undefined}
  branchId={String(branch.id)}
/>
```

- [ ] **Step 5: Manual check list (dev)**

1. Gerência sem employee → empty state (inalterado).
2. Com employee → 3 cards novos, sem ranking; Total ≥ Atendidas+Não atendidas em cenários típicos.
3. Clique Total (Geral) → listagem inbound só com datas; `pagination.total` ≈ card.
4. Clique Atendidas (filial X) → `outcome=ANSWERED&employeeId&branchId`.
5. Diretoria → cards antigos + ranking.
6. Menu Ligações → página; export CSV com >100 rows se houver.

- [ ] **Step 6: Typecheck + commit**

```bash
git add components/gerencia-calls-section.tsx components/gerencia-section-cards.tsx
git commit -m "feat(gerencia): calls cards navigate to filtered ligacoes list"
```

---

### Task 6: Verificação final

- [ ] **Step 1: Run helper tests**

```bash
node --experimental-strip-types --test lib/calls-list-query.test.ts lib/calls-export.test.ts
```

Expected: PASS

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: exit 0

- [ ] **Step 3: Smoke against running API (if available)**

Confirmar drilldown `outcome=UNANSWERED` inclui answered fila-only (3 dígitos). Se summary e drilldown divergirem, anotar gap de backend — não reimplementar regra no client.

- [ ] **Step 4: Final commit only if leftover fixes**

---

## Out of scope (do not implement)

- Mudanças em Dashboard (`CallsSection`) ou ranking da Diretoria além de preservar UI overview
- Novo endpoint de summary
- Remover televendas/picos/gráficos
- PDF
