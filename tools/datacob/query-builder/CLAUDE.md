# 📊 SQL Query Builder - Integração com Seu Projeto

Oi Jonathan! Aqui está o **SQL Query Builder** pronto para usar. 🚀

---

## 📦 O Que Você Recebeu

```
├── sql-query-builder.html         ⭐ COMECE AQUI - Abra no navegador
├── sql-query-builder.jsx           📦 React component (para seu projeto)
├── SQL_QUERY_BUILDER.md            📚 Documentação técnica completa
├── README.md                       📖 Guia de uso
├── package.json                    🔧 Dependências
└── CLAUDE.md                       👈 Este arquivo
```

---

## 🎯 Comece Agora (5 minutos)

### Passo 1: Abrir no Navegador

```bash
# Simples assim:
# 1. Baixe o arquivo sql-query-builder.html
# 2. Clique duplo nele
# 3. Pronto! Sua ferramenta está aberta
```

✅ **Funciona 100% offline** - Sem servidor, sem instalação

---

## 🔧 Caso 1: Usar Como Projeto Standalone

Se você quer apenas testar:

```bash
# 1. Copie para uma pasta
mkdir sql-query-builder
cd sql-query-builder

# 2. Copie o arquivo HTML
cp sql-query-builder.html ./

# 3. Pronto! Abra no navegador
open sql-query-builder.html
```

---

## 🚀 Caso 2: Integrar no Projeto Arriba (Recomendado)

Se você quer adicionar à estrutura PH3A:

### Estrutura de Pastas

```
arriba_platform/
├── tools/
│   └── datacob/
│       └── query-builder/           ← Nova pasta
│           ├── index.html           ← Seu arquivo
│           ├── script.js            ← Lógica (opcional)
│           └── style.css            ← Styling (opcional)
```

### Adicionar ao Menu

1. **Abra** `/pages/docs/help-center/index.html`
2. **Adicione link**:

```html
<a href="/tools/datacob/query-builder/" class="menu-link">
  🔨 SQL Query Builder
</a>
```

3. **Ou na navegação principal** (`/assets/js/navigation-v2.js`):

```javascript
{
  title: "SQL Query Builder",
  url: "/tools/datacob/query-builder/",
  icon: "🔨"
}
```

---

## 💻 Caso 3: Integrar Como Componente React (Seu Clothing App)

Se você quer usar no seu projeto NestJS + React:

### 1. Copiar Componente

```bash
cp sql-query-builder.jsx src/components/SQLQueryBuilder.jsx
```

### 2. Importar em Sua App

```jsx
// src/App.jsx (ou rota específica)
import SQLQueryBuilder from './components/SQLQueryBuilder';

export default function App() {
  return (
    <div>
      <SQLQueryBuilder />
    </div>
  );
}
```

### 3. Instalar Dependências

```bash
npm install xlsx
# ou
yarn add xlsx
```

### 4. Usar em Nova Rota

```jsx
// src/pages/DataExtraction.jsx
import SQLQueryBuilder from '../components/SQLQueryBuilder';

export default function DataExtraction() {
  return (
    <div>
      <h1>Extração de Dados - DataCob</h1>
      <SQLQueryBuilder />
    </div>
  );
}
```

---

## 🎯 Recursos Principais

### ✅ Funcionalidades Incluídas

1. **Visual DB Diagram** (style dbdiagram.io)
   - Seleção visual de tabelas
   - Relacionamentos dinâmicos
   - Preview em tempo real

2. **T-SQL Builder**
   - Filtros com 9+ operadores
   - CASE WHEN automático
   - Lógica AND/OR

3. **Query Preview**
   - Visualização de dados mockados
   - Contagem de registros
   - Scroll infinito

4. **Exportação**
   - 📊 XLSX (Excel)
   - 📄 CSV (universal)
   - 👁️ Tabela em tela

---

## 📋 Como Usar - Fluxo Rápido

### Cenário: Entrada Diferente em Acordos

```
1. Abrir ferramenta
   ↓
2. Selecionar tabelas:
   ✓ Contrato
   ✓ Parcela
   ✓ Parcela_Acordo
   ✓ Acordo
   ↓
3. Adicionar filtros:
   - Tabela: Parcela, Campo: Nr_Parcela, Operador: Igual, Valor: 1
   - ✓ Usar em CASE WHEN
   ↓
4. Configurar CASE WHEN:
   - Lógica: AND
   - Resultado: "Sim - Entrada Diferente"
   ↓
5. Visualizar query gerada
   ↓
6. Exportar para análise
```

