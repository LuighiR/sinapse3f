# Orcamentos Exportacao Filtrada Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar exportacao CSV na tela de orcamentos respeitando todos os filtros ativos, incluindo a busca textual local, sem limitar o arquivo a pagina atual.

**Architecture:** A pagina continuara buscando os dados com os filtros de backend ja existentes e aplicando a busca textual local em memoria. A exportacao sera feita no frontend a partir da colecao `filtered`, usando um helper puro em `lib/` para montar o CSV e um handler na pagina para disparar o download.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Node test runner, shadcn/ui

---

### Task 1: Criar testes para o helper de exportacao

**Files:**
- Create: `lib/budget-export.test.ts`
- Create: `lib/budget-export.ts`

- [ ] **Step 1: Write the failing test**

Criar teste para:

- gerar cabecalho e todas as linhas recebidas
- escapar aspas e delimitadores
- gerar nome de arquivo com periodo

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test lib/budget-export.test.ts`
Expected: FAIL because the export helper does not exist yet

- [ ] **Step 3: Write minimal implementation**

Criar helper puro com:

- `buildBudgetExportCsv(rows)`
- `buildBudgetExportFilename(from, to)`

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test lib/budget-export.test.ts`
Expected: PASS

### Task 2: Integrar a exportacao na pagina de orcamentos

**Files:**
- Modify: `app/dashboard/orcamentos/page.tsx`
- Modify: `lib/budget-export.ts`

- [ ] **Step 1: Add UI trigger**

Adicionar botao `Exportar CSV` na tela de orcamentos, desabilitado quando estiver carregando ou sem resultados filtrados.

- [ ] **Step 2: Wire the export action**

Usar `filtered` para gerar o CSV e disparar o download no navegador com `Blob` + `URL.createObjectURL`.

- [ ] **Step 3: Keep behavior aligned with filters**

Garantir que o handler use o periodo atual da tela para nome do arquivo e a colecao filtrada completa, nao a lista paginada.

### Task 3: Verificacao final

**Files:**
- Verify: `app/dashboard/orcamentos/page.tsx`
- Verify: `lib/budget-export.ts`
- Verify: `lib/budget-export.test.ts`

- [ ] **Step 1: Run targeted tests**

Run: `node --experimental-strip-types --test lib/budget-export.test.ts`
Expected: PASS

- [ ] **Step 2: Run type checking**

Run: `npm run typecheck`
Expected: exit code 0

- [ ] **Step 3: Review diff**

Run: `git diff -- app/dashboard/orcamentos/page.tsx lib/budget-export.ts lib/budget-export.test.ts`
Expected: only export-related changes
