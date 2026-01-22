import { Routes, Route, Navigate } from "react-router-dom"
import PrivateRoute from "./components/PrivateRoute"
import Login from "./pages/Login/Login"
import Dashboard from "./pages/Dashboard/Dashboard"
import Stores from "./pages/Stores/Stores"
import Layout from "./components/Layout/Layout"
import Analytics from "./pages/Analytics/Analytics"
import Cameras from "./pages/Cameras/Cameras"
import Alerts from "./pages/Alerts/Alerts"
import Settings from "./pages/Settings/Settings"
import HomePage from "./pages/Home/Home"
import ProfilePage from "./pages/Profile/Profile"

// 🆕 Páginas de Alerts
import AlertRules from "./pages/AlertRules/AlertRules"
import NotificationLogs from "./pages/NotificationLogs/NotificationLogs"

function App() {
  return (
    <Routes>
      {/* Rotas públicas */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Login />} />

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

        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Compat: se algum lugar ainda manda pra rotas sem /app */}
      <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/stores" element={<Navigate to="/app/stores" replace />} />
      <Route path="/analytics" element={<Navigate to="/app/analytics" replace />} />
      <Route path="/cameras" element={<Navigate to="/app/cameras" replace />} />
      <Route path="/alerts" element={<Navigate to="/app/alerts" replace />} />
      <Route path="/settings" element={<Navigate to="/app/settings" replace />} />

      {/* ✅ NOVOS REDIRECTS (o que você pediu) */}
      <Route path="/alert-rules" element={<Navigate to="/app/alert-rules" replace />} />
      <Route
        path="/notification-logs"
        element={<Navigate to="/app/notification-logs" replace />}
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
