# Design: Exportacao Filtrada de Orcamentos

## Contexto

A tela `app/dashboard/orcamentos/page.tsx` ja busca todos os orcamentos do periodo com filtros de periodo, vendedor, filial e status aplicados no backend. Depois disso, a busca textual por cliente/vendedor/DAV/CPF-CNPJ acontece no cliente e a paginacao so afeta a visualizacao.

Hoje a pagina nao oferece exportacao do conjunto exibido.

## Objetivo

Permitir exportar exatamente o conjunto filtrado atual da tela de orcamentos, incluindo:

- Periodo
- Vendedor
- Filial
- Status
- Busca textual local

A exportacao nao deve ficar limitada aos itens da pagina atual.

## Abordagens Consideradas

### 1. Exportar no frontend a partir de `filtered`

Recomendacao.

Vantagens:

- Reproduz exatamente o que o usuario esta vendo como conjunto filtrado
- Inclui automaticamente a busca textual local
- Nao exige alteracao de API

Trade-offs:

- O arquivo exportado depende do conjunto ja carregado no navegador
- Para volumes muito altos, o processamento fica no cliente

### 2. Exportar via backend

Vantagens:

- Melhor para grandes volumes
- Pode centralizar formato e regras de exportacao

Trade-offs:

- Exigiria levar a busca textual local para a API
- Aumenta escopo e acoplamento

## Design Escolhido

Adicionar um botao `Exportar CSV` na pagina de orcamentos. Ao clicar:

1. A pagina usa a colecao `filtered`, nao `rows` nem `paginated`
2. A aplicacao monta um CSV UTF-8 com BOM
3. O navegador inicia o download de um arquivo com o periodo no nome

## Formato do Arquivo

Colunas iniciais:

- Data
- Cliente
- Vendedor
- Status
- Canal
- Filial
- Valor
- DAV
- CPF/CNPJ
- Data/Hora

Formato:

- Delimitador `;` para melhor compatibilidade com Excel em pt-BR
- Valores escapados quando contiverem aspas, quebra de linha ou delimitador

## Impacto Tecnico

- Extrair a geracao do CSV para um helper dedicado em `lib/`
- Cobrir a serializacao do CSV com teste automatizado usando o test runner nativo do Node
- Conectar o botao de exportacao na pagina existente sem alterar a logica atual de filtros e paginacao

## Validacao

- Verificar que o helper gera cabecalho e todas as linhas recebidas
- Verificar escape de campos com `;` e aspas
- Executar `npm run typecheck`
