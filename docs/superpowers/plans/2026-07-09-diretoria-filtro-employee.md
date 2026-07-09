# Diretoria Filtro Employee Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a aba Diretoria (`/dashboard/diretoria`) espelhando a Gerencia, com seletor obrigatorio de employee e KPIs por cidade usando o `erpId` correto de cada filial via `erpUsers`, com Geral = soma das filiais com vinculo.

**Architecture:** Extrair helpers puros (normalizacao de Employee, CityKpi zerado, agregacao do Geral) testaveis com Node test runner; estender `fetchGerenciaKpis` com modo employee; reutilizar a UI da Gerencia via props (`mode: "gerencia" | "diretoria"`) em vez de duplicar cards. Sidebar ganha item Diretoria; pagina nova so monta o shell.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Node test runner (`node --experimental-strip-types --test`), shadcn/ui Select, date-fns

**Spec:** `docs/superpowers/specs/2026-07-09-diretoria-filtro-employee-design.md`

---

## File Structure

| File | Responsibility |
|------|----------------|
| `lib/api.ts` | Tipo `Employee` + `EmployeeErpUser`; `getEmployees` normaliza `erpUsers`/`erpId` |
| `lib/normalize-employee.ts` | Helper puro de normalizacao (testavel) |
| `lib/normalize-employee.test.mjs` | Testes do shim |
| `lib/empty-city-kpi.ts` | Factory de `CityKpiData` zerado |
| `lib/empty-city-kpi.test.mjs` | Testes do zero |
| `lib/aggregate-city-kpis.ts` | Agregacao do Geral (soma + recalculos) |
| `lib/aggregate-city-kpis.test.mjs` | Testes de agregacao |
| `lib/fetch-gerencia-kpis.ts` | Modo employee: sellerId por branch, zeros, Geral agregado |
| `lib/fetch-gerencia-kpis.test.mjs` | Testes do fetch mode (mock fetch/API) |
| `components/gerencia-section-cards.tsx` | Aceitar `mode` + seletor employee na Diretoria |
| `app/dashboard/diretoria/page.tsx` | Nova pagina shell |
| `components/app-sidebar.tsx` | Nav item Diretoria |

---

### Task 1: Normalizar Employee (`erpUsers` + shim `erpId`)

**Files:**
- Create: `lib/normalize-employee.ts`
- Create: `lib/normalize-employee.test.mjs`
- Modify: `lib/api.ts`

- [ ] **Step 1: Write the failing test**

Criar `lib/normalize-employee.test.mjs`:

```js
import test from "node:test"
import assert from "node:assert/strict"
import { normalizeEmployee } from "./normalize-employee.ts"

test("fills erpId from erpUsers[0] when flat erpId missing", () => {
  const emp = normalizeEmployee({
    id: 1,
    name: "Joao",
    branchId: 1,
    extensionNumber: null,
    extensionUuid: null,
    chatId: null,
    erpUsers: [{ id: 10, erpId: 111, branchId: 1 }],
  })
  assert.equal(emp.erpId, 111)
  assert.equal(emp.erpUsers.length, 1)
})

test("keeps flat erpId when present", () => {
  const emp = normalizeEmployee({
    id: 1,
    name: "Joao",
    branchId: 1,
    extensionNumber: null,
    extensionUuid: null,
    chatId: null,
    erpId: 999,
    erpUsers: [{ id: 10, erpId: 111, branchId: 1 }],
  })
  assert.equal(emp.erpId, 999)
})

test("defaults erpUsers to [] and erpId to 0", () => {
  const emp = normalizeEmployee({
    id: 1,
    name: "Joao",
    branchId: 1,
    extensionNumber: null,
    extensionUuid: null,
    chatId: null,
  })
  assert.deepEqual(emp.erpUsers, [])
  assert.equal(emp.erpId, 0)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test lib/normalize-employee.test.mjs`  
Expected: FAIL (module not found)

- [ ] **Step 3: Implement normalize + update api types**

`lib/normalize-employee.ts`:

```ts
export interface EmployeeErpUser {
  id: number
  erpId: number
  branchId: number
}

export interface EmployeeLike {
  id: number
  name: string
  branchId: number
  extensionNumber: string | null
  extensionUuid: string | null
  chatId: string | null
  isNonCommercial?: boolean
  erpUsers?: EmployeeErpUser[]
  erpId?: number
}

export interface NormalizedEmployee {
  id: number
  name: string
  branchId: number
  extensionNumber: string | null
  extensionUuid: string | null
  chatId: string | null
  isNonCommercial?: boolean
  erpUsers: EmployeeErpUser[]
  erpId: number
}

export function normalizeEmployee(raw: EmployeeLike): NormalizedEmployee {
  const erpUsers = Array.isArray(raw.erpUsers) ? raw.erpUsers : []
  const erpId = raw.erpId ?? erpUsers[0]?.erpId ?? 0
  return { ...raw, erpUsers, erpId }
}

export function sellerIdForBranch(
  employee: Pick<NormalizedEmployee, "erpUsers">,
  branchId: number,
): number | undefined {
  return employee.erpUsers.find((u) => u.branchId === branchId)?.erpId
}
```

