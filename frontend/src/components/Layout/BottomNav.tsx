import { NavLink } from "react-router-dom"
import ReactDOM from "react-dom"
import { useMemo, useState } from "react"

type BottomNavProps = {
  onOpenAgent: () => void
}

export default function BottomNav({ onOpenAgent }: BottomNavProps) {
  const [infraOpen, setInfraOpen] = useState(false)

  const items = useMemo(
    () => [
      { label: "Dashboard", to: "/app/dashboard", icon: "🏠" },
      { label: "Alertas", to: "/app/alerts", icon: "🔔" },
      { label: "Analytics", to: "/app/analytics", icon: "📈" },
    ],
    []
  )

  const content = (
    <>
      {infraOpen && (
        <div className="fixed inset-0 z-[10000] flex items-end justify-center">
          <button
            type="button"
            onClick={() => setInfraOpen(false)}
            className="absolute inset-0 bg-black/40"
            aria-label="Fechar menu Infra"
          />
          <div className="relative w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">Infra</h3>
              <button
                type="button"
                onClick={() => setInfraOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
              >
                Fechar
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <NavLink
                to="/app/stores"
                onClick={() => setInfraOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Lojas
              </NavLink>
              <NavLink
                to="/app/cameras"
                onClick={() => setInfraOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Câmeras
              </NavLink>
              <NavLink
                to="/app/settings"
                onClick={() => setInfraOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Configurações
              </NavLink>
            </div>
          </div>
        </div>
      )}

      <nav className="dv-bottomnav" aria-label="Navegação inferior">
        <div className="dv-bottomnav__inner">
          <NavLink
            to={items[0].to}
            onClick={() => setInfraOpen(false)}
            className={({ isActive }) =>
              `dv-bottomnav__item ${isActive ? "is-active" : ""}`
            }
          >
            <div className="dv-bottomnav__icon">{items[0].icon}</div>
            <span className="dv-bottomnav__label">{items[0].label}</span>
          </NavLink>

          <NavLink
            to={items[1].to}
            onClick={() => setInfraOpen(false)}
            className={({ isActive }) =>
              `dv-bottomnav__item ${isActive ? "is-active" : ""}`
            }
          >
            <div className="dv-bottomnav__icon">{items[1].icon}</div>
            <span className="dv-bottomnav__label">{items[1].label}</span>
          </NavLink>

          <button
            type="button"
            onClick={onOpenAgent}
            className="dv-bottomnav__fab"
            aria-label="Abrir IA"
          >
            IA
          </button>

          <NavLink
            to={items[2].to}
            onClick={() => setInfraOpen(false)}
            className={({ isActive }) =>
              `dv-bottomnav__item ${isActive ? "is-active" : ""}`
            }
          >
            <div className="dv-bottomnav__icon">{items[2].icon}</div>
            <span className="dv-bottomnav__label">{items[2].label}</span>
          </NavLink>

          <button
            type="button"
            onClick={() => setInfraOpen((v) => !v)}
            className={`dv-bottomnav__item ${infraOpen ? "is-active" : ""}`}
            aria-label="Infra"
          >
            <div className="dv-bottomnav__icon">🧰</div>
            <span className="dv-bottomnav__label">Infra</span>
          </button>
        </div>
      </nav>
    </>
  )

  return ReactDOM.createPortal(content, document.body)
}
