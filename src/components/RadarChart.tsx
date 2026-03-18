"use client";

import React, { useEffect, useState } from 'react';
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
  series?: SeriesConfig[];
}

export function RadarChart({ data, mini = false, series }: RadarChartProps) {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains('light'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const gridStroke = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.1)';
  const labelColor = isLight ? '#334155' : '#94a3b8';
  const bmColor    = isLight ? '#64748b' : '#94a3b8';

  const defaultSeries: SeriesConfig[] = [
    { key: 'B', color: bmColor },
    { key: 'A', color: 'hsl(212, 73%, 55%)' },
  ].filter(s => data[0]?.[s.key] !== undefined);

  const activeSeries = series ?? defaultSeries;

  return (
    <div className={`w-full h-full flex items-center justify-center ${!mini ? 'chart-glow' : ''}`}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart cx="50%" cy="50%" outerRadius={mini ? "70%" : "80%"} data={data}>
          <PolarGrid stroke={gridStroke} />
          <PolarAngleAxis
            dataKey="subject"
            tick={mini ? false : { fill: labelColor, fontSize: 10, fontWeight: 700 }}
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
