import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// O front chama a API pelo mesmo host em dev, via proxy: assim o cookie de
// sessão (HttpOnly, SameSite=Lax) funciona sem CORS nem configuração extra
// no navegador. Em produção, front e API ficam atrás do mesmo domínio.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3333",
        changeOrigin: true
      }
    }
  }
});
