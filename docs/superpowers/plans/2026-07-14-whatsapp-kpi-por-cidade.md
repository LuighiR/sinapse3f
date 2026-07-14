# WhatsApp KPI por cidade — Implementation Plan

> **For agentic workers:** Spec: `docs/superpowers/specs/2026-07-14-whatsapp-kpi-por-cidade-design.md`

**Goal:** Zona WhatsApp em Gerência/Diretoria usa `GET /whatsapp-cities` + filtro `whatsappCityId`; commerce/calls continuam por branches.

**Architecture:** Desacoplar fetch de WhatsApp do `fetchScopeKpis` (branches). Bundle ganha `whatsappCities` + `failedWhatsAppCityIds`. UI da zona WA renderiza Geral + cidades WA.

**Tech Stack:** TypeScript, Node test runner, Next.js client components

---

## File Structure

| File | Responsibility |
|------|----------------|
| `lib/api.ts` | `WhatsAppCity`, `getWhatsAppCities`, `KpiOpts.whatsappCityId` |
| `lib/gerencia-kpi-types.ts` | `WhatsAppCityKpiData` + bundle |
| `lib/fetch-gerencia-kpis.ts` | WA separado: geral + por city; sem `branchId` em WA |
| `lib/fetch-gerencia-kpis.test.mjs` | Asserts `whatsappCityId` / sem branch em WA |
| `components/gerencia-section-cards.tsx` | Zona WA por `whatsappCities` + toasts |

---

### Task 1: API client

- [ ] Tipo `WhatsAppCity` (`id`, `name`, `isActive?`)
- [ ] `getWhatsAppCities({ token, tenantId, activeOnly? })`
- [ ] `whatsappCityId` em `KpiOpts` + `kpiParams`

### Task 2: Fetch

- [ ] `whatsappOpts`: periodo + chatId? + whatsappCityId? (sem branchId)
- [ ] `fetchScopeKpis` não busca WA (usa empty) — evita lixo agregado / branchId em WA
- [ ] Carregar cities `activeOnly=true`; falha → `[]` + flag
- [ ] WA Geral + por city; employee passa `chatId`
- [ ] Retornar `whatsappCities`, `failedWhatsAppCityIds`, `whatsappCitiesLoadFailed`

### Task 3: UI

- [ ] Skeleton/render Geral + `data.whatsappCities`
- [ ] Toasts para listagem e cidades falhas

### Task 4: Testes

- [ ] Stub `/whatsapp-cities`
- [ ] Assert WA requests: geral sem cityId; city com `whatsappCityId`; sem `branchId` em `/kpis/whatsapp/`
- [ ] Typecheck
