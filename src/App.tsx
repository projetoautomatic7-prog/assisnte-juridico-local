import { lazy, Suspense, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { User, ViewType } from "@/types";
import { useAutoMinuta } from "@/hooks/use-auto-minuta";
import { useKV } from "@/hooks/use-kv";
import GlobalSearch from "@/components/GlobalSearch";
import NotificationCenter from "@/components/NotificationCenter";
import Sidebar from "@/components/Sidebar";
import { SimpleAuth } from "@/components/SimpleAuth";
import { Toaster } from "@/components/ui/sonner";

// SpeedInsights só funciona no Vercel - desabilitar em outros hosts
const isVercel = typeof window !== "undefined" && window.location.hostname.includes("vercel");

// QueryClient global (criado fora do componente para evitar recriação)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// ⚡ COMPONENTES CRÍTICOS - Carregados diretamente (sempre visíveis)
import Dashboard from "@/components/Dashboard";

// ⚡ LAZY LOADING - Componentes pesados (carregam sob demanda)
// Isso melhora performance inicial e reduz bundle size
const HarveySpecterChat = lazy(() => import("@/components/HarveySpecterChat"));
const MinutasManager = lazy(() => import("@/components/MinutasManager"));
const ProcessCRM = lazy(() => import("@/components/ProcessCRM"));
const Calendar = lazy(() => import("@/components/Calendar"));
const FinancialManagement = lazy(() => import("@/components/FinancialManagement"));
const CalculadoraPrazos = lazy(() => import("@/components/CalculadoraPrazos"));
const PDFUploader = lazy(() => import("@/components/PDFUploader"));
const AIAgents = lazy(() => import("@/components/AIAgents"));
const AnalyticsDashboard = lazy(() => import("@/components/AnalyticsDashboard"));
const ExpedientePanel = lazy(() => import("@/components/ExpedientePanel"));
const BatchAnalysis = lazy(() => import("@/components/BatchAnalysis"));
const AudioTranscription = lazy(() => import("@/components/AudioTranscription"));
const DatabaseQueries = lazy(() => import("@/components/DatabaseQueries"));
const DatajudChecklist = lazy(() => import("@/components/DatajudChecklist"));
const KnowledgeBase = lazy(() => import("@/components/KnowledgeBase"));
const AcervoPJe = lazy(() => import("@/components/AcervoPJe"));

// Skeleton loader reutilizável
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
  </div>
);

const viewTypes = {
  DASHBOARD: "dashboard",
  ACERVO: "acervo",
  ACERVO_PJE: "acervo-pje",
  CRM: "crm",
  PROCESSOS: "processos",
  PROCESSES: "processes",
  CALENDAR: "calendar",
  CALENDARIO: "calendario",
  FINANCEIRO: "financial",
  FINANCIAL: "financial",
  PRAZOS: "prazos",
  CALCULADORA: "calculadora",
  CALCULATOR: "calculator",
  UPLOAD_PDF: "upload-pdf",
  MINUTAS: "minutas",
  DONNA: "donna",
  ASSISTENTE: "assistente",
  AI_AGENTS: "ai-agents",
  ANALYTICS: "analytics",
  EXPEDIENTES: "expedientes",
  BATCH: "batch",
  AUDIO: "audio",
  QUERIES: "queries",
  DATAJUD: "datajud",
  KNOWLEDGE: "knowledge",
};

