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
  fila?: number
}

const defaultData: LineChartPoint[] = [
  { label: "08:00", visitantes: 45, conversoes: 12, fila: 3 },
  { label: "10:00", visitantes: 120, conversoes: 45, fila: 4 },
  { label: "12:00", visitantes: 210, conversoes: 85, fila: 6 },
  { label: "14:00", visitantes: 180, conversoes: 78, fila: 5 },
  { label: "16:00", visitantes: 150, conversoes: 65, fila: 4 },
  { label: "18:00", visitantes: 90, conversoes: 32, fila: 3 },
  { label: "20:00", visitantes: 40, conversoes: 15, fila: 2 },
]

type LineSeries = {
  key: keyof LineChartPoint
  label: string
  color: string
}

const defaultSeries: LineSeries[] = [
  { key: "visitantes", label: "Visitantes", color: "#3b82f6" },
  { key: "conversoes", label: "Conversões", color: "#8b5cf6" },
]

export const LineChart = ({
  data = defaultData,
  series = defaultSeries,
}: {
  data?: LineChartPoint[]
  series?: LineSeries[]
}) => {
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
        {series.map((item) => (
          <Line
            key={item.key}
            type="monotone"
            dataKey={item.key}
            name={item.label}
            stroke={item.color}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}
