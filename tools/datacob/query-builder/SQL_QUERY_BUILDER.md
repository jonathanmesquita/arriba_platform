# 📊 SQL Query Builder - DataCob

## Visão Geral

**SQL Query Builder** é uma ferramenta visual para construir consultas T-SQL sobre a estrutura de dados do **DataCob** (cobrança de dívidas). Inspirado em [dbdiagram.io](https://dbdiagram.io), oferece uma interface amigável para:

- ✅ **Visual DB Diagram** - Seleção e visualização de tabelas e relacionamentos
- ✅ **T-SQL Builder** - Construtor visual de `CASE WHEN` com filtros dinâmicos
- ✅ **Query Preview** - Visualização de dados mockados
- ✅ **Exportação Múltipla** - `.xlsx`, `.csv` e tabela em tela

---

## 🎯 Casos de Uso

### 1. Entrada Diferenciada em Parcelas de Acordo
**Objetivo**: Identificar quando a primeira parcela de um acordo tem valor diferente das demais.

```sql
CASE 
  WHEN [CParcelaAcordoIPA].[Nr_Parcela] = 1 
    AND EXISTS (
      SELECT 1 FROM [Cob].[Parcela_Acordo] PA2
      WHERE PA2.[Id_Acordo] = [CParcelaAcordoIPA].[Id_Acordo]
        AND PA2.[Nr_Parcela] > 1
        AND PA2.[Vl_Parcela] <> [CParcelaAcordoIPA].[Vl_Parcela]
    )
  THEN "Sim - Entrada Diferente"
  ELSE "Não"
END
```

**Uso na ferramenta**:
1. Selecionar tabelas: `Contrato` → `Parcela` → `Parcela_Acordo` → `Acordo`
2. Adicionar filtros no sidebar esquerdo
3. Ativar checkbox "Usar em CASE WHEN"
4. Configurar lógica (AND/OR) e resultado esperado
5. Gerar query e exportar

---

## 🏗️ Arquitetura

### Estrutura de Tabelas

| Tabela | Schema | Relacionamento | Uso |
|--------|--------|-----------------|-----|
| `Contrato` | `Cob` | ← Parcela, Historico, Cliente | Raiz - Acesso por contrato |
| `Parcela` | `Cob` | ← Contrato, Negociacao_Parcela, Acordo | Parcelas de cobrança |
| `Acordo` | `Cob` | ← Negociacao, Parcela_Acordo | Acordos negociados |
| `Negociacao` | `Cob` | ← Parcela, Acordo | Detalhes da negociação |
| `Parcela_Acordo` | `Cob` | ← Parcela, Acordo | Mapeamento M:N |
| `Cliente` | `Par` | ← Contrato | Dados demográficos |
| `Email` | `Cob` | ← Financiado | Contato |
| `Telefone` | `Cob` | ← Financiado | Contato |
| `Endereco` | `Cob` | ← Financiado | Localização |

### Tabelas e Campos Principais

#### Contrato (Cob)
```
- Id_Contrato (PK)
- Id_Cliente (FK)
- Id_Grupo (FK)
- Id_Financiado (FK)
- Id_Cliente_Web (FK)
- Numero_Contrato
```

#### Parcela (Cob)
```
- Id_Parcela (PK)
- Id_Contrato (FK)
- Id_Cliente (FK)
- Tipo_Parcela
- Dt_Vencimento
```

#### Parcela_Acordo (Cob)
```
- Id_Parcela_Acordo (PK)
- Id_Parcela (FK)
- Id_Acordo (FK)
- Dt_Vencimento
- Vl_Parcela
- Nr_Parcela
```

#### Acordo (Cob)
```
- Id_Acordo (PK)
- Id_Negociacao (FK)
- Id_Agrupamento
- Id_Cliente_Web (FK)
- Dt_Acordo
```

---

## 🎮 Como Usar

### 1️⃣ Selecionar Tabelas (Sidebar Esquerdo)

```
[x] Contrato
[x] Parcela
[x] Acordo
[x] Parcela_Acordo
[ ] Email
[ ] Telefone
[ ] Endereco
```

**Resultado**: Gera JOINs automáticos entre as tabelas selecionadas.

---

### 2️⃣ Adicionar Filtros

No sidebar, clique **"+ Adicionar Filtro"** para cada condição:

| Campo | Tabela | Operador | Valor | Usar em CASE WHEN |
|-------|--------|----------|-------|-------------------|
| Nr_Parcela | Parcela | Igual | 1 | ✓ |
| Vl_Parcela | Parcela_Acordo | Diferente | {valor} | ✓ |
| Dt_Vencimento | Parcela | Entre | 2024-01-01 / 2024-12-31 | ☐ |

---

### 3️⃣ Operadores Disponíveis

| Operador | Template SQL | Exemplo |
|----------|-------------|---------|
| Não Filtrar | *(sem filtro)* | - |
| Nulos | `IS NULL` | `[Telefone] IS NULL` |
| Não Nulos | `IS NOT NULL` | `[Email] IS NOT NULL` |
| Igual | `= {value}` | `[Nr_Parcela] = 1` |
| Diferente | `<> {value}` | `[Status] <> 'Cancelado'` |
| Maior | `> {value}` | `[Vl_Parcela] > 100.00` |
| Maior ou Igual | `>= {value}` | `[Dt_Vencimento] >= '2024-01-01'` |
| Entre | `BETWEEN {min} AND {max}` | `[Vl_Parcela] BETWEEN 50 AND 500` |
| Na Lista | `IN ({values})` | `[Tipo_Parcela] IN ('Entrada', 'Fixa')` |
| Não Está na Lista | `NOT IN ({values})` | `[Status] NOT IN ('Cancelado', 'Arquivado')` |
| Começando Por | `LIKE '{value}%'` | `[Nome_Ren] LIKE 'João%'` |
| Terminando Por | `LIKE '%{value}'` | `[Nome_Ren] LIKE '%Silva'` |
| Contendo | `LIKE '%{value}%'` | `[Descricao] LIKE '%acordo%'` |

---

### 4️⃣ Configurar CASE WHEN

```
Lógica: [AND / OR]
Resultado THEN: "Sim - Entrada Diferente"
Resultado ELSE: "Não"
```

**Resultado gerado**:
```sql
CASE
  WHEN [Parcela].[Nr_Parcela] = 1 
    AND [Parcela_Acordo].[Vl_Parcela] <> [Parcela].[Vl_Parcela]
  THEN "Sim - Entrada Diferente"
  ELSE "Não"
END AS [Entrada_Diferenciada]
```

---

### 5️⃣ Visualizar Query (Aba "Query")

```sql
SELECT
  [Contrato].[Id_Contrato],
  [Contrato].[Numero_Contrato],
  [Parcela].[Id_Parcela],
  [Parcela].[Dt_Vencimento],
  [Parcela].[Tipo_Parcela],
  CASE
    WHEN [Parcela].[Nr_Parcela] = 1 
      AND EXISTS (...)
    THEN "Sim - Entrada Diferente"
    ELSE "Não"
  END AS [Entrada_Diferenciada],
  [Cliente].[Nome_Ren]
FROM [Cob].[Contrato]
INNER JOIN [Cob].[Parcela] ON [Contrato].[Id_Contrato] = [Parcela].[Id_Contrato]
INNER JOIN [Par].[Cliente] ON [Contrato].[Id_Cliente] = [Cliente].[Id_Cliente]
```

---

### 6️⃣ Preview de Dados (Aba "Preview")

Visualize os dados mockados antes de executar contra o banco real:

```
| Id_Contrato | Numero_Contrato | Id_Parcela | Dt_Vencimento | Tipo_Parcela | Entrada_Diferenciada | Nome_Ren     |
|-------------|-----------------|------------|----------------|--------------|----------------------|--------------|
| 1001        | CT-2024-00001   | 1          | 2024-01-15     | Entrada      | Sim - Entrada...     | Cliente 1    |
| 1001        | CT-2024-00001   | 2          | 2024-02-15     | Parcela      | Não                  | Cliente 1    |
```

---

### 7️⃣ Exportar Dados (Aba "Export")

#### 📊 XLSX (Excel)
- Mantém formatação
- Suporta múltiplas abas
- Ideal para análises posteriores em Excel

#### 📄 CSV (Comma-Separated Values)
- Compatível com SQL Server, Power BI, Python
- Formato universal de intercâmbio
- Leve e rápido de processar

#### 👁️ Visualizador em Tela
- Tabela interativa com scroll
- Contagem de registros
- Sem necessidade de download

---

## 🔄 Fluxo Típico

```
1. Abrir ferramenta
   ↓
2. Selecionar tabelas (Diagrama visual)
   ↓
3. Adicionar filtros (Sidebar esquerdo)
   ↓
4. Configurar CASE WHEN (se necessário)
   ↓
5. Visualizar Query gerada
   ↓
6. Ver Preview dos dados
   ↓
7. Exportar (.xlsx, .csv ou tabela em tela)
```

---

## 💡 Exemplos Práticos

### Exemplo 1: Encontrar Acordos com Entrada Diferente

**Objetivo**: Listar todos os contratos onde a primeira parcela de acordo tem valor diferente.

1. Selecionar: `Contrato`, `Parcela`, `Parcela_Acordo`, `Acordo`
2. Adicionar filtros:
   - `Nr_Parcela` = 1
   - `Vl_Parcela` diferente de valor anterior
3. CASE WHEN Result: "Sim - Entrada Diferente"
4. Exportar para análise

### Exemplo 2: Listar Clientes com Telefones Sem Registro

**Objetivo**: Identificar clientes sem contato telefônico.

1. Selecionar: `Cliente`, `Telefone`
2. Adicionar filtro: `Telefone` IS NULL
3. Sem CASE WHEN necessário
4. Exportar para verificação manual

### Exemplo 3: Parcelas Atrasadas em Acordo

**Objetivo**: Encontrar parcelas de acordo com vencimento próximo ou passado.

1. Selecionar: `Parcela_Acordo`, `Acordo`
2. Adicionar filtro: `Dt_Vencimento` BETWEEN `today - 30` e `today`
3. Visualizar preview
4. Exportar para fila de cobrança

---

## 📁 Estrutura de Arquivos

```
sql-query-builder/
├── sql-query-builder.jsx          # React component principal
├── SQL_QUERY_BUILDER.md            # Documentação (este arquivo)
├── package.json                    # Dependências (React, SheetJS, Tailwind)
└── README.md                       # Guia de instalação
```

---

## 📦 Dependências

```json
{
  "react": "^18.0.0",
  "react-dom": "^18.0.0",
  "xlsx": "^0.18.5",
  "tailwindcss": "^3.0.0"
}
```

---

## 🚀 Como Instalar e Rodar

### Opção 1: React App (Desenvolvimento Local)

```bash
# 1. Clonar ou copiar para pasta
npx create-react-app sql-query-builder
cd sql-query-builder

# 2. Instalar dependências
npm install xlsx

# 3. Copiar componente
cp sql-query-builder.jsx src/

# 4. Importar em App.js
import SQLQueryBuilder from './sql-query-builder';

# 5. Rodar
npm start
```

### Opção 2: Integrado ao Projeto Arriba

```bash
# 1. Copiar arquivo para /tools/datacob/
cp sql-query-builder.jsx tools/datacob/query-builder/

# 2. Criar página HTML wrapper
cat > tools/datacob/query-builder/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
    <div id="root"></div>
    <script>
        // Load and render React component
    </script>
</body>
</html>
EOF
```

---

## 🎨 Interface (Abas)

### Aba 1: Diagram (📐)
- Grid de tabelas selecionadas
- Campos e relacionamentos
- Checkbox para ativar/desativar tabelas

### Aba 2: Query (📝)
- Query T-SQL completa gerada
- CASE WHEN detalhado
- Copy-paste direto para SQL Server

### Aba 3: Preview (👁️)
- Tabela com dados mockados
- Scroll horizontal para muitos campos
- Total de registros

### Aba 4: Export (📥)
- Botão XLSX
- Botão CSV
- Botão Preview

---

## 🔐 Segurança

⚠️ **Importante**: Esta ferramenta gera **preview mockado de dados**. Para usar com dados reais:

1. **Nunca expor credenciais** do banco de dados no frontend
2. **Backend seguro**: Criar API que valida as queries geradas
3. **Auditoria**: Logar todas as queries executadas
4. **Permissões**: Controlar quais tabelas/campos cada usuário pode acessar

### Sugestão de Implementação Segura

```
Frontend (React Query Builder)
    ↓
    └→ POST /api/query/validate
           (envia estrutura de query)
    ←
Backend (Node.js / C#.NET)
    ↓
    └→ Valida estrutura
    └→ Sanitiza inputs
    └→ Executa contra banco
    ←
    └→ Retorna resultado
```

---

## 📊 Métricas e Performance

| Métrica | Esperado | Real |
|---------|----------|------|
| Tempo de carregamento | < 2s | - |
| Geração de query | < 100ms | - |
| Export XLSX (1000 linhas) | < 1s | - |
| Export CSV (1000 linhas) | < 500ms | - |

---

## 🐛 Troubleshooting

### Problema: Query não gera CASE WHEN
**Solução**: Verificar se há filtros com "Usar em CASE WHEN" ativado

### Problema: Preview não mostra dados
**Solução**: Clicar em "Preview" gera dados mockados; para dados reais, implementar backend API

### Problema: Export não funciona
**Solução**: Verificar se browser tem permissão de download; testar em outro navegador

---

## 🔮 Roadmap (Futuras Melhorias)

- [ ] Conexão com banco SQL Server real
- [ ] Salvar e carregar consultas (localStorage/DB)
- [ ] Compartilhar queries via URL
- [ ] Editor visual de JOIN (arrastar tabelas)
- [ ] Histórico de queries executadas
- [ ] Atalhos de teclado (Ctrl+E para executar)
- [ ] Dark mode automático
- [ ] Suporte a múltiplas linguagens (SQL Server, PostgreSQL, MySQL)
- [ ] Geração de relatórios PDF
- [ ] Integração com Power BI

---

## 👨‍💻 Desenvolvimento

### Stack Técnico
- **Frontend**: React 18
- **UI**: Tailwind CSS
- **Export**: SheetJS (XLSX)
- **Hospedagem**: Vercel (sugerido)

### Contribuir
```bash
# Fork + Clone
git clone https://github.com/seu-user/sql-query-builder.git

# Criar branch
git checkout -b feature/nova-funcionalidade

# Commit + Push
git add .
git commit -m "Add: nova funcionalidade"
git push origin feature/nova-funcionalidade

# Pull Request
```

---

## 📞 Suporte

- 📧 **Email**: jonathan@example.com
- 💬 **Issues**: GitHub Issues
- 📝 **Docs**: wiki completa em construção

---

## 📄 Licença

MIT © 2024 - Projeto DataCob Query Builder

---

**Criado com ❤️ por Jonathan Mesquita**  
*"Learning is hacking yourself"* 🧠⚡

**Última atualização**: Jul 30, 2026
