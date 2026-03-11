"use client";

import React, { useEffect, useState } from 'react';
import { Share2, ArrowLeft, Zap, Loader2, TrendingUp, ShieldAlert, Target } from 'lucide-react';
import { RadarChart } from '@/components/RadarChart';
import { getAssetMarketInsights, AssetMarketInsightOutput } from '@/ai/flows/asset-market-insight';
import { backtestPortfolio, BacktestOutput } from '@/ai/flows/backtest-portfolio';

export function ResultScreen({ data, onReset }: { data: any; onReset: () => void }) {
  const [backtestResult, setBacktestResult] = useState<BacktestOutput | null>(null);
  const [insights, setInsights] = useState<AssetMarketInsightOutput | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!data) return;
      setLoading(true);
      try {
        // Run backtest and insights in parallel
        const [backtest, marketInsights] = await Promise.all([
          backtestPortfolio({ assets: data }),
          getAssetMarketInsights({ assets: data.map((a: any) => a.ticker) })
        ]);
        
        setBacktestResult(backtest);
        setInsights(marketInsights);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [data]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center animate-fade-in">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-accent w-4 h-4" />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-bold">퀀트 엔진 가동 중...</h3>
          <p className="text-sm text-muted-foreground">과거 데이터를 분석하여 성과를 시뮬레이션하고 있습니다.</p>
        </div>
      </div>
    );
  }

  if (!backtestResult) {
    return (
      <div className="p-6 text-center flex flex-col gap-4">
        <p>결과를 불러오는 데 실패했습니다.</p>
        <button onClick={onReset} className="text-primary font-bold">다시 시도</button>
      </div>
    );
  }

  const metrics = [
    { label: '분석 기간', value: backtestResult.metrics.period, icon: Target, sub: 'Backtest Period' },
    { label: 'CAGR', value: `${backtestResult.metrics.cagr}%`, icon: TrendingUp, sub: '연평균 수익률', highlight: '#7AE9AB' },
    { label: 'MDD', value: `${backtestResult.metrics.mdd}%`, icon: ShieldAlert, sub: '최대 낙폭', highlight: '#F25B5B' },
  ];

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
        {metrics.map((m) => (
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
          <span className="text-sm font-bold text-primary">포트폴리오 분석</span>
          <span className="text-[10px] text-muted-foreground">Sharpe Ratio: {backtestResult.metrics.sharpe}</span>
        </div>
        <div className="w-full h-full mt-4">
          <RadarChart data={backtestResult.radar} />
        </div>
      </div>

      {/* AI Backtest Insight */}
      <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl flex gap-3">
        <Zap size={20} className="text-primary shrink-0" />
        <p className="text-xs leading-relaxed italic text-primary-foreground/90">
          "{backtestResult.aiInsight}"
        </p>
      </div>

      {/* AI Market Insights */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-lg">자산별 시장 인사이트</h3>
        </div>

        {insights ? (
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
