"use client";

import React, { useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';

import { RadarChart } from '@/components/RadarChart';
import { useLang } from '@/lib/i18n';
import type { Asset } from '@/app/page';

interface CommunityPortfolio {
  id: number;
  titleKey: string;
  author: string;
  assets: { ticker: string; weight: number }[];
  radar: { subject: string; A: number; fullMark: number }[];
}

const COMMUNITY_PORTFOLIOS: CommunityPortfolio[] = [
  {
    id: 1,
    titleKey: 'cp_growth_allweather',
    author: "KimAlpha",
    assets: [
      { ticker: 'VTI', weight: 40 },
      { ticker: 'TLT', weight: 20 },
      { ticker: 'GLD', weight: 20 },
      { ticker: 'BTC', weight: 20 },
    ],
    radar: [
      { subject: 'Attack', A: 70, fullMark: 100 },
      { subject: 'Defense', A: 85, fullMark: 100 },
      { subject: 'Volatility', A: 30, fullMark: 100 },
      { subject: 'Sharpe', A: 90, fullMark: 100 },
      { subject: 'Dividend', A: 20, fullMark: 100 },
    ],
  },
  {
    id: 2,
    titleKey: 'cp_nasdaq_aggressive',
    author: "LeeQuant",
    assets: [
      { ticker: 'TQQQ', weight: 60 },
      { ticker: 'SOXL', weight: 40 },
    ],
    radar: [
      { subject: 'Attack', A: 100, fullMark: 100 },
      { subject: 'Defense', A: 10, fullMark: 100 },
      { subject: 'Volatility', A: 95, fullMark: 100 },
      { subject: 'Sharpe', A: 60, fullMark: 100 },
      { subject: 'Dividend', A: 5, fullMark: 100 },
    ],
  },
  {
    id: 3,
    titleKey: 'cp_dividend_stable',
    author: "ParkDividend",
    assets: [
      { ticker: 'SCHD', weight: 50 },
      { ticker: 'O', weight: 30 },
      { ticker: 'JEPI', weight: 20 },
    ],
    radar: [
      { subject: 'Attack', A: 40, fullMark: 100 },
      { subject: 'Defense', A: 80, fullMark: 100 },
      { subject: 'Volatility', A: 20, fullMark: 100 },
      { subject: 'Sharpe', A: 85, fullMark: 100 },
      { subject: 'Dividend', A: 95, fullMark: 100 },
    ],
  },
  {
    id: 4,
    titleKey: 'cp_crypto_maxi',
    author: "ChainMaster",
    assets: [
      { ticker: 'BTC', weight: 70 },
      { ticker: 'ETH', weight: 30 },
    ],
    radar: [
      { subject: 'Attack', A: 95, fullMark: 100 },
      { subject: 'Defense', A: 20, fullMark: 100 },
      { subject: 'Volatility', A: 100, fullMark: 100 },
      { subject: 'Sharpe', A: 50, fullMark: 100 },
      { subject: 'Dividend', A: 0, fullMark: 100 },
    ],
  },
];

interface CommunityScreenProps {
  onLoadPortfolio: (assets: Asset[]) => void;
}

export function CommunityScreen({ onLoadPortfolio }: CommunityScreenProps) {
  const { t } = useLang();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleLoad = (p: CommunityPortfolio) => {
    const assets: Asset[] = p.assets.map(a => ({
      ticker: a.ticker,
      weight: a.weight,
      launch_year: 'Unknown',
    }));
    onLoadPortfolio(assets);
  };

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6 animate-fade-in pb-8">
      <header className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold">{t('community_title')}</h2>
        <p className="text-sm text-muted-foreground">{t('community_subtitle')}</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {COMMUNITY_PORTFOLIOS.map((p) => {
          const isExpanded = expandedId === p.id;
          return (
            <div
              key={p.id}
              className={`glass-morphism rounded-3xl p-5 flex flex-col gap-3 transition-all border group
                ${isExpanded ? 'col-span-2 md:col-span-1 border-primary/30 bg-primary/5' : 'border-white/5 hover:border-primary/30 hover:bg-primary/5 cursor-pointer'}`}
            >
              <div
                className="flex justify-between items-start cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : p.id)}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold">{t(p.titleKey as Parameters<typeof t>[0])}</span>
                  <span className="text-xs text-muted-foreground">@{p.author}</span>
                </div>
                <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
              </div>

              <div className={`w-full transition-all duration-300 ${isExpanded ? 'h-48' : 'h-28 group-hover:h-36'}`}>
                <RadarChart data={p.radar} mini={!isExpanded} />
              </div>

              {/* Asset tags — always visible */}
              <div className="flex flex-wrap gap-1.5">
                {p.assets.map((a) => (
                  <div key={a.ticker} className="bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20 flex items-center gap-1.5">
                    <span className="text-xs font-bold">{a.ticker}</span>
                    <span className="text-xs text-primary">{a.weight}%</span>
                  </div>
                ))}
              </div>

              {/* Load button — visible when expanded or on hover */}
              <button
                onClick={(e) => { e.stopPropagation(); handleLoad(p); }}
                className={`w-full h-10 bg-primary/20 hover:bg-primary/30 text-primary text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2
                  ${isExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              >
                <Download size={14} />
                {t('community_load_button')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
