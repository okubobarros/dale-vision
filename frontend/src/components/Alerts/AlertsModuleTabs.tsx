import { NavLink } from "react-router-dom"

const tabs = [
  { label: "Feed", to: "/app/alerts" },
  { label: "Regras", to: "/app/alerts/rules" },
  { label: "Histórico", to: "/app/alerts/history" },
]

export function AlertsModuleTabs() {
  return (
    <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              isActive ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  )
}

