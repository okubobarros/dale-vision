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

export type LineChartPoint = {
  label: string
  visitantes: number
  conversoes: number
}

const defaultData: LineChartPoint[] = [
  { label: "08:00", visitantes: 45, conversoes: 12 },
  { label: "10:00", visitantes: 120, conversoes: 45 },
  { label: "12:00", visitantes: 210, conversoes: 85 },
  { label: "14:00", visitantes: 180, conversoes: 78 },
  { label: "16:00", visitantes: 150, conversoes: 65 },
  { label: "18:00", visitantes: 90, conversoes: 32 },
  { label: "20:00", visitantes: 40, conversoes: 15 },
]

export const LineChart = ({ data = defaultData }: { data?: LineChartPoint[] }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" stroke="#666" />
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
          dataKey="conversoes"
          stroke="#8b5cf6"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}
