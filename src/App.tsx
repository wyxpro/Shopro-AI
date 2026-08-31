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
const DashboardPage   = lazy(() => import("@/pages/DashboardPage"));
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

// F-13: React Error Boundary
interface EBState { hasError: boolean; error?: Error }
class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, EBState> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error): EBState { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <div className="space-y-1.5">
            <p className="font-semibold text-foreground">页面出错了</p>
            <p className="text-sm text-muted-foreground max-w-xs text-pretty">
              {this.state.error?.message ?? '发生了意外错误，请刷新重试'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-1.5" />刷新页面
          </Button>
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
                  {/* Phase 3 路由 */}
                  <Route path="/team"              element={<TeamSpacePage />} />
                  <Route path="/open-api"          element={<OpenAPIPage />} />
                  <Route path="/data-feedback"     element={<DataFeedbackPage />} />
                  <Route path="/trending-patterns" element={<TrendingPatternsPage />} />
                  <Route path="/personalize"       element={<PersonalizePage />} />
                  <Route path="/batch-create"      element={<BatchCreatePage />} />
                  <Route path="/ai-toolbox"         element={<AiToolboxPage />} />
                  <Route path="/notifications"      element={<NotificationsPage />} />
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
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
