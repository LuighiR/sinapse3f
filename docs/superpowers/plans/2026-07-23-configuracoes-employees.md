# Configurações Employees Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar `/dashboard/configuracoes` em abas Usuários | Colaboradores, cada uma com sua permissão, e habilitar listagem/criação/edição de employees via a API nova.

**Architecture:** Helpers de permissão + normalização testáveis; cliente API estendido (`getEmployees` com query, `createEmployee`, `updateEmployee`); página vira shell com `Tabs`; UI de usuários migrada para `tenant-users-section`; nova `employees-section` espelhando o padrão de dialogs/tabela dos usuários.

**Tech Stack:** Next.js App Router, React, TypeScript, shadcn/ui (`Tabs`, `Table`, `Dialog`, `Select`), Node test runner (`node --experimental-strip-types --test`)

**Spec:** `docs/superpowers/specs/2026-07-23-configuracoes-employees-design.md`

---

## File Structure

| File | Responsibility |
|------|----------------|
| `lib/tenant-permissions.ts` | `canManageTenantUsers`, `canManageEmployees`, `canAccessConfiguracoes` |
| `lib/tenant-permissions.test.mjs` | Testes dos helpers de role |
| `lib/normalize-employee.ts` | Inclui `isActive` na normalização |
| `lib/normalize-employee.test.mjs` | Testes `isActive` |
| `lib/employee-admin.ts` | Query string + payload create/patch (incl. empty→null) |
| `lib/employee-admin.test.mjs` | Testes dos helpers de admin |
| `lib/api.ts` | `getEmployees` opts; `createEmployee`; `updateEmployee` |
| `components/configuracoes/tenant-users-section.tsx` | Aba Usuários (extraída da página) |
| `components/configuracoes/employees-section.tsx` | Aba Colaboradores |
| `app/dashboard/configuracoes/page.tsx` | Shell: gate + abas + subtítulo |
| `components/app-sidebar.tsx` | Link Configurações via `canAccessConfiguracoes` |

---

### Task 1: Permissões de Configurações

**Files:**
- Modify: `lib/tenant-permissions.ts`
- Create: `lib/tenant-permissions.test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `lib/tenant-permissions.test.mjs`:

```js
import test from "node:test"
import assert from "node:assert/strict"
import {
  canManageTenantUsers,
  canManageEmployees,
  canAccessConfiguracoes,
} from "./tenant-permissions.ts"

test("canManageTenantUsers only OWNER and ADMIN", () => {
  assert.equal(canManageTenantUsers("OWNER"), true)
  assert.equal(canManageTenantUsers("ADMIN"), true)
  assert.equal(canManageTenantUsers("MANAGER"), false)
  assert.equal(canManageTenantUsers("VIEWER"), false)
  assert.equal(canManageTenantUsers(null), false)
})

test("canManageEmployees OWNER ADMIN MANAGER", () => {
  assert.equal(canManageEmployees("OWNER"), true)
  assert.equal(canManageEmployees("ADMIN"), true)
  assert.equal(canManageEmployees("MANAGER"), true)
  assert.equal(canManageEmployees("VIEWER"), false)
  assert.equal(canManageEmployees(undefined), false)
})

