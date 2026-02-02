import { useAuth } from "../../contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import logo from "../../assets/logo.png"

type HeaderProps = {
  onOpenAgent?: () => void
}

const Header = ({ onOpenAgent }: HeaderProps) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    if (window.confirm("Tem certeza que deseja sair?")) {
      await logout()
      navigate("/login", { replace: true })
    }
  }

  const displayName = user?.username || user?.email || "Perfil"
  const initial = (user?.username || user?.email || "P").charAt(0).toUpperCase()

  return (
    <header className="bg-white shadow-sm border-b relative z-50">
      <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-6 sm:py-4">

        {/* Left: Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <img src={logo} alt="DALE Vision" className="h-12 w-auto" />
          <h1 className="text-xl sm:text-2xl font-bold leading-none bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
            DALE Vision
          </h1>

        </div>

        {/* Right: Actions + User */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {/* ✅ Desktop Agent button */}
          {onOpenAgent && (
            <button
              type="button"
              onClick={onOpenAgent}
              className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-lg
              bg-gradient-to-r from-blue-500 to-purple-600
              text-white text-sm font-semibold shadow-sm
              border border-white/10
              hover:bg-white hover:from-transparent hover:to-transparent
              hover:border-gray-200
              transition group"
              aria-label="Abrir agente"
            >
              <span className="text-base leading-none">⚡</span>
             <span className="hidden md:inline group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-purple-600 group-hover:bg-clip-text group-hover:text-transparent">
              DALE Copiloto
            </span>
            </button>
          )}

          {/* Dropdown */}
          <div className="relative group">
            <button
              className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              aria-label={`Perfil de ${displayName}`}
              title={`Perfil de ${displayName}`}
            >
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                {initial}
              </div>
              <span className="hidden md:inline text-gray-700">{displayName}</span>
              <svg
                className="w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <button
                onClick={() => navigate("/app/profile")}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Meu Perfil
              </button>

              <button
                onClick={() => navigate("/app/settings")}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Configurações
              </button>
              <div className="border-t border-gray-100" />
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
