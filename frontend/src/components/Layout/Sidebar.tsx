import { NavLink, useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  HomeIcon,
  BuildingStorefrontIcon,
  BellAlertIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline"
import { useAuth } from "../../contexts/useAuth"
import { meService } from "../../services/me"

const Sidebar = () => {
  const location = useLocation()
  const { user } = useAuth()
  const statusQ = useQuery({
    queryKey: ["me-status-sidebar"],
    queryFn: () => meService.getStatus(),
    staleTime: 60_000,
    retry: false,
  })
  const isInternalAdmin = Boolean(
    user?.is_staff || user?.is_superuser || statusQ.data?.is_internal_admin
  )
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("dv-sidebar-collapsed") === "1"
  })

  useEffect(() => {
    localStorage.setItem("dv-sidebar-collapsed", collapsed ? "1" : "0")
  }, [collapsed])

  // Considera aberto se estiver em qualquer rota de alertas
  const isAlertsOpen = location.pathname.startsWith("/app/alerts")
  const isOperationsOpen = location.pathname.startsWith("/app/operations")

  const navigation = [
    { name: "Dashboard", href: "/app/dashboard", icon: HomeIcon },
    { name: "Operações", href: "/app/operations", icon: BuildingStorefrontIcon },
    { name: "Relatórios", href: "/app/reports", icon: DocumentTextIcon },

    // Grupo ALERTAS (abre no HOVER)
    {
      name: "Alertas",
      href: "/app/alerts",
      icon: BellAlertIcon,
      children: [
        { name: "Painel", href: "/app/alerts" },
        { name: "Regras", href: "/app/alerts/rules" },
        { name: "Histórico", href: "/app/alerts/history" },
      ],
    },

    { name: "Configurações", href: "/app/settings", icon: Cog6ToothIcon },
  ] as Array<{
    name: string
    href: string
    icon: typeof HomeIcon
    children?: Array<{ name: string; href: string }>
  }>

  if (isInternalAdmin) {
    navigation.splice(navigation.length - 1, 0, {
      name: "Admin SaaS",
      href: "/app/admin",
      icon: ShieldCheckIcon,
    })
  }

  return (
    <aside className={`hidden md:block bg-white border-r min-h-[calc(100vh-73px)] transition-all ${collapsed ? "w-20" : "w-64"}`}>
      <div className="px-3 pt-4">
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="inline-flex items-center justify-center rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          <Bars3Icon className="h-5 w-5" />
        </button>
      </div>
      <nav className="mt-4 px-3">
        <ul className="space-y-2">
          {navigation.map((item) => (
            <li
              key={item.name}
              className="relative group"
            >
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center ${collapsed ? "justify-center px-2" : "px-4"} py-3 rounded-lg transition-colors ${
                    isActive ||
                    (item.name === "Alertas" && isAlertsOpen) ||
                    (item.name === "Operações" && isOperationsOpen)
                      ? "bg-blue-50 text-blue-700 border-l-4 border-blue-500"
                      : "text-gray-700 hover:bg-gray-50"
                  }`
                }
                title={collapsed ? item.name : undefined}
              >
                <item.icon className={`h-5 w-5 ${collapsed ? "" : "mr-3"}`} />
                {!collapsed && <span className="font-medium">{item.name}</span>}
              </NavLink>

              {/* Submenu (abre no hover) */}
              {item.children && !collapsed && (
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
