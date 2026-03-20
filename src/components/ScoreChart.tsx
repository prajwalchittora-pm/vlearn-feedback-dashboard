import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface Props {
  distribution: { score: number; count: number }[];
}

const COLORS = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"];

export function ScoreChart({ distribution }: Props) {
  return (
    <div className="score-chart">
      <h3>Rating Distribution</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={distribution} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="score"
            tickFormatter={(v) => `${v}\u2605`}
            tick={{ fontSize: 13 }}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value: number) => [`${value} responses`, "Count"]}
            labelFormatter={(label) => `Rating: ${label}/5`}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {distribution.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