---

## 🔌 Integração com Banco Real (Backend)

Quando precisar de dados reais, crie uma **API segura**:

### Backend (Node.js)

```javascript
// api/query.js
app.post('/api/query/preview', async (req, res) => {
  const { tabelas, filtros } = req.body;
  
  // Validar permissões do usuário
  if (!userHasAccess(req.user, tabelas)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  
  // Sanitizar e construir query
  const query = buildSafeQuery(tabelas, filtros);
  
  // Executar
  try {
    const result = await executeQuery(query);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

### Frontend (React)

```javascript
// sql-query-builder.jsx - Adicionar
async function executeQuery() {
  const response = await fetch('/api/query/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tabelas: selectedTables,
      filtros: conditions
    })
  });
  
  const data = await response.json();
  setQueryResult(data.data);
}
```

---

## 🗂️ Estrutura de Dados Suportada

### Tabelas Disponíveis

```
Schema: Cob
├── Contrato (Id_Contrato PK)
├── Parcela (Id_Parcela PK)
├── Acordo (Id_Acordo PK)
├── Negociacao (Id_Negociacao PK)
├── Parcela_Acordo (Id_Parcela_Acordo PK)
├── Email (Id_Email PK)
├── Telefone (Id_Telefone PK)
└── Endereco (Id_Endereco PK)

Schema: Par
└── Cliente (Id_Cliente PK)
```

**Pode adicionar mais tabelas?** Sim! Edite:

```javascript
// sql-query-builder.html - Linha ~40
const TABLES_STRUCTURE = {
  MinhaTabela: {
    schema: 'schema_name',
    fields: ['Id', 'Nome', 'Data'],
    relationships: ['OutraTabela']
  },
  // ... adicione aqui
};
```

---

## 🛠️ Personalização

### Mudar Cores

No HTML, procure por `bg-gray-800` e troque por:
- `bg-slate-800` (mais azulado)
- `bg-zinc-800` (mais cinza)
- `bg-neutral-800` (neutro)

### Adicionar Novo Operador

```javascript
const FILTER_OPERATORS = [
  // ... existentes
  { id: 'custom', label: 'Meu Operador', template: 'CUSTOM_SQL' }
];
```

### Mudar Tema para Light

```html
<body class="bg-white text-black">
  <!-- change classes from bg-gray-* to bg-white, etc -->
</body>
```

---

## 📊 Exemplos de Queries Geradas

### Exemplo 1: Entrada Diferente
```sql
SELECT
  [Contrato].[Id_Contrato],
  [Contrato].[Numero_Contrato],
  CASE
    WHEN [Parcela].[Nr_Parcela] = 1 
      AND [Parcela_Acordo].[Vl_Parcela] <> 1000.00
    THEN "Sim - Entrada Diferente"
    ELSE "Não"
  END AS [Entrada_Diferenciada]
FROM [Cob].[Contrato]
INNER JOIN [Cob].[Parcela] ...
```

### Exemplo 2: Clientes Sem Contato
```sql
SELECT
  [Cliente].[Id_Cliente],
  [Cliente].[Nome_Ren]
FROM [Par].[Cliente]
LEFT JOIN [Cob].[Telefone] ON ...
WHERE [Telefone].[Id_Telefone] IS NULL
```

### Exemplo 3: Relatório Complexo
```sql
SELECT
  [Contrato].[Numero_Contrato],
  [Parcela].[Dt_Vencimento],
  SUM([Parcela_Acordo].[Vl_Parcela]) AS Total,
  CASE
    WHEN COUNT(*) > 1 THEN "Múltiplas Parcelas"
    ELSE "Parcela Única"
  END AS Tipo
FROM [Cob].[Contrato]
INNER JOIN [Cob].[Parcela_Acordo] ...
GROUP BY ...
```

---

## 🔒 Security Best Practices

### ❌ NÃO FAÇA

```javascript
// ❌ NUNCA expor credenciais
const connString = "Server=192.168.1.1;User=admin;Password=123";

// ❌ NUNCA confiar 100% em input do cliente
const query = buildQuery(userInput); // SEM validação
```

### ✅ FAÇA

```javascript
// ✅ Validar entrada
const ALLOWED_TABLES = ['Contrato', 'Parcela', ...];
if (!ALLOWED_TABLES.includes(table)) throw Error('Invalid table');

