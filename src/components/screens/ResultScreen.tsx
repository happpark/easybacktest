"use client";

import React, { useEffect, useState } from 'react';
import { Share2, ArrowLeft, Zap, Loader2, TrendingUp, ShieldAlert, Target, Info, AlertTriangle, Coins } from 'lucide-react';
import { RadarChart } from '@/components/RadarChart';
import { getAssetMarketInsights, AssetMarketInsightOutput } from '@/ai/flows/asset-market-insight';
import { backtestPortfolio, BacktestOutput } from '@/ai/flows/backtest-portfolio';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ResultScreen({ data, onReset }: { data: any; onReset: () => void }) {
  const [backtestResult, setBacktestResult] = useState<BacktestOutput | null>(null);
  const [insights, setInsights] = useState<AssetMarketInsightOutput | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!data) return;
      setLoading(true);
      try {
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
      <div className="p-6 text-center flex flex-col gap-4 h-full items-center justify-center">
        <AlertTriangle className="w-12 h-12 text-destructive" />
        <p>결과를 불러오는 데 실패했습니다.</p>
        <button onClick={onReset} className="text-primary font-bold">다시 시도</button>
      </div>
    );
  }

  const m = backtestResult.metrics;
  const bm = backtestResult.benchmark_metrics;

  const radarDescriptions: Record<string, string> = {
    Attack: "수익력: CAGR(연평균 수익률)을 기반으로 자산의 성장성을 나타냅니다.",
    Defense: "방어력: MDD(최대 낙폭)를 기반으로 위기 시 손실 최소화 능력을 나타냅니다.",
    Volatility: "변동성 관리: 표준편차를 기반으로 주가 변동 폭이 얼마나 안정적인지 나타냅니다.",
    Sharpe: "위험 대비 수익: 샤프 지수를 기반으로 위험 한 단위당 얼마나 효율적인 수익을 냈는지 나타냅니다.",
    Dividend: "배당 수익: 최근 1년 배당 수익률을 기반으로 현금 흐름 창출 능력을 나타냅니다.",
  };

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in pb-32">
      <header className="flex justify-between items-center">
        <button onClick={onReset} className="p-2 -ml-2 text-muted-foreground">
          <ArrowLeft size={24} />
        </button>
        <div className="flex flex-col items-center">
           <h2 className="text-lg font-bold">백테스트 결과</h2>
           <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-muted-foreground">
             {backtestResult.period}
           </span>
        </div>
        <button className="p-2 -mr-2 text-muted-foreground">
          <Share2 size={24} />
        </button>
      </header>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-morphism p-4 rounded-2xl flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <TrendingUp size={14} className="text-[#7AE9AB]" />
            <span className="text-[10px] font-bold uppercase tracking-wider">CAGR (수익률)</span>
          </div>
          <span className="text-2xl font-bold text-[#7AE9AB]">{m.cagr}%</span>
          <div className="flex flex-col text-[10px] text-muted-foreground border-t border-white/5 pt-1 mt-1">
            <span className="font-semibold">최고 실적 연도: {m.best_year.year}</span>
            <span>수익률: {m.best_year.value}%</span>
          </div>
        </div>

        <div className="glass-morphism p-4 rounded-2xl flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <ShieldAlert size={14} className="text-[#F25B5B]" />
            <span className="text-[10px] font-bold uppercase tracking-wider">MDD (최대낙폭)</span>
          </div>
          <span className="text-2xl font-bold text-[#F25B5B]">{m.mdd}%</span>
          <div className="flex flex-col text-[10px] text-muted-foreground border-t border-white/5 pt-1 mt-1">
            <span className="font-semibold">최대 하락 연도: {m.mdd_year}</span>
            <span className="opacity-0">Placeholder</span>
          </div>
        </div>
      </div>

      {/* Radar Chart Section */}
      <div className="glass-morphism p-6 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden min-h-[400px]">
        <div className="absolute top-4 left-6 right-6 flex justify-between items-start">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-primary">포트폴리오 오각형</span>
            <span className="text-[10px] text-muted-foreground">S&P 500(SPY) 벤치마크 비교</span>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-[9px] text-muted-foreground">Portfolio</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
              <span className="text-[9px] text-muted-foreground">Benchmark</span>
            </div>
          </div>
        </div>
        
        <div className="w-full h-64 mt-8">
          <RadarChart data={backtestResult.radar} />
        </div>

        {/* Radar Labels with Tooltips */}
        <div className="grid grid-cols-5 w-full mt-4 gap-1">
          <TooltipProvider>
            {backtestResult.radar.map((r) => (
              <Tooltip key={r.subject}>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center gap-1 cursor-help">
                    <span className="text-[9px] font-bold text-muted-foreground flex items-center gap-0.5">
                      {r.subject} <Info size={8} />
                    </span>
                    <div className="flex flex-col items-center">
                       <span className="text-[10px] font-bold text-primary">{r.A}</span>
                       <span className="text-[8px] text-muted-foreground/50">{r.B}</span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px] text-[11px] p-2">
                  {radarDescriptions[r.subject]}
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>

        {/* Actual Values Comparison Table */}
        <div className="w-full mt-6 bg-white/5 rounded-xl p-3 border border-white/10">
           <table className="w-full text-[10px]">
             <thead>
               <tr className="text-muted-foreground/60 border-b border-white/10">
                 <th className="text-left pb-1 font-normal">Metric</th>
                 <th className="text-right pb-1 font-normal text-primary">Portfolio</th>
                 <th className="text-right pb-1 font-normal">S&P 500</th>
               </tr>
             </thead>
             <tbody className="text-muted-foreground">
               <tr className="border-b border-white/5">
                 <td className="py-1.5">CAGR (수익률)</td>
                 <td className="text-right font-bold text-primary">{m.cagr}%</td>
                 <td className="text-right">{bm?.cagr}%</td>
               </tr>
               <tr className="border-b border-white/5">
                 <td className="py-1.5">MDD (낙폭)</td>
                 <td className="text-right font-bold text-primary">{m.mdd}%</td>
                 <td className="text-right">{bm?.mdd}%</td>
               </tr>
               <tr className="border-b border-white/5">
                 <td className="py-1.5">Volatility (변동성)</td>
                 <td className="text-right font-bold text-primary">{m.volatility}%</td>
                 <td className="text-right">{bm?.volatility}%</td>
               </tr>
               <tr className="border-b border-white/5">
                 <td className="py-1.5">Sharpe (효율성)</td>
                 <td className="text-right font-bold text-primary">{m.sharpe}</td>
                 <td className="text-right">{bm?.sharpe}</td>
               </tr>
               <tr>
                 <td className="py-1.5">Dividend (배당)</td>
                 <td className="text-right font-bold text-primary">{m.dividend}%</td>
                 <td className="text-right">{bm?.dividend}%</td>
               </tr>
             </tbody>
           </table>
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
