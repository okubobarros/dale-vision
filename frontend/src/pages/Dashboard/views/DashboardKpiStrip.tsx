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
  <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 sm:p-5 hover:bg-white transition-colors min-w-0">
    <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
      <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
    </div>

    <h3 className="text-2xl sm:text-[32px] leading-none font-bold text-[#111827] mb-2 break-words">
      {value}
    </h3>
    <p className="text-[#111827] font-semibold text-sm sm:text-base">{title}</p>
    {subtitle && <p className="text-[#6B7280] text-xs sm:text-sm mt-1">{subtitle}</p>}
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