// ✅ Usar prepared statements
const query = `SELECT * FROM ${table} WHERE id = @id`;
db.execute(query, { '@id': userId });

// ✅ Limitar resultados
const result = await db.query(query, { limit: 1000 });

// ✅ Logar tudo
auditLog.record({ user, query, timestamp, resultCount });
```

---

## 📱 Responsividade

Funciona em:
- ✅ Desktop (Chrome, Firefox, Safari)
- ✅ Tablet (iPad, Android)
- ✅ Mobile (leitura apenas, editor em desktop)

---

## 🚨 Troubleshooting

| Problema | Solução |
|----------|---------|
| Página branca | Atualizar (Ctrl+F5) |
| Export não funciona | Verificar permissões de download |
| CASE WHEN não aparece | Ativar "Usar em CASE WHEN" no filtro |
| Query vazia | Selecionar pelo menos uma tabela |
| Lento | Reduzir número de registros no preview |

---

## 🎯 Próximas Melhorias (Sugestões)

```
- [ ] Salvar queries no localStorage
- [ ] Compartilhar via URL
- [ ] Editor visual de JOINs (arrastar tabelas)
- [ ] Histórico de queries
- [ ] Integração com Power BI
- [ ] Suporte a múltiplos bancos (PostgreSQL, MySQL)
- [ ] Temas customizáveis
- [ ] Dark/Light mode automático
- [ ] Geração de relatórios PDF
- [ ] API GraphQL opcional
```

---

## 📞 Suporte

Dúvidas? Verifique:
1. 📖 **README.md** - Guia de uso geral
2. 📚 **SQL_QUERY_BUILDER.md** - Documentação técnica
3. 🧪 **Teste no navegador** - Abra o HTML direto
4. 📧 **Entre em contato** - jonathan@ph3a.dev

---

## 🎨 Seu Projeto + SQL Query Builder

### Clothing & Outfit Generator
```
Seu projeto:
NestJS backend + React frontend

SQL Query Builder se encaixa como:
┌─────────────────────────────────────────┐
│ Painel Administrativo                   │
├─────────────────────────────────────────┤
│ [🏠 Home] [👕 Roupas] [🔨 Query Builder] │
│                                          │
│ SQL Query Builder:                      │
│ - Extrair dados de clientes             │
│ - Gerar relatórios                      │
│ - Exportar para análise                 │
└─────────────────────────────────────────┘
```

Integração sugerida:
```jsx
// src/pages/admin/AdminDashboard.jsx
import SQLQueryBuilder from '../components/SQLQueryBuilder';

export default function AdminDashboard() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <Tabs>
        <Tab label="Roupas">...</Tab>
        <Tab label="Clientes">...</Tab>
        <Tab label="SQL Query Builder">
          <SQLQueryBuilder />
        </Tab>
      </Tabs>
    </div>
  );
}
```

---

## 📝 Checklist de Integração

- [ ] Baixei os 5 arquivos
- [ ] Testei abrir `sql-query-builder.html` no navegador
- [ ] Experimentei criar uma query
- [ ] Exportei dados em XLSX/CSV
- [ ] Li a documentação completa
- [ ] Integrei no projeto (se necessário)
- [ ] Customizei para meus dados
- [ ] Adicionei ao seu GitHub

---

## 🎓 Aprendizados

Este projeto demonstra:
- ✅ React hooks avançados (useState, useCallback)
- ✅ Manipulação dinâmica de UI
- ✅ Geração de SQL programaticamente
- ✅ Export de dados (XLSX/CSV)
- ✅ Tailwind CSS avançado
- ✅ Estrutura escalável

**Ótimo para seu portfolio internacionalizador!** 🌍

---

## 📄 Licença

MIT - Use livremente, comercialmente ou pessoalmente.

---

## ❤️ Criado para

Jonathan Mesquita | Desenvolvedor Full-Stack | Brasil

*"Learning is hacking yourself"* 🧠⚡

---

**Última atualização**: 30 de Julho de 2026

## 🚀 Comece Agora!

1. Abra `sql-query-builder.html` no navegador
2. Explore as tabelas e crie uma query
3. Exporte os dados
4. Consulte a documentação para casos complexos
5. Integre no seu projeto

**Sucesso!** 🎯
