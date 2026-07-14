# Design: WhatsApp KPI por cidade (`whatsappCityId`)

## Contexto

Nas telas Gerência / Diretoria, a zona de WhatsApp hoje reusa as seções por `core.branches` e envia `branchId` nos KPIs. A API documenta que `branchId` em WhatsApp é **ignorado**. O filtro efetivo de cidade é `whatsappCityId` (uuid), sobre o cadastro tenant-scoped `GET /whatsapp-cities`, independente de branches (`docs/api/rest-api.md` — WhatsApp Cities + WhatsApp KPI).

O efeito de `whatsappCityId` existe no path **canônico** (`WHATSAPP_KPI_SOURCE=canonical`). Em `legacy`, a coluna não existe.

## Objetivo

Dividir a zona WhatsApp por **cidades WhatsApp** (`GET /whatsapp-cities?activeOnly=true`), filtrando cada bloco com `whatsappCityId`.

- **Geral** WhatsApp: consolidado **sem** `whatsappCityId`
- **Por cidade**: uma subseção por cidade ativa
- **Gerência** (modo employee): cada cidade com `whatsappCityId` + `chatId` do employee
- **Diretoria** (overview): cidades só com `whatsappCityId` (sem chatId)
- Orçamentos / vendas / follow-up / calls: **inalterados** (continuam por `branches`)

## Abordagens consideradas

### 1. Desacoplar só o WhatsApp no fetch (escolhida)

WhatsApp usa `/whatsapp-cities`; demais KPIs usam `/branches`.

### 2. Casar nomes city ≈ branch

Frágil; cadastros são independentes na doc.

### 3. Novo endpoint agregado

YAGNI.

## Design escolhido

### API client (`lib/api.ts`)

- Tipo `WhatsAppCity` alinhado ao payload de `GET /whatsapp-cities` (no mínimo `id: string`, `name: string`, `isActive?: boolean`; demais campos se vierem no JSON)
- `getWhatsAppCities({ token, tenantId, activeOnly?: boolean })`
- `KpiOpts.whatsappCityId?: string` e inclusão em `kpiParams`

### Tipos (`lib/gerencia-kpi-types.ts`)

```ts
export interface WhatsAppCityKpiData {
  city: WhatsAppCity
  data: WhatsAppKpiData
}

export interface GerenciaKpiBundle {
  geral: CityKpiData
  branches: BranchKpiData[]
  whatsappCities: WhatsAppCityKpiData[]
}
```

`geral.whatsapp` continua sendo o consolidado (sem city). Os `branchData.whatsapp` por filial podem permanecer zerados / não usados na UI da zona WhatsApp (não quebrar shape de `CityKpiData`).

### Fetch (`lib/fetch-gerencia-kpis.ts`)

1. Carregar branches (como hoje) para commerce/calls
2. Carregar `getWhatsAppCities({ activeOnly: true })`
3. WhatsApp Geral: `fetchWhatsAppSection` sem `whatsappCityId` (com `chatId` se employee)
4. Para cada cidade: `fetchWhatsAppSection` com `whatsappCityId` (+ `chatId` se employee); **não** enviar `branchId` nos opts de WhatsApp
5. Falha ao listar cities → `whatsappCities: []` + sinalização para toast na UI (ou throw parcial tratado no caller)
6. Falha em uma cidade → empty WhatsApp para essa cidade; demais ok

`whatsappOpts` passa a:

- periodo + `chatId?` + `whatsappCityId?`
- sem `branchId`

Tag comparison: manter comportamento atual; passar `whatsappCityId` no opts se o client já propaga via `kpiParams` (tags ainda legado — se a API ignorar city, aceitável).

### UI (`components/gerencia-section-cards.tsx`)

Zona WhatsApp:

- Skeleton: Geral + uma skeleton por city (quando lista já conhecida) ou só Geral enquanto cities carregam junto do bundle
- Render: Geral + `data.whatsappCities.map(({ city, data }) => subsection title=city.name)`

Outras zonas: inalteradas (`data.branches`).

### Erros

- Toast se falhar `getWhatsAppCities`
- Toast opcional por cidade falha (ou silencioso com zeros — preferir toast agregado / por cidade como já fazemos com `failedBranchIds`)
- Falha WhatsApp não zera budgets/sales/calls (já isolado hoje)

## Fora de escopo

- CRUD de whatsapp-cities / department-mappings no front
- Ligar `whatsappCityId` a `branch.id`
- Mudar source legacy → canonical no backend
- Refatorar `WhatsAppSection` do Dashboard principal (só Gerência/Diretoria neste spec), salvo se compartilhar helpers de fetch

## Critérios de aceite

1. Zona WhatsApp Geral = consolidado sem `whatsappCityId`
2. Uma subseção por cidade ativa de `/whatsapp-cities`
3. Requests por cidade incluem `whatsappCityId=<uuid>`
4. Gerência: city + `chatId` do employee
5. Branches só em orçamentos/vendas/calls/follow-up
6. Falha de cities/cidade não zera o restante do dashboard
7. Typecheck + testes do fetch/plan cobrindo opts de WhatsApp por city
