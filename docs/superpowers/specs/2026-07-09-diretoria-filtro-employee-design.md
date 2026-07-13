# Design: Aba Diretoria com filtro por employee

## Contexto

A pagina `app/dashboard/gerencia` mostra KPIs agregados da empresa e por filial (Geral + cidades), sem filtro de pessoa. A API (`docs/api/rest-api.md`) modela employee com `erpId` flat + `branchId` de residencia/trabalho (um employee ↔ uma filial).

## Objetivo

Criar uma nova aba **Diretoria** (`/dashboard/diretoria`) que reutiliza o padrao visual e de KPIs da Gerencia, com seletor obrigatorio de employee, e popula **todas as filiais cadastradas** com `sellerId = employee.erpId` (mesmo ERP em cada `branchId`).

`employee.branchId` e apenas a filial principal/residencia — a pessoa pode vender em outras lojas com o mesmo `erpId`.

Comportamento esperado (exemplo Shaiane, `branchId` principal=2, `erpId=42754`):

- Pelotas (`branchId=2`): KPIs com `sellerId=42754`
- Santa Maria / Rio Grande / demais: tambem com `sellerId=42754` (API devolve 0 se nao houver movimento)
- **Geral**: soma no frontend das filiais

Sem employee selecionado: empty state pedindo selecao (nao carrega KPIs).

Gerencia permanece intacta (sem filtro de employee).

## Abordagens Consideradas

### 1. Clonar Gerencia → Diretoria

Copiar page + fetch + cards e adicionar filtro.

- Pro: entrega rapida, Gerencia intacta
- Contra: duplicacao de UI; correcoes em dois lugares

### 2. Extrair nucleo compartilhado + modo Diretoria (escolhida)

Extrair fetch/UI reutilizavel da Gerencia; Diretoria chama o mesmo nucleo com `employeeId` obrigatorio e resolucao `erpUsers` por filial.

- Pro: um lugar para cards/layout; alinhado a doc da API
- Contra: refactor leve na Gerencia

### 3. So fetch novo, UI 100% duplicada

- Pro: isolamento total
- Contra: UI e logica separadas sem ganho

## Design Escolhido

### Navegacao

- Nova rota: `/dashboard/diretoria`
- Item **Diretoria** no `app-sidebar`, imediatamente abaixo de Gerencia
- Header da pagina: titulo "Diretoria"

### Modelo de dados (frontend)

`Employee` alinhado a API (flat):

```ts
interface Employee {
  id: number
  name: string
  branchId: number
  extensionNumber: string | null
  extensionUuid: string | null
  chatId: string | null
  isNonCommercial?: boolean
  erpId: number // sellerId nas rotas de budgets/sales
}
```

`getEmployees` normaliza `erpId` com default `0` se ausente.

Seletor da Diretoria: listar **todos** os employees (sem filtrar `isNonCommercial`).

Resolucao por filial:

```ts
// mesmo erpId em todas as lojas; branchId do employee e so a principal
const sellerIdForBranch = employee.erpId || undefined
```

**Employee com `erpId` 0:** permitir selecao; todas as cidades e Geral em zero; sem requests de KPI.

### Fetch

Estender `fetchGerenciaKpis` com modo opcional de employee:

1. Carregar `branches` via `getBranches`
2. Se nao houver employee → nao buscar KPIs (UI empty state)
3. Para **cada** branch cadastrada: `fetchScopeKpis({ branchId, sellerId: erpId, ... })`
4. Calls: `extensionUuid` / `extensionNumber` (sem `sellerId`)
5. WhatsApp: `chatId`; `sellerId` so em tags/comparison
6. **Geral**: agregar no frontend todas as filiais com sucesso

Filtros de dominio isolados: commerce nao recebe ramal/chatId; calls nao recebe sellerId; falha em calls/WA nao zera budgets/sales.

### Regras de agregacao do Geral

Entrada: lista de `CityKpiData` das filiais **com vinculo** (ignorar zeros de filiais sem vinculo).

**Somar (counts / values numericos ou string-numericos):**

- Budgets: `total|open|won|lost` → `count` e `value`
- Sales: `total|active|canceled` → `count` e `value`; idem `salesWithBudget.active` / `salesWithoutBudget.active`
- Follow-up: em `within24h` e `after24h`, somar `total|converted|lost|open` → `count` e `value`; somar tambem `followUp.total`
- Calls summary: somar campos de contagem do summary (ex. totalInbound, received, lost, …)
- WhatsApp summary: somar campos de contagem do summary
- Series horarias (calls hourly, calls comparison, WA sessions/messages hourly, tagComparison): **merge por chave de hora** somando counts/values da mesma hora

