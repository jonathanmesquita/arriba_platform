/* =====================================================================
   Bloco de acesso das páginas de administração (fonte única)

   As páginas de pages/admin/ têm o mesmo painel "Acesso": estado, login
   por usuário e senha, sair e aviso. Elas chamam iniciarAcessoAdmin() e
   só recebem o sinal: liberou (é administrador) ou fechou.

   Marcação esperada (ids): estado, estadoTexto, formLogin, usuario,
   senha, btnEntrar, blocoConectado, btnSair, avisoAcesso.

   Quem decide é a API, pelo cookie HttpOnly — esta página só pergunta.
   ===================================================================== */

import { API, API_PADRAO, MENSAGEM_DEMORA, entrar, lembrarAdmin, lerSessao, sair } from "./arriba-api.js";

const $ = (id) => document.getElementById(id);

export function iniciarAcessoAdmin({ aoLiberar, aoFechar } = {}) {
  function aviso(tipo, texto) {
    const a = $("avisoAcesso");
    if (!texto) { a.hidden = true; return; }
    a.dataset.tipo = tipo;
    a.textContent = texto;
    a.hidden = false;
  }

  const avisarDemora = () => aviso("info", MENSAGEM_DEMORA);

  function definirEstado(estado, usuario = "") {
    const textos = {
      verificando: "Verificando…",
      fora: "Não conectado",
      semPermissao: `Conectado como ${usuario}, sem permissão de administrador`,
      admin: `Administrador: ${usuario}`
    };
    $("estado").dataset.estado = estado;
    $("estadoTexto").textContent = textos[estado];
    $("formLogin").hidden = estado !== "fora";
    $("blocoConectado").hidden = !(estado === "admin" || estado === "semPermissao");
    if (estado === "admin") aoLiberar?.(usuario);
    else aoFechar?.();
  }

  function aplicarSessao({ conectado, usuario, papel }) {
    if (!conectado) { lembrarAdmin(false); definirEstado("fora"); return; }
    const admin = papel === "admin";
    lembrarAdmin(admin);
    definirEstado(admin ? "admin" : "semPermissao", usuario);
    if (!admin) aviso("erro", "Esta conta entra na API, mas não é de administrador. Esta página fica fechada.");
  }

  $("formLogin").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const botao = $("btnEntrar");
    botao.disabled = true;
    const r = await entrar($("usuario").value.trim(), $("senha").value, { aoDemorar: avisarDemora });
    $("senha").value = "";
    botao.disabled = false;
    aviso(null);
    if (!r.ok) { aviso("erro", r.mensagem); $("senha").focus(); return; }
    aplicarSessao({ conectado: true, usuario: r.usuario, papel: r.papel });
  });

  $("btnSair").addEventListener("click", async () => {
    await sair();
    definirEstado("fora");
    aviso("ok", "Você saiu. O atalho de administração some do chat deste navegador.");
  });

  (async () => {
    definirEstado("verificando");
    const sessao = await lerSessao({ aoDemorar: avisarDemora });
    aviso(null);
    if (sessao.falhaRede) aviso("erro", sessao.falhaRede);
    aplicarSessao(sessao);
    if (API !== API_PADRAO && $("avisoAcesso").hidden) aviso("info", `Usando a API local: ${API}`);
  })();

  return { aviso };
}
