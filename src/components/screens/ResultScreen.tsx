"use client";

import React, { useEffect, useState } from 'react';
import { Share2, ArrowLeft, Zap, Shield, Activity, BarChart3, Coins, Loader2 } from 'lucide-react';
import { RadarChart } from '@/components/RadarChart';
import { getAssetMarketInsights, AssetMarketInsightOutput } from '@/ai/flows/asset-market-insight';

const PERFORMANCE_METRICS = [
  { label: '분석 기간', value: '10년', sub: '2014 - 2024' },
  { label: 'CAGR', value: '18.4%', sub: '연평균 수익률', highlight: '#7AE9AB' },
  { label: 'MDD', value: '-12.2%', sub: '최대 낙폭', highlight: '#F25B5B' },
];

const RADAR_DATA = [
  { subject: 'Attack', A: 85, fullMark: 100 },
  { subject: 'Defense', A: 65, fullMark: 100 },
  { subject: 'Volatility', A: 45, fullMark: 100 },
  { subject: 'Sharpe', A: 78, fullMark: 100 },
  { subject: 'Dividend', A: 30, fullMark: 100 },
];

export function ResultScreen({ data, onReset }: { data: any; onReset: () => void }) {
  const [insights, setInsights] = useState<AssetMarketInsightOutput | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    async function fetchInsights() {
      if (!data) return;
      setLoadingInsights(true);
      try {
        const res = await getAssetMarketInsights({ assets: data.map((a: any) => a.ticker) });
        setInsights(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingInsights(false);
      }
    }
    fetchInsights();
  }, [data]);

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in pb-32">
      <header className="flex justify-between items-center">
        <button onClick={onReset} className="p-2 -ml-2 text-muted-foreground">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-bold">백테스트 결과</h2>
        <button className="p-2 -mr-2 text-muted-foreground">
          <Share2 size={24} />
        </button>
      </header>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-3">
        {PERFORMANCE_METRICS.map((m) => (
          <div key={m.label} className="glass-morphism p-3 rounded-2xl flex flex-col gap-1 items-center text-center">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground">{m.label}</span>
            <span className="text-lg font-bold" style={{ color: m.highlight }}>{m.value}</span>
            <span className="text-[10px] text-muted-foreground/60">{m.sub}</span>
          </div>
        ))}
      </div>

      {/* Radar Chart Section */}
      <div className="glass-morphism p-6 rounded-3xl aspect-square flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-4 left-4 flex flex-col">
          <span className="text-sm font-bold text-primary">포트폴리오 오각형</span>
          <span className="text-[10px] text-muted-foreground">균형 잡힌 성과 분석</span>
        </div>
        <div className="w-full h-full mt-4">
          <RadarChart data={RADAR_DATA} />
        </div>
      </div>

      {/* AI Market Insights */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-accent fill-accent/20" />
          <h3 className="font-bold text-lg">AI 시장 인사이트</h3>
        </div>

        {loadingInsights ? (
          <div className="glass-morphism p-8 rounded-2xl flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">시장을 분석하는 중...</span>
          </div>
        ) : insights ? (
          <div className="flex flex-col gap-3">
            {insights.insights.map((insight, idx) => (
              <div key={idx} className="glass-morphism p-4 rounded-2xl border-l-4 border-primary/40">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-sm">{insight.asset}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    insight.sentiment === 'positive' ? 'bg-[#7AE9AB]/20 text-[#7AE9AB]' :
                    insight.sentiment === 'negative' ? 'bg-destructive/20 text-destructive' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {insight.sentiment}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{insight.summary}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground text-sm py-4">인사이트를 불러올 수 없습니다.</div>
        )}
      </section>

      {/* Share CTA */}
      <button className="w-full glass-morphism h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-primary border-primary/20 hover:bg-primary/10 transition-colors">
        <Share2 size={18} />
        포트폴리오 공유하기
      </button>
    </div>
  );
}
