// src/components/Charts/PieChart.tsx
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts"

export type PieChartPoint = { name: string; value: number; color: string }

const defaultData: PieChartPoint[] = [
  { name: "Entrada", value: 35, color: "#3b82f6" },
  { name: "Balcao", value: 25, color: "#8b5cf6" },
  { name: "Salao", value: 20, color: "#10b981" },
  { name: "Caixas", value: 15, color: "#f59e0b" },
  { name: "Outros", value: 5, color: "#6b7280" },
]

export const PieChart = ({ data = defaultData }: { data?: PieChartPoint[] }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          outerRadius="75%"
          dataKey="value"
          labelLine={false}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>

        <Tooltip
          formatter={(value) => [`${value}%`, "Participação"]}
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
          }}
        />

        <Legend />
      </RechartsPieChart>
    </ResponsiveContainer>
  )
}
