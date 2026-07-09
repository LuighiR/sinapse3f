# Design: Aba Diretoria com filtro por employee

## Contexto

A pagina `app/dashboard/gerencia` mostra KPIs agregados da empresa e por filial (Geral + cidades), sem filtro de pessoa. A API ja documenta o fluxo correto para filtrar por pessoa em varias lojas via `GET /companies/current/employees` e o array `erpUsers` (`docs/api/rest-api.md`).

Hoje o tipo `Employee` no frontend (`lib/api.ts`) ainda expoe um `erpId` flat e nao modela `erpUsers[]`. As telas de Vendas/Orcamentos/Follow-up usam esse `erpId` unico, o que nao serve para a grade multi-loja da Gerencia.

## Objetivo

Criar uma nova aba **Diretoria** (`/dashboard/diretoria`) que reutiliza o padrao visual e de KPIs da Gerencia, com seletor obrigatorio de employee, e popula cada cidade com o `sellerId` (`erpId`) correspondente aquela filial.

Comportamento esperado (exemplo Joaozinho):

- Pelotas: KPIs do `erpId` dele em Pelotas
- Santa Maria: KPIs do `erpId` dele em Santa Maria
- Rio Grande (sem vinculo): zeros
- **Geral**: soma no frontend das filiais com vinculo

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

Atualizar `Employee` em `lib/api.ts` para refletir a API:

```ts
interface EmployeeErpUser {
  id: number
  erpId: number
  branchId: number
}

interface Employee {
  id: number
  name: string
  branchId: number
  extensionNumber: string | null
  extensionUuid: string | null
  chatId: string | null
  isNonCommercial?: boolean
  erpUsers: EmployeeErpUser[]
  /**
   * Legado: algumas telas (Vendas/Orcamentos/Follow-up/Dashboard) ainda leem erpId flat.
   * Manter como campo opcional de compat se o backend ainda enviar; a Diretoria NAO usa.
   * Preferir derivar de erpUsers[0]?.erpId apenas se alguma tela legada quebrar.
   */
  erpId?: number
}
```

Seletor da Diretoria: listar **todos** os employees retornados por `getEmployees` (sem filtrar `isNonCommercial`), igual as outras paginas hoje.

Resolucao por filial:

```ts
const sellerIdForBranch = employee.erpUsers.find((u) => u.branchId === branchId)?.erpId
```

Nao usar `employee.branchId` (residencia) como filtro de KPI por loja.

### Fetch

Estender `fetchGerenciaKpis` (ou extrair helper compartilhado) com modo opcional de employee:

1. Carregar `branches` via `getBranches`
2. Se nao houver employee → nao buscar KPIs (UI empty state)
3. Para cada branch:
   - Com vinculo: `fetchScopeKpis({ branchId, sellerId, ... })` + ramal/`chatId` conforme abaixo
   - Sem vinculo: `CityKpiData` **inteiro** zerado (budgets, sales, follow-up, **calls e whatsapp**), sem chamar a API — mesmo que o employee tenha ramal/`chatId` global
4. Calls (so filiais com vinculo): passar `extensionUuid` / `extensionNumber` do employee (`sellerId` nao filtra ligacoes)
5. WhatsApp (so filiais com vinculo): passar `chatId` onde aplicavel; `sellerId` apenas onde a API ja usa (ex. tags/comparison)
6. **Geral**: agregar no frontend **apenas** filiais com vinculo, com as regras abaixo

Nao chamar a API "sem branchId + um sellerId unico" para o Geral — isso misturaria ERP de outra loja.

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
- Sales `averageDaily` = totais do periodo / numero de dias do periodo (`from`→`to`, inclusive), mesma regra conceitual da API
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
- Falha em uma filial → toast; demais continuam; Geral soma so o que veio ok
- Refresh: mesmo fluxo da Gerencia, restrito a employee selecionado

## Impacto Tecnico

Arquivos principais:

- `components/app-sidebar.tsx` — item Diretoria
- `app/dashboard/diretoria/page.tsx` — nova pagina
- `components/gerencia-section-cards.tsx` — extrair nucleo reutilizavel / modo employee
- `lib/fetch-gerencia-kpis.ts` — modo employee + zeros + agregacao Geral
- `lib/gerencia-kpi-types.ts` — tipos auxiliares se necessario
- `lib/api.ts` — tipo `Employee` com `erpUsers`

Telas legadas (Vendas/Orcamentos/Follow-up/Dashboard) podem continuar usando `erpId` flat se ainda existir no payload; a Diretoria usa exclusivamente `erpUsers`.

## Fora de Escopo

- Alterar comportamento da Gerencia (sem filtro de employee)
- Novos endpoints no backend
- Filtro por branch na Diretoria
- Refatorar filtro de employee das outras paginas para multi-loja

## Criterios de Aceite

1. Sidebar mostra Diretoria abaixo de Gerencia
2. Sem employee: empty state, zero requests de KPI
3. Com employee: cada cidade usa o `erpId` correto daquela filial
4. Filial sem vinculo: zeros, sem request com sellerId errado
5. Geral = soma das filiais com vinculo
6. Gerencia continua funcionando sem regressao visual/funcional
