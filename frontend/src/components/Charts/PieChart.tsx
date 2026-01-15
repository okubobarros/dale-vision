// src/components/Charts/PieChart.tsx
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts"

const data = [
  { name: "Setor A", value: 35, color: "#3b82f6" },
  { name: "Setor B", value: 25, color: "#8b5cf6" },
  { name: "Setor C", value: 20, color: "#10b981" },
  { name: "Setor D", value: 15, color: "#f59e0b" },
  { name: "Outros", value: 5, color: "#6b7280" },
]

export const PieChart = () => {
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
