import { NavLink, useLocation } from "react-router-dom"
import {
  HomeIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  CameraIcon,
  BellAlertIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline"

const Sidebar = () => {
  const location = useLocation()

  // Considera aberto se estiver em qualquer rota de alertas
  const isAlertsOpen = location.pathname.startsWith("/app/alert")

  const navigation = [
    { name: "Dashboard", href: "/app/dashboard", icon: HomeIcon },
    { name: "Lojas", href: "/app/stores", icon: BuildingStorefrontIcon },
    { name: "Analytics", href: "/app/analytics", icon: ChartBarIcon },
    { name: "Câmeras", href: "/app/cameras", icon: CameraIcon },

    // Grupo ALERTAS (abre no HOVER)
    {
      name: "Alertas",
      href: "/app/alerts",
      icon: BellAlertIcon,
      children: [
        { name: "Feed", href: "/app/alerts" },
        { name: "Regras", href: "/app/alert-rules" },
        { name: "Logs", href: "/app/notification-logs" },
      ],
    },

    { name: "Configurações", href: "/app/settings", icon: Cog6ToothIcon },
  ]

  return (
    <aside className="hidden md:block w-64 bg-white border-r min-h-[calc(100vh-73px)]">
      <nav className="mt-8 px-4">
        <ul className="space-y-2">
          {navigation.map((item) => (
            <li
              key={item.name}
              className="relative group"
            >
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive || (item.name === "Alertas" && isAlertsOpen)
                      ? "bg-blue-50 text-blue-700 border-l-4 border-blue-500"
                      : "text-gray-700 hover:bg-gray-50"
                  }`
                }
              >
                <item.icon className="h-5 w-5 mr-3" />
                <span className="font-medium">{item.name}</span>
              </NavLink>

              {/* Submenu (abre no hover) */}
              {item.children && (
                <ul
                  className="
                    absolute left-full top-0 ml-1 w-40
                    bg-white border rounded-lg shadow-md
                    opacity-0 invisible
                    group-hover:opacity-100 group-hover:visible
                    transition-all duration-150
                    z-50
                  "
                >
                  {item.children.map((sub) => (
                    <li key={sub.href}>
                      <NavLink
                        to={sub.href}
                        className={({ isActive }) =>
                          `block px-4 py-2 text-sm ${
                            isActive
                              ? "bg-blue-50 text-blue-700"
                              : "text-gray-700 hover:bg-gray-50"
                          }`
                        }
                      >
                        {sub.name}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

export default Sidebar
