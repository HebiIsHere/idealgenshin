import React, { useMemo } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { SubstatAllocation, SubstatType } from '../../types';
import { STAT_DISPLAY_NAMES } from '../../data/constants';

interface ComparisonChartProps {
  /** Original allocation. */
  original: SubstatAllocation[];
  /** Optimized allocation. */
  optimized: SubstatAllocation[];
  /** Chart type. */
  type?: 'radar' | 'bar';
}

/** Comparison chart using Recharts — radar or bar chart. */
function ComparisonChart({
  original,
  optimized,
  type = 'radar',
}: ComparisonChartProps): React.ReactElement {
  const chartData = useMemo(() => {
    const allTypes = new Set<SubstatType>([
      ...original.map((a) => a.type),
      ...optimized.map((a) => a.type),
    ]);

    return Array.from(allTypes).map((type) => {
      const origAlloc = original.find((a) => a.type === type);
      const optAlloc = optimized.find((a) => a.type === type);

      return {
        name: STAT_DISPLAY_NAMES[type] ?? type,
        当前: origAlloc?.rolls ?? 0,
        优化: optAlloc?.rolls ?? 0,
      };
    });
  }, [original, optimized]);

  if (chartData.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">暂无数据</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'primary.main' }}>
        词条分配对比图
      </Typography>

      {type === 'radar' ? (
        <ResponsiveContainer width="100%" height={350}>
          <RadarChart data={chartData}>
            <PolarGrid stroke="rgba(212, 168, 67, 0.2)" />
            <PolarAngleAxis
              dataKey="name"
              tick={{ fill: '#A0A0B0', fontSize: 12 }}
            />
            <PolarRadiusAxis tick={{ fill: '#A0A0B0', fontSize: 10 }} />
            <Radar
              name="当前"
              dataKey="当前"
              stroke="#4CC2F1"
              fill="#4CC2F1"
              fillOpacity={0.2}
            />
            <Radar
              name="优化"
              dataKey="优化"
              stroke="#D4A843"
              fill="#D4A843"
              fillOpacity={0.2}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, color: '#E0E0E0' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(212, 168, 67, 0.1)" />
            <XAxis dataKey="name" tick={{ fill: '#A0A0B0', fontSize: 11 }} />
            <YAxis tick={{ fill: '#A0A0B0', fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#16213E',
                border: '1px solid rgba(212, 168, 67, 0.2)',
                color: '#E0E0E0',
              }}
            />
            <Bar dataKey="当前" fill="#4CC2F1" radius={[2, 2, 0, 0]} />
            <Bar dataKey="优化" fill="#D4A843" radius={[2, 2, 0, 0]} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
}

export default ComparisonChart;
