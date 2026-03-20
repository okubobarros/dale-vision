import { NavLink, useSearchParams } from "react-router-dom"

const tabs = [
  { label: "Feed", to: "/app/alerts" },
  { label: "Regras", to: "/app/alerts/rules" },
  { label: "Histórico", to: "/app/alerts/history" },
]

export function AlertsModuleTabs() {
  const [searchParams] = useSearchParams()
  const storeId = (searchParams.get("store_id") || "").trim()

  return (
    <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={storeId ? `${tab.to}?store_id=${encodeURIComponent(storeId)}` : tab.to}
          end={tab.to === "/app/alerts"}
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
