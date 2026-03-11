"use client";

import React, { useState } from 'react';
import { Search, Filter, ArrowRight, ChevronDown } from 'lucide-react';
import { RadarChart } from '@/components/RadarChart';
import { Input } from '@/components/ui/input';

const COMMUNITY_PORTFOLIOS = [
  {
    id: 1,
    title: "성장형 올웨더",
    author: "KimAlpha",
    assets: [
      { ticker: 'VTI', weight: 40 },
      { ticker: 'TLT', weight: 20 },
      { ticker: 'GLD', weight: 20 },
      { ticker: 'BTC', weight: 20 },
    ],
    radar: [
      { subject: 'Att', A: 70 },
      { subject: 'Def', A: 85 },
      { subject: 'Vol', A: 30 },
      { subject: 'Shp', A: 90 },
      { subject: 'Div', A: 20 },
    ]
  },
  {
    id: 2,
    title: "나스닥 공격형",
    author: "LeeQuant",
    assets: [
      { ticker: 'TQQQ', weight: 60 },
      { ticker: 'SOXL', weight: 40 },
    ],
    radar: [
      { subject: 'Att', A: 100 },
      { subject: 'Def', A: 10 },
      { subject: 'Vol', A: 95 },
      { subject: 'Shp', A: 60 },
      { subject: 'Div', A: 5 },
    ]
  },
  {
    id: 3,
    title: "배당 안정성",
    author: "ParkDividend",
    assets: [
      { ticker: 'SCHD', weight: 50 },
      { ticker: 'O', weight: 30 },
      { ticker: 'JEPI', weight: 20 },
    ],
    radar: [
      { subject: 'Att', A: 40 },
      { subject: 'Def', A: 80 },
      { subject: 'Vol', A: 20 },
      { subject: 'Shp', A: 85 },
      { subject: 'Div', A: 95 },
    ]
  },
  {
    id: 4,
    title: "크립토 맥시",
    author: "ChainMaster",
    assets: [
      { ticker: 'BTC', weight: 70 },
      { ticker: 'ETH', weight: 30 },
    ],
    radar: [
      { subject: 'Att', A: 95 },
      { subject: 'Def', A: 20 },
      { subject: 'Vol', A: 100 },
      { subject: 'Shp', A: 50 },
      { subject: 'Div', A: 0 },
    ]
  },
];

export function CommunityScreen() {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div className="p-6 flex flex-col gap-6 animate-fade-in pb-32">
      <header className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">커뮤니티</h2>
        <div className="flex gap-2">
          <button className="p-2 glass-morphism rounded-full"><Search size={20} /></button>
          <button className="p-2 glass-morphism rounded-full"><Filter size={20} /></button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4">
        {COMMUNITY_PORTFOLIOS.map((p) => (
          <div 
            key={p.id}
            onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
            className={`glass-morphism rounded-3xl p-4 flex flex-col gap-3 transition-all cursor-pointer ${expandedId === p.id ? 'col-span-2' : ''}`}
          >
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="text-sm font-bold truncate max-w-[100px]">{p.title}</span>
                <span className="text-[10px] text-muted-foreground">@{p.author}</span>
              </div>
              <div className={`transition-transform ${expandedId === p.id ? 'rotate-180' : ''}`}>
                <ChevronDown size={14} className="text-muted-foreground" />
              </div>
            </div>

            <div className={`w-full aspect-square ${expandedId === p.id ? 'h-48' : 'h-24'} transition-all`}>
              <RadarChart data={p.radar as any} mini={expandedId !== p.id} />
            </div>

            {expandedId === p.id && (
              <div className="mt-2 flex flex-col gap-3 animate-fade-in border-t border-white/5 pt-4">
                <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">구성 자산</h4>
                <div className="flex flex-wrap gap-2">
                  {p.assets.map((a) => (
                    <div key={a.ticker} className="bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20 flex items-center gap-2">
                      <span className="text-xs font-bold">{a.ticker}</span>
                      <span className="text-[10px] text-primary">{a.weight}%</span>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-2 h-10 bg-primary/20 hover:bg-primary/30 text-primary text-xs font-bold rounded-xl transition-colors">
                  이 포트폴리오 가져오기
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
