// src/components/Charts/LineChart.tsx
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

const data = [
  { hora: "08:00", visitantes: 45, conversões: 12 },
  { hora: "10:00", visitantes: 120, conversões: 45 },
  { hora: "12:00", visitantes: 210, conversões: 85 },
  { hora: "14:00", visitantes: 180, conversões: 78 },
  { hora: "16:00", visitantes: 150, conversões: 65 },
  { hora: "18:00", visitantes: 90, conversões: 32 },
  { hora: "20:00", visitantes: 40, conversões: 15 },
]

export const LineChart = () => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="hora" stroke="#666" />
        <YAxis stroke="#666" />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="visitantes"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="conversões"
          stroke="#8b5cf6"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}
