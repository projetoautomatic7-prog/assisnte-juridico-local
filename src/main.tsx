import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { initializeOpenTelemetry } from "./lib/otel-integration";
import "./index.css";

// 🔍 TRACING: Importar e inicializar OpenTelemetry (DEVE ser primeiro)
initializeOpenTelemetry();

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

// ✅ MONITORING: Inicialização do Sentry (lazy loaded)
let monitoringInitialized = false;

const initMonitoring = () => {
  if (monitoringInitialized) return;
  monitoringInitialized = true;

  import("./lib/monitoring")
    .then(({ initMonitoring }) => {
      initMonitoring();
      console.log("[Monitoring] Sentry inicializado");
    })
    .catch((error) => {
      console.warn("[Monitoring] Não foi possível inicializar:", error);
    });
};

// ✅ ANALYTICS: GTM + GA4 inicialização (após consentimento se LGPD requerido)
let analyticsInitialized = false;

const initAnalyticsServices = () => {
  if (analyticsInitialized) return;
  analyticsInitialized = true;

  import("./lib/analytics")
    .then(({ initAnalytics }) => {
      initAnalytics();
      console.log("[Analytics] GTM/GA4 inicializados");
    })
    .catch((error) => {
      console.warn("[Analytics] Não inicializado:", error);
    });
};

// ✅ ESTRATÉGIA DE CARREGAMENTO OTIMIZADA
// 1. Monitoring: Carrega após primeira interação ou após 3s (o que ocorrer primeiro)
// 2. Analytics: Carrega após 2s para não impactar FCP/LCP

// Porta padrão do servidor `vite preview` usada nos testes E2E
const VITE_PREVIEW_PORT = "4173";

// Detectar ambiente de teste
const isTest =
  import.meta.env.MODE === "test" ||
  (typeof globalThis !== "undefined" && globalThis.location.port === VITE_PREVIEW_PORT);

// Monitoring - Carregar após interação do usuário
const initOnInteraction = () => {
  const events: Array<keyof WindowEventMap> = ["click", "keydown", "scroll", "touchstart"];
  const handler = () => {
    events.forEach((e) => globalThis.removeEventListener(e, handler, { capture: true }));
    if ("requestIdleCallback" in globalThis) {
      requestIdleCallback(() => initMonitoring(), { timeout: 2000 });
    } else {
      setTimeout(initMonitoring, 100);
    }
  };
  events.forEach((e) =>
    globalThis.addEventListener(e, handler, { capture: true, passive: true })
  );
};

// Monitoring - Fallback após 3s se não houver interação
const initOnIdle = () => {
  if ("requestIdleCallback" in globalThis) {
    requestIdleCallback(() => setTimeout(initMonitoring, 3000), { timeout: 5000 });
  } else {
    setTimeout(initMonitoring, 5000);
  }
};

// Analytics e Monitoring - Pular em testes para acelerar
if (!isTest) {
  setTimeout(initAnalyticsServices, 2000);
  initOnInteraction();
  initOnIdle();
}

createRoot(rootElement).render(
  <ErrorBoundary>
    <StrictMode>
      <App />
    </StrictMode>
  </ErrorBoundary>
);

// ✅ Limpa o timeout de loading quando o React carrega
if (typeof (globalThis as any).__clearLoadingTimeout === "function") {
  (globalThis as any).__clearLoadingTimeout();
}
