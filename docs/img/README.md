# Imagens do README

Capturas e GIF **gerados a partir do site rodando** (Playwright, tela 1240 px, 2x), com dados
100% fictícios. Não são mockups.

Ao mudar a tela de uma ferramenta de forma visível, refazer a captura dela: imagem velha no
README é pior que nenhuma. O GIF `cnab400-gerador.gif` segue o fluxo vazio → erro por campo →
resumo → exemplo → letra no valor → corrigido → arquivo gerado. As capturas ficam em WebP (o
GitHub exibe) para o repositório não crescer.

Para refazer: subir o site (`python3 -m http.server 8899` na raiz), abrir cada página com o
Playwright, rolar até o ponto mostrado, capturar e converter para WebP de 1600 px de largura.
Sem acesso ao CDN, servir Bootstrap e Font Awesome do espelho local (ver o cabeçalho de
`scripts/conferir-contraste.mjs`).
