import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/sidebar-fetely.css";

// Auto-reload quando um chunk lazy fica obsoleto após novo deploy.
// Evita tela branca com "Failed to fetch dynamically imported module".
const isChunkLoadError = (msg: string) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(msg);

window.addEventListener("error", (e) => {
  if (isChunkLoadError(e.message ?? "")) {
    if (!sessionStorage.getItem("__chunk_reload__")) {
      sessionStorage.setItem("__chunk_reload__", "1");
      window.location.reload();
    }
  }
});

window.addEventListener("unhandledrejection", (e) => {
  const msg = (e.reason?.message ?? String(e.reason ?? "")) as string;
  if (isChunkLoadError(msg)) {
    if (!sessionStorage.getItem("__chunk_reload__")) {
      sessionStorage.setItem("__chunk_reload__", "1");
      window.location.reload();
    }
  }
});

// Limpa o flag após carregamento bem-sucedido
window.addEventListener("load", () => {
  setTimeout(() => sessionStorage.removeItem("__chunk_reload__"), 5000);
});

createRoot(document.getElementById("root")!).render(<App />);

