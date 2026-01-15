import { NavLink } from "react-router-dom"

export function BottomNav({
  onOpenAgent,
}: {
  onOpenAgent: () => void
}) {
  const base =
    "flex flex-col items-center justify-center gap-1 text-xs text-white/70"
  const active = "text-white"

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0B0F14]/95 backdrop-blur">
      <div className="mx-auto grid max-w-lg grid-cols-5 px-2 py-2">
        <NavLink to="/dashboard" className={({ isActive }) => `${base} ${isActive ? active : ""}`}>
          <span className="text-lg">📡</span>
          Radar
        </NavLink>

        <NavLink to="/stores" className={({ isActive }) => `${base} ${isActive ? active : ""}`}>
          <span className="text-lg">🏬</span>
          Lojas
        </NavLink>

        <button
          onClick={onOpenAgent}
          className="flex items-center justify-center"
          type="button"
          aria-label="Abrir agente IA"
        >
          <div className="relative -mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-lime-400 to-green-500 text-black shadow-lg">
            <span className="text-xl">⚡</span>
          </div>
        </button>

        <NavLink to="/analytics" className={({ isActive }) => `${base} ${isActive ? active : ""}`}>
          <span className="text-lg">👥</span>
          Time
        </NavLink>

        <NavLink to="/cameras" className={({ isActive }) => `${base} ${isActive ? active : ""}`}>
          <span className="text-lg">📷</span>
          Monitor
        </NavLink>
      </div>
    </nav>
  )
}
