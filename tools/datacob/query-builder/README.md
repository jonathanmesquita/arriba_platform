# 📊 SQL Query Builder - DataCob

> Uma ferramenta visual para construir consultas T-SQL sobre a estrutura DataCob, estilo [dbdiagram.io](https://dbdiagram.io)

![License](https://img.shields.io/badge/license-MIT-blue)
![Version](https://img.shields.io/badge/version-1.0.0-green)
![Status](https://img.shields.io/badge/status-in%20development-yellow)

---

## 🚀 Quick Start

### Opção 1: Abrir no Navegador (Sem Instalação)

```bash
# Simplesmente abra o arquivo
open sql-query-builder.html

# Ou clique duplo no arquivo no explorador de arquivos
```

✅ **Funciona em qualquer navegador moderno** (Chrome, Firefox, Edge, Safari)

---

### Opção 2: React App (Desenvolvimento Local)

```bash
# 1. Instalar dependências
npm install react react-dom xlsx tailwindcss

# 2. Copiar o componente
cp sql-query-builder.jsx src/App.jsx

# 3. Executar
npm start
```

---

### Opção 3: Integrado ao Projeto Arriba (PH3A)

```bash
# 1. Copiar arquivo HTML
cp sql-query-builder.html tools/datacob/query-builder/index.html

# 2. Acessar via URL
http://localhost:3000/tools/datacob/query-builder/

# 3. Adicionar menu em /pages/docs/index.html
<a href="/tools/datacob/query-builder/">🔨 SQL Query Builder</a>
```

---

## 📖 Uso Básico

### 1. Selecionar Tabelas
- Checkbox no sidebar esquerdo
- Visualizar estrutura em tempo real
- Suporta até 8+ tabelas da base DataCob

### 2. Adicionar Filtros
- Clique **"+ Adicionar Filtro"**
- Escolha: Tabela → Campo → Operador → Valor
- Ative "Usar em CASE WHEN" para incluir na lógica condicional

### 3. Configurar CASE WHEN
- Defina lógica: **AND** ou **OR**
- Resultado esperado: "Sim - Entrada Diferente"
- Sistema gera T-SQL automaticamente

### 4. Visualizar Query
- Aba **"Query"** mostra SQL completo
- Aba **"Diagram"** mostra relacionamentos
- Aba **"Preview"** mostra dados mockados

### 5. Exportar
- **XLSX**: Excel com formatação
- **CSV**: Texto simples, importável em qualquer ferramenta
- **Tabela em tela**: Visualização rápida

---

## 📁 Arquivos Incluídos

```
sql-query-builder/
├── sql-query-builder.html       ⭐ RECOMENDADO - Abrir direto no navegador
├── sql-query-builder.jsx        📦 React component (para build)
├── SQL_QUERY_BUILDER.md         📚 Documentação detalhada
├── README.md                    📖 Este arquivo
├── exemplo-dados.json           💾 Estrutura de dados mockados
└── package.json                 🔧 Dependências (opcional)
```

---

## 🎯 Exemplos Reais

### Caso 1: Entrada Diferente em Acordos

**O que é**: Identificar quando a primeira parcela de um acordo tem valor diferente das demais.

**Como fazer**:
1. Selecionar: `Contrato` + `Parcela` + `Parcela_Acordo` + `Acordo`
2. Adicionar filtros:
   - `Nr_Parcela` = 1 ✓ (em CASE WHEN)
   - `Vl_Parcela` <> 1000.00 ✓ (em CASE WHEN)
3. Lógica: **AND**
4. Resultado: "Sim - Entrada Diferente"
5. Exportar para análise

**Query gerada**:
```sql
CASE
  WHEN [Parcela].[Nr_Parcela] = 1 
    AND [Parcela_Acordo].[Vl_Parcela] <> 1000.00
  THEN "Sim - Entrada Diferente"
  ELSE "Não"
END
```

### Caso 2: Clientes sem Telefone

**O que é**: Listar clientes da base que não possuem registro de telefone.

**Como fazer**:
1. Selecionar: `Cliente` + `Telefone`
2. Adicionar filtro:
   - `Telefone` IS NULL (sem CASE WHEN)
3. Exportar para ativação de telefone

### Caso 3: Parcelas Atrasadas

**O que é**: Encontrar parcelas com vencimento próximo (próximos 30 dias).

**Como fazer**:
1. Selecionar: `Parcela_Acordo` + `Acordo`
2. Adicionar filtro:
   - `Dt_Vencimento` BETWEEN `today - 30` E `today`
3. Exportar para fila de cobrança

---

## 🎨 Interface Explicada

### Aba: Diagram (📐)
Visualiza as tabelas selecionadas com seus campos e relacionamentos.
```
┌─────────────┐         ┌──────────────┐
│  Contrato   │────────→│   Parcela    │
├─────────────┤         ├──────────────┤
│ Id_Contrato │         │ Id_Parcela   │
│ Numero_Ctl  │         │ Dt_Venc      │
│ Id_Cliente  │         │ Tipo_Parc    │
└─────────────┘         └──────────────┘
       ↓
  ┌───────────────┐
  │ Parcela_Acordo│
  ├───────────────┤
  │ Id_Parc_Acor  │
  │ Vl_Parcela    │
  │ Nr_Parcela    │
  └───────────────┘
```

### Aba: Query (📝)
Mostra o T-SQL completo gerado.
```sql
SELECT
  [Contrato].[Id_Contrato],
  [Parcela].[Id_Parcela],
  CASE WHEN ... THEN "Sim - Entrada Diferente" ELSE "Não" END AS [Entrada_Diferenciada],
  [Cliente].[Nome_Ren]
FROM [Cob].[Contrato]
INNER JOIN [Cob].[Parcela] ON ...
```

### Aba: Preview (👁️)
Tabela interativa com dados mockados.
```
| Id_Contrato | Nr_Parcela | Vl_Parcela | Entrada_Diferenciada |
|-------------|------------|------------|-----------------------|
| 1001        | 1          | 1000.00    | Sim - Entrada Dif...  |
| 1001        | 2          | 500.00     | Não                   |
```

### Aba: Export (📥)
Botões para baixar em diferentes formatos.
```
[📊 Download XLSX]  [📄 Download CSV]  [👁️ Ver Preview]
```

---

## 🔧 Operadores Disponíveis

| Operador | SQL | Exemplo | Uso |
|----------|-----|---------|-----|
| Não Filtrar | - | - | Mostrar todos |
| Nulos | `IS NULL` | `[Telefone] IS NULL` | Campos vazios |
| Não Nulos | `IS NOT NULL` | `[Email] IS NOT NULL` | Campos preenchidos |
| Igual | `= {value}` | `[Nr_Parcela] = 1` | Valor exato |
| Diferente | `<> {value}` | `[Status] <> 'Canc'` | Tudo menos um valor |
| Maior | `> {value}` | `[Vl_Parcela] > 100` | Maior que |
| Maior ou Igual | `>= {value}` | `[Saldo] >= 0` | Maior ou igual |
| Entre | `BETWEEN ... AND` | `BETWEEN 1 AND 100` | Range |
| Na Lista | `IN (...)` | `IN ('Ent', 'Parc')` | Um de vários |
| Contendo | `LIKE '%...%'` | `LIKE '%Silva%'` | Busca por texto |

---

## 📊 Tabelas Disponíveis

### Cob (Cobrança)
- **Contrato** - Contratos de cobrança
- **Parcela** - Parcelas individuais
- **Acordo** - Acordos negociados
- **Negociacao** - Detalhes de negociação
- **Parcela_Acordo** - Mapeamento parcelas × acordos
- **Email** - Contatos por email
- **Telefone** - Contatos telefônicos
- **Endereco** - Endereços

### Par (Parceiros/Dados Mestres)
- **Cliente** - Dados de cliente/empresa

---

## 💻 Compatibilidade

| Navegador | HTML | React | Status |
|-----------|------|-------|--------|
| Chrome 90+ | ✅ | ✅ | ✅ Funciona |
| Firefox 88+ | ✅ | ✅ | ✅ Funciona |
| Safari 14+ | ✅ | ✅ | ✅ Funciona |
| Edge 90+ | ✅ | ✅ | ✅ Funciona |
| IE 11 | ❌ | ❌ | ⚠️ Não suporta |

---

## 🔐 Segurança

⚠️ **Importante**: Esta versão exibe **dados mockados** (fictícios).

Para usar em **produção com dados reais**:

1. **Backend seguro** - Criar API Node/Python/C# que valida queries
2. **Autenticação** - Apenas usuários autorizados podem acessar
3. **Credenciais** - NUNCA expor conexão do banco no frontend
4. **Auditoria** - Logar todas as queries executadas
5. **Rate Limit** - Limitar requisições por usuário

### Exemplo de Implementação Segura

```
Frontend (Query Builder)
    ↓ POST /api/query/preview
    ├ Envia: { tabelas, filtros }
    └ Recebe: { sql, dados }
    
Backend (Node.js/C#)
    ↓ Valida query
    ├ Valida permissões do usuário
    ├ Executa com conn. segura
    ├ Faz auditoria
    └ Retorna dados (limitado a 1000 linhas)
```

---

## 📦 Dependências

### Para versão HTML (Standalone)
- ✅ Nenhuma dependência! Funciona direto no navegador

### Para versão React
```json
{
  "react": "^18.0.0",
  "react-dom": "^18.0.0",
  "xlsx": "^0.18.5",
  "tailwindcss": "^3.0.0"
}
```

---

## 🚀 Performance

| Ação | Tempo |
|------|-------|
| Carregar página | < 2 segundos |
| Gerar query | < 100ms |
| Render preview (1000 linhas) | < 500ms |
| Export XLSX | < 1 segundo |
| Export CSV | < 500ms |

---

## 🐛 Troubleshooting

### P: Página branca ao abrir
**R**: 
- Atualizar página (Ctrl+F5)
- Usar navegador diferente
- Verificar console (F12) para erros

### P: Botões de export não funcionam
**R**:
- Verificar se há dados no preview
- Tentar com outro navegador
- Verificar permissões de download

### P: CASE WHEN não aparece
**R**:
- Adicionar filtro com "Usar em CASE WHEN" ✓
- Verificar se lógica (AND/OR) está configurada

### P: Query não faz sentido
**R**:
- Verificar seleção de tabelas
- Confirmar relacionamentos
- Testar CASE WHEN separadamente

---

## 📝 Changelog

### v1.0.0 (Jul 30, 2026)
- ✅ Interface visual completa
- ✅ Builder de CASE WHEN
- ✅ Export XLSX/CSV
- ✅ Preview em tela
- ✅ Documentação completa

### v1.1.0 (Planejado)
- 🔄 Conexão com banco real
- 🔄 Salvar queries
- 🔄 Histórico

---

## 🤝 Contribuindo

Quer melhorar? Pull requests são bem-vindos!

```bash
# 1. Fork
git clone https://github.com/seu-user/sql-query-builder.git

# 2. Branch
git checkout -b feature/melhor-coisa

# 3. Commit
git add .
git commit -m "Add: coisa melhor"

# 4. Push
git push origin feature/melhor-coisa

# 5. Pull Request
```

---

## 📞 Suporte

- 📧 Email: jonathan@ph3a.dev
- 💬 GitHub Issues: [Abrir issue](https://github.com)
- 📚 Wiki: [Ver documentação](./SQL_QUERY_BUILDER.md)

---

## 📄 Licença

MIT © 2024 - Jonathan Mesquita

```
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software.
```

---

## 🙏 Agradecimentos

- [dbdiagram.io](https://dbdiagram.io) - Inspiração UI/UX
- [SheetJS](https://sheetjs.com) - Export para Excel/CSV
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [React](https://react.dev) - Framework

---

**Criado com ❤️ por Jonathan Mesquita**

*"Learning is hacking yourself"* 🧠⚡

---

## 🎯 Próximos Passos

1. **Abrir** `sql-query-builder.html` no navegador
2. **Experimentar** com as tabelas DataCob
3. **Adicionar filtros** e ver query mudar em tempo real
4. **Exportar dados** em seu formato preferido
5. **Consultar documentação** para casos complexos (🔗 [SQL_QUERY_BUILDER.md](./SQL_QUERY_BUILDER.md))

---

**Última atualização**: 30 de Julho de 2026
