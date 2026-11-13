const state={html:"",placeholders:[],meta:null};
const exampleHex=`0x1F8B0800000000000400ED5ADD72DBB8157E9513763AD36644533F8EE3DA92B78C24773DE358AA57C9A4571E888425AC49820B40729CEECE6CA757BDEF03D4EDC54EF7BE37BDC94CF4267D921E80A4488992EC2472B2DDA9122912001E9CFFEF1C20CD479D5E7BF0877E17C62A0C8E9AFA1302128D5A56ACEC67E7160E51E21F013443AA0878632224552DEBC5E0D8DEB7C0C96778A4688433D7CC57E3964FA7CCA3B6F951011631C548604B8F04B455B32022216D595346AF632E54914E32F3DA26711C50DB67920CF1DF904A4946D416F4928B9028C5A251F1A9B152B14DBF99B069CB7A65BF70ED360F63A2183E6BE5AC9D745BD41FD1F2760951DBA78A7A8AF1A8F08CA2018DC73CA2AD88A70F2AA6027A843B4C22E6119F834FC1F5B8C06F367488226D3E6C3AC92A5C1EB0E80AC6C879CBD26CCA03C7B944EA7267C4F928A0246672C7E3A1E349F9C525095970D33A258A1FEC56AB157CB3CA53FC826F6681A041CB92EA26A0724C69A6373300EA26A69ADDD74A53B2700260C8FD1BF823989731C501D4AAD55F1E26239A0B3BD9F100F4961570059AA9025FD2604A150A57014922694B2AD865FA947D4D87574CD97A275BB237D426FED713A91648DBA1DCBC2026BE8F363C806A3A1012316251FE7B48BCAB91E093C8B73D1E707100BFB8342F33FF9DFE50DA3532F142C96D33600732261E454AB13A5C9E13A5B921DA8D0ABD4740628953D9B7C579FD5CC26FFC3AE78085A36C7FF4D43820A8C861C0BDAB858773A1F844A137E026113A543A66D4E453F41FA25D6F614EAB91A1238A980766D60EB98F8F0F9937C177CE485C81710DDF757C37E62A5950A95947B2B9D2AEA8682A3473E9D699D2BBFB4FDCFA6E4EE1B721F519011E0537203D41690424F2E15721796DA72EB6574525FD3ADB69270D25BBE88C0BEE088F58A8D3008932A368DE17C995D77C9792273EC15455B0C49DB4C7948DC6E88E64A2F87ABA211F32F498D45173E2E9801DD04BA4515FC95BBE4A245BAD5E966D655245BE83894B1D38F8DCDE6AF2DA50762647A3BE91385A7A25EDDA7D68D79FACA58D1F4DC7E49EA3A66350A2A94DAC3392CFA660665A56298EB3304E32543309E204342C6D31CCBD3408D2786B59D5E477AA4FF35B704D381654A25B91245FDF6F37BD9F38CA046D2A1F48C04651CBF2A88EB239992C3B61E4A441549D53304F3EB26D68F7CE06EEC959F71CFAE72767ED93BE7B0AB65D5C95C8E605444ADCA21006562630FAF6C3CA5BE077D0EBF7C081D3DEEF7A8B7C2E6AE5BEBA696897367E5D7B927E5BDAD5D0D181597A49E1E560787D7DBD138F1B4483E0CE5038ED44518E648A3A2C44D8974EC047DCF6115A3D3EDC8935F6975E2440B44ED11771B8FF65C35DB12AD57B63B7BA62329530CF3DB84CA7FBE447825E6960E8DC715822E12C6BD151FED1D280285BE6D83D79E542A78B7FBF1AB8BF7FD1DD867DAAA971AA1B8CF3D0C1777C7CDCE8B60F331015C4671379B0869B5562DE57D8FAEE7A29531A71168826DBCE29148BA0FBD44079026D18DF2866CBC69E1E4965CF80D33C709D2CC02A6E2D8300A7341C0A2C410BF5E46A519C78BD901F2D566D6F592CADDCB9587BDDA7FBFBF5C339C0291E1FEC6DD03B405628CF7E98FD83038DA60C211B621AE0075635C414DF59DDFC7E1297E26B3E5C76241CD4DEFE6111DA76CF3BEBD2FC8785676D1E9CF38F3B23F4C9FEB6D1E2F837FACF5602348DAEC5B2C9CAB4A0ABA5D51092E348E39EF18B05CD16C2B7B65FF2F3A7653F5FEFD6BD60765BD1CD97E0D1E8E8DDDB631691C843DFE68FCF78481FD7DFBDD5E59199DD81C104A37948C32FD648B73EA487A2042B3F599D74A5222197981CB05D8F50E298080281CE6B44C037130A7A68843D7784A537CE4B3A0192A4BA298D3C0A3404CC8153BAB3553DE9107ED67B051D17FAEE79BB7BEA2E877061F127AA48B398337D842EC5250F989F375C8B2159DBDD9863D7056636EB97D2CFFE5D80993EFAC91065331F90455AC6CE22CA5A471D0C3C091A588840F39079EC6DA4B9D69DB6287D39A6F60BD2D73B8DF6EEDE229EEEDF691680776FFB89A01749A9F0F84C5CA4233AF5BCFB315304FCE7FBBFDE4BB34725922F839CE4E3E7857CF6D975BA158F7A89198725A908D34E49FA8EBAD02B2E9E61702BAE95FAE162AF2954E693EBA27775D1329FFD5FC286BE86023A650A91802841249715C08CA904C3CAF05F54029F688840A8D0C890A0825E8115C49B45E0206AF64FC0555832EA5A799ADB9145A69AF4C976F1E3A7A6CB366A0FA6DC9BFD085FCF6E01DBE531814BCA5003053D555039D2E39164082408AD125B0B326592EF800B3816297639AFCB63EEEBC623A6FA1C501B2016E48D39DAC6B61C4765BA6E8845CEEC16E5FC796BB8376F48D0D526D89F203A4F120DE89305547EA0741B33FB1B8C50B17ADCA80ABD379AFD806C4574C4B11A4C9B1EEDCE614CD04C69E9435307970F51E80C667F2E1DF114162505CE527BF211254E7A44666A7873A65ACBBE7D54C5B2C4E070646CD7B252CCCF2BAC85426963139112274BD731CB2750B1E03E72EFA4074E2B4E8A165E98D146FA4EEC621890E8EAAED529D7D97D018B8C93A6B706F3F24C9F67E873DD43D82A4A560B3190D5A1CB5701C9FDC3F2B105BCB79A015C4F5FDB89CDBD7D6A1387FC1F3E37B65621783AEBEB2C3DFBF794F904E1134343989E491F2E233B3A57230278242281C931880CFE1234F2E4E885863A968946E0182162763BA5819E29F6643FEF14EF2A5D3770695232AD6CE2FDCEEEC360C2B7F9E5EFC63AF9B39F66754E5E9E7CD53BDFC631563DBF0578F883E6F73C915AC48721578A8707B5BCD33EAEB5EB6E7B7EA45F33AC7F32239CF73A6E7FF697AD9D252696D87415B38DC66BB71473B5FBC59C899001F5225C3962BA2BFDFB3A5C58151F9F97F9BB2A06AB5403ACC9134BCFAD42BDB2F4F77428570735B82F06BDE7B33F0D4EDA1F76CB979759C9C944D9D9EA1B8EAB1FDE4A2BEF379357573738A65C076A878405A6060D67B7B81D62599F0BB824532EB038D74579827C2B5AC5F7B740391124F77A27CF0BB7C4056B14E8CD29E5349A8ECFA69888CC6D7AD331FF33EBBFD22D0586A9250000`;
document.addEventListener("DOMContentLoaded",bindEvents);
function bindEvents(){document.querySelectorAll("[data-scroll-to]").forEach(b=>b.addEventListener("click",()=>document.getElementById(b.dataset.scrollTo)?.scrollIntoView({behavior:"smooth",block:"start"})));document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>activateTab(b.dataset.tab)));document.getElementById("btnDecode")?.addEventListener("click",decodeInput);document.getElementById("btnUseExample")?.addEventListener("click",useExample);document.getElementById("btnClear")?.addEventListener("click",clearAll);document.getElementById("btnCopyHtml")?.addEventListener("click",()=>copyText(state.html||""));document.getElementById("btnDownloadHtml")?.addEventListener("click",downloadHtml);document.getElementById("btnCopyPlaceholders")?.addEventListener("click",copyPlaceholders)}
async function decodeInput(){const raw=document.getElementById("hexInput").value.trim();if(!raw){setMessage("Cole o hexadecimal ou a linha SQL antes de converter.","error");return}try{const hex=extractGzipHex(raw);if(!hex)throw new Error("Não encontrei um bloco hexadecimal GZIP iniciado por 0x1F8B.");const bytes=hexToBytes(hex);const html=await gunzipBytes(bytes);updateDecodedResult({html,hex,compressedBytes:bytes.length,source:"hex-gzip"});setMessage("Código convertido com sucesso. HTML decodificado e placeholders identificados.","ok");document.getElementById("step-result")?.scrollIntoView({behavior:"smooth",block:"start"})}catch(e){console.error(e);setMessage(e.message||"Falha ao converter código.","error")}}
function useExample(){const input=document.getElementById("hexInput");input.value=exampleHex;setMessage("Exemplo real carregado. Convertendo Hexadecimal → GZIP → HTML...","warn");decodeInput()}
function updateDecodedResult({html,hex,compressedBytes,source}){state.html=html;state.placeholders=extractPlaceholders(html);state.meta={source,compressedBytes,htmlChars:html.length,gzipSignature:hex?hex.slice(0,4).toUpperCase():"-",placeholderCount:state.placeholders.length,hasPix:/QrCode_Pix|Pix_CopiaCola/i.test(html),hasImage:/<img/i.test(html)};document.getElementById("sourceOutput").textContent=html;renderPreview(html);renderMeta(state.meta);renderPlaceholders(state.placeholders);updateChips(state.meta);activateTab("source")}
function extractGzipHex(raw){const compact=raw.replace(/\s+/g," ");const m1=compact.match(/0x1f8b[0-9a-f]+/i);if(m1)return m1[0].replace(/^0x/i,"").replace(/[^0-9a-f]/gi,"");const m2=compact.match(/\b1f8b[0-9a-f]{20,}\b/i);return m2?m2[0].replace(/[^0-9a-f]/gi,""):""}
function hexToBytes(hex){const clean=hex.replace(/^0x/i,"").replace(/[^0-9a-f]/gi,"");if(!clean||clean.length%2!==0)throw new Error("Hexadecimal inválido. Verifique se não faltou nenhum caractere.");const bytes=new Uint8Array(clean.length/2);for(let i=0;i<clean.length;i+=2)bytes[i/2]=parseInt(clean.slice(i,i+2),16);if(bytes[0]!==0x1f||bytes[1]!==0x8b)throw new Error("O binário não parece GZIP. A assinatura esperada é 1F 8B.");return bytes}
async function gunzipBytes(bytes){if(!("DecompressionStream" in window))throw new Error("Este navegador não suporta DecompressionStream. Use Chrome ou Edge atualizado para converter no front-end.");const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));const buffer=await new Response(stream).arrayBuffer();return decodeText(buffer)}
function decodeText(buffer){for(const enc of ["utf-8","windows-1252","iso-8859-1"]){try{const text=new TextDecoder(enc).decode(buffer);if(text&&/<\s*(p|div|span|table|html|body|img|strong|b)\b|&iquest;|¿/i.test(text))return text}catch{}}return new TextDecoder("utf-8").decode(buffer)}
function renderPreview(html){document.getElementById("previewFrame").srcdoc=`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}img{max-width:100%}</style></head><body>${html}</body></html>`}
function renderMeta(meta){const rows=[["Origem",meta.source==="hex-gzip"?"Hexadecimal + GZIP":"Exemplo HTML"],["Assinatura GZIP",meta.gzipSignature],["Tamanho compactado",meta.compressedBytes?`${meta.compressedBytes} bytes`:"-"],["Tamanho HTML",`${meta.htmlChars} caracteres`],["Placeholders",String(meta.placeholderCount)],["Possui PIX",meta.hasPix?"Sim":"Não"],["Possui imagem",meta.hasImage?"Sim":"Não"]];document.getElementById("metaOutput").innerHTML=rows.map(([l,v])=>`<div class="meta-card"><span>${escapeHtml(l)}</span><strong>${escapeHtml(v)}</strong></div>`).join("")}
function extractPlaceholders(html){const normalized=html.replace(/&amp;iquest;/gi,"¿").replace(/&iquest;/gi,"¿").replace(/&#191;/gi,"¿");const regex=/¿([^¿]+?)¿/g;const found=[];let match;while((match=regex.exec(normalized))!==null){const raw=match[1].trim();const parts=raw.split("*");found.push({raw:`¿${raw}¿`,tabela:parts[0]||"",campo:parts[1]||"",indice:parts[2]||""})}const seen=new Set();return found.filter(i=>{if(seen.has(i.raw))return false;seen.add(i.raw);return true})}
function renderPlaceholders(items){const c=document.getElementById("placeholderOutput");if(!items.length){c.innerHTML=`<div class="validation-msg">Nenhum placeholder encontrado.</div>`;return}c.innerHTML=items.map(i=>`<div class="placeholder-item"><div><span>Tabela/Função</span><strong>${escapeHtml(i.tabela||"-")}</strong></div><div><span>Campo</span><strong>${escapeHtml(i.campo||"-")}</strong></div><div><span>Índice</span><strong>${escapeHtml(i.indice||"-")}</strong></div></div>`).join("")}
function updateChips(meta){document.getElementById("chipSignature").textContent=meta.gzipSignature||"-";document.getElementById("chipFormat").textContent=meta.source==="hex-gzip"?"GZIP":"HTML";document.getElementById("chipHtml").textContent=meta.htmlChars?`${meta.htmlChars}`:"-";document.getElementById("chipPlaceholders").textContent=String(meta.placeholderCount||0)}
function activateTab(tab){document.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));document.getElementById("sourceOutput").classList.toggle("hidden",tab!=="source");document.getElementById("previewFrame").classList.toggle("hidden",tab!=="preview");document.getElementById("metaOutput").classList.toggle("hidden",tab!=="meta")}
function setMessage(text,type="warn"){const b=document.getElementById("messageBox");b.textContent=text;b.classList.toggle("ok",type==="ok");b.classList.toggle("error",type==="error")}
async function copyText(text){if(!text){setMessage("Nada para copiar ainda.","error");return}try{await navigator.clipboard.writeText(text)}catch{const t=document.createElement("textarea");t.value=text;document.body.appendChild(t);t.select();document.execCommand("copy");t.remove()}setMessage("Conteúdo copiado para a área de transferência.","ok")}
function copyPlaceholders(){if(!state.placeholders.length){setMessage("Nenhum placeholder para copiar.","error");return}const text=state.placeholders.map(i=>`${i.raw};${i.tabela};${i.campo};${i.indice}`).join("\n");copyText(`Placeholder;Tabela;Campo;Indice\n${text}`)}
function downloadHtml(){if(!state.html){setMessage("Converta um modelo antes de baixar.","error");return}const blob=new Blob(["\uFEFF"+state.html],{type:"text/html;charset=utf-8;"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="modelo-carta-decodificado.html";a.click();URL.revokeObjectURL(url);setMessage("HTML baixado com sucesso.","ok")}
function clearAll(){document.getElementById("hexInput").value="";document.getElementById("sourceOutput").textContent="Nenhum HTML decodificado ainda.";document.getElementById("previewFrame").srcdoc="";document.getElementById("metaOutput").innerHTML="";document.getElementById("placeholderOutput").innerHTML=`<div class="validation-msg">Nenhum placeholder processado ainda.</div>`;state.html="";state.placeholders=[];state.meta=null;updateChips({gzipSignature:"-",source:"-",htmlChars:"-",placeholderCount:0});setMessage("Aguardando código para conversão.","warn");activateTab("source")}
function escapeHtml(v=""){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}



/* ===========================
   Criador de Modelo Carta
=========================== */
document.addEventListener("DOMContentLoaded", bindBuilderEvents);

function bindBuilderEvents() {
  document.getElementById("btnLoadDecodedToBuilder")?.addEventListener("click", loadDecodedToBuilder);

  document.querySelectorAll("[data-command]").forEach(button => {
    button.addEventListener("click", () => runEditorCommand(button.dataset.command));
  });

  document.querySelectorAll("[data-insert]").forEach(button => {
    button.addEventListener("click", () => insertIntoBuilderEditor(button.dataset.insert));
  });

  document.getElementById("builderImageFile")?.addEventListener("change", handleBuilderImageUpload);
  document.getElementById("builderFontSize")?.addEventListener("change", applyBuilderFontSize);
  document.getElementById("btnInsertLogo")?.addEventListener("click", insertBuilderLogo);
  document.getElementById("btnInsertLink")?.addEventListener("click", insertLinkIntoBuilder);
  document.getElementById("btnSyncCode")?.addEventListener("click", toggleBuilderCode);
  document.getElementById("btnBuildTemplate")?.addEventListener("click", () => buildDefaultTemplate(true));
  document.getElementById("btnRefreshBuilderPreview")?.addEventListener("click", () => refreshBuilderPreview(true));
  document.getElementById("btnPrintBuilderPdf")?.addEventListener("click", printBuilderPdf);
  document.getElementById("btnDownloadBuilderHtml")?.addEventListener("click", downloadBuilderHtml);
  document.getElementById("btnGenerateBuilderHex")?.addEventListener("click", generateBuilderHex);
  document.getElementById("btnCopyBuilderHex")?.addEventListener("click", () => copyTextLocal(document.getElementById("builderHexOutput").value));

  const editor = document.getElementById("builderEditor");
  editor?.addEventListener("input", () => {
    syncBuilderCodeFromEditor();
    refreshBuilderPreview(false);
  });

  buildDefaultTemplate(false);
}

function buildDefaultTemplate(scroll = true) {
  const logo = getBuilderLogo();
  const fontSize = document.getElementById("builderFontSize").value || "14px";
  const html = `
<div style="font-family: Arial, sans-serif; font-size: ${fontSize}; color: #111;">
  ${logo ? `<p><img alt="Logo" src="${escapeAttributeLocal(logo)}" style="max-width: 180px; height: auto;" /></p>` : ""}
  <p>&nbsp;</p>
  <p><strong>Neocob Soluções Financeiras</strong></p>
  <div>
    <div><strong>Rua Sete de Setembro, nº 1760, 6º andar, Bairro Centro, Blumenau/SC</strong></div>
    <div><strong>Telefone: (47) 3237-2570</strong></div>
    <div><span style="color: rgb(0, 0, 255);"><strong>www.neocob.com.br</strong></span></div>
  </div>
  <p>&nbsp;</p>
  <p>
    ¿Financiado*Nome*2¿, boleto do acordo número
    <strong>¿Acordo*Nr_Acordo*2¿</strong>
    referente à empresa <strong>¿Cliente*Nome_Res*2¿</strong>.
  </p>
  <p><strong>Teste Pix QRCODE:</strong></p>
  <p style="background-color:#ffff00;">¿Funcoes_Carta*QrCode_Pix*2¿</p>
  <p><strong>Teste Pix COPIA E COLA:</strong></p>
  <p style="background-color:#ffff00;">¿Funcoes_Carta*Pix_CopiaCola*2¿</p>
  <p style="font-size: 6px;">¿Funcoes_Carta*Pix_CopiaCola*2¿</p>
</div>`.trim();

  setBuilderHtml(html);
  setBuilderMessage("Modelo base carregado. Edite o texto e gere o HTML/Hex quando estiver pronto.", "ok");

  if (scroll) {
    document.getElementById("step-builder")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function setBuilderHtml(html) {
  const editor = document.getElementById("builderEditor");
  const code = document.getElementById("builderCode");

  if (!editor || !code) return;

  editor.innerHTML = html;
  code.value = html;
  refreshBuilderPreview(false);
}

function getBuilderHtml() {
  const codeWrap = document.getElementById("builderCodeWrap");
  const code = document.getElementById("builderCode");
  const editor = document.getElementById("builderEditor");

  if (!editor || !code || !codeWrap) return "";

  if (!codeWrap.classList.contains("hidden")) {
    editor.innerHTML = code.value;
  }

  return editor.innerHTML.trim();
}

function syncBuilderCodeFromEditor() {
  const code = document.getElementById("builderCode");
  const editor = document.getElementById("builderEditor");

  if (code && editor) {
    code.value = editor.innerHTML.trim();
  }
}

function toggleBuilderCode() {
  const codeWrap = document.getElementById("builderCodeWrap");
  const code = document.getElementById("builderCode");

  if (!codeWrap || !code) return;

  const isHidden = codeWrap.classList.contains("hidden");

  if (isHidden) {
    syncBuilderCodeFromEditor();
    codeWrap.classList.remove("hidden");
    code.focus();
    setBuilderMessage("Código HTML visível. Edite com cuidado: HTML é fofo até quebrar o layout.", "warn");
  } else {
    document.getElementById("builderEditor").innerHTML = code.value;
    codeWrap.classList.add("hidden");
    refreshBuilderPreview(true);
  }
}

function refreshBuilderPreview(showMessage = true) {
  const html = getBuilderHtml();
  const preview = document.getElementById("builderPreview");

  if (preview) {
    preview.innerHTML = html || "<em>Nenhum modelo criado ainda.</em>";
  }

  syncBuilderCodeFromEditor();

  if (showMessage) {
    setBuilderMessage("Prévia atualizada.", "ok");
  }
}

function runEditorCommand(command) {
  document.getElementById("builderEditor")?.focus();
  document.execCommand(command, false, null);
  syncBuilderCodeFromEditor();
  refreshBuilderPreview(false);
}

function insertIntoBuilderEditor(text) {
  document.getElementById("builderEditor")?.focus();
  document.execCommand("insertText", false, text);
  syncBuilderCodeFromEditor();
  refreshBuilderPreview(false);
}

function insertBuilderLogo() {
  const logo = getBuilderLogo();

  if (!logo) {
    setBuilderMessage("Informe uma URL de imagem ou carregue uma imagem local antes de inserir.", "error");
    return;
  }

  insertHtmlIntoBuilder(`<p><img alt="Logo" src="${escapeAttributeLocal(logo)}" style="max-width: 180px; height: auto;" /></p>`);
}

function insertHtmlIntoBuilder(html) {
  document.getElementById("builderEditor")?.focus();
  document.execCommand("insertHTML", false, html);
  syncBuilderCodeFromEditor();
  refreshBuilderPreview(false);
}

function insertLinkIntoBuilder() {
  const url = prompt("Informe a URL do link:");

  if (!url) return;

  document.getElementById("builderEditor")?.focus();
  document.execCommand("createLink", false, url);
  syncBuilderCodeFromEditor();
  refreshBuilderPreview(false);
}

function handleBuilderImageUpload(event) {
  const file = event.target.files?.[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    setBuilderMessage("Selecione um arquivo de imagem válido.", "error");
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    state.builderImageDataUrl = String(reader.result || "");
    setBuilderMessage("Imagem local carregada. Clique em Logo para inserir no modelo.", "ok");
  };

  reader.readAsDataURL(file);
}

function getBuilderLogo() {
  return state.builderImageDataUrl || document.getElementById("builderLogoUrl")?.value.trim() || "";
}

function applyBuilderFontSize() {
  const editor = document.getElementById("builderEditor");
  const fontSize = document.getElementById("builderFontSize")?.value || "14px";

  if (!editor) return;

  editor.style.fontSize = fontSize;
  refreshBuilderPreview(false);
  setBuilderMessage(`Fonte base ajustada para ${fontSize}.`, "ok");
}

function loadDecodedToBuilder() {
  if (!state.html) {
    setMessage("Converta um modelo antes de enviar para edição.", "error");
    return;
  }

  setBuilderHtml(state.html);
  setBuilderMessage("HTML decodificado carregado no editor. Agora você pode ajustar e gerar um novo Hex/GZIP.", "ok");
  document.getElementById("step-builder")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function downloadBuilderHtml() {
  const html = getBuilderHtml();

  if (!html) {
    setBuilderMessage("Crie ou edite um modelo antes de baixar.", "error");
    return;
  }

  const filename = slugifyLocal(document.getElementById("builderTitle")?.value || "modelo-carta") + ".html";
  downloadTextFileLocal(filename, "\uFEFF" + html, "text/html;charset=utf-8;");
  setBuilderMessage("HTML do modelo baixado com sucesso.", "ok");
}

function printBuilderPdf() {
  const html = getBuilderHtml();

  if (!html) {
    setBuilderMessage("Crie ou edite um modelo antes de gerar PDF.", "error");
    return;
  }

  const printWindow = window.open("", "_blank", "noopener,noreferrer");

  if (!printWindow) {
    setBuilderMessage("O navegador bloqueou a janela de impressão. Libere pop-ups para esta página.", "error");
    return;
  }

  const title = document.getElementById("builderTitle")?.value || "Modelo Carta";

  printWindow.document.open();
  printWindow.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${escapeHtmlLocal(title)}</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111;line-height:1.6}img{max-width:100%}@page{margin:20mm}</style></head><body>${html}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();

  setBuilderMessage("Janela de impressão aberta. Escolha “Salvar como PDF”.", "ok");
}

async function generateBuilderHex() {
  const html = getBuilderHtml();

  if (!html) {
    setBuilderMessage("Crie ou edite um modelo antes de gerar Hex/GZIP.", "error");
    return;
  }

  try {
    const hex = await gzipHtmlToHex(html);
    document.getElementById("builderHexOutput").value = hex;
    setBuilderMessage("Hex/GZIP gerado com sucesso. Use este conteúdo no campo Arquivo quando aplicável.", "ok");
  } catch (error) {
    console.error(error);
    setBuilderMessage(error.message || "Falha ao gerar Hex/GZIP.", "error");
  }
}

async function gzipHtmlToHex(html) {
  if (!("CompressionStream" in window)) {
    throw new Error("Este navegador não suporta CompressionStream. Use Chrome ou Edge atualizado.");
  }

  const bytes = new TextEncoder().encode(html);
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  const buffer = await new Response(stream).arrayBuffer();
  const hex = Array.from(new Uint8Array(buffer))
    .map(byte => byte.toString(16).padStart(2, "0").toUpperCase())
    .join("");

  return `0x${hex}`;
}

async function copyTextLocal(text) {
  if (!text) {
    setBuilderMessage("Nada para copiar ainda.", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  setBuilderMessage("Conteúdo copiado para a área de transferência.", "ok");
}

function setBuilderMessage(text, type = "ok") {
  const box = document.getElementById("builderMessage");

  if (!box) return;

  box.textContent = text;
  box.classList.toggle("ok", type === "ok");
  box.classList.toggle("error", type === "error");
}

function downloadTextFileLocal(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function escapeHtmlLocal(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttributeLocal(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;");
}

function slugifyLocal(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
