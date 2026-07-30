import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';

// Dados da estrutura DataCob
const TABLES_STRUCTURE = {
  Contrato: {
    schema: 'Cob',
    fields: ['Id_Contrato', 'Id_Cliente', 'Id_Grupo', 'Id_Financiado', 'Id_Cliente_Web', 'Numero_Contrato'],
    relationships: ['Parcela', 'Historico', 'Cliente', 'Grupo', 'Financiado']
  },
  Parcela: {
    schema: 'Cob',
    fields: ['Id_Parcela', 'Id_Cliente', 'Id_Contrato', 'Tipo_Parcela', 'Dt_Vencimento'],
    relationships: ['Contrato', 'Negociacao_Parcela', 'Parcela_Acordo', 'Cliente']
  },
  Acordo: {
    schema: 'Cob',
    fields: ['Id_Acordo', 'Id_Negociacao', 'Id_Agrupamento', 'Id_Cliente_Web', 'Dt_Acordo'],
    relationships: ['Negociacao', 'Parcela_Acordo']
  },
  Negociacao: {
    schema: 'Cob',
    fields: ['Id_Negociacao', 'Id_Negociacao_Parcela', 'Id_Parcela', 'Vl_Total', 'Vl_Principal'],
    relationships: ['Parcela', 'Acordo']
  },
  Parcela_Acordo: {
    schema: 'Cob',
    fields: ['Id_Parcela_Acordo', 'Id_Parcela', 'Id_Acordo', 'Dt_Vencimento', 'Vl_Parcela'],
    relationships: ['Parcela', 'Acordo']
  },
  Cliente: {
    schema: 'Par',
    fields: ['Id_Cliente', 'Id_Grupo', 'Razao', 'Nome_Ren', 'Endereco', 'Numero'],
    relationships: ['Contrato', 'Grupo']
  },
  Email: {
    schema: 'Cob',
    fields: ['Id_Email', 'Id_Financiado', 'Endereco_Email', 'Status_Email', 'Contato', 'Id_Tipo_Email'],
    relationships: []
  },
  Telefone: {
    schema: 'Cob',
    fields: ['Id_Telefone', 'Id_Financiado', 'Id_Tipo_Telefone', 'Ddd', 'Fone', 'Descricao'],
    relationships: []
  },
  Endereco: {
    schema: 'Cob',
    fields: ['Id_Endereco', 'Id_Financiado', 'Tipo_Endereco', 'Tipo_Status', 'Logradouro', 'Numero', 'Complemento'],
    relationships: []
  }
};

const FILTER_OPERATORS = [
  { id: 'no_filter', label: 'Não Filtrar', template: '' },
  { id: 'null', label: 'Nulos', template: 'IS NULL' },
  { id: 'not_null', label: 'Não Nulos', template: 'IS NOT NULL' },
  { id: 'equal', label: 'Igual', template: '= {value}' },
  { id: 'different', label: 'Diferente', template: '<> {value}' },
  { id: 'greater', label: 'Maior', template: '> {value}' },
  { id: 'greater_equal', label: 'Maior ou Igual', template: '>= {value}' },
  { id: 'between', label: 'Entre', template: 'BETWEEN {min} AND {max}' },
  { id: 'in', label: 'Na Lista', template: 'IN ({values})' },
  { id: 'not_in', label: 'Não Está na Lista', template: 'NOT IN ({values})' },
  { id: 'like_start', label: 'Começando Por', template: "LIKE '{value}%'" },
  { id: 'like_end', label: 'Terminando Por', template: "LIKE '%{value}'" },
  { id: 'like_contains', label: 'Contendo', template: "LIKE '%{value}%'" },
];

