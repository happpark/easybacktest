"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Share2, ArrowLeft, Zap, TrendingUp, ShieldAlert, Info, AlertTriangle, CheckCircle2, ChevronUp, Bookmark, BookmarkCheck } from 'lucide-react';
import { RadarChart } from '@/components/RadarChart';
import type { BacktestOutput } from '@/ai/flows/backtest-portfolio';
import { useMyPortfolios } from '@/lib/useMyPortfolios';
import { useAuth } from '@/hooks/useAuth';
import { useLang } from '@/lib/i18n';
import { buildRadar, buildMultiRadar } from '@/lib/radar';
import type { PortfolioSlot } from '@/app/page';
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
import { cn } from '@/lib/utils';

interface ResultScreenProps {
  data: Asset[] | null;
  multiData?: PortfolioSlot[] | null;
  rebalancingMonths: number;
  onReset: () => void;
}

function TooltipIcon({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative group/tip block shrink-0">
      <Info
        size={11}
        className="text-muted-foreground/40 hover:text-muted-foreground cursor-pointer transition-colors"
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
      />
      <div className={cn(
        "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[13rem] bg-popover border border-border rounded-xl px-3 py-2 text-xs text-foreground shadow-xl transition-all duration-150 pointer-events-none z-50 leading-relaxed whitespace-pre-line",
        open ? "opacity-100 visible" : "opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible"
      )}>
        {text}
      </div>
    </div>
  );
}

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

