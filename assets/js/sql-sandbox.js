/* =====================================================================
   Sandbox SQL (AlaSQL) - semeadura de tabelas em memória

   Fonte única do "como criar tabela no AlaSQL" das ferramentas de SQL do
   site (SQL Playground, sandbox das lições do Track 7 e futuras).

   POR QUE ESTE MÓDULO EXISTE
   --------------------------
   O caminho intuitivo — `SELECT * INTO tabela FROM ?` — NÃO funciona no
   AlaSQL 4: ele estoura com "Cannot read properties of undefined
   (reading 'xcolumns')". O sandbox do Track 7 usava exatamente esse
   comando dentro de um try/catch que só logava aviso, então todas as
   tabelas ficavam sem ser criadas e qualquer query respondia
   "Table does not exist: ..." — o simulador estava quebrado.

   O que funciona no AlaSQL 4 é a sequência abaixo (validada rodando
   as consultas de exemplo do playground de ponta a ponta):

       DROP TABLE IF EXISTS <tabela>   -- deixa idempotente (reload)
       CREATE TABLE <tabela>
       INSERT INTO <tabela> SELECT * FROM ?

   Tudo roda em memória, no navegador: nenhuma dessas funções abre
   conexão com banco nenhum.

   ⚠️ Nome de tabela vai concatenado no SQL (AlaSQL não aceita parâmetro
   no lugar do identificador), então só aceitamos identificador simples
   — ver validarNomeTabela().
   ===================================================================== */

// Só letras, números e underscore, começando por letra/underscore. Cobre
// os nomes reais do DataCob (Negociacao_Parcela, Parcela_Acordo...) e
// barra qualquer coisa que pudesse virar injeção no DDL concatenado.
const NOME_TABELA_VALIDO = /^[A-Za-z_][A-Za-z0-9_]*$/;

function validarNomeTabela(nome) {
  if (!NOME_TABELA_VALIDO.test(String(nome || ""))) {
    throw new Error(`Nome de tabela inválido para o sandbox: "${nome}"`);
  }
  return nome;
}

// Cria (ou recria) uma tabela em memória com as linhas informadas.
// Recriar em vez de inserir por cima deixa a chamada idempotente: dar
// reload na página não duplica linha.
export function semearTabela(nome, linhas = []) {
  validarNomeTabela(nome);
  alasql(`DROP TABLE IF EXISTS ${nome}`);
  alasql(`CREATE TABLE ${nome}`);
  if (linhas.length) {
    alasql(`INSERT INTO ${nome} SELECT * FROM ?`, [linhas]);
  }
  return nome;
}

// Semeia várias tabelas de uma vez. Aceita:
//   [{ nome, dados }]            (formato explícito)
//   [{ tabela, dados }]          (formato do DATACOB_SCHEMA)
// Devolve { ok: [...], falhas: [{ tabela, erro }] } — quem chama decide
// se avisa na tela; nada é silenciado aqui dentro.
export function semearTabelas(tabelas = []) {
  const ok = [];
  const falhas = [];

  tabelas.forEach((item) => {
    const nome = item.nome || item.tabela;
    try {
      semearTabela(nome, item.dados || []);
      ok.push(nome);
    } catch (error) {
      falhas.push({ tabela: nome, erro: error.message || String(error) });
    }
  });

  return { ok, falhas };
}

// Roda uma query medindo o tempo. Devolve sempre o mesmo formato, com
// `erro` preenchido em vez de lançar — a UI trata os dois casos igual.
export function executarQuery(sql) {
  const inicio = performance.now();
  try {
    const resultado = alasql(sql);
    return {
      linhas: Array.isArray(resultado) ? resultado : [],
      erro: null,
      duracaoMs: Math.round(performance.now() - inicio)
    };
  } catch (error) {
    return {
      linhas: null,
      erro: error.message || String(error),
      duracaoMs: Math.round(performance.now() - inicio)
    };
  }
}
