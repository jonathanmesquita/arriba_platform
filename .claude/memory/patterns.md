# Snippets e Padrões Recorrentes — Arriba Platform

> O que se repete neste repositório, no formato em que já está certo. Copiar daqui evita
> reinventar (e evita reintroduzir bug já corrigido).

---

## Padrão: ferramenta nova do site

```
tools/<categoria>/<nome>/
├── <nome>.html     topbar → hero → sidebar/main, .btn-arriba, .panel, .card-section
└── script.js       ES module nativo; nada de bundler
```

```html
<!-- tokens.css SEMPRE antes dos outros CSS; não redeclarar :root -->
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/app.css">
<script type="module" src="./script.js"></script>
```

Depois: registrar em `assets/js/navigation-v2.js` (menu **e** `searchItems`) e rodar
`node --check assets/js/navigation-v2.js`. Ferramenta que não está no menu não existe.

---

## Padrão: ler campo de arquivo posicional (CNAB / bureau de crédito)

```js
// Posição do manual é 1-indexada e INCLUSIVA; slice() é 0-indexada e exclusiva.
const valor = linha.slice(ini - 1, fim);
```

Declaração de campo, do jeito que o motor espera:

```js
{ ini: 71, fim: 81, nome: "nossoNumero", tipo: "num", fmt: "zeros",
  exemplo: "00000000002" }   // exemplo FICTÍCIO — nunca amostra real de cliente
```

Campo sem confirmação em fonte confiável fica explicitamente marcado
(`naoConfirmado: true`), nunca estimado. Ver ADR-006.

---

## Padrão: sandbox SQL (AlaSQL)

```js
// NÃO use "SELECT * INTO tabela FROM ?" — quebra no AlaSQL 4 ('xcolumns').
alasql(`DROP TABLE IF EXISTS ${nome}`);
alasql(`CREATE TABLE ${nome} (${colunas})`);
alasql(`INSERT INTO ${nome} SELECT * FROM ?`, [linhas]);  // idempotente
```

Alias: `AS Total` quebra o parser (palavra reservada) — usar `Qtd_Linhas` e afins.
A semeadura é fonte única em `assets/js/sql-sandbox.js`; não reimplementar na ferramenta.

---

## Padrão: chamada à API no `apps/arriba-chat-ia`

```ts
// Sempre pelo client.ts — ele já manda o cookie e traduz o erro.
const dados = await apiGet<RespostaX>("/rota");
```

```ts
// Esquecer credentials: "include" faz a chamada sair sem sessão e voltar 401.
// É por isso que nenhuma tela chama fetch direto.
```

Erro da API tem formato único (`{ error, message }`): `code` é para o código decidir,
`message` é a frase em pt-BR que vai para a tela.

---

## Padrão: teste do servidor (node:test, sem framework)

```ts
import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("assunto", () => {
  test("afirma o comportamento, não a implementação", () => {
    assert.equal(funcao("entrada"), "saida");
  });
});
```

Roda com `npm test` (`node --test --import tsx tests/*.test.ts`). Teste que precisa de banco
não entra aqui — as funções testadas são puras de propósito.

---

## Padrão: dado de exemplo é sempre fictício

```js
import { gerarNome, gerarCpf, gerarCelular } from "/assets/js/fake-data-br.js";
```

Nome, CPF, telefone, e-mail, endereço e número de contrato em fixture, exemplo de campo,
schema de sandbox ou documentação são **inventados**. Amostra real de planilha de cliente
serve para validar em memória e não entra no repositório (LGPD).

---

## Padrão: biblioteca nova por CDN

```html
<script src="https://cdn.jsdelivr.net/npm/<pkg>@<versão-exata>/dist/x.min.js"
        integrity="sha384-..." crossorigin="anonymous"></script>
```

```bash
npm pack <pkg>@<versão> && tar -xOf <pkg>-<versão>.tgz package/dist/x.min.js \
  | openssl dgst -sha384 -binary | openssl base64 -A
```

Versão exata sempre — tag flutuante (`@4`) muda sozinha e impede fixar o hash.