export function ResultScreen({ data, multiData, rebalancingMonths, onReset }: ResultScreenProps) {
  const { user, signInWithGoogle } = useAuth();
  const { t, lang } = useLang();
  const [backtestResult, setBacktestResult] = useState<BacktestOutput | null>(null);
  const [backtestResults, setBacktestResults] = useState<BacktestOutput[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saved, setSaved] = useState(false);
  const [loginToast, setLoginToast] = useState(false);
  // Multi-mode: radar series toggle
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  // Multi-mode: per-slot save state
  const [savingSlotIdx, setSavingSlotIdx] = useState<number | null>(null);
  const [slotSaveName, setSlotSaveName] = useState('');
  const [savedSlots, setSavedSlots] = useState<Set<number>>(new Set());
  const runningRef = useRef(false);
  const { save: savePortfolio } = useMyPortfolios(user?.id);

  // DCA state
  const [dcaAmount, setDcaAmount] = useState<number | null>(null);
  const [dcaCustom, setDcaCustom] = useState('');
  const [dcaLoading, setDcaLoading] = useState(false);
  const [dcaResult, setDcaResult] = useState<BacktestOutput | null>(null);

  const LOADING_MESSAGES = [
    t('result_loading_step0'),
    t('result_loading_step1'),
    t('result_loading_step2'),
  ];

  const rbLabel = (months: number): string => {
    if (months === 1) return t('rb_result_monthly');
    if (months === 3) return t('rb_result_quarterly');
    if (months === 12) return t('rb_result_yearly');
    return `${months}${t('rb_result_custom_suffix')}`;
  };

  const toggleSeries = (key: string) => {
    setHiddenSeries(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  useEffect(() => {
    if ((!data && !multiData) || runningRef.current) return;
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
        if (multiData && multiData.length > 0) {
          // Multi-portfolio mode
          const res = await fetch('/api/backtest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ portfolios: multiData.map(s => ({ assets: s.assets })), rebalancingMonths }),
          });
          const json = await res.json();
          if (!res.ok || json.error) {
            setErrorMessage(json.error ?? t('result_fetch_fail'));
          } else {
            setBacktestResults(json as BacktestOutput[]);
          }
        } else if (data) {
          // Single mode
          const res = await fetch('/api/backtest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assets: data, rebalancingMonths }),
          });
          const json = await res.json();
          if (!res.ok || json.error) {
            setErrorMessage(json.error ?? t('result_fetch_fail'));
          } else {
            setBacktestResult(json as BacktestOutput);
          }
        }
      } catch (e: unknown) {
        const err = e as { message?: string };
        setErrorMessage(err.message ?? t('result_fetch_fail'));
      } finally {
        clearInterval(stepTimer);
        setLoading(false);
        runningRef.current = false;
      }
    }

    fetchData();
    return () => clearInterval(stepTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, multiData]);

  const handleRetry = () => {
    runningRef.current = false;
    setBacktestResult(null);
    setBacktestResults(null);
    setErrorMessage(null);
    setLoading(true);
    setLoadingStep(0);

    const stepTimer = setInterval(() => {
      setLoadingStep(prev => Math.min(prev + 1, LOADING_MESSAGES.length - 1));
    }, 4000);

    if (multiData && multiData.length > 0) {
      fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolios: multiData.map(s => ({ assets: s.assets })), rebalancingMonths }),
      })
        .then(async res => {
          const json = await res.json();
          if (!res.ok || json.error) {
            setErrorMessage(json.error ?? t('result_fetch_fail'));
          } else {
            setBacktestResults(json as BacktestOutput[]);
          }
        })
        .catch((e: unknown) => {
          const err = e as { message?: string };
          setErrorMessage(err.message ?? t('result_fetch_fail'));
        })
        .finally(() => {
          clearInterval(stepTimer);
          setLoading(false);
        });
    } else if (data) {
      fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets: data, rebalancingMonths }),
      })
        .then(async res => {
          const json = await res.json();
          if (!res.ok || json.error) {
            setErrorMessage(json.error ?? t('result_fetch_fail'));
          } else {
            setBacktestResult(json as BacktestOutput);
          }
        })
        .catch((e: unknown) => {
          const err = e as { message?: string };
          setErrorMessage(err.message ?? t('result_fetch_fail'));
        })
        .finally(() => {
          clearInterval(stepTimer);
          setLoading(false);
        });
    }
  };

  const handleSave = () => {
    if (!backtestResult) return;
    if (!user) {
      setLoginToast(true);
      setTimeout(() => setLoginToast(false), 3000);
      signInWithGoogle();
      return;
    }
    const defaultName = `${t('result_default_portfolio_name')} ${new Date().toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' })}`;
    setSaveName(defaultName);
    setSaving(true);
  };

  const commitSave = () => {
    if (!backtestResult || !data) return;
    savePortfolio(saveName || t('result_default_portfolio_name'), data, backtestResult);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleShare = async () => {
    if (!backtestResult || !data) return;
    const m = backtestResult.metrics;
    const composition = data.map(a => `${a.ticker} ${a.weight}%`).join(' | ');
    const text = [
      t('result_share_text_title'),
      `${t('result_share_composition')}: ${composition}`,
      `${t('result_share_period')}: ${backtestResult.period}`,
      `${t('result_cagr_label')}: ${m.cagr}%  |  ${t('result_mdd_label')}: ${m.mdd}%  |  ${lang === 'ko' ? '효율성' : 'Efficiency'}: ${m.sharpe}`,
      `Volatility: ${m.volatility}%  |  Dividend: ${m.dividend}%`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 p-6 text-center animate-fade-in" style={{ minHeight: 'calc(100vh - 4rem)' }}>
        <Zap className="w-10 h-10 text-primary" />
        <div className="flex flex-col items-center gap-3">
          <h3 className="text-xl font-bold">{t('result_loading_title')}</h3>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">{LOADING_MESSAGES[loadingStep]}</p>
            <MovingDots />
          </div>
          <p className="text-xs text-muted-foreground/60">{t('result_loading_note')}</p>
        </div>
      </div>
    );
  }

  if (errorMessage || (!backtestResult && !backtestResults)) {
    return (
      <div className="p-6 text-center flex flex-col gap-4 min-h-[80vh] items-center justify-center">
        <AlertTriangle className="w-12 h-12 text-destructive" />
        <div className="flex flex-col gap-1">
          <p className="font-bold text-base">{t('result_error_title')}</p>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">{errorMessage ?? t('result_error_unknown')}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleRetry} className="text-primary font-bold border border-primary/30 px-4 py-2 rounded-xl text-sm hover:bg-primary/10 transition-colors">
            {t('result_retry')}
          </button>
          <button onClick={onReset} className="text-muted-foreground font-bold border border-white/10 px-4 py-2 rounded-xl text-sm hover:bg-white/5 transition-colors">
            {t('result_edit_portfolio')}
          </button>
        </div>
      </div>
    );
  }

  // ── Multi-portfolio result UI ──
  if (multiData && backtestResults) {
    const COLORS = ['hsl(212, 73%, 55%)', '#F59E0B', '#EC4899'];
    const benchmarkMetrics = backtestResults[0]?.benchmark_metrics;

    const multiRadarData = buildMultiRadar(
      backtestResults.map(r => r.metrics),
      benchmarkMetrics ?? undefined
    );

    const multiSeries = [
      { key: 'BM', color: '#94a3b8' },
      ...backtestResults.map((_, i) => ({ key: `P${i}`, color: COLORS[i] })),
    ].filter(s => multiRadarData[0]?.[s.key] !== undefined);

    return (
      <div className="flex flex-col gap-6 p-6 animate-fade-in pb-32">
        <header className="flex justify-between items-center">
          <button onClick={onReset} className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-lg font-bold">{t('multi_title')}</h2>
          <div className="w-10" />
        </header>

        {/* Period badge */}
        <div className="flex justify-center gap-2 flex-wrap">
          <span className="text-xs bg-white/10 px-3 py-1 rounded text-muted-foreground">
            {backtestResults[0]?.period}
          </span>
          <span className="text-xs bg-primary/10 px-3 py-1 rounded text-primary/70">
            {rbLabel(rebalancingMonths)}
          </span>
        </div>

        {/* Color legend — clickable toggles */}
        <div className="flex gap-3 justify-center flex-wrap">
          {multiData.map((slot, i) => {
            const key = `P${i}`;
            const isHidden = hiddenSeries.has(key);
            return (
              <button
                key={i}
                onClick={() => toggleSeries(key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all text-xs font-semibold',
                  isHidden
                    ? 'border-white/10 text-muted-foreground/40 bg-white/3'
                    : 'border-white/15 hover:border-white/30'
                )}
                style={isHidden ? {} : { color: COLORS[i] }}
              >
                <div className="w-3 h-3 rounded-full transition-opacity" style={{ backgroundColor: COLORS[i], opacity: isHidden ? 0.2 : 1 }} />
                {slot.name}
              </button>
            );
          })}
          <button
            onClick={() => toggleSeries('BM')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all text-xs',
              hiddenSeries.has('BM')
                ? 'border-white/10 text-muted-foreground/20'
                : 'border-white/15 text-muted-foreground hover:border-white/30'
            )}
          >
            <div className="w-3 h-3 rounded-full transition-opacity" style={{ backgroundColor: '#94a3b8', opacity: hiddenSeries.has('BM') ? 0.2 : 0.7 }} />
            S&P 500
          </button>
        </div>

        {/* Multi Radar Chart */}
        <div className="glass-morphism p-6 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden min-h-[400px]">
          <div className="absolute top-4 left-6">
            <span className="text-sm font-bold text-primary">{t('multi_radar_title')}</span>
          </div>
          <div className="w-full h-72 mt-8">
            <RadarChart
              data={multiRadarData}
              series={multiSeries.map(s => ({ ...s, hidden: hiddenSeries.has(s.key) }))}
            />
          </div>
        </div>

        {/* Growth chart - multiple lines */}
        <div className="glass-morphism p-5 rounded-3xl flex flex-col gap-3">
          <span className="text-sm font-bold text-primary">{t('multi_growth_title')}</span>
          <span className="text-xs text-muted-foreground">{t('multi_initial')}</span>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  {backtestResults.map((_, i) => (
                    <linearGradient key={i} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS[i]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS[i]} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" allowDuplicatedCategory={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <RechartsTooltip contentStyle={{ background: '#0B0E14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} labelStyle={{ color: '#94a3b8' }} formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name]} />
                {backtestResults.map((result, i) => (
                  <Area
                    key={i}
                    data={result.history.map(h => ({ date: h.date.slice(0, 7), value: h.value }))}
                    type="monotone"
                    dataKey="value"
                    name={multiData[i].name}
                    stroke={COLORS[i]}
                    strokeWidth={2}
                    fill={`url(#grad${i})`}
                    dot={false}
                    activeDot={{ r: 3, fill: COLORS[i] }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="glass-morphism p-5 rounded-3xl">
          <span className="text-sm font-bold text-primary block mb-4">{t('multi_table_title')}</span>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left pb-3 font-semibold text-muted-foreground w-20">{t('multi_metric_col')}</th>
                  {multiData.map((slot, i) => (
                    <th key={i} className="text-right pb-3 font-bold">
                      <span className="inline-flex items-center justify-end gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i] }} />
                        <span className="text-foreground">{slot.name}</span>
                      </span>
                    </th>
                  ))}
                  <th className="text-right pb-3 font-semibold text-muted-foreground">S&P 500</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: t('my_metric_cagr'), key: 'cagr' as const, unit: '%', higherBetter: true },
                  { label: t('my_metric_mdd'), key: 'mdd' as const, unit: '%', higherBetter: false },
                  { label: t('multi_volatility'), key: 'volatility' as const, unit: '%', higherBetter: false },
                  { label: t('my_metric_sharpe'), key: 'sharpe' as const, unit: '', higherBetter: true },
                  { label: t('multi_dividend'), key: 'dividend' as const, unit: '%', higherBetter: true },
                ].map((row, ri, arr) => {
                  const vals = backtestResults.map(r => r.metrics[row.key]);
                  const bmVal = backtestResults[0]?.benchmark_metrics?.[row.key] ?? 0;
                  const best = row.higherBetter ? Math.max(...vals) : Math.min(...vals);
                  return (
                    <tr key={row.key} className={ri < arr.length - 1 ? 'border-b border-border/50' : ''}>
                      <td className="py-2.5 text-muted-foreground font-semibold">{row.label}</td>
                      {vals.map((v, i) => {
                        const isBest = v === best;
                        return (
                          <td key={i} className="text-right py-2.5">
                            {isBest ? (
                              <span className="inline-flex items-center justify-end gap-1 font-bold text-[#16a34a] dark:text-[#7AE9AB]">
                                <span className="text-[8px] opacity-70">▲</span>
                                {v}{row.unit}
                              </span>
                            ) : (
                              <span className="font-semibold text-foreground">{v}{row.unit}</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="text-right py-2.5 text-muted-foreground">{bmVal}{row.unit}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Login toast (multi) */}
        {loginToast && (
          <div className="bg-primary/15 border border-primary/30 text-primary text-sm font-semibold px-4 py-3 rounded-2xl text-center animate-fade-in">
            {t('result_login_toast')}
          </div>
        )}

        {/* Final values + save buttons */}
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${backtestResults.length}, 1fr)` }}>
          {backtestResults.map((result, i) => {
            const finalVal = result.history[result.history.length - 1]?.value ?? 1000;
            const isSaved = savedSlots.has(i);
            return (
              <div key={i} className="glass-morphism p-4 rounded-2xl border border-white/5 flex flex-col gap-1">
                <div className="w-2 h-2 rounded-full mb-1" style={{ backgroundColor: COLORS[i] }} />
                <div className="text-xs text-muted-foreground">{multiData[i].name}</div>
                <div className="text-lg font-black font-mono" style={{ color: COLORS[i] }}>${finalVal.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">CAGR {result.metrics.cagr}%</div>
                <button
                  onClick={() => {
                    if (isSaved) return;
                    if (!user) {
                      setLoginToast(true);
                      setTimeout(() => setLoginToast(false), 3000);
                      signInWithGoogle();
                      return;
                    }
                    setSlotSaveName(multiData[i].name);
                    setSavingSlotIdx(i);
                  }}
                  className={cn(
                    'mt-2 h-7 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border transition-colors',
                    isSaved
                      ? 'bg-[#7AE9AB]/10 text-[#7AE9AB] border-[#7AE9AB]/20'
                      : 'bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10'
                  )}
                >
                  {isSaved ? <><BookmarkCheck size={10} /> {t('multi_saved')}</> : <><Bookmark size={10} /> {t('multi_save')}</>}
                </button>
              </div>
            );
          })}
        </div>

        {/* Slot save name input */}
        {savingSlotIdx !== null && (
          <div className="glass-morphism border border-primary/30 rounded-2xl p-4 flex flex-col gap-3 animate-fade-in">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('multi_portfolio_name_label')}</span>
            <input
              autoFocus
              value={slotSaveName}
              onChange={e => setSlotSaveName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const idx = savingSlotIdx;
                  savePortfolio(slotSaveName || multiData[idx].name, multiData[idx].assets, backtestResults[idx]);
                  setSavedSlots(prev => new Set([...prev, idx]));
                  setSavingSlotIdx(null);
                }
                if (e.key === 'Escape') setSavingSlotIdx(null);
              }}
              placeholder={t('multi_portfolio_name_placeholder')}
              className="bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-primary/60 text-foreground placeholder:text-muted-foreground/40"
            />
            <div className="flex gap-2">
              <button onClick={() => setSavingSlotIdx(null)} className="flex-1 h-10 rounded-xl border border-white/10 text-xs font-bold text-muted-foreground hover:bg-white/5 transition-colors">
                {t('multi_cancel')}
              </button>
              <button
                onClick={() => {
                  const idx = savingSlotIdx;
                  savePortfolio(slotSaveName || multiData[idx].name, multiData[idx].assets, backtestResults[idx]);
                  setSavedSlots(prev => new Set([...prev, idx]));
                  setSavingSlotIdx(null);
                }}
                className="flex-[2] h-10 rounded-xl bg-primary/20 text-primary text-xs font-bold hover:bg-primary/30 transition-colors border border-primary/30"
              >
                {t('multi_save_confirm')}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Single-portfolio result UI ──
  if (!backtestResult) return null;

  const m = backtestResult.metrics;
  const bm = backtestResult.benchmark_metrics;

  // Compute radar from metrics using the shared frontend normalization.
  const radar = buildRadar(m, bm ?? undefined);

  const radarDescriptions: Record<string, string> = {
    Attack: t('radar_attack'),
    Defense: t('radar_defense'),
    Volatility: t('radar_volatility'),
    Sharpe: t('radar_sharpe'),
    Dividend: t('radar_dividend'),
  };

  const historyData = backtestResult.history.map((h, i) => ({
    ...h,
    year: h.date.slice(0, 4),
    benchmark: backtestResult.benchmark_history?.[i]?.value,
  }));

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in pb-8">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm -mx-6 px-6 py-3 flex justify-between items-center border-b border-white/5">
        <button onClick={onReset} className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="flex flex-col items-center gap-1">
          <h2 className="text-lg font-bold">{t('result_title')}</h2>
          <div className="flex items-center gap-1.5">
            <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-muted-foreground">
              {backtestResult.period}
            </span>
            <span className="text-xs bg-primary/10 px-2 py-0.5 rounded text-primary/70">
              {rbLabel(rebalancingMonths)}
            </span>
          </div>
        </div>
        <button
          onClick={handleShare}
          className="p-2 -mr-2 text-muted-foreground hover:text-primary transition-colors relative"
          title={t('result_copy_title')}
        >
          {copied ? <CheckCircle2 size={24} className="text-[#7AE9AB]" /> : <Share2 size={24} />}
        </button>
      </header>

      {/* Main Metrics + Growth Chart — mobile: stacked, desktop: side-by-side */}
      <div className="md:grid md:grid-cols-[220px_1fr] md:gap-3 flex flex-col gap-3">

        {/* CAGR + MDD stacked */}
        <div className="grid grid-cols-2 gap-3 md:flex md:flex-col md:h-full">
          <div className="glass-morphism p-5 rounded-2xl flex flex-col gap-2 md:flex-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp size={16} className="text-[#7AE9AB]" />
              <span className="text-xs font-bold uppercase tracking-wider">{t('result_cagr_label')}</span>
            </div>
            <span className="text-3xl md:text-4xl font-black text-[#7AE9AB]">{m.cagr}%</span>
            <div className="flex flex-col text-xs text-muted-foreground border-t border-white/5 pt-2 mt-1 gap-0.5">
              <span className="font-semibold">{t('result_best_year')}: {m.best_year.year}</span>
              <span>{t('result_return')} {m.best_year.value}%</span>
            </div>
          </div>

          <div className="glass-morphism p-5 rounded-2xl flex flex-col gap-2 md:flex-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <ShieldAlert size={16} className="text-[#F25B5B]" />
              <span className="text-xs font-bold uppercase tracking-wider">{t('result_mdd_label')}</span>
            </div>
            <span className="text-3xl md:text-4xl font-black text-[#F25B5B]">{m.mdd}%</span>
            <div className="flex flex-col text-xs text-muted-foreground border-t border-white/5 pt-2 mt-1 gap-0.5">
              <span className="font-semibold">{t('result_max_drop')}: {m.mdd_year}</span>
              <span className="opacity-0">—</span>
            </div>
          </div>
        </div>

      {/* Portfolio Growth Chart */}
      <div className="glass-morphism p-5 rounded-3xl flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold text-primary">{t('result_growth_chart_title')}</span>
            <span className="text-xs text-muted-foreground">{t('result_initial_investment')}</span>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span className="text-xs text-muted-foreground">Portfolio</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40" />
              <span className="text-xs text-muted-foreground">S&P 500</span>
            </div>
          </div>
        </div>
        <div className="h-44 md:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(212, 73%, 55%)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(212, 73%, 55%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="benchmarkGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
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
                formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name]}
              />
              <Area
                type="monotone"
                dataKey="benchmark"
                name="S&P 500"
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                fill="url(#benchmarkGradient)"
                dot={false}
                activeDot={{ r: 3, fill: '#94a3b8' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                name="Portfolio"
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
          <span className="text-xs text-muted-foreground">{t('result_initial_label')}</span>
          <span className="text-xs text-muted-foreground">{t('result_final_label')}</span>
        </div>
        <div className="flex justify-between items-center -mt-2">
          <span className="text-sm font-mono font-bold">$1,000</span>
          <span className="text-sm font-mono font-bold text-[#7AE9AB]">
            ${historyData.length > 0 ? historyData[historyData.length - 1].value.toLocaleString() : '-'}
          </span>
        </div>
      </div>

      </div>{/* end md:grid wrapper */}

      {/* Radar Chart Section */}
      <div className="glass-morphism p-6 rounded-3xl relative overflow-hidden min-h-[400px] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-primary">{t('result_radar_title')}</span>
            <span className="text-xs text-muted-foreground">{t('result_radar_benchmark')}</span>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-xs text-muted-foreground">Portfolio</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
              <span className="text-xs text-muted-foreground">Benchmark</span>
            </div>
          </div>
        </div>

        {/* Body: mobile = stack, PC = side by side */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
          {/* Radar */}
          <div className="w-full md:w-3/5 h-72 md:h-[320px]">
            <RadarChart data={radar} />
          </div>

          {/* Table */}
          <div className="w-full md:w-2/5 md:self-center">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left pb-3 font-semibold text-muted-foreground">{t('result_table_metric')}</th>
                  <th className="text-right pb-3 font-bold text-foreground">Portfolio</th>
                  <th className="text-right pb-3 font-semibold text-muted-foreground">S&P 500</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: t('my_metric_cagr'), tooltip: t('tooltip_cagr'), pv: m.cagr, bv: bm?.cagr ?? 0, unit: '%', higherIsBetter: true },
                  { label: t('my_metric_mdd'), tooltip: t('tooltip_mdd'), pv: m.mdd, bv: bm?.mdd ?? 0, unit: '%', higherIsBetter: true },
                  { label: t('result_volatility'), tooltip: t('tooltip_volatility'), pv: m.volatility, bv: bm?.volatility ?? 0, unit: '%', higherIsBetter: false },
                  { label: t('my_metric_sharpe'), tooltip: t('tooltip_sharpe'), pv: m.sharpe, bv: bm?.sharpe ?? 0, unit: '', higherIsBetter: true },
                  { label: t('result_dividend'), tooltip: t('tooltip_dividend'), pv: m.dividend, bv: bm?.dividend ?? 0, unit: '%', higherIsBetter: true },
                ].map((row, i, arr) => {
                  const portfolioWins = row.higherIsBetter ? row.pv > row.bv : row.pv < row.bv;
                  const benchmarkWins = row.higherIsBetter ? row.bv > row.pv : row.bv < row.pv;
                  return (
                    <tr key={row.label} className={i < arr.length - 1 ? 'border-b border-border/50' : ''}>
                      <td className="py-2.5 text-muted-foreground font-semibold">
                        <div className="flex items-center gap-1">
                          <span className="min-w-[4.5rem] shrink-0">{row.label}</span>
                          <TooltipIcon text={row.tooltip} />
                        </div>
                      </td>
                      <td className="text-right py-2.5">
                        {portfolioWins ? (
                          <span className="inline-flex items-center justify-end gap-1 font-bold text-[#16a34a] dark:text-[#7AE9AB]">
                            <span className="text-[8px] opacity-70">▲</span>
                            {row.pv}{row.unit}
                          </span>
                        ) : (
                          <span className="font-semibold text-foreground">{row.pv}{row.unit}</span>
                        )}
                      </td>
                      <td className="text-right py-2.5">
                        {benchmarkWins ? (
                          <span className="inline-flex items-center justify-end gap-1 font-bold text-[#16a34a] dark:text-[#7AE9AB]">
                            <span className="text-[8px] opacity-70">▲</span>
                            {row.bv}{row.unit}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{row.bv}{row.unit}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* AI Backtest Insight */}
      <p className="text-sm text-muted-foreground leading-relaxed italic px-1">
        &quot;{backtestResult.aiInsight}&quot;
      </p>

      {/* ── DCA Section ── */}
      {data && (
        <div className="glass-morphism rounded-3xl border border-white/8 p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-base font-bold">💰 {t('dca_section_title')}</span>
            <span className="text-xs text-muted-foreground">{t('dca_section_desc')}</span>
          </div>

          {/* Amount presets */}
          <div className="flex flex-wrap gap-2">
            {[50, 100, 200, 500].map(amt => (
              <button
                key={amt}
                onClick={() => { setDcaAmount(amt); setDcaCustom(''); }}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-bold border transition-all',
                  dcaAmount === amt && !dcaCustom
                    ? 'bg-primary/20 border-primary/50 text-primary'
                    : 'border-white/10 text-muted-foreground hover:border-white/25 hover:text-foreground'
                )}
              >
                ${amt}<span className="text-xs font-normal opacity-70">{t('dca_monthly_label')}</span>
              </button>
            ))}
            <input
              type="number"
              placeholder={t('dca_custom_placeholder')}
              value={dcaCustom}
              onChange={e => { setDcaCustom(e.target.value); setDcaAmount(null); }}
              className="w-32 px-3 py-2 rounded-xl text-sm font-bold border border-white/10 bg-black/30 text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50"
            />
          </div>

          <button
            onClick={async () => {
              const amount = dcaCustom ? parseInt(dcaCustom) : dcaAmount;
              if (!amount || amount <= 0 || !data) return;
              setDcaLoading(true);
              setDcaResult(null);
              try {
                const res = await fetch('/api/backtest', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ assets: data, rebalancingMonths, dcaMonthlyAmount: amount }),
                });
                const result = await res.json();
                setDcaResult(result);
              } catch { /* ignore */ } finally {
                setDcaLoading(false);
              }
            }}
            disabled={dcaLoading || (!dcaAmount && !dcaCustom)}
            className="h-11 rounded-xl bg-primary/15 border border-primary/30 text-primary text-sm font-bold hover:bg-primary/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {dcaLoading ? t('dca_calculating') : t('dca_calculate')}
          </button>

          {/* DCA Results */}
          {dcaResult?.dca_metrics && (
            <div className="flex flex-col gap-4 animate-fade-in">
              {/* Key stats */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: t('dca_total_invested'), value: `$${dcaResult.dca_metrics.totalInvested.toLocaleString()}` },
                  { label: t('dca_final_value'), value: `$${Math.round(dcaResult.dca_metrics.finalValue).toLocaleString()}` },
                  { label: t('dca_profit'), value: `+$${Math.round(dcaResult.dca_metrics.finalValue - dcaResult.dca_metrics.totalInvested).toLocaleString()}`, positive: true },
                  { label: t('dca_return'), value: `+${dcaResult.dca_metrics.totalReturn}%`, positive: true },
                ].map(({ label, value, positive }) => (
                  <div key={label} className="bg-white/5 rounded-2xl p-3 flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className={cn('text-base font-bold', positive && 'text-[#7AE9AB]')}>{value}</span>
                  </div>
                ))}
              </div>

              {/* DCA Chart */}
              {dcaResult.dca_history && (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dcaResult.dca_history} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                      <defs>
                        <linearGradient id="dcaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(212,73%,55%)" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="hsl(212,73%,55%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" hide />
                      <YAxis hide />
                      <RechartsTooltip
                        contentStyle={{ background: '#0B0E14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                        formatter={(value: number, name: string) => [`$${Math.round(value).toLocaleString()}`, name === 'value' ? t('dca_chart_portfolio') : t('dca_chart_cost')]}
                        labelFormatter={(l: string) => l.substring(0, 7)}
                      />
                      <Area type="monotone" dataKey="costBasis" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 3" fill="none" dot={false} name="costBasis" />
                      <Area type="monotone" dataKey="value" stroke="hsl(212,73%,55%)" strokeWidth={2} fill="url(#dcaGrad)" dot={false} name="value" />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 justify-center mt-2">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="w-5 h-0.5 bg-primary/70 inline-block" />{t('dca_chart_portfolio')}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="w-5 h-0.5 bg-slate-400 inline-block border-dashed" />{t('dca_chart_cost')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Login nudge banner — always visible for non-logged-in users */}
      {!user && (
        <div className="flex flex-col gap-3 glass-morphism border border-primary/20 rounded-2xl px-4 py-4 animate-fade-in">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold text-foreground">{t('result_login_nudge_title')}</span>
            <span className="text-xs text-muted-foreground">{t('result_login_nudge_desc')}</span>
          </div>
          <button
            onClick={signInWithGoogle}
            className="w-full h-10 rounded-xl bg-primary/15 border border-primary/30 text-primary text-sm font-bold hover:bg-primary/25 transition-colors flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.332 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
              <path d="M6.306 14.691l6.571 4.819C14.655 15.108 19.001 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
              <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.316 0-9.828-3.418-11.534-8.15l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
              <path d="M43.611 20.083H42V20H24v8h11.303a11.986 11.986 0 01-4.087 5.571l6.19 5.238C42.021 35.688 44 30.138 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
            </svg>
            {t('result_login_nudge_cta')}
          </button>
        </div>
      )}

      {/* Login toast */}
      {loginToast && (
        <div className="bg-primary/15 border border-primary/30 text-primary text-sm font-semibold px-4 py-3 rounded-2xl text-center animate-fade-in">
          {t('result_login_toast')}
        </div>
      )}

      {/* Save + Share */}
      <div className="flex gap-3">
        <button
          onClick={handleShare}
          className="flex-1 glass-morphism h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-muted-foreground border-white/10 hover:bg-white/5 transition-colors text-sm"
        >
          {copied ? <CheckCircle2 size={16} className="text-[#7AE9AB]" /> : <Share2 size={16} />}
          {copied ? t('result_copied') : t('result_share')}
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
          {saved ? t('result_saved') : t('result_save_to_portfolio')}
        </button>
      </div>

      {/* Save name input */}
      {saving && (
        <div className="glass-morphism border border-primary/30 rounded-2xl p-4 flex flex-col gap-3 animate-fade-in">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('result_portfolio_name_label')}</span>
          <input
            autoFocus
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commitSave(); if (e.key === 'Escape') setSaving(false); }}
            placeholder={t('result_portfolio_name_placeholder')}
            className="bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-primary/60 text-foreground placeholder:text-muted-foreground/40"
          />
          <div className="flex gap-2">
            <button onClick={() => setSaving(false)} className="flex-1 h-10 rounded-xl border border-white/10 text-xs font-bold text-muted-foreground hover:bg-white/5 transition-colors">
              {t('result_cancel')}
            </button>
            <button onClick={commitSave} className="flex-[2] h-10 rounded-xl bg-primary/20 text-primary text-xs font-bold hover:bg-primary/30 transition-colors border border-primary/30">
              {t('result_save_confirm')}
            </button>
          </div>
        </div>
      )}

      {/* Suppress unused variable warning for radarDescriptions */}
      {/* radarDescriptions is available for tooltip use */}
      <div className="hidden">{JSON.stringify(radarDescriptions)}</div>
    </div>
  );
}
