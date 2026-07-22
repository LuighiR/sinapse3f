# Design: Ligações na Gerência + listagem completa

## Contexto

Ligações hoje aparecem só como KPIs em Dashboard / Gerência / Diretoria. Na Gerência (`GerenciaCallsSection`), os cards usam `received` / `lost` / ranking Top 3; o clique não navega para listagem. A API já expõe `GET /kpis/calls/drilldown` e `GET /kpis/calls/filter-options` (`docs/api/rest-api.md`), mas o frontend não tem página nem client TS para esses endpoints.

Orçamentos e vendas já têm o padrão a portar: rota no menu, filtros via query params, tabela, export CSV e deep-link a partir dos cards.

## Objetivo

1. Na **Gerência apenas**: trocar os cards de ligações para **Total** (inbound geral no período), **Atendidas** e **Não atendidas** do atendente filtrado; remover o card de ranking.
2. Criar `/dashboard/ligacoes` (menu + deep-link dos cards) com filtros da central (`status`, `direction`, `outcome`, datas, atendente/ramal, etc.) e export CSV filtrado.
3. Tratar fila-only (destino 3 dígitos, sem extension de employee) como **não atendida**, alinhado ao `outcome` da API.

Dashboard e Diretoria permanecem intactos (incluindo ranking).

## Abordagens consideradas

### 1. Reaproveitar API atual + tela no padrão orçamentos/vendas (escolhida)

- Dois fetches de summary na Gerência (geral sem ramal + com ramal).
- Nova página com drilldown + filter-options.
- Cards → `router.push` com query params.

Prós: entrega rápida, alinhado ao contrato existente.  
Contras: dois requests de summary na Gerência.

### 2. Estender o summary da API

Endpoint devolve campos explícitos `totalInbound` / `answered` / `unanswered`.

Prós: UI com 1 request.  
Contras: mudança de backend + risco de regressão nos KPIs do Dashboard.

### 3. Métricas derivadas do drilldown

Prós: uma fonte.  
Contras: lento/frágil para KPI.

## Design escolhido

### Escopo por tela

| Tela | Mudança |
|------|---------|
| Gerência | Novos 3 cards; remove ranking; clique → listagem |
| Dashboard / Diretoria | Sem mudança |
| Nova `/dashboard/ligacoes` | Listagem + filtros + export + item no sidebar |

Sem atendente na Gerência: comportamento atual (não carrega / não mostra KPIs de ligações).

Mantém na Gerência: Orç. Abertos Televendas, Picos por Horário e gráficos.

### Cards na Gerência

**Contexto de filial:** a Gerência tem bloco Geral e blocos por filial. O `branchId` do card clicado (ou do fetch daquele bloco) **entra no deep-link** quando o card está numa filial; no Geral, **omite** `branchId` (tenant-wide no período). O fetch do Total e o do atendente usam o **mesmo** `branchId` do bloco, para a listagem bater com o KPI.

**Identidade do atendente (contrato único card ↔ listagem):**

- Preferir `employeeId=<employee.id>` em summary (Atendidas/Não atendidas) e no deep-link — alinhado a `rest-api.md` (`employeeId` resolve as extensões do funcionário).
- Migrar o filtro de calls da Gerência de `extensionUuid`/`extensionNumber` para `employeeId` neste fluxo, para paridade com o drilldown.
- Fallback só se `employee.id` estiver indisponível: `extensionUuid` + `extensionNumber` (comportamento legado); nesse caso o deep-link usa os mesmos params do summary.

| Card | Métrica | Fetch |
|------|---------|--------|
| Total de ligações | Inbound no período, **sem** filtro de atendente | `getCallsSummary` com `from`/`to` (+ `branchId` do bloco se houver) → `totalInbound.count` |
| Atendidas | Inbound atendidas do atendente | Summary com `employeeId` (+ `branchId` do bloco) → `received.count` |
| Não atendidas | Inbound não atendidas do atendente | Mesmo fetch → `lost.count` |

Regra de fila-only já embutida em `received` / `lost` / `outcome` na API:

- `answered` sem `extension_uuid` e destino com exatamente 3 dígitos → **não atendida** (`UNANSWERED` / `isLost`).
- Não usar booleans `isReceived` / `isLost` como filtros de URL ou UI; usar `direction` + `outcome` (e `status` bruto quando o usuário filtrar).

