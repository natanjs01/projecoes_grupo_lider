'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

interface Props {
  type: 'bar' | 'line';
  data: any[];
  dataKeys: string[];
  colors: string[];
  labels: string[];
}

export default function RechartsWrapper({ type, data, dataKeys, colors, labels }: Props) {
  const safeData = data ?? [];
  const safeKeys = dataKeys ?? [];
  const safeColors = colors ?? [];
  const safeLabels = labels ?? [];

  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={safeData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
          <XAxis
            dataKey="name"
            tickLine={false}
            tick={{ fontSize: 10, fill: '#999' }}
          />
          <YAxis
            tickLine={false}
            tick={{ fontSize: 10, fill: '#999' }}
            label={{ value: 'R$ MM', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 11, fill: '#999' } }}
          />
          <Tooltip contentStyle={{ fontSize: 11, backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 6 }} />
          <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
          {safeKeys.map((key: string, i: number) => (
            <Bar
              key={key}
              dataKey={key}
              name={safeLabels?.[i] ?? key}
              fill={safeColors?.[i] ?? '#DC2626'}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={safeData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
        <XAxis
          dataKey="name"
          tickLine={false}
          tick={{ fontSize: 10, fill: '#999' }}
        />
        <YAxis
          tickLine={false}
          tick={{ fontSize: 10, fill: '#999' }}
        />
        <Tooltip contentStyle={{ fontSize: 11, backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 6 }} />
        <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
        {safeKeys.map((key: string, i: number) => (
          <Line
            key={key}
            dataKey={key}
            name={safeLabels?.[i] ?? key}
            stroke={safeColors?.[i] ?? '#DC2626'}
            strokeWidth={2}
            dot={{ r: 4, fill: safeColors?.[i] ?? '#DC2626' }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
