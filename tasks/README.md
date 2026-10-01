# Sistema de Tarefas — Arriba Platform

Contrato de formato, herdado do modelo a empresa (BoilerplateIA). Aqui ele é **só arquivo**: os
programas do modelo que leem esta pasta (`scripts/prioridade.py`, os painéis do Obsidian,
`scripts/registrar-concluidas.py`) **não estão instalados neste repositório**. O formato é
mantido assim mesmo para que passem a funcionar no dia em que forem instalados, sem
reescrever nada.

O que isso significa na prática: **não existe `PRIORIDADE.md` nem `spec.md` aqui** (são
gerados), e ninguém escreve `[prio: N]` à mão.

## Estrutura

```
tasks/
├── README.md       Este contrato
├── human.md        🙋 Decisões que dependem do dono — a única fila que ele acompanha
├── backlog.md      Trabalho futuro, já entendido
├── bugs.md         Defeitos abertos
├── features.md     Frentes em desenvolvimento
├── ideas.md        Ideias sem compromisso, formato livre
└── concluidas.md   Histórico append-only
```

## A linha de tarefa

```markdown
- [ ] Título em uma frase 📅 2026-09-30 🔺 alta #area/ferramentas #esforco/m 🤖
  - Contexto: por que isto existe
  - Local: `tools/cobranca/cnab400/engine.js:42`
  - Ação: o que precisa ser feito
```

| Marcador | O que é |
|---|---|
| `📅 AAAA-MM-DD` | **registrada em** — quando entrou na fila (não é prazo) |
| `🎯 AAAA-MM-DD` | prazo real, só quando existe compromisso externo |
| `🔺 alta` `🔼 média` `🔽 baixa` | severidade |
| `#area/<area>` | `site`, `ferramentas`, `chat-ia`, `docs`, `infra` |
| `#esforco/p\|m\|g` | 0,5 / 1 / 3 — sem tag vale `m` |
| `🤖` | identificado pelo agente, não pedido por humano |

## Invioláveis (de `.claude/rules/tasks.md`)

1. **Trabalho identificado e não executado agora é registrado** — nunca em comentário no
   código, nunca só na conversa.
2. **Pedido a humano vai para `human.md` e só para lá.**
3. **Nunca bloquear em cima de um pedido:** registre, siga com o que não depende dele e diga
   o que ficou parado.
4. **Concluída sai do arquivo de trabalho** — o item inteiro move para `concluidas.md` com
   `✅ AAAA-MM-DD`. Quem abre `backlog.md` quer o que falta.

## Relação com o `CLAUDE.md`

O `CLAUDE.md` guarda o **estado do projeto por partes** (o que já foi entregue e as gotchas
de cada ferramenta) — é documentação. Esta pasta guarda a **fila**: o que está aberto, para
quem e em que ordem. Pendência citada lá tem item aqui; o texto longo fica lá, o item aqui
aponta para ele.
