import { Suspense, lazy } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import PrivateRoute from "./components/PrivateRoute"

const Layout = lazy(() => import("./components/Layout/Layout"))

const HomePage = lazy(() => import("./pages/Home/Home"))
const Login = lazy(() => import("./pages/Login/Login"))
const ForgotPassword = lazy(() => import("./pages/ForgotPassword/ForgotPassword"))
const AgendarDemo = lazy(() => import("./pages/AgendarDemo/AgendarDemo"))
const AuthCallback = lazy(() => import("./pages/AuthCallback/AuthCallback"))
const ResetPassword = lazy(() => import("./pages/ResetPassword/ResetPassword"))
const Privacy = lazy(() => import("./pages/Privacy/Privacy"))
const Terms = lazy(() => import("./pages/Terms/Terms"))

const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard"))
const Stores = lazy(() => import("./pages/Stores/Stores"))
const Analytics = lazy(() => import("./pages/Analytics/Analytics"))
const Cameras = lazy(() => import("./pages/Cameras/Cameras"))
const Alerts = lazy(() => import("./pages/Alerts/Alerts"))
const Settings = lazy(() => import("./pages/Settings/Settings"))
const ProfilePage = lazy(() => import("./pages/Profile/Profile"))
const Upgrade = lazy(() => import("./pages/Billing/Upgrade"))
const EdgeHelp = lazy(() => import("./pages/EdgeHelp/EdgeHelp"))

// ✅ Alerts stack
const AlertRules = lazy(() => import("./pages/AlertRules/AlertRules"))
const NotificationLogs = lazy(() => import("./pages/NotificationLogs/NotificationLogs"))

// 🆕 Onboarding / Register
const Register = lazy(() => import("./pages/Register/Register"))
const Onboarding = lazy(() => import("./pages/Onboarding/Onboarding"))

// 🆕 Setup técnico (EDGE-first)
const Setup = lazy(() => import("./pages/Setup/Setup"))

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
    Carregando...
  </div>
)

function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      {/* Rotas públicas */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/auth/reset-password" element={<ResetPassword />} />
      <Route path="/agendar-demo" element={<AgendarDemo />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />

      {/* Registro + onboarding (público por enquanto) */}
      <Route path="/register" element={<Register />} />
      <Route path="/onboarding" element={<Onboarding />} />

      {/* Rotas protegidas */}
      <Route
        path="/app"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="stores" element={<Stores />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="cameras" element={<Cameras />} />
        <Route path="alerts" element={<Alerts />} />

        {/* ✅ Alerts stack */}
        <Route path="alert-rules" element={<AlertRules />} />
        <Route path="notification-logs" element={<NotificationLogs />} />

        {/* 🧩 SETUP TÉCNICO */}
        <Route path="setup" element={<Setup />} />

        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="upgrade" element={<Upgrade />} />
        <Route path="edge-help" element={<EdgeHelp />} />
      </Route>

      {/* Compat redirects (rotas antigas sem /app) */}
      <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/stores" element={<Navigate to="/app/stores" replace />} />
      <Route path="/analytics" element={<Navigate to="/app/analytics" replace />} />
      <Route path="/cameras" element={<Navigate to="/app/cameras" replace />} />
      <Route path="/alerts" element={<Navigate to="/app/alerts" replace />} />
      <Route path="/settings" element={<Navigate to="/app/settings" replace />} />

      {/* ✅ Redirects Alerts */}
      <Route path="/alert-rules" element={<Navigate to="/app/alert-rules" replace />} />
      <Route path="/notification-logs" element={<Navigate to="/app/notification-logs" replace />} />
      <Route path="/politica-de-privacidade" element={<Navigate to="/privacy" replace />} />
      <Route path="/termos" element={<Navigate to="/terms" replace />} />

      {/* ✅ Redirects Onboarding */}

      {/* ✅ Redirect Setup (opcional) */}
      <Route path="/setup" element={<Navigate to="/app/setup" replace />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  )
}

export default App
