import { NavLink } from "react-router-dom"
import ReactDOM from "react-dom"
import { useMemo } from "react"

type BottomNavProps = {
  onOpenAgent: () => void
}

export default function BottomNav({ onOpenAgent }: BottomNavProps) {
  const items = useMemo(
    () => [
      { label: "Dashboard", to: "/app/dashboard", icon: "🏠" },
      { label: "Lojas", to: "/app/stores", icon: "🏪" },
      { label: "Câmeras", to: "/app/cameras", icon: "📹" },
      { label: "Alertas", to: "/app/alerts", icon: "🔔" },
    ],
    []
  )

  const content = (
    <nav className="dv-bottomnav" aria-label="Navegação inferior">
      <div className="dv-bottomnav__inner">
        <NavLink
          to={items[0].to}
          className={({ isActive }) =>
            `dv-bottomnav__item ${isActive ? "is-active" : ""}`
          }
        >
          <div className="dv-bottomnav__icon">{items[0].icon}</div>
          <span className="dv-bottomnav__label">{items[0].label}</span>
        </NavLink>

        <NavLink
          to={items[1].to}
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
          aria-label="Abrir agente"
        >
          ⚡
        </button>

        <NavLink
          to={items[2].to}
          className={({ isActive }) =>
            `dv-bottomnav__item ${isActive ? "is-active" : ""}`
          }
        >
          <div className="dv-bottomnav__icon">{items[2].icon}</div>
          <span className="dv-bottomnav__label">{items[2].label}</span>
        </NavLink>

        <NavLink
          to={items[3].to}
          className={({ isActive }) =>
            `dv-bottomnav__item ${isActive ? "is-active" : ""}`
          }
        >
          <div className="dv-bottomnav__icon">{items[3].icon}</div>
          <span className="dv-bottomnav__label">{items[3].label}</span>
        </NavLink>
      </div>
    </nav>
  )

  return ReactDOM.createPortal(content, document.body)
}
