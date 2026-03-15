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

interface RadarChartProps {
  data: {
    subject: string;
    A: number;
    B?: number;
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
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={mini ? false : { fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
          />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          
          {/* Benchmark Radar */}
          {data[0]?.B !== undefined && (
            <Radar
              name="Benchmark"
              dataKey="B"
              stroke="#94a3b8"
              fill="#94a3b8"
              fillOpacity={0.2}
            />
          )}

          {/* Portfolio Radar */}
          <Radar
            name="Portfolio"
            dataKey="A"
            stroke="#007BFF"
            fill="#3787E0"
            fillOpacity={0.5}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
