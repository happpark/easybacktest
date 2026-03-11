"use client";

import React from 'react';
import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts';

interface RadarChartProps {
  data: {
    subject: string;
    A: number;
    fullMark: number;
  }[];
  size?: number | string;
  mini?: boolean;
}

export function RadarChart({ data, mini = false }: RadarChartProps) {
  return (
    <div className={`w-full h-full flex items-center justify-center ${!mini ? 'chart-glow' : ''}`}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart cx="50%" cy="50%" outerRadius={mini ? "70%" : "80%"} data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.1)" radialLines={!mini} />
          {!mini && (
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
            />
          )}
          <Radar
            name="Portfolio"
            dataKey="A"
            stroke="#007BFF"
            fill="#3787E0"
            fillOpacity={0.6}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