Em `lib/api.ts`:
- Importar/reexportar tipos ou alinhar `Employee` com `NormalizedEmployee` (incluir `erpUsers`, manter `erpId: number`)
- Em `getEmployees`, apos o `api<>`, mapear com `normalizeEmployee`

```ts
export async function getEmployees(opts: { token: string; tenantId: string }) {
  const rows = await api<EmployeeLike[]>("/companies/current/employees", {
    token: opts.token,
    tenantId: opts.tenantId,
  })
  return rows.map(normalizeEmployee)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test lib/normalize-employee.test.mjs`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/normalize-employee.ts lib/normalize-employee.test.mjs lib/api.ts
git commit -m "feat: normalize employees with erpUsers and erpId shim"
```

---

### Task 2: Factory de CityKpi zerado

**Files:**
- Create: `lib/empty-city-kpi.ts`
- Create: `lib/empty-city-kpi.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
import test from "node:test"
import assert from "node:assert/strict"
import { emptyCityKpi } from "./empty-city-kpi.ts"

test("emptyCityKpi zeros budgets sales followUp calls whatsapp", () => {
  const data = emptyCityKpi("2026-07-01", "2026-07-31")
  assert.equal(data.budgets.total.count, 0)
  assert.equal(data.budgets.total.value, "0")
  assert.equal(data.sales.active.count, 0)
  assert.equal(data.followUp.within24h.converted.percentage, "0")
  assert.equal(data.calls.summary.totalInbound.count, 0)
  assert.equal(data.calls.hourly.rows.length, 0)
  assert.equal(data.whatsapp.summary.totalConversations.count, 0)
  assert.equal(data.whatsapp.tagComparison.tagId, "")
  assert.equal(data.budgets.period.from, "2026-07-01")
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test lib/empty-city-kpi.test.mjs`  
Expected: FAIL

- [ ] **Step 3: Implement `emptyCityKpi(from, to): CityKpiData`**

Usar `period = { from, to, key: \`${from}_${to}\` }`. Zerar todos os campos de `CityKpiData` / `CallsKpiData` / `WhatsAppKpiData` (arrays vazios em series/rankings).

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test lib/empty-city-kpi.test.mjs`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/empty-city-kpi.ts lib/empty-city-kpi.test.mjs
git commit -m "feat: add empty CityKpiData factory for Diretoria zeros"
```

---

### Task 3: Agregar CityKpis para o Geral

**Files:**
- Create: `lib/aggregate-city-kpis.ts`
- Create: `lib/aggregate-city-kpis.test.mjs`

- [ ] **Step 1: Write the failing tests**

Cobrir no minimo:

1. Soma budgets/sales counts+values de 2 filiais
2. Recalcula follow-up percentage a partir dos totais
3. Recalcula averageTicket = total.value / total.count
4. Merge hourly rows pela hora
5. tagComparison: mesmo tagId → merge; tagIds diferentes → rows vazias
6. Lista vazia → retorna `emptyCityKpi(from, to)`
7. averageDaily: dias inclusivos `from`→`to` (ex. 2026-07-01 a 2026-07-02 = 2 dias)

Exemplo minimo:

```js
test("sums budget totals across branches", () => {
  const a = emptyCityKpi("2026-07-01", "2026-07-02")
  a.budgets.total = { count: 2, value: "100" }
  const b = emptyCityKpi("2026-07-01", "2026-07-02")
  b.budgets.total = { count: 3, value: "50" }
  const g = aggregateCityKpis([a, b], "2026-07-01", "2026-07-02")
  assert.equal(g.budgets.total.count, 5)
  assert.equal(g.budgets.total.value, "150")
})
```

Helpers internos sugeridos: `sumMoney(a,b)`, `pct(part, total)` com `toFixed(1)` (mesma precisao tipica da UI), `daysInclusive(from,to)`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test lib/aggregate-city-kpis.test.mjs`  
Expected: FAIL

- [ ] **Step 3: Implement `aggregateCityKpis(cities, from, to): CityKpiData`**

Seguir a secao **Regras de agregacao do Geral** do spec:

- Somar counts/values
- Recalcular percentages, averageTicket, averageDaily, peakHour
- Rankings: merge por `agentKey` (calls) / `agentKey` (whatsapp); somar metricas; sort desc pela metrica do top-3 da UI (`totalInboundCount` / `sessionsCount`)
- tagComparison so se todos os `tagId` iguais e nao vazios

Para `value` string: parse float, somar, serializar de volta (preferir string sem notacao cientifica; se API usa decimais, manter `String(sum)` ou toFixed coerente com inputs).

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --experimental-strip-types --test lib/aggregate-city-kpis.test.mjs`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/aggregate-city-kpis.ts lib/aggregate-city-kpis.test.mjs
git commit -m "feat: aggregate multi-branch CityKpiData for Diretoria Geral"
```

---

### Task 4: Estender `fetchGerenciaKpis` com modo employee

**Files:**
- Modify: `lib/fetch-gerencia-kpis.ts`
- Create: `lib/fetch-gerencia-kpis.test.mjs`

- [ ] **Step 1: Write the failing test**

Mockar `getBranches` e `fetchScopeKpis` (ou o modulo `api`) via injecao **ou** testar uma funcao exportada pura `buildDiretoriaBranchPlan(employee, branches)` + integrar fetch com mocks de `globalThis.fetch` se necessario.

Preferencia YAGNI: exportar helper puro testavel:

```ts
export function planDiretoriaBranches(
  employee: { erpUsers: { erpId: number; branchId: number }[] },
  branches: { id: number; name: string; clientId: string }[],
): { branchId: number; sellerId?: number; skipFetch: boolean }[]
```

Testes:

- Joaozinho com erpUsers em branch 1 e 2, branches 1/2/3 → branch 3 `skipFetch: true`
- erpUsers vazio → todos `skipFetch: true`

E um teste de integracao leve de `fetchGerenciaKpis` com employee: stubbing fetch para garantir que URLs de KPI incluem `sellerId` correto por `branchId` e que branch sem vinculo nao gera request.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test lib/fetch-gerencia-kpis.test.mjs`  
Expected: FAIL

- [ ] **Step 3: Implement modo employee em `fetchGerenciaKpis`**

Assinatura:

```ts
export type FetchGerenciaKpisResult = GerenciaKpiBundle & {
  /** branchIds com vinculo ERP cuja request de KPI falhou (cidade veio zerada) */
  failedBranchIds: number[]
}

export async function fetchGerenciaKpis(opts: {
  token: string
  tenantId: string
  from: string
  to: string
  employee?: NormalizedEmployee | null
}): Promise<FetchGerenciaKpisResult>
```

No modo Gerencia (sem employee), retornar `failedBranchIds: []` (ou so falhar o Promise inteiro como hoje — manter comportamento atual de throw global se preferir; se mudar para allSettled na Gerencia, fora de escopo — **nao** alterar Gerencia).

Comportamento:

1. Sem `employee` (modo Gerencia): comportamento atual (Geral sem branchId + cada branch so com branchId); `failedBranchIds: []`
2. Com `employee`:
   - Nao chamar KPI "geral" na API
   - Para cada branch: se `sellerIdForBranch` existe → `fetchScopeKpis` com `{ branchId: String(branch.id), sellerId: String(erpId), extensionUuid?, extensionNumber?, chatId? }` (`KpiOpts` tipa ids como `string`); senao → `emptyCityKpi` (nao conta como failed)
   - Usar `Promise.allSettled` nas filiais com vinculo: rejected → `emptyCityKpi` + incluir `branch.id` em `failedBranchIds`
   - `geral = aggregateCityKpis(successfulLinkedCities, from, to)` — **excluir** filiais em `failedBranchIds` e as sem vinculo
   - Incluir **todas** as branches na lista `branches` (com zeros onde skip ou failed)

Passar ramal/`chatId` so nas filiais com vinculo ERP.

- [ ] **Step 4: Run tests**

Run: `node --experimental-strip-types --test lib/fetch-gerencia-kpis.test.mjs lib/aggregate-city-kpis.test.mjs lib/empty-city-kpi.test.mjs`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/fetch-gerencia-kpis.ts lib/fetch-gerencia-kpis.test.mjs
git commit -m "feat: fetch Gerencia KPIs filtered by employee erpUsers per branch"
```

---

### Task 5: UI compartilhada — modo Diretoria no `GerenciaSectionCards`

**Files:**
- Modify: `components/gerencia-section-cards.tsx`

- [ ] **Step 1: Adicionar props**

```tsx
type GerenciaSectionCardsProps = {
  mode?: "gerencia" | "diretoria"
}

export function GerenciaSectionCards({ mode = "gerencia" }: GerenciaSectionCardsProps) {
```

Estado `data` tipado como `FetchGerenciaKpisResult | null` (inclui `failedBranchIds`), nao so `GerenciaKpiBundle`.

- [ ] **Step 2: Estado employee (so diretoria)**

- `selectedEmployeeId`, `employees`
- `useEffect` → `getEmployees` quando `mode === "diretoria"` e session ok
- Listar **todos** os employees retornados (sem filtrar `isNonCommercial`)
- Em falha de `getEmployees`: `toast.error("Erro ao carregar colaboradores")`, `setEmployees([])`, manter empty state
- Select no toolbar (ao lado do mes), **sem** opcao "Todos" — placeholder "Selecione um colaborador"
- Padrao visual: mesmo `Select` de `components/section-cards.tsx` (largura ~220px)

- [ ] **Step 3: Fetch condicional + toasts de filial**

- `mode === "gerencia"`: fetch atual (sempre); ignorar `failedBranchIds`
- `mode === "diretoria"`:
  - sem employee → `setData(null)`, `setLoading(false)`, nao chamar KPIs
  - com employee → `const result = await fetchGerenciaKpis({ ..., employee: selected })` → `setData(result)`
  - Se `result.failedBranchIds.length > 0`: para cada id (ou um toast agregado), `toast.error` com o nome da filial (`result.branches.find(b => b.branch.id === id)?.branch.name`) — ex. `"Erro ao carregar KPIs de ${name}"`. Cidade ja vem zerada no bundle; Geral nao inclui essas filiais.

- [ ] **Step 4: Empty state**

Se `mode === "diretoria" && !selectedEmployeeId`:

```tsx
<div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
  <p className="text-sm text-muted-foreground">
    Selecione um colaborador para ver os KPIs por cidade.
  </p>
</div>
```

Nao renderizar skeletons de zonas nesse estado.

- [ ] **Step 5: Refresh**

Desabilitar botao se `mode === "diretoria" && !selectedEmployeeId`.  
Refresh continua chamando `refreshBudgets/Sales/Calls` so com periodo (igual Gerencia); depois refetch com employee.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`  
Expected: exit 0

- [ ] **Step 7: Commit**

```bash
git add components/gerencia-section-cards.tsx
git commit -m "feat: add Diretoria mode with required employee filter to Gerencia cards"
```

---

### Task 6: Pagina Diretoria + sidebar

**Files:**
- Create: `app/dashboard/diretoria/page.tsx`
- Modify: `components/app-sidebar.tsx`

- [ ] **Step 1: Criar pagina**

Copiar `app/dashboard/gerencia/page.tsx`, trocar:

- titulo `SiteHeader` → `"Diretoria"`
- `<GerenciaSectionCards mode="diretoria" />`

- [ ] **Step 2: Sidebar**

Em `navMain`, apos Gerencia:

```ts
{
  title: "Diretoria",
  url: "/dashboard/diretoria",
  icon: <Building2Icon />, // ou outro icone ja importado (ex. UsersIcon se preferir); YAGNI: reusar Building2Icon ou importar BriefcaseIcon/UsersIcon do lucide
},
```

Preferir icone distinto se ja houver no projeto (ex. `UsersIcon`); senao `Building2Icon` ok.

- [ ] **Step 3: Verificar Gerencia intacta**

`app/dashboard/gerencia/page.tsx` continua com `<GerenciaSectionCards />` (default gerencia).

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`  
Expected: exit 0

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/diretoria/page.tsx components/app-sidebar.tsx
git commit -m "feat: add Diretoria dashboard route and sidebar entry"
```

---

### Task 7: Verificacao final

**Files:**
- Verify all touched files

- [ ] **Step 1: Run all related tests**

Run:

```bash
node --experimental-strip-types --test lib/normalize-employee.test.mjs lib/empty-city-kpi.test.mjs lib/aggregate-city-kpis.test.mjs lib/fetch-gerencia-kpis.test.mjs
```

Expected: PASS

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`  
Expected: exit 0

- [ ] **Step 3: Smoke manual checklist**

1. Sidebar: Diretoria abaixo de Gerencia
2. Abrir Diretoria sem employee → empty state, Network sem KPI
3. Selecionar employee com 2 filiais → Geral + cidades; cidade sem vinculo = 0
4. Employee com `erpUsers` vazio → todas cidades/Geral zerados, sem requests de KPI por filial
5. Abrir Gerencia → ainda carrega sem seletor de employee
6. Vendas ainda lista employees (shim erpId)

- [ ] **Step 4: Final commit se houver ajustes**

```bash
git add -A
git commit -m "chore: polish Diretoria employee filter after verification"
```

(so se houver diff)

---

## Notes for implementer

- Nao refatorar Vendas/Orcamentos para multi-loja neste plano
- Nao alterar comportamento default da Gerencia
- Nao criar endpoints novos
- Seguir TDD nas Tasks 1–4; Tasks 5–6 sao UI (typecheck + smoke)
- Spec de agregacao e a fonte da verdade se houver duvida em campos derivados
