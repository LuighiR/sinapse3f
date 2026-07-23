# Design: Configurações — abas Usuários e Colaboradores

## Contexto

`/dashboard/configuracoes` hoje só administra **tenant users** (`GET/POST/PATCH /tenant-users`) e só abre para `OWNER` / `ADMIN` (`canManageTenantUsers`).

A API passou a expor gestão de **employees** da empresa atual (`docs/api/rest-api.md`):

- `GET /companies/current/employees` — lista (default só ativos; `includeInactive=true` para admin)
- `POST /companies/current/employees` — cria
- `PATCH /companies/current/employees/:employeeId` — atualiza / soft-delete via `isActive`

`POST` / `PATCH` exigem membership `OWNER`, `ADMIN` ou `MANAGER`. Soft-delete (sem `DELETE` duro). `dkwWebhook` não é exposto na API pública.

O frontend já lista employees só como seletor de KPI (`getEmployees`), sem create/update nem `isActive` / `includeInactive`.

## Objetivo

1. Transformar Configurações em **duas abas**, cada uma com sua permissão.
2. Aba **Colaboradores**: listar (incl. inativos), criar e editar employees.
3. Abrir Configurações (sidebar + página) para quem puder gerir **pelo menos uma** das abas — inclusive `MANAGER` (só colaboradores).

## Abordagens consideradas

### A) Dois cards na mesma página

Prós: espelha o card atual. Contras: página longa.

### B) Abas Usuários | Colaboradores (escolhida)

Prós: organização clara; some a aba sem permissão. Contras: um pouco mais de UI/estado.

### C) Sub-rotas

Prós: isolamento. Contras: overhead desnecessário agora.

## Design escolhido

### Permissões

| Capacidade | Roles | Helper |
|------------|-------|--------|
| Aba Usuários | OWNER, ADMIN | `canManageTenantUsers` (existente) |
| Aba Colaboradores | OWNER, ADMIN, MANAGER | `canManageEmployees` (novo) |
| Entrar em Configurações | users **ou** employees | `canAccessConfiguracoes` (novo) |

- Sidebar: item Configurações usa `canAccessConfiguracoes`.
- Página: redirect para `/dashboard` se nenhuma capacidade.
- Se só uma aba for permitida, ela é a default (sem UI vazia).
- Se as duas forem permitidas, default = **Usuários**.
- Usuários do tenant: comportamento atual inalterado (API continua bloqueando `MANAGER`).

### Shell da página

`app/dashboard/configuracoes/page.tsx` vira shell:

- header / sidebar / badge de perfil e tenant
- copy do subtítulo adapta ao que o role vê (ex.: MANAGER → só colaboradores; OWNER/ADMIN → usuários e colaboradores)
- `Tabs`: **Usuários** | **Colaboradores** (só as permitidas)
- cada aba carrega o conteúdo da seção correspondente

### Extração de seções

A página atual (~680 linhas) é monólito. Extrair:

| Arquivo | Responsabilidade |
|---------|------------------|
| `components/configuracoes/tenant-users-section.tsx` | Lista + dialogs create/edit de tenant users (mover UI atual) |
| `components/configuracoes/employees-section.tsx` | Lista + dialogs create/edit de employees |
| `app/dashboard/configuracoes/page.tsx` | Gate de acesso + abas |

### Cliente API (`lib/api.ts`)

- Estender `getEmployees` com opts opcionais: `includeInactive`, `search`, `branchId`.
- `createEmployee` → `POST /companies/current/employees` (espera `201`).
- `updateEmployee` → `PATCH /companies/current/employees/:employeeId`.
- Tipos de input alinhados ao contrato (campos opcionais; `null` limpa extension/chat no PATCH).

### Normalização (`lib/normalize-employee.ts`)

- Incluir `isActive: boolean` (default `true` se omitido).
- Seletores de KPI continuam chamando `getEmployees` **sem** `includeInactive` (só ativos).

### Aba Colaboradores — UI

**Lista**

- Tabela: nome, filial (nome via `getBranches`), erpId, ramal, chatId, comercial / não comercial, status ativo/inativo.
- Fetch com `includeInactive=true`.
- Filtros leves: busca texto, select de filial, toggle “mostrar inativos” (default on para admin).
- Ações: Atualizar, Novo colaborador, Editar.

**Formulários (dialogs, padrão Usuários)**

Campos create/edit:

- `name` *required*
- `branchId` *required* (select de filiais)
- `erpId` *required* (integer)
- `extensionNumber`, `extensionUuid`, `chatId` opcionais
- `isNonCommercial` (checkbox, default false)
- `isActive` (checkbox; edit também desativa/reativa)

Regras:

- Soft-delete = `isActive: false`; reativar = `true`.
- No PATCH, string vazia em extension/chat → enviar `null` para limpar.
- Toast de sucesso/erro; 403/409/400 mostram `message` da API.
- Após create/update bem-sucedido: fechar dialog e refresh da lista.

### Fora de escopo

- Expor ou editar `dkwWebhook`
- Sync / importação ERP
- Sub-rotas por seção
- DELETE duro
- E2E

### Testes

- Unit: `canManageEmployees` / `canAccessConfiguracoes`
- Unit: `normalizeEmployee` com `isActive` presente/ausente

### Critérios de aceite

1. OWNER/ADMIN veem as duas abas; MANAGER só Colaboradores; VIEWER não acessa Configurações.
2. Admin lista ativos e inativos; cria e edita com persistência via API.
3. Soft-delete / reativação via `isActive` funciona.
4. Seletores de KPI (Vendas, Orçamentos, etc.) continuam listando só ativos.
5. Conflito de `erpId` / uniques (409) aparece em toast legível.
)