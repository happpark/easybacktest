"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Share2, ArrowLeft, Zap, TrendingUp, ShieldAlert, Info, AlertTriangle, CheckCircle2, ChevronUp, Bookmark, BookmarkCheck } from 'lucide-react';
import { RadarChart } from '@/components/RadarChart';
import { backtestPortfolio, BacktestOutput } from '@/ai/flows/backtest-portfolio';
import { useMyPortfolios } from '@/lib/useMyPortfolios';
import { buildRadar } from '@/lib/radar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import type { Asset } from '@/app/page';

interface ResultScreenProps {
  data: Asset[];
  onReset: () => void;
}


const LOADING_MESSAGES = [
  '과거 데이터 다운로드 중',
  '수익률 계산 중',
  'AI 인사이트 생성 중',
];

function MovingDots() {
  const [pos, setPos] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPos(p => (p + 1) % 3), 400);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="inline-flex gap-1.5">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full transition-all duration-300"
          style={{ background: i === pos ? 'hsl(212, 73%, 55%)' : 'rgba(255,255,255,0.2)' }}
        />
      ))}
    </span>
  );
}

export function ResultScreen({ data, onReset }: ResultScreenProps) {
  const [backtestResult, setBacktestResult] = useState<BacktestOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saved, setSaved] = useState(false);
  const runningRef = useRef(false);
  const { save: savePortfolio } = useMyPortfolios();

  useEffect(() => {
    if (!data || runningRef.current) return;
    runningRef.current = true;

    let stepTimer: ReturnType<typeof setInterval>;

    async function fetchData() {
      setLoading(true);
      setErrorMessage(null);
      setLoadingStep(0);

      stepTimer = setInterval(() => {
        setLoadingStep(prev => Math.min(prev + 1, LOADING_MESSAGES.length - 1));
      }, 4000);

      try {
        const backtest = await backtestPortfolio({ assets: data });
        setBacktestResult(backtest);
      } catch (e: unknown) {
        const err = e as { message?: string };
        setErrorMessage(err.message ?? '결과를 불러오는 데 실패했습니다.');
      } finally {
        clearInterval(stepTimer);
        setLoading(false);
        runningRef.current = false;
      }
    }

    fetchData();
    return () => clearInterval(stepTimer);
  }, [data]);

  const handleRetry = () => {
    runningRef.current = false;
    setBacktestResult(null);

    setErrorMessage(null);
    setLoading(true);
    setLoadingStep(0);

    const stepTimer = setInterval(() => {
      setLoadingStep(prev => Math.min(prev + 1, LOADING_MESSAGES.length - 1));
    }, 4000);

    backtestPortfolio({ assets: data })
      .then(backtest => setBacktestResult(backtest))
      .catch((e: unknown) => {
        const err = e as { message?: string };
        setErrorMessage(err.message ?? '결과를 불러오는 데 실패했습니다.');
      })
      .finally(() => {
        clearInterval(stepTimer);
        setLoading(false);
      });
  };

  const handleSave = () => {
    if (!backtestResult) return;
    const defaultName = `포트폴리오 ${new Date().toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}`;
    setSaveName(defaultName);
    setSaving(true);
  };

  const commitSave = () => {
    if (!backtestResult) return;
    savePortfolio(saveName || '포트폴리오', data, backtestResult);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleShare = async () => {
    if (!backtestResult) return;
    const m = backtestResult.metrics;
    const composition = data.map(a => `${a.ticker} ${a.weight}%`).join(' | ');
    const text = [
      `📊 AlphaFlow 포트폴리오 백테스트 결과`,
      `구성: ${composition}`,
      `기간: ${backtestResult.period}`,
      `CAGR: ${m.cagr}%  |  MDD: ${m.mdd}%  |  Sharpe: ${m.sharpe}`,
      `변동성: ${m.volatility}%  |  배당: ${m.dividend}%`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-6 text-center animate-fade-in min-h-[80vh]">
        <Zap className="w-10 h-10 text-primary" />
        <div className="flex flex-col items-center gap-3">
          <h3 className="text-xl font-bold">퀀트 엔진 가동 중</h3>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">{LOADING_MESSAGES[loadingStep]}</p>
            <MovingDots />
          </div>
          <p className="text-xs text-muted-foreground/60">데이터 양에 따라 30초 이상 소요될 수 있습니다.</p>
        </div>
      </div>
    );
  }

  if (errorMessage || !backtestResult) {
    return (
      <div className="p-6 text-center flex flex-col gap-4 min-h-[80vh] items-center justify-center">
        <AlertTriangle className="w-12 h-12 text-destructive" />
        <div className="flex flex-col gap-1">
          <p className="font-bold text-base">백테스트 실패</p>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">{errorMessage ?? '알 수 없는 오류가 발생했습니다.'}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleRetry} className="text-primary font-bold border border-primary/30 px-4 py-2 rounded-xl text-sm hover:bg-primary/10 transition-colors">
            다시 시도
          </button>
          <button onClick={onReset} className="text-muted-foreground font-bold border border-white/10 px-4 py-2 rounded-xl text-sm hover:bg-white/5 transition-colors">
            포트폴리오 수정
          </button>
        </div>
      </div>
    );
  }

  const m = backtestResult.metrics;
  const bm = backtestResult.benchmark_metrics;

  // Compute radar from metrics using the shared frontend normalization.
  // This ensures saved portfolios and new results always use the same thresholds.
  const radar = buildRadar(m, bm ?? undefined);

  const radarDescriptions: Record<string, string> = {
    Attack: "수익력: CAGR(연평균 수익률)을 기반으로 자산의 성장성을 나타냅니다.",
    Defense: "방어력: MDD(최대 낙폭)를 기반으로 위기 시 손실 최소화 능력을 나타냅니다.",
    Volatility: "변동성 관리: 표준편차를 기반으로 주가 변동 폭이 얼마나 안정적인지 나타냅니다.",
    Sharpe: "위험 대비 수익: 샤프 지수를 기반으로 위험 한 단위당 얼마나 효율적인 수익을 냈는지 나타냅니다.",
    Dividend: "배당 수익: 최근 1년 배당 수익률을 기반으로 현금 흐름 창출 능력을 나타냅니다.",
  };

  const historyData = backtestResult.history.map(h => ({
    ...h,
    year: h.date.slice(0, 4),
  }));

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in pb-32">
      <header className="flex justify-between items-center">
        <button onClick={onReset} className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-lg font-bold">백테스트 결과</h2>
          <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-muted-foreground">
            {backtestResult.period}
          </span>
        </div>
        <button
          onClick={handleShare}
          className="p-2 -mr-2 text-muted-foreground hover:text-primary transition-colors relative"
          title="결과 복사"
        >
          {copied ? <CheckCircle2 size={24} className="text-[#7AE9AB]" /> : <Share2 size={24} />}
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
            <span className="opacity-0">—</span>
          </div>
        </div>
      </div>

      {/* Portfolio Growth Chart */}
      <div className="glass-morphism p-5 rounded-3xl flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold text-primary">포트폴리오 성장 추이</span>
          <span className="text-[10px] text-muted-foreground">$1,000 초기 투자 기준</span>
        </div>
        <div className="h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(212, 73%, 55%)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(212, 73%, 55%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="year"
                tick={{ fill: '#64748b', fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              />
              <RechartsTooltip
                contentStyle={{ background: '#0B0E14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, '포트폴리오']}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(212, 73%, 55%)"
                strokeWidth={2}
                fill="url(#portfolioGradient)"
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(212, 73%, 55%)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-between items-center border-t border-white/5 pt-3">
          <span className="text-[10px] text-muted-foreground">초기 투자금</span>
          <span className="text-[10px] text-muted-foreground">최종 평가액</span>
        </div>
        <div className="flex justify-between items-center -mt-2">
          <span className="text-sm font-mono font-bold">$1,000</span>
          <span className="text-sm font-mono font-bold text-[#7AE9AB]">
            ${historyData.length > 0 ? historyData[historyData.length - 1].value.toLocaleString() : '-'}
          </span>
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
          <RadarChart data={radar} />
        </div>

        {/* Radar Labels with Tooltips */}
        <div className="grid grid-cols-5 w-full mt-4 gap-1">
          <TooltipProvider>
            {radar.map((r) => (
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
              {[
                { label: 'CAGR (수익률)', pv: m.cagr, bv: bm?.cagr, unit: '%', higherIsBetter: true },
                { label: 'MDD (낙폭)', pv: m.mdd, bv: bm?.mdd, unit: '%', higherIsBetter: true },
                { label: 'Volatility (변동성)', pv: m.volatility, bv: bm?.volatility, unit: '%', higherIsBetter: false },
                { label: 'Sharpe (효율성)', pv: m.sharpe, bv: bm?.sharpe, unit: '', higherIsBetter: true },
                { label: 'Dividend (배당)', pv: m.dividend, bv: bm?.dividend, unit: '%', higherIsBetter: true },
              ].map((row, i, arr) => {
                const bv = row.bv ?? 0;
                const portfolioWins = row.higherIsBetter ? row.pv > bv : row.pv < bv;
                const benchmarkWins = row.higherIsBetter ? bv > row.pv : bv < row.pv;
                return (
                  <tr key={row.label} className={i < arr.length - 1 ? 'border-b border-white/5' : ''}>
                    <td className="py-1.5">{row.label}</td>
                    <td className="text-right py-1.5">
                      <span className={`font-bold inline-flex items-center justify-end gap-0.5 ${portfolioWins ? 'text-[#7AE9AB]' : 'text-primary'}`}>
                        {portfolioWins && <ChevronUp size={10} className="text-[#7AE9AB]" />}
                        {row.pv}{row.unit}
                      </span>
                    </td>
                    <td className="text-right py-1.5">
                      <span className={`inline-flex items-center justify-end gap-0.5 ${benchmarkWins ? 'text-[#7AE9AB]' : ''}`}>
                        {benchmarkWins && <ChevronUp size={10} className="text-[#7AE9AB]" />}
                        {bv}{row.unit}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Backtest Insight */}
      <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl flex gap-3">
        <Zap size={20} className="text-primary shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed italic text-primary-foreground/90">
          "{backtestResult.aiInsight}"
        </p>
      </div>

      {/* Save + Share */}
      <div className="flex gap-3">
        <button
          onClick={handleShare}
          className="flex-1 glass-morphism h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-muted-foreground border-white/10 hover:bg-white/5 transition-colors text-sm"
        >
          {copied ? <CheckCircle2 size={16} className="text-[#7AE9AB]" /> : <Share2 size={16} />}
          {copied ? '복사됨!' : '공유'}
        </button>
        <button
          onClick={saved ? undefined : handleSave}
          className={`flex-[2] h-14 rounded-2xl flex items-center justify-center gap-2 font-bold transition-colors text-sm border ${
            saved
              ? 'bg-[#7AE9AB]/15 text-[#7AE9AB] border-[#7AE9AB]/30'
              : 'bg-primary/15 text-primary border-primary/30 hover:bg-primary/25'
          }`}
        >
          {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          {saved ? '저장 완료!' : '내 포트폴리오에 저장'}
        </button>
      </div>

      {/* Save name input */}
      {saving && (
        <div className="glass-morphism border border-primary/30 rounded-2xl p-4 flex flex-col gap-3 animate-fade-in">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">포트폴리오 이름</span>
          <input
            autoFocus
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commitSave(); if (e.key === 'Escape') setSaving(false); }}
            placeholder="예: 안정형 포트폴리오"
            className="bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-primary/60 text-foreground placeholder:text-muted-foreground/40"
          />
          <div className="flex gap-2">
            <button onClick={() => setSaving(false)} className="flex-1 h-10 rounded-xl border border-white/10 text-xs font-bold text-muted-foreground hover:bg-white/5 transition-colors">
              취소
            </button>
            <button onClick={commitSave} className="flex-[2] h-10 rounded-xl bg-primary/20 text-primary text-xs font-bold hover:bg-primary/30 transition-colors border border-primary/30">
              저장하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