Clique:

| Card | Query em `/dashboard/ligacoes` |
|------|--------------------------------|
| Total | `from`, `to`, `direction=inbound`, + `branchId` se o card for de uma filial |
| Atendidas | `from`, `to`, `direction=inbound`, `outcome=ANSWERED`, `employeeId`, + `branchId` se filial |
| Não atendidas | idem com `outcome=UNANSWERED`, `employeeId`, + `branchId` se filial |

Falha em um dos summaries: estado de erro/toast no card afetado; não derrubar o restante da página.

### Página `/dashboard/ligacoes`

Espelhar `app/dashboard/orcamentos` / `vendas`:

- Rota e item **Ligações** no `app-sidebar` (junto às demais listagens).
- Query params como fonte de verdade dos filtros.
- Filtros de UI:
  - Período (`from` / `to`)
  - Atendente via seletor de employees → query `employeeId` (padrão canônico; não expor `extensionUuid`/`extensionNumber` na UI desta tela)
  - Filial (`branchId`)
  - `status` e `direction` populados por `GET /kpis/calls/filter-options`
  - `outcome`: `all` | `ANSWERED` | `UNANSWERED` | `UNCLASSIFIED`
  - Busca por número: campos `callerNumber` e/ou `destinationNumber` (contains) na barra de filtros
- Tabela paginada via `GET /kpis/calls/drilldown` (ordenar como a API: `startedAt DESC`; `pageSize` até 100).
- Colunas mínimas: data/hora, direção, status, outcome, origem, destino, ramal, atendente, duração, filial.
- Export CSV: **conjunto filtrado completo**, não só a página visível. Como o drilldown é paginado no servidor (`pageSize` máx. 100), o export varre todas as páginas com os mesmos filtros até esgotar `pagination.total`, depois monta o CSV (helper puro em `lib/`, no espírito de `budget-export`). Sem PDF.

Client em `lib/api.ts`:

- `getCallsDrilldown(opts)`
- `getCallsFilterOptions(opts)`

Tipos alinhados ao response documentado em `rest-api.md` (incluir `outcome`, `isReceived`, `isLost` na row para exibição se útil; filtros da UI não usam esses booleans).

### Fluxo de dados (Gerência)

```
[Employee selecionado + período + branchId do bloco?]
        │
        ├─► getCallsSummary(periodo[, branchId])                 → Total
        └─► getCallsSummary(periodo + employeeId[, branchId])    → Atendidas / Não atendidas
                                                                   (+ hourly / comparison / televendas
                                                                      com employeeId; sem ranking)

[Clique no card] → router.push(/dashboard/ligacoes?…&employeeId&branchId?)
```

Ajuste em `fetch-gerencia-kpis` / `GerenciaCallsSection` / tipos: **não buscar** ranking na Gerência; trocar `callsOpts` de ramal para `employeeId` neste fluxo.

### Fora de escopo

- Alterar cards, ranking ou drilldown dialogs do Dashboard / Diretoria.
- Novo endpoint de summary agregado.
- Remover televendas, picos ou gráficos da Gerência.
- Relatório PDF / impressão.

### Riscos e alinhamento API

Se `summary.received` / `lost` divergirem do `outcome` do drilldown para o mesmo filtro, priorizar o contrato documentado em `rest-api.md` e registrar gap de backend; o frontend não reimplementa a regra de 3 dígitos no client.

### Critérios de aceite

1. Gerência com atendente: 3 cards (Total geral inbound, Atendidas do atendente, Não atendidas do atendente); sem card de ranking.
2. Sem atendente: Gerência continua sem KPIs (como hoje).
3. Clique em cada card abre `/dashboard/ligacoes` com os query params corretos (`employeeId` + `branchId` quando aplicável); totais da listagem batem com o KPI do card.
4. Menu lateral leva à listagem; filtros usam status/direção/outcome/`employeeId` (não booleans de UI).
5. Export CSV varre todas as páginas do drilldown e respeita os filtros ativos.
6. Chamada answered só na fila (3 dígitos, sem extension de employee) aparece como não atendida / `UNANSWERED`.
7. Dashboard e Diretoria inalterados visual e comportamentalmente neste ciclo.
