---
paths:
  - "tasks/**"
---

# Regra: a fila de trabalho vive em `tasks/`

O **formato** da linha está em `tasks/README.md`. Esta regra é o **comportamento**.

1. **Trabalho identificado e não executado agora é registrado.** Nunca em comentário no
   código (`// TODO` some do radar), nunca só na conversa — `bugs.md` se é defeito,
   `backlog.md` se é trabalho futuro, `ideas.md` se não há compromisso. Item achado fora do
   escopo do que se está fazendo leva `🤖`, o local (`arquivo:linha`) e o motivo do adiamento.

2. **O que depende de decisão de quem é dono do projeto vai para `decisoes-pendentes.md`** —
   e só para lá. Pedido perdido no meio de um relatório não é lido e não vira decisão.

3. **Nunca bloquear em cima de um pedido.** Registre a pergunta, faça o que não depende dela
   e diga explicitamente o que ficou parado esperando resposta.

4. **Concluída sai do arquivo de trabalho.** O item inteiro (linha + sub-bullets) move para
   `concluidas.md` com `✅ AAAA-MM-DD`. Nada de `- [x]` sobrevivendo em `backlog.md` ou
   `bugs.md`: quem abre esses arquivos quer ver o que falta.

5. **Uma pendência tem um lugar só.** Se já está descrita em prosa no `CLAUDE.md`, o item
   daqui aponta para lá em vez de repetir o texto — o `CLAUDE.md` conta o estado do projeto,
   `tasks/` conta o que está aberto.
