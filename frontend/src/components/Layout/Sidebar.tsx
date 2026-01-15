import { NavLink } from "react-router-dom"
import {
  HomeIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  CameraIcon,
  BellAlertIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline"

const Sidebar = () => {
  const navigation = [
    { name: "Dashboard", href: "/app/dashboard", icon: HomeIcon },
    { name: "Lojas", href: "/app/stores", icon: BuildingStorefrontIcon },
    { name: "Analytics", href: "/app/analytics", icon: ChartBarIcon },
    { name: "Câmeras", href: "/app/cameras", icon: CameraIcon },
    { name: "Alertas", href: "/app/alerts", icon: BellAlertIcon },
    { name: "Configurações", href: "/app/settings", icon: Cog6ToothIcon },
  ]

  return (
    <aside className="hidden md:block w-64 bg-white border-r min-h-[calc(100vh-73px)]">
      <nav className="mt-8 px-4">
        <ul className="space-y-2">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700 border-l-4 border-blue-500"
                      : "text-gray-700 hover:bg-gray-50"
                  }`
                }
              >
                <item.icon className="h-5 w-5 mr-3" />
                <span className="font-medium">{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

export default Sidebar
