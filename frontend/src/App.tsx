import { Routes, Route, Navigate } from "react-router-dom"
import PrivateRoute from "./components/PrivateRoute"
import Layout from "./components/Layout/Layout"

import HomePage from "./pages/Home/Home"
import Login from "./pages/Login/Login"
import AgendarDemo from "./pages/AgendarDemo/AgendarDemo"
import AuthCallback from "./pages/AuthCallback/AuthCallback"
import Privacy from "./pages/Privacy/Privacy"
import Terms from "./pages/Terms/Terms"

import Dashboard from "./pages/Dashboard/Dashboard"
import Stores from "./pages/Stores/Stores"
import Analytics from "./pages/Analytics/Analytics"
import Cameras from "./pages/Cameras/Cameras"
import Alerts from "./pages/Alerts/Alerts"
import Settings from "./pages/Settings/Settings"
import ProfilePage from "./pages/Profile/Profile"
import Upgrade from "./pages/Billing/Upgrade"
import EdgeHelp from "./pages/EdgeHelp/EdgeHelp"

// ✅ Alerts stack
import AlertRules from "./pages/AlertRules/AlertRules"
import NotificationLogs from "./pages/NotificationLogs/NotificationLogs"

// 🆕 Onboarding / Register
import Register from "./pages/Register/Register"
import Onboarding from "./pages/Onboarding/Onboarding"

// 🆕 Setup técnico (EDGE-first)
import Setup from "./pages/Setup/Setup"

function App() {
  return (
    <Routes>
      {/* Rotas públicas */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
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
  )
}

export default App
