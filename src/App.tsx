import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

function RedirectWithState({ to }: { to: string }) {
  const location = useLocation();
  return <Navigate to={to} state={location.state} replace />;
}
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import MainLayout from "@/components/layouts/MainLayout";
import { lazy, Suspense, Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// FP-01: 路由级懒加载
const LoginPage       = lazy(() => import("@/pages/LoginPage"));
const LandingPage     = lazy(() => import("@/pages/LandingPage"));
const HomePage        = lazy(() => import("@/pages/HomePage"));
const VideoCreatePage = lazy(() => import("@/pages/VideoCreatePage"));
const WorksPage       = lazy(() => import("@/pages/WorksPage"));
const AnalyticsPage   = lazy(() => import("@/pages/AnalyticsPage"));
const ProfilePage     = lazy(() => import("@/pages/ProfilePage"));
const ProductsPage    = lazy(() => import("@/pages/ProductsPage"));
const ProductSelectionPage = lazy(() => import("@/pages/ProductSelectionPage"));
const AvatarsPage     = lazy(() => import("@/pages/AvatarsPage"));
const TemplatesPage   = lazy(() => import("@/pages/TemplatesPage"));
const CreditsPage     = lazy(() => import("@/pages/CreditsPage"));
const ScriptPage      = lazy(() => import("@/pages/ScriptPage"));
const StyleCopyPage   = lazy(() => import("@/pages/StyleCopyPage"));
const KnowledgePage   = lazy(() => import("@/pages/KnowledgePage"));
const CompetitorPage  = lazy(() => import("@/pages/CompetitorPage"));
const LiveHighlightPage      = lazy(() => import("@/pages/LiveHighlightPage"));
const PromptTemplatesPage    = lazy(() => import("@/pages/PromptTemplatesPage"));
const OrderDetailPage        = lazy(() => import("@/pages/OrderDetailPage"));
const VideoEditPage          = lazy(() => import("@/pages/VideoEditPage"));
const ActivitiesPage         = lazy(() => import("@/pages/ActivitiesPage"));
const InvitePage             = lazy(() => import("@/pages/InvitePage"));
// Phase 2 新增页面
const ABTestPage             = lazy(() => import("@/pages/ABTestPage"));
const EmotionAnalysisPage    = lazy(() => import("@/pages/EmotionAnalysisPage"));
const MultiLangPage          = lazy(() => import("@/pages/MultiLangPage"));
const TaskQueuePage          = lazy(() => import("@/pages/TaskQueuePage"));
const ExportFormatsPage      = lazy(() => import("@/pages/ExportFormatsPage"));
const LLMCachePage           = lazy(() => import("@/pages/LLMCachePage"));
// Phase 3 新增页面
const TeamSpacePage          = lazy(() => import("@/pages/TeamSpacePage"));
const OpenAPIPage            = lazy(() => import("@/pages/OpenAPIPage"));
const DataFeedbackPage       = lazy(() => import("@/pages/DataFeedbackPage"));
const TrendingPatternsPage   = lazy(() => import("@/pages/TrendingPatternsPage"));
const PersonalizePage        = lazy(() => import("@/pages/PersonalizePage"));
const BatchCreatePage        = lazy(() => import("@/pages/BatchCreatePage"));
const AiToolboxPage          = lazy(() => import("@/pages/AiToolboxPage"));
const NotificationsPage      = lazy(() => import("@/pages/NotificationsPage"));
const MaterialsPage          = lazy(() => import("@/pages/MaterialsPage"));
const PublishPage            = lazy(() => import("@/pages/PublishPage"));
const DataDashboardPage      = lazy(() => import("@/pages/DataDashboardPage"));

import { supabase } from "@/db/supabase";
import PlanGate from "@/components/PlanGate";
import ForbiddenPage from "@/components/ForbiddenPage";
import { Send, CheckCircle2 } from "lucide-react";

// F-13: 页面级加载占位
function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">页面加载中...</p>
      </div>
    </div>
  );
}

// F-13: 增强型 React Error Boundary (支持重试、一键上报 error_logs)
interface EBState {
  hasError: boolean;
  error?: Error;
  reported: boolean;
  reporting: boolean;
}