function App() {
  const [currentView, setCurrentView] = useState<ViewType>("dashboard");
  const [user, setUser] = useKV<User | null>("user", null);

  // ✨ Auto-criação de minutas quando agentes completam tarefas de redação
  useAutoMinuta();

  // Fallback de roteamento: sincroniza currentView com o hash da URL
  useEffect(() => {
    const applyHashView = () => {
      if (globalThis === undefined) return;
      const hash = globalThis.location.hash.replace(/^#/, "").trim();
      if (hash) {
        setCurrentView(hash as ViewType);
      }
    };
    applyHashView();
    globalThis.addEventListener("hashchange", applyHashView);
    return () => globalThis.removeEventListener("hashchange", applyHashView);
  }, [setCurrentView]);

  const handleSimpleAuthSuccess = (user: User) => {
    setUser(user);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView(viewTypes.DASHBOARD);
  };

  const handleNavigate = (view: string) => {
    setCurrentView(view as ViewType);
  };

  const renderContent = () => {
    switch (currentView) {
      case viewTypes.DASHBOARD:
        return <Dashboard onNavigate={setCurrentView} />;

      case viewTypes.ACERVO:
      case viewTypes.ACERVO_PJE:
        return (
          <Suspense fallback={<LoadingFallback />}>
            <AcervoPJe />
          </Suspense>
        );

      case viewTypes.CRM:
      case viewTypes.PROCESSOS:
      case viewTypes.PROCESSES:
        return (
          <Suspense fallback={<LoadingFallback />}>
            <ProcessCRM />
          </Suspense>
        );

      case viewTypes.CALENDAR:
      case viewTypes.CALENDARIO:
        return (
          <Suspense fallback={<LoadingFallback />}>
            <Calendar />
          </Suspense>
        );

      case viewTypes.FINANCEIRO:
      case viewTypes.FINANCIAL:
        return (
          <Suspense fallback={<LoadingFallback />}>
            <FinancialManagement />
          </Suspense>
        );

      case viewTypes.PRAZOS:
      case viewTypes.CALCULADORA:
      case viewTypes.CALCULATOR:
        return (
          <Suspense fallback={<LoadingFallback />}>
            <CalculadoraPrazos />
          </Suspense>
        );

      case viewTypes.UPLOAD_PDF:
        return (
          <Suspense fallback={<LoadingFallback />}>
            <PDFUploader />
          </Suspense>
        );

      case viewTypes.MINUTAS:
        return (
          <Suspense fallback={<LoadingFallback />}>
            <MinutasManager />
          </Suspense>
        );

      case viewTypes.DONNA:
      case viewTypes.ASSISTENTE:
        return (
          <Suspense fallback={<LoadingFallback />}>
            <HarveySpecterChat />
          </Suspense>
        );

      case viewTypes.AI_AGENTS:
        return (
          <Suspense fallback={<LoadingFallback />}>
            <AIAgents onNavigate={setCurrentView} />
          </Suspense>
        );

      case viewTypes.ANALYTICS:
        return (
          <Suspense fallback={<LoadingFallback />}>
            <AnalyticsDashboard />
          </Suspense>
        );

      case viewTypes.EXPEDIENTES:
        return (
          <Suspense fallback={<LoadingFallback />}>
            <ExpedientePanel />
          </Suspense>
        );

      case viewTypes.BATCH:
        return (
          <Suspense fallback={<LoadingFallback />}>
            <BatchAnalysis />
          </Suspense>
        );

      case viewTypes.AUDIO:
        return (
          <Suspense fallback={<LoadingFallback />}>
            <AudioTranscription />
          </Suspense>
        );

      case viewTypes.QUERIES:
        return (
          <Suspense fallback={<LoadingFallback />}>
            <DatabaseQueries />
          </Suspense>
        );

      case viewTypes.DATAJUD:
        return (
          <Suspense fallback={<LoadingFallback />}>
            <DatajudChecklist />
          </Suspense>
        );

      case viewTypes.KNOWLEDGE:
        return (
          <Suspense fallback={<LoadingFallback />}>
            <KnowledgeBase />
          </Suspense>
        );

      default:
        return <Dashboard onNavigate={setCurrentView} />;
    }
  };

  if (!user) {
    return (
      <QueryClientProvider client={queryClient}>
        <div
          className="min-h-screen bg-background flex items-center justify-center p-4 notranslate"
          translate="no"
        >
          <div className="max-w-md w-full space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-foreground mb-2">Assistente Jurídico PJe</h1>
              <p className="text-muted-foreground">Sistema inteligente de gestão jurídica com IA</p>
            </div>

            <div className="space-y-4">
              {/* Login simples local (adm/adm123) */}
              <SimpleAuth onSuccess={handleSimpleAuthSuccess} />

              {/* GoogleAuth removido definitivamente */}
            </div>
          </div>
          <Toaster />
          
        </div>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen bg-background notranslate" translate="no">
        <Sidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          user={user}
          onLogout={handleLogout}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar com Busca Global e Notificações */}
          <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-2">
              <GlobalSearch onNavigate={handleNavigate} />
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Pressione{" "}
                <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted rounded border">/</kbd>{" "}
                para buscar
              </span>
            </div>
            <div className="flex items-center gap-2">
              <NotificationCenter onNavigate={handleNavigate} />
            </div>
          </header>
          <main
            id="main-content"
            role="main"
            aria-label="Conteúdo principal"
            className="flex-1 overflow-hidden"
          >
            <div className="h-full overflow-y-auto p-6">{renderContent()}</div>
          </main>
        </div>
        <Toaster />
        
      </div>
    </QueryClientProvider>
  );
}

export default App;
