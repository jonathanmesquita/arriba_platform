# ✅ Concluídas

Histórico append-only. O relato longo de cada entrega está no `CLAUDE.md` (Status por partes);
aqui fica só o registro com data.

- [x] Gerador de dados fictícios revisado para uso rápido: gera sozinho, "Copiar" junto do resultado, menu com rótulos curtos, seletor no celular, opções lembradas, arquivo igual à tela; README da ferramenta reescrito ✅ 2026-11-13 #area/ferramentas
- [x] Histórico do git recomeçado num repositório novo, com um commit único; o anterior foi renomeado pelo dono e uma cópia do histórico antigo foi entregue a ele. Nomes de cliente e de produto saíram também dos documentos ✅ 2026-11-13 #area/infra
- [x] Dígito do RG conferido contra um gerador de referência (caso incluído nos testes) ✅ 2026-11-13 #area/ferramentas
- [x] Contraste: 74 textos reprovados que a conferência local não via (rosa do `<code>` e cinza do `.text-muted` do Bootstrap, botões escuros no tema escuro, cores do modelo de carta); a conferência agora falha se o CDN não carregar ✅ 2026-11-13 #area/site
- [x] Gerador de RG no gerador de dados fictícios (dígito verificador no padrão de São Paulo, com ou sem pontuação); o RG da "pessoa completa" passou a ter dígito válido ✅ 2026-11-13 #area/ferramentas
- [x] Gerador de dados fictícios: "Copiar dados" leva só os registros, sem a linha de título (o arquivo baixado continua com ela) ✅ 2026-11-13 #area/ferramentas
- [x] Rota antiga `POST /chat` apagada do `arriba-api` (um caminho de chat só: widget do site + IA do servidor) ✅ 2026-11-12 #area/infra
- [x] Marcas de terceiros fora do repositório: 205 logos de bancos, 3 ícones da tela do CNAB (viraram ícone neutro), 2 logos de empresa/produto e 23 imagens de capa — 233 arquivos, 22 MB ✅ 2026-11-12 #area/site
- [x] IA dentro da API (fase 3): OpenAI, Gemini e Claude com a chave no servidor, rota autenticada e chat público opcional com teto; chat do site e página de administração ligados ✅ 2026-11-10 #area/chat-ia
- [x] Busca do chat por palavra inteira: "qual a capital da França" voltou a responder "não sei" ✅ 2026-11-10 #area/site
- [x] ~~Backend externo preso em `local-fallback`~~ e ~~relevância ruim no fallback~~ — obsoletos: eram da rota antiga `/chat`, substituída por `/v1/ia/conversar` e `/publico/chat` ✅ 2026-11-10 #area/infra
- [x] Painel de controle da API (fase 2): registro sem dado pessoal, resumo por rota e por fonte, tela de administração com gráfico e tabelas ✅ 2026-11-09 #area/infra
- [x] Cartão de capa não cobre mais a pergunta no topo da home (faixa própria; conferido em 13 larguras) ✅ 2026-11-06 #area/site
- [x] Documentação do layout padrão do Gerador de CSV recriada, gerada de `layouts-csv.js` ✅ 2026-11-06 #area/ferramentas
- [x] `.env.example` dos dois apps no git (`!.env.example` no `.gitignore`) ✅ 2026-11-06 #area/chat-ia
- [x] Testes automáticos em todo PR: workflow no site (sintaxe, 22 testes da lógica, contraste) e no `arriba-api` (testes e `npm audit`) ✅ 2026-11-06 #area/infra
- [x] Testes da lógica do site: parser CSV, regras, CNAB 400 (6 layouts, ida e volta) e dados fictícios ✅ 2026-11-06 #area/ferramentas
- [x] Conferência de contraste com estados abertos (chat, mega-menu, busca) e sem falso alarme de transição ✅ 2026-11-06 #area/site
- [x] Configuração do chat movida para página de administração (só abre com sessão de administrador na API); visitante não vê mais a engrenagem ✅ 2026-11-05 #area/site
- [x] Tela "Validar e consultar pela API" no site: login por cookie `HttpOnly` ou chave só em memória, nenhum segredo no repositório ✅ 2026-11-05 #area/site
- [x] API privada no ar (`arriba-api` PR #1): chave de API, validações e consultas a APIs públicas, 44 testes ✅ 2026-11-05 #area/infra
- [x] Licença MIT no repositório (`LICENSE`), com marcas de terceiros excluídas no README e link no rodapé ✅ 2026-11-05 #area/docs
- [x] Chat do site redesenhado: conversa honesta, acessível e com estilo em fonte única ✅ 2026-11-05 #area/site
- [x] Decidido: contato da página "Sobre o autor" fica em branco — o repositório oficial está sendo criado ✅ 2026-11-05 #area/site
- [x] Login com Microsoft validado no servidor (`arriba-api`, branch da sessão) ✅ 2026-11-04 #area/infra
- [x] Nomes que dizem o que cada ferramenta faz, menu agrupado por ação ✅ 2026-11-04 #area/site
- [x] Página "Sobre o autor" refeita (era lorem ipsum, com CSS e imagens em 404) ✅ 2026-11-04 #area/site
- [x] README atualizado e `docs/preview.png` real ✅ 2026-11-04 #area/docs
- [x] Texto da home acentuado ✅ 2026-11-04 #area/site
- [x] ~~Primeira ferramenta da aba "Outros CRM"~~ — obsoleto: a aba não existe mais ✅ 2026-11-04 #area/ferramentas
- [x] ~~Padronizar os 61 manuais genéricos~~ — obsoleto: os manuais saíram na descaracterização ✅ 2026-11-04 #area/docs
- [x] Correção de contraste da paleta em todo o site, nos dois temas ✅ 2026-10-02 #area/site
- [x] Adoção da paleta boho tech / Deep Autumn (terracota, oliva, mostarda, areia) ✅ 2026-10-02 #area/site
- [x] `apps/comunicados`: portal de cartas modelo e disparo de e-mail ✅ 2026-10-02 #area/comunicados
- [x] Descaracterização: remover do repositório o que amarra a uma empresa ✅ 2026-10-01 #area/site
- [x] Base de conhecimento no chat do app (importação, busca, contexto, fontes citadas) ✅ 2026-09-22 #area/chat-ia
- [x] App de chat multi-provedor com streaming, painel de administração e auditoria ✅ 2026-09-22 #area/chat-ia
- [x] Validador de CSV + auditoria de nomes do menu e da busca ✅ 2026-09-21 #area/ferramentas
- [x] Ferramenta de negativação (validar/gerar/tabelas) + página do processo ✅ 2026-09-20 #area/ferramentas
- [x] Centro de aprendizado, playground SQL e editor web com preview ao vivo ✅ 2026-09-18 #area/site
- [x] Correção da sessão do copiloto de suporte (401 de origens diferentes) ✅ 2026-09-17 #area/ferramentas
- [x] Campo único de busca no topo (sem input duplicado no painel) ✅ 2026-09-17 #area/site
