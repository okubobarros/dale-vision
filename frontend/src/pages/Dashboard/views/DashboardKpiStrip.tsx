import type { ReactNode } from "react"

export interface DashboardKpiItem {
  title: string
  value: string | number
  subtitle?: string
  color: string
  icon: ReactNode
}

interface DashboardKpiStripProps {
  items: DashboardKpiItem[]
}

export const MetricCard = ({ title, value, icon, color, subtitle }: DashboardKpiItem) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow min-w-0">
    <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
      <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
    </div>

    <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1 break-words">
      {value}
    </h3>
    <p className="text-gray-700 font-semibold text-sm sm:text-base">{title}</p>
    {subtitle && <p className="text-gray-400 text-xs sm:text-sm mt-1">{subtitle}</p>}
  </div>
)

export function DashboardKpiStrip({ items }: DashboardKpiStripProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {items.map((item) => (
        <MetricCard key={item.title} {...item} />
      ))}
    </div>
  )
}
