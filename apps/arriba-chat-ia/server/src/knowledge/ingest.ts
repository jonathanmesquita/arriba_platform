/* =====================================================================
   Importação da base de conhecimento

   Lê o que já existe no portal e grava no banco deste app. Quatro fontes,
   por ordem de confiança:

     1. CURADORIA      — assets/data/datacob-knowledge-base.js
                         escrita à mão pelo suporte: passo a passo,
                         checklist, caminho de tela. É o material mais
                         confiável que existe aqui.
     2. RESPOSTA_PRONTA— assets/data/respostas-predefinidas.js
     3. ERRO           — pages/docs/datacob/erros-datacob.html
     4. MANUAL         — os index.html sob docs/datacob-manuais (87 páginas)
                         (escrito assim, sem o curinga de caminho, porque
                         a sequência dele fecharia este comentário de bloco)

   POR QUE IMPORTAR EM VEZ DE LER O ARQUIVO A CADA PERGUNTA:
   o app precisa rodar sozinho (outro servidor, talvez outro repositório).
   Depender do caminho relativo do site em tempo de resposta amarraria um
   ao outro para sempre. Importar deixa o acoplamento num único momento,
   explícito, que o admin dispara quando quiser.

   As duas primeiras fontes são módulos ESM sem dependência de DOM, então
   são IMPORTADAS de verdade — nada de reparsear JavaScript com regex, que
   quebraria no primeiro reformatador. As duas últimas são HTML, e aí sim
   há extração de texto.
   ===================================================================== */

import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { prisma } from "../db.js";

export interface DocumentoParaIndexar {
  source: "CURADORIA" | "RESPOSTA_PRONTA" | "MANUAL" | "ERRO";
  externalId: string;
  title: string;
  category: string | null;
  url: string | null;
  keywords: string | null;
  content: string;
}

export interface ResultadoImportacao {
  porFonte: Record<string, number>;
  total: number;
  removidos: number;
  caracteres: number;
  avisos: string[];
}

/** Onde está o portal. Configurável porque, se um dia o app virar
 *  repositório próprio, o caminho relativo deixa de existir. */
export function raizDoSite(): string {
  const doAmbiente = process.env["SITE_ROOT"];
  if (doAmbiente) return resolve(doAmbiente);
  // server/src/knowledge -> server/src -> server -> arriba-chat-ia -> apps -> raiz
  return resolve(import.meta.dirname, "..", "..", "..", "..", "..");
}

/* ------------------------------------------------------------------
   Extração de texto de HTML

   Sem dependência nova: script/style/nav/header/footer fora, tags viram
   espaço, entidades comuns traduzidas. Não é um parser de HTML — é
   extração de texto para busca.

   O FIM DE BLOCO VIRA QUEBRA DE LINHA, e isso não é estética: o corte de
   texto repetido (abaixo) compara pedaço com pedaço, e sem a quebra um
   parágrafo do template gruda no pedaço anterior. Foi o que aconteceu com
   "Arquivo de origem <nome>.pdf O PDF original deve ser mantido…": o nome
   do arquivo, único em cada manual, tornava única uma frase que se repete
   em 61 páginas. De quebra, o contexto que vai para o modelo deixa de ser
   um parágrafo gigante sem estrutura.
   ------------------------------------------------------------------ */
const FIM_DE_BLOCO = /<\/(p|div|li|tr|h[1-6]|section|article|td|th|dt|dd|blockquote|pre|figcaption)\s*>|<br\s*\/?>/gi;