**Recalcular a partir dos totais somados (nunca somar o campo derivado):**

- Follow-up `percentage` = `(parte.count / grupo.total.count) * 100` (string com mesma precisao da UI atual, tipicamente 1 casa)
- Sales `averageTicket.value` = `total.value / total.count` (0 se count=0)
- Sales `averageDaily` = totais do periodo / numero de dias do periodo (`from`→`to`, inclusive no calendario America/Sao_Paulo); espelhar a mesma regra de dias usada pela API/Gerencia no codigo existente, sem inventar formula nova
- Calls `peakHour` = hora com maior `totalInboundCount` na serie horaria ja mergeada

**Rankings (calls agents / WhatsApp agents):**

- Merge por identidade do agente (mesmo id/nome/ramal conforme o row da API)
- Somar metricas numericas do row
- Reordenar por a metrica principal que a UI ja usa no top-3
- Se nao houver chave estavel entre filiais, concatenar rows e deixar a UI cortar top-3 (aceitavel; preferir merge quando a chave existir)

**Periodo:**

- `period` do Geral = `{ from, to, key: `${from}_${to}` }` do request (nao misturar periods das filiais)

**tagComparison:**

- So agregar rows se todas as filiais com vinculo usarem o **mesmo** `tagId`; caso contrario, Geral fica com `tagComparison.rows = []` e `tagId` vazio (UI mostra vazio, sem inventar mix de tags)

### UI

- Shell igual a Gerencia (sidebar, layout, zonas: Orcamentos, Follow-up, Vendas, Ligacoes, WhatsApp)
- Seletor de mes (igual Gerencia)
- Select de employee obrigatorio (padrao visual de Vendas/Orcamentos)
- Sem selecao: empty state central ("Selecione um colaborador"), sem skeleton de KPIs
- Com selecao: secoes Geral → todas as cidades (filiais sem vinculo mostram zeros)
- Botao "Atualizar KPIs" so ativo com employee selecionado

### Erros

- Falha ao listar employees → toast + empty
- Falha em uma filial → toast; essa cidade mostra `CityKpiData` zerado (nao some da UI); demais filiais ok continuam; Geral soma so filiais com vinculo que retornaram com sucesso
- Refresh: espelha a Gerencia — chama `refreshBudgets` / `refreshSales` / `refreshCalls` com `token`, `tenantId`, `from`, `to` (sem `sellerId` / `branchId`, igual ao codigo atual da Gerencia); depois refetch dos KPIs da Diretoria no modo employee. Botao desabilitado sem employee selecionado.

## Impacto Tecnico

Arquivos principais:

- `components/app-sidebar.tsx` — item Diretoria
- `app/dashboard/diretoria/page.tsx` — nova pagina
- `components/gerencia-section-cards.tsx` — extrair nucleo reutilizavel / modo employee
- `lib/fetch-gerencia-kpis.ts` — modo employee + zeros + agregacao Geral
- `lib/gerencia-kpi-types.ts` — tipos auxiliares se necessario
- `lib/api.ts` — tipo `Employee` flat (`erpId` + `branchId`)

Telas legadas (Vendas/Orcamentos/Follow-up/Dashboard) continuam usando `employee.erpId`.

## Fora de Escopo

- Alterar comportamento da Gerencia (sem filtro de employee)
- Novos endpoints no backend
- Filtro por branch na Diretoria (alem do branch do employee)
- Multi-loja por pessoa (`erpUsers`) — revertido na API

## Criterios de Aceite

1. Sidebar mostra Diretoria abaixo de Gerencia
2. Sem employee: empty state, zero requests de KPI
3. Com employee: **todas** as filiais usam `sellerId = erpId`
4. Filial sem movimento: API/zeros na UI (request ainda e feito)
5. Employee com `erpId` 0: todas as cidades e Geral em zero, sem requests de KPI
6. Geral = soma das filiais com sucesso
7. `getEmployees` garante `erpId` number para telas legadas
8. Gerencia continua funcionando sem regressao visual/funcional
9. Falha em calls/WhatsApp nao zera budgets/sales da filial
