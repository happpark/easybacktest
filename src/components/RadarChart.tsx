"use client";

import React from 'react';
import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  PolarRadiusAxis,
} from 'recharts';

export interface SeriesConfig {
  key: string;
  color: string;
  hidden?: boolean;
}

interface RadarChartProps {
  data: Record<string, string | number | undefined>[];
  mini?: boolean;
  // If provided, renders each series with its color + visibility.
  // Falls back to default A (portfolio) / B (benchmark) if omitted.
  series?: SeriesConfig[];
}

export function RadarChart({ data, mini = false, series }: RadarChartProps) {
  const defaultSeries: SeriesConfig[] = [
    { key: 'B', color: '#94a3b8' },
    { key: 'A', color: 'hsl(212, 73%, 55%)' },
  ].filter(s => data[0]?.[s.key] !== undefined);

  const activeSeries = series ?? defaultSeries;

  return (
    <div className={`w-full h-full flex items-center justify-center ${!mini ? 'chart-glow' : ''}`}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart cx="50%" cy="50%" outerRadius={mini ? "70%" : "80%"} data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={mini ? false : { fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
          />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />

          {activeSeries.filter(s => !s.hidden).map(s => (
            <Radar
              key={s.key}
              name={s.key}
              dataKey={s.key}
              stroke={s.color}
              fill={s.color}
              fillOpacity={0.25}
              strokeWidth={2}
            />
          ))}
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
