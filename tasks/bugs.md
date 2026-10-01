# 🐞 Bugs

Defeitos abertos. Formato em [README.md](README.md).

- [ ] Backend externo preso em `source: "local-fallback"` 📅 2026-10-01 🔼 média #area/infra #esforco/m
  - Contexto: as rotas de IA do backend nunca usam o provedor configurado — caem sempre no
    conhecimento local. Suspeita de variável de ambiente ausente no serviço hospedado.
  - Local: fora deste repositório (serviço de API)
  - Ação: conferir variáveis e log do serviço. Hoje o chat do site não depende mais disso.
- [ ] Relevância ruim no fallback local do backend externo 📅 2026-10-01 🔽 baixa #area/infra #esforco/m
  - Contexto: num teste, devolveu artigo errado para a pergunta.
  - Ação: comparar com a busca do `apps/arriba-chat-ia`, que já ordena por relevância medida.
