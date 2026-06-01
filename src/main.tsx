import { createRoot } from "react-dom/client";
import { Component, type ErrorInfo, type ReactNode } from "react";
import App from "./App.tsx";
import "./index.css";
import "./styles/sidebar-fetely.css";

// Auto-reload quando um chunk lazy fica obsoleto após novo deploy.
// Evita tela branca com "Failed to fetch dynamically imported module".
const isChunkLoadError = (msg: string) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|error loading dynamically imported module/i.test(msg);

const RELOAD_KEY = "__chunk_reload_ts__";
const RELOAD_COOLDOWN_MS = 30_000;

function tryReload() {
  const now = Date.now();
  const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? "0");
  if (now - last < RELOAD_COOLDOWN_MS) return;
  sessionStorage.setItem(RELOAD_KEY, String(now));
  window.location.reload();
}

window.addEventListener("error", (e) => {
  const msg = [e.message, e.error?.message, String(e.error ?? "")].filter(Boolean).join(" ");
  if (isChunkLoadError(msg)) tryReload();
});

window.addEventListener("unhandledrejection", (e) => {
  const msg = (e.reason?.message ?? String(e.reason ?? "")) as string;
  if (isChunkLoadError(msg)) tryReload();
});

class ChunkErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo) {
    if (isChunkLoadError(error?.message ?? String(error ?? ""))) {
      tryReload();
    } else {
      console.error(error);
    }
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <ChunkErrorBoundary>
    <App />
  </ChunkErrorBoundary>
);

