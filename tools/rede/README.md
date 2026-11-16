# Rede e diagnóstico

Duas telas que respondem perguntas de suporte sem instalar nada. Tudo roda no navegador.

## Meu IP, navegador e sistema (`meu-dispositivo/`)

Mostra o IP público, o navegador, o sistema operacional, a tela, o idioma e o fuso, e junta
tudo num texto para colar no chamado.

- O IP vem de um serviço público (ipify), porque **uma página não enxerga o próprio IP**:
  quem enxerga é o servidor do outro lado. Se o serviço não responder, a tela diz isso e o
  resto continua funcionando.
- Navegador e sistema saem de `detectar.js`, que prefere os "Client Hints" quando existem e
  cai para o texto do User-Agent. **Onde o navegador congela a versão de propósito** (o
  Chrome no Android diz sempre "Android 10"; o macOS diz sempre "10.15.7"), a tela diz que
  não dá para saber, em vez de repetir o número falso.

## Conferir DNS e e-mail de um domínio (`dns/`)

Três modos:

1. **Conferir registros** — cole o que o provedor mandou cadastrar e veja o que está
   publicado, diferente ou faltando. Aceita dois formatos de colagem (nomes e valores em
   blocos separados, ou um registro por linha).
2. **E-mail do domínio** — lê SPF, DKIM, DMARC e MX, explica o que cada um faz e aponta o
   que está errado.
3. **Consulta avulsa** — um nome, um tipo, a resposta como ela vem.

A consulta sai do navegador por "DNS sobre HTTPS", para o Google Public DNS e, se ele
falhar, para a Cloudflare. **O projeto não tem servidor no meio.**

Dois enganos de cadastro são detectados por tentativa, não por adivinhação: o domínio
repetido no nome (`em1.exemplo.com.br.exemplo.com.br`) e o CNAME criado como TXT.

O DKIM fica num nome que cada provedor escolhe (o "seletor") e o DNS não permite listar os
nomes de uma zona: ou se informa o seletor, ou a tela tenta os mais comuns. Não achar não
prova que não existe, e a tela diz isso.

## Arquivos

| Arquivo | O que é |
|---|---|
| `rede.css` | estilo das duas telas (cores só por token) |
| `dns/dns-logica.js` | consulta, leitura de SPF/DKIM/DMARC e comparação do esperado com o publicado — sem DOM |
| `meu-dispositivo/detectar.js` | leitura do navegador e do sistema — sem DOM |
| `*/script.js` | a tela de cada uma |

A lógica fica fora do `script.js` de propósito: é o que tem teste automático, em
`scripts/tests/rede.test.mjs` (20 testes, nenhum sai para a rede — o resolvedor é simulado).