class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, EBState> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, reported: false, reporting: false };
  }

  static getDerivedStateFromError(error: Error): Partial<EBState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReportError = async () => {
    if (this.state.reported || this.state.reporting) return;
    this.setState({ reporting: true });
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData?.session?.user?.id ?? null;

      await supabase.from('error_logs').insert({
        user_id: currentUserId,
        source: 'frontend_error_boundary',
        action: window.location.pathname,
        error_code: 'REACT_RENDER_CRASH',
        error_msg: this.state.error?.message ?? 'Unknown React Error',
        meta: {
          stack: this.state.error?.stack,
          url: window.location.href,
          userAgent: navigator.userAgent,
          time: new Date().toISOString(),
        },
      });
      this.setState({ reported: true, reporting: false });
    } catch (e) {
      console.warn('[ErrorBoundary] 错误日志上报失败:', e);
      this.setState({ reported: true, reporting: false });
    }
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, reported: false });
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <p className="font-semibold text-lg text-foreground">页面运行遇到了问题</p>
            <p className="text-sm text-muted-foreground text-pretty">
              {this.state.error?.message ?? '发生了意外错误，已为您保护会话安全。'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button variant="default" size="sm" onClick={this.handleReset} className="gap-1.5">
              <RefreshCw className="w-4 h-4" /> 尝试恢复
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="gap-1.5">
              刷新整个页面
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={this.state.reported || this.state.reporting}
              onClick={this.handleReportError}
              className="gap-1.5 text-xs"
            >
              {this.state.reported ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 已上报技术团队
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" /> {this.state.reporting ? '正在上报...' : '一键上报异常'}
                </>
              )}
            </Button>
          </div>

          {this.state.error?.stack && (
            <details className="mt-4 text-left max-w-xl text-xs text-muted-foreground/80 bg-muted/30 p-3 rounded-lg border border-border/50 overflow-auto max-h-40">
              <summary className="cursor-pointer font-mono mb-1 text-[11px] text-muted-foreground hover:text-foreground">
                查看技术诊断信息
              </summary>
              <pre className="whitespace-pre-wrap font-mono text-[10px] leading-tight">
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient();

function AppRoutes() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/landing" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/*" element={
          <MainLayout>
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/home" element={<RedirectWithState to="/video/create" />} />
                  <Route path="/" element={<RedirectWithState to="/video/create" />} />
                  <Route path="/video/create" element={<HomePage />} />
                  <Route path="/video/create/:projectId" element={<HomePage />} />
                  <Route path="/works" element={<WorksPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/product-selection" element={<ProductSelectionPage />} />
                  <Route path="/avatars" element={<AvatarsPage />} />
                  <Route path="/templates" element={<TemplatesPage />} />
                  <Route path="/credits" element={<CreditsPage />} />
                  <Route path="/script" element={<ScriptPage />} />
                  <Route path="/style-copy" element={<StyleCopyPage />} />
                  <Route path="/knowledge" element={<KnowledgePage />} />
                  <Route path="/competitor" element={<CompetitorPage />} />
                  <Route path="/live-highlight" element={<LiveHighlightPage />} />
                  <Route path="/prompt-templates" element={<PromptTemplatesPage />} />
                  <Route path="/order/:orderId" element={<OrderDetailPage />} />
                  <Route path="/video/edit" element={<VideoEditPage />} />
                  <Route path="/activities" element={<ActivitiesPage />} />
                  <Route path="/invite" element={<InvitePage />} />
                  <Route path="/ab-test" element={<ABTestPage />} />
                  <Route path="/emotion-analysis" element={<EmotionAnalysisPage />} />
                  <Route path="/multilang" element={<MultiLangPage />} />
                  <Route path="/task-queue" element={<TaskQueuePage />} />
                  <Route path="/export-formats" element={<ExportFormatsPage />} />
                  <Route path="/llm-cache" element={<LLMCachePage />} />
                  {/* 权限门禁与高级功能 */}
                  <Route path="/team"              element={<TeamSpacePage />} />
                  <Route path="/open-api"          element={<OpenAPIPage />} />
                  <Route path="/data-feedback"     element={<DataFeedbackPage />} />
                  <Route path="/trending-patterns" element={<TrendingPatternsPage />} />
                  <Route path="/personalize"       element={<PersonalizePage />} />
                  <Route path="/batch-create"      element={<PlanGate requiredPlan="pro" featureName="批量混剪与脚本矩阵"><BatchCreatePage /></PlanGate>} />
                  <Route path="/ai-toolbox"         element={<AiToolboxPage />} />
                  <Route path="/notifications"      element={<NotificationsPage />} />
                  <Route path="/materials"          element={<MaterialsPage />} />
                  <Route path="/publish"            element={<PublishPage />} />
                  <Route path="/data-dashboard"     element={<DataDashboardPage />} />
                  <Route path="/403"               element={<ForbiddenPage />} />
                  <Route path="/login" element={<Navigate to="/" replace />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </MainLayout>
        } />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner richColors position="top-center" />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
