/* =====================================================================
   Sessão do usuário no front

   A sessão de verdade é o cookie HttpOnly que o servidor emite — este
   contexto é só o reflexo dela na tela. Consequência prática: nada aqui
   "guarda" login. Na montagem perguntamos ao servidor quem somos
   (GET /auth/me) e, a partir daí, qualquer 401 em qualquer chamada
   limpa o usuário (o cliente HTTP avisa por `definirAoPerderSessao`).

   Por isso também não existe cópia do usuário em localStorage: seria
   uma segunda fonte de verdade, capaz de mostrar cabeçalho "logado como
   fulano" depois de a sessão morrer no servidor — e de continuar
   mostrando isso no computador compartilhado do time.

   `carregando` começa em `true` e é o que impede o pisca-pisca de
   mandar para /login quem já está logado: enquanto o /auth/me não
   responde, as rotas protegidas não decidem nada.
   ===================================================================== */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ApiError, apiGet, apiPost, definirAoPerderSessao } from "../api/client";

export type PapelUsuario = "ADMIN" | "USER";

/** O usuário como a tela usa.
 *
 *  A API devolve o nome no campo `name` (é o nome da coluna no Prisma).
 *  Guardamos os dois: `nome` porque o resto da interface é em pt-BR, e
 *  `name` para não obrigar ninguém a lembrar de qual lado está. É
 *  sempre o mesmo valor. */
export interface Usuario {
  id: string;
  nome: string;
  name: string;
  email: string;
  role: PapelUsuario;
  isActive?: boolean;
  lastLoginAt?: string | null;
}

interface RespostaUsuario {
  user?: {
    id: string;
    name?: string | null;
    email: string;
    role: string;
    isActive?: boolean;
    lastLoginAt?: string | null;
  };
}

interface ValorDoContexto {
  usuario: Usuario | null;
  carregando: boolean;
  /** Lança `ApiError` quando as credenciais não servem — a tela de
   *  login mostra `.message`. */
  entrar: (email: string, senha: string) => Promise<Usuario>;
  sair: () => Promise<void>;
}

const AuthContext = createContext<ValorDoContexto | null>(null);

function normalizar(resposta: RespostaUsuario): Usuario | null {
  const bruto = resposta.user;
  if (!bruto) return null;

  const nome = bruto.name?.trim() || bruto.email;
  return {
    id: bruto.id,
    nome,
    name: nome,
    email: bruto.email,
    // O banco só tem USER e ADMIN; qualquer outra coisa é tratada como
    // o papel de menor privilégio.
    role: bruto.role === "ADMIN" ? "ADMIN" : "USER",
    isActive: bruto.isActive ?? true,
    lastLoginAt: bruto.lastLoginAt ?? null
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  // O callback de "sessão caiu" precisa ver o estado mais recente sem
  // se reinscrever a cada render; a ref resolve isso.
  const montado = useRef(true);
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  useEffect(() => {
    definirAoPerderSessao(() => {
      if (montado.current) setUsuario(null);
    });
    return () => definirAoPerderSessao(null);
  }, []);

  useEffect(() => {
    const controlador = new AbortController();
    // Requisição ABORTADA não pode encerrar o carregamento — é a
    // diferença entre "já sei quem é" e "ainda estou perguntando".
    //
    // Sem esta marca, recarregar qualquer tela logada caía no login com
    // a sessão perfeitamente válida: em desenvolvimento o StrictMode
    // monta o componente duas vezes, a primeira montagem é desfeita (e
    // aborta este fetch) e o `finally` daquele fetch morto zerava o
    // `carregando` enquanto a segunda chamada ainda estava no ar. As
    // rotas protegidas, vendo carregando=false e usuário=null,
    // redirecionavam para /login uma fração de segundo antes de a
    // resposta chegar. A mesma coisa aconteceria em produção se algo
    // abortasse a chamada.
    let abortado = false;

    // `ignorarSessaoExpirada`: aqui o 401 é a resposta normal para
    // "ninguém logado ainda", não uma sessão que caiu.
    apiGet<RespostaUsuario>("/auth/me", { signal: controlador.signal, ignorarSessaoExpirada: true })
      .then((resposta) => {
        if (montado.current) setUsuario(normalizar(resposta));
      })
      .catch((erro: unknown) => {
        if (erro instanceof ApiError && erro.cancelado) {
          abortado = true;
          return;
        }
        if (montado.current) setUsuario(null);
      })
      .finally(() => {
        if (!abortado && montado.current) setCarregando(false);
      });

    return () => controlador.abort();
  }, []);

  const entrar = useCallback(async (email: string, senha: string): Promise<Usuario> => {
    const resposta = await apiPost<RespostaUsuario>(
      "/auth/login",
      { email, senha },
      { ignorarSessaoExpirada: true }
    );

    const logado = normalizar(resposta);
    if (!logado) {
      throw new ApiError({
        code: "RESPOSTA_INVALIDA",
        status: 200,
        message: "Login aceito, mas o servidor não devolveu o usuário. Tente de novo."
      });
    }

    setUsuario(logado);
    return logado;
  }, []);

  const sair = useCallback(async () => {
    try {
      await apiPost("/auth/logout", undefined, { ignorarSessaoExpirada: true });
    } catch {
      // Sair nunca pode falhar na cara do usuário: se a chamada não foi,
      // o cookie pode ter sobrado, mas a tela já volta para o login e a
      // próxima requisição toma 401 e limpa o resto.
    } finally {
      if (montado.current) setUsuario(null);
    }
  }, []);

  const valor = useMemo<ValorDoContexto>(
    () => ({ usuario, carregando, entrar, sair }),
    [usuario, carregando, entrar, sair]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): ValorDoContexto {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    // Erro de montagem, não de usuário: aparece na primeira renderização
    // e é melhor gritar do que renderizar uma tela "deslogada" silenciosa.
    throw new Error("useAuth() precisa estar dentro de <AuthProvider>.");
  }
  return contexto;
}

/** Enquanto o /auth/me não responde não dá para decidir nada — mostrar
 *  isto evita o pisca de login que some. */
function Aguardando() {
  return (
    <div className="tela-centro">
      <p className="texto-suave" role="status">
        Carregando…
      </p>
    </div>
  );
}

/** Rota que exige sessão. Sem sessão, manda para /login guardando de
 *  onde a pessoa veio, para voltar ao lugar certo depois de entrar. */
export function RequireAuth({ children }: { children?: ReactNode }) {
  const { usuario, carregando } = useAuth();
  const localizacao = useLocation();

  if (carregando) return <Aguardando />;
  if (!usuario) return <Navigate to="/login" replace state={{ de: localizacao.pathname + localizacao.search }} />;

  return <>{children ?? <Outlet />}</>;
}

/** Rota que exige papel de administrador.
 *
 *  Quem não é admin vai para o chat, NÃO para o login: a sessão dele
 *  está perfeitamente válida, só não alcança esta tela. Mandar para o
 *  login aqui daria a impressão de sessão expirada e renderia chamado. */
export function RequireAdmin({ children }: { children?: ReactNode }) {
  const { usuario, carregando } = useAuth();
  const localizacao = useLocation();

  if (carregando) return <Aguardando />;
  if (!usuario) return <Navigate to="/login" replace state={{ de: localizacao.pathname + localizacao.search }} />;
  if (usuario.role !== "ADMIN") return <Navigate to="/" replace />;

  return <>{children ?? <Outlet />}</>;
}