export default function SQLQueryBuilder() {
  const [selectedTables, setSelectedTables] = useState(['Contrato', 'Parcela']);
  const [conditions, setConditions] = useState([
    { field: 'Nr_Parcela', table: 'Parcela', operator: 'equal', value: '1', caseWhen: true }
  ]);
  const [caseWhenLogic, setCaseWhenLogic] = useState('AND');
  const [caseWhenResult, setCaseWhenResult] = useState('Entrada Diferente');
  const [viewMode, setViewMode] = useState('diagram'); // diagram, query, preview, export
  const [queryResult, setQueryResult] = useState([]);

  // Generate JOIN clauses based on selected tables
  const generateJoins = useCallback(() => {
    const joins = [];
    if (selectedTables.includes('Parcela') && selectedTables.includes('Contrato')) {
      joins.push('[Cob].[Parcela] INNER JOIN [Cob].[Contrato] ON [Parcela].[Id_Contrato] = [Contrato].[Id_Contrato]');
    }
    if (selectedTables.includes('Parcela_Acordo')) {
      joins.push('[Cob].[Parcela_Acordo] INNER JOIN [Cob].[Parcela] ON [PA].[Id_Parcela] = [Parcela].[Id_Parcela]');
      joins.push('[Cob].[Parcela_Acordo] INNER JOIN [Cob].[Acordo] ON [PA].[Id_Acordo] = [Acordo].[Id_Acordo]');
    }
    return joins;
  }, [selectedTables]);

  // Generate T-SQL CASE WHEN
  const generateCaseWhen = useCallback(() => {
    if (conditions.length === 0) return '';
    
    const conditionStrings = conditions
      .filter(c => c.caseWhen)
      .map(c => {
        const op = FILTER_OPERATORS.find(o => o.id === c.operator);
        let condition = op.template;
        
        if (c.operator === 'between') {
          condition = condition.replace('{min}', c.valueMin || '0').replace('{max}', c.valueMax || '0');
        } else if (c.operator === 'in' || c.operator === 'not_in') {
          condition = condition.replace('{values}', c.value || '');
        } else if (c.operator !== 'null' && c.operator !== 'not_null' && c.operator !== 'no_filter') {
          condition = condition.replace('{value}', c.value || '');
        }
        
        return `[${c.table}].[${c.field}] ${condition}`;
      });

    if (conditionStrings.length === 0) return '';

    const whenClause = conditionStrings.join(` ${caseWhenLogic} `);
    
    return `CASE
  WHEN ${whenClause}
  THEN "${caseWhenResult}"
  ELSE "Não"
END`;
  }, [conditions, caseWhenLogic, caseWhenResult]);

  // Generate full SELECT query
  const generateFullQuery = useCallback(() => {
    const baseQuery = `SELECT
  [Contrato].[Id_Contrato],
  [Contrato].[Numero_Contrato],
  [Parcela].[Id_Parcela],
  [Parcela].[Dt_Vencimento],
  [Parcela].[Tipo_Parcela],
  ${generateCaseWhen() ? `${generateCaseWhen()} AS [Entrada_Diferenciada],` : ''}
  [Cliente].[Nome_Ren]
FROM [Cob].[Contrato]
INNER JOIN [Cob].[Parcela] ON [Contrato].[Id_Contrato] = [Parcela].[Id_Contrato]
INNER JOIN [Par].[Cliente] ON [Contrato].[Id_Cliente] = [Cliente].[Id_Cliente]`;

    return baseQuery;
  }, [generateCaseWhen]);

  // Mock data generator for preview
  const generateMockData = useCallback(() => {
    const data = [];
    for (let i = 1; i <= 10; i++) {
      data.push({
        'Id_Contrato': 1000 + i,
        'Numero_Contrato': `CT-2024-${String(i).padStart(5, '0')}`,
        'Id_Parcela': i,
        'Dt_Vencimento': `2024-${String((i % 12) + 1).padStart(2, '0')}-15`,
        'Tipo_Parcela': i === 1 ? 'Entrada' : 'Parcela',
        'Entrada_Diferenciada': i === 1 ? 'Sim - Entrada Diferente' : 'Não',
        'Nome_Ren': `Cliente ${i}`
      });
    }
    setQueryResult(data);
  }, []);

  // Export to XLSX
  const exportToXLSX = useCallback(() => {
    const worksheet = XLSX.utils.json_to_sheet(queryResult);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
    XLSX.writeFile(workbook, 'query_result.xlsx');
  }, [queryResult]);

  // Export to CSV
  const exportToCSV = useCallback(() => {
    const worksheet = XLSX.utils.json_to_sheet(queryResult);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', 'query_result.csv');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }, [queryResult]);

  const toggleTable = (table) => {
    setSelectedTables(prev =>
      prev.includes(table) ? prev.filter(t => t !== table) : [...prev, table]
    );
  };

  const addCondition = () => {
    setConditions([...conditions, {
      field: 'Id_Parcela',
      table: 'Parcela',
      operator: 'equal',
      value: '',
      caseWhen: true
    }]);
  };

  const updateCondition = (index, updates) => {
    setConditions(prev => {
      const newConditions = [...prev];
      newConditions[index] = { ...newConditions[index], ...updates };
      return newConditions;
    });
  };

  const removeCondition = (index) => {
    setConditions(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">📊 SQL Query Builder - DataCob</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('diagram')}
            className={`px-4 py-2 rounded ${viewMode === 'diagram' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            Diagram
          </button>
          <button
            onClick={() => setViewMode('query')}
            className={`px-4 py-2 rounded ${viewMode === 'query' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            Query
          </button>
          <button
            onClick={() => { generateMockData(); setViewMode('preview'); }}
            className={`px-4 py-2 rounded ${viewMode === 'preview' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            Preview
          </button>
          <button
            onClick={() => setViewMode('export')}
            className={`px-4 py-2 rounded ${viewMode === 'export' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            Export
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Table Selection */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 overflow-y-auto p-4">
          <h2 className="text-lg font-bold mb-4">📋 Tabelas</h2>
          <div className="space-y-2">
            {Object.keys(TABLES_STRUCTURE).map(table => (
              <label key={table} className="flex items-center gap-2 p-2 hover:bg-gray-700 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTables.includes(table)}
                  onChange={() => toggleTable(table)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{table}</span>
              </label>
            ))}
          </div>

          <h2 className="text-lg font-bold mt-6 mb-4">🔧 Filtros</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {conditions.map((cond, idx) => (
              <div key={idx} className="bg-gray-700 p-3 rounded text-sm">
                <div className="flex gap-2 mb-2">
                  <select
                    value={cond.table}
                    onChange={(e) => updateCondition(idx, { table: e.target.value })}
                    className="flex-1 bg-gray-600 px-2 py-1 rounded text-xs"
                  >
                    {selectedTables.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeCondition(idx)}
                    className="bg-red-600 hover:bg-red-500 px-2 py-1 rounded text-xs"
                  >
                    ✕
                  </button>
                </div>
                
                <select
                  value={cond.field}
                  onChange={(e) => updateCondition(idx, { field: e.target.value })}
                  className="w-full bg-gray-600 px-2 py-1 rounded text-xs mb-2"
                >
                  {TABLES_STRUCTURE[cond.table]?.fields.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>

                <select
                  value={cond.operator}
                  onChange={(e) => updateCondition(idx, { operator: e.target.value })}
                  className="w-full bg-gray-600 px-2 py-1 rounded text-xs mb-2"
                >
                  {FILTER_OPERATORS.map(op => (
                    <option key={op.id} value={op.id}>{op.label}</option>
                  ))}
                </select>

                {(cond.operator !== 'null' && cond.operator !== 'not_null' && cond.operator !== 'no_filter') && (
                  <input
                    type="text"
                    value={cond.value}
                    onChange={(e) => updateCondition(idx, { value: e.target.value })}
                    placeholder="Valor"
                    className="w-full bg-gray-600 px-2 py-1 rounded text-xs text-white"
                  />
                )}

                <label className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    checked={cond.caseWhen}
                    onChange={(e) => updateCondition(idx, { caseWhen: e.target.checked })}
                    className="w-3 h-3"
                  />
                  <span className="text-xs">Usar em CASE WHEN</span>
                </label>
              </div>
            ))}
          </div>
          <button
            onClick={addCondition}
            className="w-full mt-3 bg-green-600 hover:bg-green-500 px-4 py-2 rounded text-sm font-semibold"
          >
            + Adicionar Filtro
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {viewMode === 'diagram' && (
            <div>
              <h2 className="text-xl font-bold mb-4">📐 Diagrama de Relacionamentos</h2>
              <div className="grid grid-cols-2 gap-4">
                {selectedTables.map(table => (
                  <div key={table} className="bg-gray-800 border-2 border-blue-500 rounded-lg p-4">
                    <h3 className="font-bold text-lg mb-2 text-blue-400">{table}</h3>
                    <div className="text-xs space-y-1">
                      <p className="text-gray-400">Schema: {TABLES_STRUCTURE[table].schema}</p>
                      <div className="mt-2">
                        <p className="text-gray-300 font-semibold">Fields:</p>
                        {TABLES_STRUCTURE[table].fields.map(f => (
                          <p key={f} className="text-gray-400 ml-2">• {f}</p>
                        ))}
                      </div>
                      {TABLES_STRUCTURE[table].relationships.length > 0 && (
                        <div className="mt-2">
                          <p className="text-gray-300 font-semibold">Relationships:</p>
                          {TABLES_STRUCTURE[table].relationships.map(r => (
                            <p key={r} className="text-yellow-400 ml-2">→ {r}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewMode === 'query' && (
            <div>
              <h2 className="text-xl font-bold mb-4">📝 Consulta T-SQL</h2>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 font-mono text-sm overflow-x-auto mb-4">
                <pre className="text-green-400">{generateFullQuery()}</pre>
              </div>

              {conditions.some(c => c.caseWhen) && (
                <div>
                  <h3 className="text-lg font-bold mb-2">CASE WHEN Configuration:</h3>
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
                    <div className="mb-3">
                      <label className="block text-sm mb-1">Lógica:</label>
                      <select
                        value={caseWhenLogic}
                        onChange={(e) => setCaseWhenLogic(e.target.value)}
                        className="w-full bg-gray-700 px-3 py-2 rounded"
                      >
                        <option value="AND">AND</option>
                        <option value="OR">OR</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Resultado THEN:</label>
                      <input
                        type="text"
                        value={caseWhenResult}
                        onChange={(e) => setCaseWhenResult(e.target.value)}
                        className="w-full bg-gray-700 px-3 py-2 rounded"
                      />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold mb-2">Generated CASE WHEN:</h3>
                  <div className="bg-gray-800 border border-green-500 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                    <pre className="text-green-400">{generateCaseWhen()}</pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {viewMode === 'preview' && (
            <div>
              <h2 className="text-xl font-bold mb-4">👁️ Preview dos Dados</h2>
              <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-700">
                    <tr>
                      {Object.keys(queryResult[0] || {}).map(key => (
                        <th key={key} className="px-4 py-2 text-left text-blue-400">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.map((row, idx) => (
                      <tr key={idx} className="border-t border-gray-700 hover:bg-gray-700">
                        {Object.values(row).map((val, i) => (
                          <td key={i} className="px-4 py-2">
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-gray-400 mt-2 text-sm">
                Total de registros: {queryResult.length}
              </p>
            </div>
          )}

          {viewMode === 'export' && (
            <div>
              <h2 className="text-xl font-bold mb-4">📥 Exportar Dados</h2>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={exportToXLSX}
                  disabled={queryResult.length === 0}
                  className="bg-green-600 hover:bg-green-500 disabled:bg-gray-600 px-6 py-4 rounded-lg text-lg font-semibold"
                >
                  📊 Download XLSX
                </button>
                <button
                  onClick={exportToCSV}
                  disabled={queryResult.length === 0}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 px-6 py-4 rounded-lg text-lg font-semibold"
                >
                  📄 Download CSV
                </button>
                <button
                  onClick={() => { generateMockData(); setViewMode('preview'); }}
                  className="bg-purple-600 hover:bg-purple-500 px-6 py-4 rounded-lg text-lg font-semibold"
                >
                  👁️ Ver Preview
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
