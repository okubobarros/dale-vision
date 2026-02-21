// src/components/PrivateRoute.tsx
import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../contexts/useAuth"

interface PrivateRouteProps {
  children: React.ReactNode
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, authReady } = useAuth()
  const location = useLocation()

  if (isLoading || !authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export default PrivateRoute
