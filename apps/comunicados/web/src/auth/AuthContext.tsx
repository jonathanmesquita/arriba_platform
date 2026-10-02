/* =====================================================================
   Estado da sessão

   `carregando` começa em `true` e é o que impede o pisca-pisca de mandar
   para o login quem já está logado: enquanto o `/auth/me` não responde,
   as rotas protegidas não decidem nada.

   O detalhe que parece bobo e não é: requisição ABORTADA não encerra o
   carregamento. Em desenvolvimento o StrictMode monta o componente duas
   vezes e aborta o primeiro `fetch`; se o `finally` dele zerasse o
   `carregando`, a rota protegida veria "não está carregando e não tem
   usuário" e redirecionaria para o login um instante antes da resposta
   chegar — com a sessão perfeitamente válida.
   ===================================================================== */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ApiError, apiGet, apiPost, definirAoPerderSessao } from "../api/client";

export type Papel = "ADMIN" | "OPERADOR";

export interface Usuario {
  id: string;
  email: string;
  nome: string;
  papel: Papel;
  ativo: boolean;
}

interface RespostaUsuario {
  user?: Usuario | null;
}

interface ValorDoContexto {
  usuario: Usuario | null;
  carregando: boolean;
  ehAdmin: boolean;
  entrar: (email: string, senha: string) => Promise<Usuario>;
  sair: () => Promise<void>;
}

const AuthContext = createContext<ValorDoContexto | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
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
    let abortado = false;

    apiGet<RespostaUsuario>("/auth/me", { signal: controlador.signal, ignorarSessaoExpirada: true })
      .then((resposta) => {
        if (montado.current) setUsuario(resposta.user ?? null);
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
    const resposta = await apiPost<RespostaUsuario>("/auth/login", { email, senha }, { ignorarSessaoExpirada: true });
    const logado = resposta.user;
    if (!logado) throw new ApiError({ code: "RESPOSTA_INVALIDA", status: 200, message: "Resposta inesperada do servidor." });
    setUsuario(logado);
    return logado;
  }, []);

  const sair = useCallback(async () => {
    try {
      await apiPost("/auth/logout");
    } finally {
      setUsuario(null);
    }
  }, []);

  const valor = useMemo<ValorDoContexto>(
    () => ({ usuario, carregando, ehAdmin: usuario?.papel === "ADMIN", entrar, sair }),
    [usuario, carregando, entrar, sair]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): ValorDoContexto {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error("useAuth() precisa estar dentro de <AuthProvider>.");
  return contexto;
}

export function ExigeSessao({ children }: { children: ReactNode }) {
  const { usuario, carregando } = useAuth();
  const local = useLocation();

  if (carregando) return <p className="carregando">Carregando…</p>;
  if (!usuario) return <Navigate to="/entrar" replace state={{ de: local.pathname }} />;
  return <>{children}</>;
}

/** Tela só de administrador. Quem não é admin vai para o início, NÃO
 *  para o login: a sessão dele está válida, só não alcança esta tela —
 *  mandar para o login pareceria sessão expirada e renderia chamado. */
export function ExigeAdmin({ children }: { children: ReactNode }) {
  const { usuario, carregando, ehAdmin } = useAuth();

  if (carregando) return <p className="carregando">Carregando…</p>;
  if (!usuario) return <Navigate to="/entrar" replace />;
  if (!ehAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