export function textoDeHtml(html: string): string {
  const semRuido = html.replace(
    /<(script|style|nav|header|footer|svg)[^>]*>[\s\S]*?<\/\1>/gi,
    " "
  );
  return semRuido
    .replace(FIM_DE_BLOCO, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    // Espaço em branco some dentro da linha; a quebra de linha sobrevive.
    .replace(/[^\S\n]+/g, " ")
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function tituloDeHtml(html: string, alternativo: string): string {
  // Título é sempre uma linha só — o texto extraído pode trazer quebra
  // (um <br> dentro do h1, por exemplo).
  const umaLinha = (t: string) => t.replace(/\s+/g, " ").trim();

  const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  if (h1?.[1]) {
    const limpo = umaLinha(textoDeHtml(h1[1]));
    if (limpo) return limpo;
  }
  const title = /<title>([\s\S]*?)<\/title>/i.exec(html);
  if (title?.[1]) {
    // Os títulos do portal terminam em "| Arriba ..." — corta o sufixo,
    // que só polui a busca.
    return umaLinha(textoDeHtml(title[1]).split("|")[0] ?? "") || alternativo;
  }
  return alternativo;
}

/* ------------------------------------------------------------------
   Fonte 1 — base curada
   ------------------------------------------------------------------ */

interface EntradaCurada {
  id?: string;
  titulo?: string;
  categoria?: string;
  palavrasChave?: string[];
  perguntaExemplo?: string;
  caminhoTela?: string;
  resumo?: string;
  passos?: string[];
  checklist?: string[];
  linkManual?: string;
  quandoEncaminharDev?: string;
  tipoFreshdeskSugerido?: string;
}

async function lerCuradoria(raiz: string, avisos: string[]): Promise<DocumentoParaIndexar[]> {
  const caminho = join(raiz, "assets", "data", "datacob-knowledge-base.js");
  if (!existsSync(caminho)) {
    avisos.push(`Base curada não encontrada em ${caminho} — nada importado dessa fonte.`);
    return [];
  }

  const modulo = (await import(pathToFileURL(caminho).href)) as {
    DATACOB_KNOWLEDGE_BASE?: EntradaCurada[];
  };
  const entradas = modulo.DATACOB_KNOWLEDGE_BASE ?? [];

  return entradas.map((entrada, i) => {
    // O texto indexado junta tudo que ajuda a responder: o caminho da
    // tela é o que o analista mais precisa, e passo a passo é o que
    // diferencia esta base de um manual genérico.
    const partes = [
      entrada.resumo,
      entrada.caminhoTela ? `Caminho na tela: ${entrada.caminhoTela}` : "",
      entrada.perguntaExemplo ? `Pergunta típica: ${entrada.perguntaExemplo}` : "",
      entrada.passos?.length ? `Passo a passo:\n${entrada.passos.map((p, n) => `${n + 1}. ${p}`).join("\n")}` : "",
      entrada.checklist?.length ? `Checklist:\n${entrada.checklist.map((c) => `- ${c}`).join("\n")}` : "",
      entrada.quandoEncaminharDev ? `Quando escalar para desenvolvimento: ${entrada.quandoEncaminharDev}` : ""
    ].filter(Boolean);

    return {
      source: "CURADORIA" as const,
      externalId: entrada.id ?? `curadoria-${i}`,
      title: entrada.titulo ?? "Sem título",
      category: entrada.categoria ?? null,
      url: entrada.linkManual ?? null,
      keywords: entrada.palavrasChave?.join(" ") ?? null,
      content: partes.join("\n\n")
    };
  });
}

/* ------------------------------------------------------------------
   Fonte 2 — respostas prontas
   ------------------------------------------------------------------ */

interface GrupoDeRespostas {
  id?: string;
  nome?: string;
  respostas?: { id?: string; titulo?: string; mensagem?: string }[];
}

async function lerRespostasProntas(raiz: string, avisos: string[]): Promise<DocumentoParaIndexar[]> {
  const caminho = join(raiz, "assets", "data", "respostas-predefinidas.js");
  if (!existsSync(caminho)) {
    avisos.push(`Respostas predefinidas não encontradas em ${caminho}.`);
    return [];
  }

  const modulo = (await import(pathToFileURL(caminho).href)) as {
    RESPOSTAS_PREDEFINIDAS?: GrupoDeRespostas[];
  };

  const docs: DocumentoParaIndexar[] = [];
  for (const grupo of modulo.RESPOSTAS_PREDEFINIDAS ?? []) {
    for (const resposta of grupo.respostas ?? []) {
      if (!resposta.mensagem) continue;
      docs.push({
        source: "RESPOSTA_PRONTA",
        externalId: `${grupo.id ?? "grupo"}/${resposta.id ?? resposta.titulo ?? ""}`,
        title: resposta.titulo ?? "Resposta pronta",
        category: grupo.nome ?? null,
        url: null,
        keywords: null,
        // O texto é a própria mensagem: serve para o modelo responder no
        // mesmo tom que o suporte já usa com o cliente.
        content: resposta.mensagem
      });
    }
  }
  return docs;
}

/* ------------------------------------------------------------------
   Fonte 3 — catálogo de erros
   ------------------------------------------------------------------ */

async function lerCatalogoDeErros(raiz: string, avisos: string[]): Promise<DocumentoParaIndexar[]> {
  const caminho = join(raiz, "pages", "docs", "datacob", "erros-datacob.html");
  if (!existsSync(caminho)) {
    avisos.push(`Catálogo de erros não encontrado em ${caminho}.`);
    return [];
  }

  const html = await readFile(caminho, "utf8");
  const texto = textoDeHtml(html);
  if (texto.length < 80) {
    avisos.push("Catálogo de erros sem texto aproveitável.");
    return [];
  }

  return [{
    source: "ERRO",
    externalId: "erros-datacob",
    title: tituloDeHtml(html, "Erros recorrentes do DataCob"),
    category: "Erros",
    url: "/pages/docs/datacob/erros-datacob.html",
    keywords: "erro codigo falha mensagem de erro",
    content: texto
  }];
}

/* ------------------------------------------------------------------
   Fonte 4 — manuais
   ------------------------------------------------------------------ */

const MINIMO_DE_TEXTO = 400; // abaixo disso é índice de categoria ou redirect

/* ------------------------------------------------------------------
   Remoção do texto repetido (boilerplate) dos manuais

   Os 61 manuais "genéricos" do portal são páginas de template: mudam o
   nome da rotina no título e repetem, palavra por palavra, o mesmo
   corpo ("Passo a passo de triagem: identificar cliente e rotina
   impactada...", "Quando encaminhar para DEV/Sistemas...").

   Medido nesta base: "cliente" aparecia em 71 dos 95 documentos,
   "carteira" em 66, "freshdesk" em 65 — não porque os manuais falem
   disso, mas porque o template fala. Isso estraga as duas pontas:

     - na BUSCA, qualquer pergunta com uma palavra do template casa com
       dezenas de manuais que não têm nada a ver (foi assim que
       "negativar um cliente" trouxe "LOGIN AD CLIENTE");
     - no CONTEXTO enviado ao modelo, o orçamento de caracteres é gasto
       com texto de template em vez de procedimento.

   A remoção é genérica, não uma lista de frases: conta em quantos
   documentos cada frase aparece e descarta as que aparecem em muitos.
   Se amanhã o template mudar, isto continua funcionando sem edição.

   O documento não é apagado quando sobra pouco — o título ("LOGIN AD
   CLIENTE") continua sendo uma informação verdadeira e pesa A na busca.
   O que deixa de existir é o corpo emprestado.
   ------------------------------------------------------------------ */

/** Em quantos documentos uma frase precisa aparecer para ser template. */
const FRACAO_BOILERPLATE = 0.4;
/** Com poucos documentos a estatística não diz nada — repetição pode ser
 *  coincidência. */
const MINIMO_DE_DOCS_PARA_DETECTAR = 10;

function frasesDe(texto: string): string[] {
  // Dois níveis: a quebra de bloco que textoDeHtml preservou e, dentro da
  // linha, a pontuação de fim de frase — um parágrafo do template pode
  // trazer várias frases, e nem todas se repetem.
  return texto.split(/\n|(?<=[.!?:])[^\S\n]+/).filter((f) => f.trim().length > 0);
}

function chaveDaFrase(frase: string): string {
  return frase.toLowerCase().replace(/\s+/g, " ").trim();
}

export function removerRepetido(textos: string[]): string[] {
  if (textos.length < MINIMO_DE_DOCS_PARA_DETECTAR) return textos;

  const limite = Math.max(2, Math.ceil(textos.length * FRACAO_BOILERPLATE));
  const porDoc = textos.map(frasesDe);
  const emQuantosDocs = new Map<string, number>();

  for (const frases of porDoc) {
    // Set: repetir a frase dentro do MESMO documento não conta duas vezes.
    for (const chave of new Set(frases.map(chaveDaFrase))) {
      emQuantosDocs.set(chave, (emQuantosDocs.get(chave) ?? 0) + 1);
    }
  }

  return porDoc.map((frases) =>
    frases
      .filter((f) => (emQuantosDocs.get(chaveDaFrase(f)) ?? 0) < limite)
      .join("\n")
      .trim()
  );
}

async function listarHtmls(dir: string): Promise<string[]> {
  const achados: string[] = [];
  const entradas = await readdir(dir, { withFileTypes: true });
  for (const entrada of entradas) {
    const caminho = join(dir, entrada.name);
    if (entrada.isDirectory()) achados.push(...(await listarHtmls(caminho)));
    else if (entrada.name.endsWith(".html")) achados.push(caminho);
  }
  return achados;
}

async function lerManuais(raiz: string, avisos: string[]): Promise<DocumentoParaIndexar[]> {
  const base = join(raiz, "tools", "datacob", "support-copilot", "docs", "datacob-manuais");
  if (!existsSync(base)) {
    avisos.push(`Pasta de manuais não encontrada em ${base}.`);
    return [];
  }

  const arquivos = await listarHtmls(base);
  const aproveitados: { arquivo: string; html: string; texto: string }[] = [];
  let descartados = 0;

  for (const arquivo of arquivos) {
    const html = await readFile(arquivo, "utf8");
    const texto = textoDeHtml(html);

    // Páginas de índice de categoria e redirects não respondem pergunta
    // nenhuma — indexá-las só faz a busca devolver casca.
    if (texto.length < MINIMO_DE_TEXTO || /^Redirecionando/i.test(texto)) {
      descartados += 1;
      continue;
    }

    aproveitados.push({ arquivo, html, texto });
  }

  // O corte de template só faz sentido com o conjunto inteiro na mão — é
  // por isso que a leitura acima junta tudo antes de montar os documentos.
  const semTemplate = removerRepetido(aproveitados.map((a) => a.texto));
  const antes = aproveitados.reduce((s, a) => s + a.texto.length, 0);
  const depois = semTemplate.reduce((s, t) => s + t.length, 0);
  let quaseVazios = 0;

  const docs: DocumentoParaIndexar[] = aproveitados.map((item, i) => {
    const relativo = relative(base, item.arquivo).split(sep).join("/");
    const categoria = relativo.split("/")[0] ?? null;
    const conteudo = semTemplate[i] ?? item.texto;
    if (conteudo.length < MINIMO_DE_TEXTO) quaseVazios += 1;

    return {
      source: "MANUAL" as const,
      externalId: relativo,
      title: tituloDeHtml(item.html, relativo),
      category: categoria,
      url: `/tools/datacob/support-copilot/docs/datacob-manuais/${relativo}`,
      keywords: categoria,
      content: conteudo
    };
  });

  if (descartados) {
    avisos.push(`${descartados} página(s) de manual ignorada(s) por serem índice de categoria ou redirect.`);
  }
  if (antes > depois) {
    avisos.push(
      `Texto repetido de template removido dos manuais: ${(antes - depois).toLocaleString("pt-BR")} caracteres ` +
      `(${Math.round(((antes - depois) / antes) * 100)}% do total lido).`
    );
  }
  if (quaseVazios) {
    avisos.push(
      `${quaseVazios} manual(is) ficaram praticamente sem texto próprio depois disso — são páginas de template ` +
      `em que só o título diz algo. Continuam indexados pelo título, mas não respondem procedimento.`
    );
  }
  return docs;
}

/* ------------------------------------------------------------------
   Importação
   ------------------------------------------------------------------ */

export async function importarBase(): Promise<ResultadoImportacao> {
  const raiz = raizDoSite();
  const avisos: string[] = [];

  const docs = [
    ...(await lerCuradoria(raiz, avisos)),
    ...(await lerRespostasProntas(raiz, avisos)),
    ...(await lerCatalogoDeErros(raiz, avisos)),
    ...(await lerManuais(raiz, avisos))
  ];

  if (docs.length === 0) {
    avisos.push(`Nenhum documento encontrado. Confira SITE_ROOT (procurei em ${raiz}).`);
    return { porFonte: {}, total: 0, removidos: 0, caracteres: 0, avisos };
  }

  const porFonte: Record<string, number> = {};
  let caracteres = 0;

  for (const doc of docs) {
    porFonte[doc.source] = (porFonte[doc.source] ?? 0) + 1;
    caracteres += doc.content.length;

    await prisma.knowledgeDoc.upsert({
      where: { source_externalId: { source: doc.source, externalId: doc.externalId } },
      create: { ...doc, charCount: doc.content.length },
      update: { ...doc, charCount: doc.content.length, indexedAt: new Date() }
    });
  }

  // Documento que sumiu da origem tem de sumir daqui também, senão a
  // busca continua devolvendo manual que foi apagado do portal.
  const chavesVivas = new Set(docs.map((d) => `${d.source}::${d.externalId}`));
  const existentes = await prisma.knowledgeDoc.findMany({ select: { id: true, source: true, externalId: true } });
  const orfaos = existentes.filter((d) => !chavesVivas.has(`${d.source}::${d.externalId}`));
  if (orfaos.length) {
    await prisma.knowledgeDoc.deleteMany({ where: { id: { in: orfaos.map((o) => o.id) } } });
  }

  return { porFonte, total: docs.length, removidos: orfaos.length, caracteres, avisos };
}
