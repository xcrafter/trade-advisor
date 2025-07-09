import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Brush,
} from "recharts";
import { format } from "date-fns";

interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface StockChartProps {
  data: CandleData[];
  sma20?: number;
  sma50?: number;
  ema9?: number;
}

export default function StockChart({
  data,
  sma20,
  sma50,
  ema9,
}: StockChartProps) {
  // Transform data for the chart and reverse it to show most recent data on the right
  const chartData = [...data].reverse().map((candle) => ({
    date: format(new Date(candle.timestamp), "MMM dd"),
    price: Number(candle.close.toFixed(2)),
    high: Number(candle.high.toFixed(2)),
    low: Number(candle.low.toFixed(2)),
    volume: candle.volume,
    sma20: sma20 ? Number(sma20.toFixed(2)) : undefined,
    sma50: sma50 ? Number(sma50.toFixed(2)) : undefined,
    ema9: ema9 ? Number(ema9.toFixed(2)) : undefined,
  }));

  return (
    <div className="w-full h-[500px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="price"
            domain={["auto", "auto"]}
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `₹${value.toFixed(2)}`}
            orientation="right"
          />
          <YAxis
            yAxisId="volume"
            orientation="left"
            tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === "Volume") {
                return [`${(Number(value) / 1000000).toFixed(1)}M`, name];
              }
              return [`₹${Number(value).toFixed(2)}`, name];
            }}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend />
          <Bar
            dataKey="volume"
            fill="#6b7280"
            opacity={0.3}
            yAxisId="volume"
            name="Volume"
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#2563eb"
            dot={false}
            name="Price"
            yAxisId="price"
            strokeWidth={2}
          />
          {sma20 && (
            <Line
              type="monotone"
              dataKey="sma20"
              stroke="#16a34a"
              dot={false}
              name="SMA 20"
              yAxisId="price"
            />
          )}
          {sma50 && (
            <Line
              type="monotone"
              dataKey="sma50"
              stroke="#dc2626"
              dot={false}
              name="SMA 50"
              yAxisId="price"
            />
          )}
          {ema9 && (
            <Line
              type="monotone"
              dataKey="ema9"
              stroke="#9333ea"
              dot={false}
              name="EMA 9"
              yAxisId="price"
            />
          )}
          <Brush
            dataKey="date"
            height={30}
            stroke="#8884d8"
            startIndex={Math.max(0, chartData.length - 30)}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