test("canAccessConfiguracoes is OR of the two", () => {
  assert.equal(canAccessConfiguracoes("MANAGER"), true)
  assert.equal(canAccessConfiguracoes("ADMIN"), true)
  assert.equal(canAccessConfiguracoes("VIEWER"), false)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --experimental-strip-types --test lib/tenant-permissions.test.mjs`

Expected: FAIL (exports missing)

- [ ] **Step 3: Implement helpers**

Update `lib/tenant-permissions.ts`:

```ts
const TENANT_USER_MANAGEMENT_ROLES = new Set(["OWNER", "ADMIN"])
const EMPLOYEE_MANAGEMENT_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"])

export function canManageTenantUsers(role?: string | null) {
  return role ? TENANT_USER_MANAGEMENT_ROLES.has(role.toUpperCase()) : false
}

export function canManageEmployees(role?: string | null) {
  return role ? EMPLOYEE_MANAGEMENT_ROLES.has(role.toUpperCase()) : false
}

export function canAccessConfiguracoes(role?: string | null) {
  return canManageTenantUsers(role) || canManageEmployees(role)
}

export function isTenantAdmin(role?: string | null) {
  return role?.toUpperCase() === "ADMIN"
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --experimental-strip-types --test lib/tenant-permissions.test.mjs`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/tenant-permissions.ts lib/tenant-permissions.test.mjs
git commit -m "feat: add employee and configuracoes permission helpers"
```

---

### Task 2: Normalizar `isActive` no Employee

**Files:**
- Modify: `lib/normalize-employee.ts`
- Modify: `lib/normalize-employee.test.mjs`

- [ ] **Step 1: Write the failing tests**

Append to `lib/normalize-employee.test.mjs`:

```js
test("keeps isActive when provided", () => {
  const emp = normalizeEmployee({
    id: 1,
    name: "Joao",
    branchId: 1,
    extensionNumber: null,
    extensionUuid: null,
    chatId: null,
    erpId: 1,
    isActive: false,
  })
  assert.equal(emp.isActive, false)
})

test("defaults isActive to true when missing", () => {
  const emp = normalizeEmployee({
    id: 1,
    name: "Joao",
    branchId: 1,
    extensionNumber: null,
    extensionUuid: null,
    chatId: null,
    erpId: 1,
  })
  assert.equal(emp.isActive, true)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --experimental-strip-types --test lib/normalize-employee.test.mjs`

Expected: FAIL on `isActive`

- [ ] **Step 3: Implement**

In `lib/normalize-employee.ts`:

- Add `isActive?: boolean` to `EmployeeLike`
- Add `isActive: boolean` to `NormalizedEmployee`
- In `normalizeEmployee`, set `isActive: raw.isActive ?? true`

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --experimental-strip-types --test lib/normalize-employee.test.mjs`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/normalize-employee.ts lib/normalize-employee.test.mjs
git commit -m "feat: normalize employee isActive for admin list"
```

---

### Task 3: Helpers de admin de employees (query + payload)

**Files:**
- Create: `lib/employee-admin.ts`
- Create: `lib/employee-admin.test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `lib/employee-admin.test.mjs`:

```js
import test from "node:test"
import assert from "node:assert/strict"
import {
  buildEmployeesQuery,
  clearableOptionalString,
  buildCreateEmployeeBody,
  buildUpdateEmployeeBody,
} from "./employee-admin.ts"

test("buildEmployeesQuery includes includeInactive search branchId", () => {
  const qs = buildEmployeesQuery({
    includeInactive: true,
    search: "fabiano",
    branchId: 2,
  }).toString()
  assert.match(qs, /includeInactive=true/)
  assert.match(qs, /search=fabiano/)
  assert.match(qs, /branchId=2/)
})

test("buildEmployeesQuery omits empty filters", () => {
  const qs = buildEmployeesQuery({}).toString()
  assert.equal(qs, "")
})

test("clearableOptionalString maps empty to null", () => {
  assert.equal(clearableOptionalString(""), null)
  assert.equal(clearableOptionalString("  "), null)
  assert.equal(clearableOptionalString("101"), "101")
})

test("buildCreateEmployeeBody trims and clears empties", () => {
  const body = buildCreateEmployeeBody({
    name: " Nova ",
    branchId: 1,
    erpId: 10,
    extensionNumber: "",
    extensionUuid: "  ",
    chatId: "a@b.com",
    isNonCommercial: true,
    isActive: true,
  })
  assert.deepEqual(body, {
    name: "Nova",
    branchId: 1,
    erpId: 10,
    extensionNumber: null,
    extensionUuid: null,
    chatId: "a@b.com",
    isNonCommercial: true,
    isActive: true,
  })
})

test("buildUpdateEmployeeBody only includes changed fields and clears empties", () => {
  const current = {
    name: "Old",
    branchId: 1,
    erpId: 10,
    extensionNumber: "101",
    extensionUuid: "uuid",
    chatId: "old@x.com",
    isNonCommercial: false,
    isActive: true,
  }
  const body = buildUpdateEmployeeBody(current, {
    name: "New",
    branchId: 1,
    erpId: 10,
    extensionNumber: "",
    extensionUuid: "uuid",
    chatId: "old@x.com",
    isNonCommercial: false,
    isActive: false,
  })
  assert.deepEqual(body, {
    name: "New",
    extensionNumber: null,
    isActive: false,
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --experimental-strip-types --test lib/employee-admin.test.mjs`

Expected: FAIL (module missing)

- [ ] **Step 3: Implement `lib/employee-admin.ts`**

```ts
export function buildEmployeesQuery(opts: {
  includeInactive?: boolean
  search?: string
  branchId?: number
}): URLSearchParams {
  const p = new URLSearchParams()
  if (opts.includeInactive) p.set("includeInactive", "true")
  const search = opts.search?.trim()
  if (search) p.set("search", search)
  if (opts.branchId != null) p.set("branchId", String(opts.branchId))
  return p
}

/** Empty / whitespace → null (API clears field). Non-empty → trimmed string. */
export function clearableOptionalString(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export type EmployeeFormFields = {
  name: string
  branchId: number
  erpId: number
  extensionNumber: string
  extensionUuid: string
  chatId: string
  isNonCommercial: boolean
  isActive: boolean
}

export function buildCreateEmployeeBody(form: EmployeeFormFields) {
  return {
    name: form.name.trim(),
    branchId: form.branchId,
    erpId: form.erpId,
    extensionNumber: clearableOptionalString(form.extensionNumber),
    extensionUuid: clearableOptionalString(form.extensionUuid),
    chatId: clearableOptionalString(form.chatId),
    isNonCommercial: form.isNonCommercial,
    isActive: form.isActive,
  }
}

export type EmployeeSnapshot = {
  name: string
  branchId: number
  erpId: number
  extensionNumber: string | null
  extensionUuid: string | null
  chatId: string | null
  isNonCommercial: boolean
  isActive: boolean
}

export function buildUpdateEmployeeBody(
  current: EmployeeSnapshot,
  form: EmployeeFormFields,
): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  const name = form.name.trim()
  if (name !== current.name) body.name = name
  if (form.branchId !== current.branchId) body.branchId = form.branchId
  if (form.erpId !== current.erpId) body.erpId = form.erpId

  const extensionNumber = clearableOptionalString(form.extensionNumber)
  if (extensionNumber !== (current.extensionNumber ?? null)) {
    body.extensionNumber = extensionNumber
  }
  const extensionUuid = clearableOptionalString(form.extensionUuid)
  if (extensionUuid !== (current.extensionUuid ?? null)) {
    body.extensionUuid = extensionUuid
  }
  const chatId = clearableOptionalString(form.chatId)
  if (chatId !== (current.chatId ?? null)) body.chatId = chatId

  if (form.isNonCommercial !== current.isNonCommercial) {
    body.isNonCommercial = form.isNonCommercial
  }
  if (form.isActive !== current.isActive) body.isActive = form.isActive
  return body
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --experimental-strip-types --test lib/employee-admin.test.mjs`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/employee-admin.ts lib/employee-admin.test.mjs
git commit -m "feat: add employee admin query and payload helpers"
```

---

### Task 4: Cliente API de employees

**Files:**
- Modify: `lib/api.ts` (seção `getEmployees` ~196–202)

- [ ] **Step 1: Extend types and functions**

Replace/extend the employees block in `lib/api.ts`:

```ts
import { buildEmployeesQuery } from "./employee-admin.ts"
// (keep existing normalizeEmployee import)

export type CreateEmployeeInput = {
  name: string
  branchId: number
  erpId: number
  extensionNumber?: string | null
  extensionUuid?: string | null
  chatId?: string | null
  isNonCommercial?: boolean
  isActive?: boolean
}

export type UpdateEmployeeInput = {
  name?: string
  branchId?: number
  erpId?: number
  extensionNumber?: string | null
  extensionUuid?: string | null
  chatId?: string | null
  isNonCommercial?: boolean
  isActive?: boolean
}

export async function getEmployees(opts: {
  token: string
  tenantId: string
  includeInactive?: boolean
  search?: string
  branchId?: number
}) {
  const qs = buildEmployeesQuery({
    includeInactive: opts.includeInactive,
    search: opts.search,
    branchId: opts.branchId,
  }).toString()
  const rows = await api<EmployeeLike[]>(
    `/companies/current/employees${qs ? `?${qs}` : ""}`,
    {
      token: opts.token,
      tenantId: opts.tenantId,
    },
  )
  return rows.map(normalizeEmployee)
}

export function createEmployee(
  opts: { token: string; tenantId: string } & CreateEmployeeInput,
) {
  const { token, tenantId, ...body } = opts
  return api<EmployeeLike>("/companies/current/employees", {
    method: "POST",
    token,
    tenantId,
    body: JSON.stringify(body),
  }).then(normalizeEmployee)
}

export function updateEmployee(
  opts: {
    token: string
    tenantId: string
    employeeId: number
  } & UpdateEmployeeInput,
) {
  const { token, tenantId, employeeId, ...body } = opts
  return api<EmployeeLike>(`/companies/current/employees/${employeeId}`, {
    method: "PATCH",
    token,
    tenantId,
    body: JSON.stringify(body),
  }).then(normalizeEmployee)
}
```

Note: KPI callers keep `getEmployees({ token, tenantId })` — no `includeInactive` → só ativos.

- [ ] **Step 2: Smoke-check TypeScript / existing tests**

Run: `node --experimental-strip-types --test lib/normalize-employee.test.mjs lib/employee-admin.test.mjs lib/tenant-permissions.test.mjs`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/api.ts
git commit -m "feat: wire employee create update and list query params"
```

---

### Task 5: Extrair aba Usuários

**Files:**
- Create: `components/configuracoes/tenant-users-section.tsx`
- Modify: `app/dashboard/configuracoes/page.tsx` (temporário: importar a seção; shell completo na Task 7)

- [ ] **Step 1: Move UI de usuários para o componente**

Create `components/configuracoes/tenant-users-section.tsx`:

- `"use client"`
- Props: `{ token: string; tenantId: string }`
- Mover de `page.tsx`: estado, `loadUsers`, dialogs create/edit, tabela, helpers locais (`ROLE_OPTIONS`, forms, badges)
- Remover redirects de auth/role daqui (ficam no shell)
- Ao montar, chamar `loadUsers()` via `useEffect`

- [ ] **Step 2: Thin the page to use the section**

In `page.tsx`, manter gate `canManageTenantUsers` por enquanto e renderizar:

```tsx
<TenantUsersSection token={session.accessToken} tenantId={session.tenantId} />
```

(Comportamento visual idêntico; refatoração sem mudança de produto.)

- [ ] **Step 3: Manual sanity**

Abrir `/dashboard/configuracoes` como ADMIN: lista/criar/editar usuários ainda funciona.

- [ ] **Step 4: Commit**

```bash
git add components/configuracoes/tenant-users-section.tsx app/dashboard/configuracoes/page.tsx
git commit -m "refactor: extract tenant users section from configuracoes"
```

---

### Task 6: Seção Colaboradores (UI completa)

**Files:**
- Create: `components/configuracoes/employees-section.tsx`
- Modify: `lib/employee-admin.ts` (add `snapshotFromEmployee` se ainda não existir)
- Modify: `lib/employee-admin.test.mjs` (teste do snapshot)

- [ ] **Step 1: Add snapshot helper + test**

In `lib/employee-admin.ts`:

```ts
export function snapshotFromEmployee(emp: {
  name: string
  branchId: number
  erpId: number
  extensionNumber: string | null
  extensionUuid: string | null
  chatId: string | null
  isNonCommercial?: boolean
  isActive: boolean
}): EmployeeSnapshot {
  return {
    name: emp.name,
    branchId: emp.branchId,
    erpId: emp.erpId,
    extensionNumber: emp.extensionNumber,
    extensionUuid: emp.extensionUuid,
    chatId: emp.chatId,
    isNonCommercial: emp.isNonCommercial ?? false,
    isActive: emp.isActive,
  }
}

export function formFromEmployee(emp: {
  name: string
  branchId: number
  erpId: number
  extensionNumber: string | null
  extensionUuid: string | null
  chatId: string | null
  isNonCommercial?: boolean
  isActive: boolean
}): EmployeeFormFields {
  return {
    name: emp.name,
    branchId: emp.branchId,
    erpId: emp.erpId,
    extensionNumber: emp.extensionNumber ?? "",
    extensionUuid: emp.extensionUuid ?? "",
    chatId: emp.chatId ?? "",
    isNonCommercial: emp.isNonCommercial ?? false,
    isActive: emp.isActive,
  }
}
```

Test: `snapshotFromEmployee` defaults `isNonCommercial` to `false` when undefined.

Run: `node --experimental-strip-types --test lib/employee-admin.test.mjs` — Expected: PASS

- [ ] **Step 2: Implement `employees-section.tsx`**

Espelhar estrutura de `tenant-users-section.tsx`.

**Props:** `{ token: string; tenantId: string }`

**State:**
- `employees`, `branches`, `loading`, `refreshing`, `error`
- filtros: `search` (string), `branchFilter` (`"all"` | id string)
- create/edit dialogs + form state (`EmployeeFormFields`)

**Load:**
```ts
async function load(showRefresh = false) {
  const branchId =
    branchFilter === "all" ? undefined : Number(branchFilter)
  const [branchRows, employeeRows] = await Promise.all([
    getBranches({ token, tenantId }),
    getEmployees({
      token,
      tenantId,
      includeInactive: true,
      search: search.trim() || undefined,
      branchId: Number.isFinite(branchId) ? branchId : undefined,
    }),
  ])
  setBranches(branchRows)
  setEmployees(employeeRows)
}
```

Refetch com `useEffect` quando `search` / `branchFilter` mudam (v1 ok).

**Tabela colunas:** Nome | Filial | ERP ID | Ramal | Chat ID | Tipo | Status | Ações

- Filial: `branches.find(b => b.id === emp.branchId)?.name ?? String(emp.branchId)`
- Tipo: badge `isNonCommercial ? "Nao comercial" : "Comercial"`
- Status: `isActive ? "Ativo" : "Inativo"`

**Create dialog fields:** name, branchId (Select), erpId (number input), extensionNumber, extensionUuid, chatId, isNonCommercial, isActive

**Submit create (sucesso):**
```ts
const body = buildCreateEmployeeBody(createForm)
if (!body.name || !body.branchId || body.erpId == null || Number.isNaN(Number(body.erpId))) {
  toast.error("Preencha nome, filial e ERP ID.")
  return
}
await createEmployee({ token, tenantId, ...body })
toast.success("Colaborador criado com sucesso.")
setCreateOpen(false)
await load(true)
```

**Submit edit (sucesso):**
```ts
const payload = buildUpdateEmployeeBody(snapshotFromEmployee(editing), editForm)
if (Object.keys(payload).length === 0) {
  toast.error("Altere pelo menos um campo antes de salvar.")
  return
}
await updateEmployee({ token, tenantId, employeeId: editing.id, ...payload })
toast.success("Colaborador atualizado com sucesso.")
setEditing(null)
await load(true)
```

**Erros:** `toast.error(err instanceof Error ? err.message : "...")` (ApiError carrega `message` da API — 403/409/400).

Ainda **não** alterar o shell/sidebar nesta task — só criar o componente exportado.

- [ ] **Step 3: Commit**

```bash
git add lib/employee-admin.ts lib/employee-admin.test.mjs components/configuracoes/employees-section.tsx
git commit -m "feat: add employees admin section component"
```

---

### Task 7: Shell com abas + sidebar

**Files:**
- Modify: `app/dashboard/configuracoes/page.tsx`
- Modify: `components/app-sidebar.tsx`
- Use: `components/ui/tabs.tsx`
- Depends on: Task 5 (`TenantUsersSection`) + Task 6 (`EmployeesSection`) já existirem

- [ ] **Step 1: Update sidebar gate**

In `components/app-sidebar.tsx`:

```ts
import { canAccessConfiguracoes } from "@/lib/tenant-permissions"
// ...
const canAccessSettings = canAccessConfiguracoes(session?.tenantRole)
// navSecondary: use canAccessSettings instead of canManageUsers
```

- [ ] **Step 2: Rewrite page shell**

`page.tsx` deve:

1. Redirect `/login` sem session; `/dashboard` se `!canAccessConfiguracoes(role)`
2. Calcular `showUsers = canManageTenantUsers(role)`, `showEmployees = canManageEmployees(role)`
3. `defaultTab = showUsers ? "usuarios" : "colaboradores"`
4. Subtítulo:
   - ambos: `"Gerencie usuarios e colaboradores da empresa atual."`
   - só users: `"Gerencie usuarios e permissoes da empresa atual."`
   - só employees: `"Gerencie colaboradores da empresa atual."`
5. Render `Tabs` com triggers/contents condicionais:

```tsx
<Tabs defaultValue={defaultTab}>
  <TabsList>
    {showUsers ? <TabsTrigger value="usuarios">Usuarios</TabsTrigger> : null}
    {showEmployees ? (
      <TabsTrigger value="colaboradores">Colaboradores</TabsTrigger>
    ) : null}
  </TabsList>
  {showUsers ? (
    <TabsContent value="usuarios">
      <TenantUsersSection
        token={session.accessToken}
        tenantId={session.tenantId}
      />
    </TabsContent>
  ) : null}
  {showEmployees ? (
    <TabsContent value="colaboradores">
      <EmployeesSection
        token={session.accessToken}
        tenantId={session.tenantId}
      />
    </TabsContent>
  ) : null}
</Tabs>
```

- [ ] **Step 3: Manual checklist**

- OWNER/ADMIN: duas abas; criar colaborador; editar; desativar (`isActive` false); reativar
- MANAGER: só aba Colaboradores; sidebar mostra Configurações
- VIEWER: sem item Configurações; URL redirect `/dashboard`
- KPI selector (Vendas): `getEmployees` sem inactive → inativo não aparece

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/configuracoes/page.tsx components/app-sidebar.tsx
git commit -m "feat: configuracoes tabs shell with role-gated sections"
```

---

### Task 8: Verificação final

- [ ] **Step 1: Run all related unit tests**

```bash
node --experimental-strip-types --test lib/tenant-permissions.test.mjs lib/normalize-employee.test.mjs lib/employee-admin.test.mjs
```

Expected: all PASS

- [ ] **Step 2: Done**

No further code unless tests fail.

---

## Execution notes

- Não alterar callers de KPI de `getEmployees` (sem `includeInactive`).
- Não expor `dkwWebhook`.
- PowerShell: commits com `git commit -m "mensagem"` simples (evitar heredoc bash).
- Página de usuários atual: `app/dashboard/configuracoes/page.tsx` — usar como referência de UX ao extrair.
- Ordem crítica: Task 6 (componente) **antes** de Task 7 (shell que importa o componente).
)
