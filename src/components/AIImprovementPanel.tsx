'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, ArrowLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Asset } from '@/app/page';
import type { BacktestOutput } from '@/ai/flows/backtest-portfolio';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';

interface StrategyResult {
  name: string;
  emoji: string;
  tagline: string;
  reasoning: string;
  weights: { ticker: string; weight: number }[];
  metrics: BacktestOutput['metrics'];
  history: { date: string; value: number }[];
  delta: {
    cagr: number; mdd: number; sharpe: number;
    volatility: number; dividend: number;
  };
  available: boolean;
}

interface AIImprovementPanelProps {
  assets: Asset[];
  currentMetrics: BacktestOutput['metrics'];
  currentHistory: { date: string; value: number }[];
  onCompare: (name: string, suggestedAssets: Asset[]) => void;
  onApply: (suggestedAssets: Asset[]) => void;
}

function MovingDots() {
  const [pos, setPos] = useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setPos(p => (p + 1) % 3), 400);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="inline-flex gap-1.5">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full transition-all duration-300"
          style={{ background: i === pos ? '#a78bfa' : 'rgba(255,255,255,0.15)' }}
        />
      ))}
    </span>
  );
}

function DeltaBadge({ value, higherBetter = true }: { value: number; higherBetter?: boolean }) {
  const good = higherBetter ? value > 0 : value < 0;
  const neutral = value === 0;
  return (
    <span className={cn(
      'text-[11px] font-bold',
      neutral ? 'text-muted-foreground' : good ? 'text-emerald-400' : 'text-rose-400'
    )}>
      {value > 0 ? '+' : ''}{value}
    </span>
  );
}

// ── Detail modal ────────────────────────────────────────────────────────────────
function StrategyDetailModal({
  strategy,
  originalAssets,
  currentMetrics,
  currentHistory,
  onBack,
  onCompare,
  onApply,
}: {
  strategy: StrategyResult;
  originalAssets: Asset[];
  currentMetrics: BacktestOutput['metrics'];
  currentHistory: { date: string; value: number }[];
  onBack: () => void;
  onCompare: () => void;
  onApply: () => void;
}) {
  const { t, lang } = useLang();
  const isKo = lang === 'ko';

  // Build aligned chart — crop both to common date range, renormalize to 1000
  const chartData = useMemo(() => {
    if (!currentHistory.length || !strategy.history.length) return [];

    // Find the LATER start date so both series begin at the same calendar point
    const laterStart = currentHistory[0].date > strategy.history[0].date
      ? currentHistory[0].date
      : strategy.history[0].date;

    const origFiltered = currentHistory.filter(h => h.date >= laterStart);
    const sugFiltered  = strategy.history.filter(h => h.date >= laterStart);
    if (!origFiltered.length || !sugFiltered.length) return [];

    // Renormalize both to start at 1000 from the common date
    const origBase = origFiltered[0].value;
    const sugBase  = sugFiltered[0].value;

    const origMap = new Map(origFiltered.map(h => [h.date, Math.round(h.value / origBase * 1000 * 100) / 100]));
    const sugMap  = new Map(sugFiltered.map(h =>  [h.date, Math.round(h.value / sugBase  * 1000 * 100) / 100]));

    const allDates = [...new Set([
      ...origFiltered.map(h => h.date),
      ...sugFiltered.map(h => h.date),
    ])].sort();

    const step = Math.max(1, Math.floor(allDates.length / 60));
    return allDates
      .filter((_, i) => i % step === 0 || i === allDates.length - 1)
      .map(d => ({ date: d.slice(0, 7), original: origMap.get(d), suggested: sugMap.get(d) }));
  }, [currentHistory, strategy.history]);

  const metricRows = [
    { label: 'CAGR', current: currentMetrics.cagr, next: strategy.metrics.cagr, delta: strategy.delta.cagr, unit: '%', higherBetter: true },
    { label: 'MDD', current: currentMetrics.mdd, next: strategy.metrics.mdd, delta: strategy.delta.mdd, unit: '%', higherBetter: false },
    { label: isKo ? '샤프' : 'Sharpe', current: currentMetrics.sharpe, next: strategy.metrics.sharpe, delta: strategy.delta.sharpe, unit: '', higherBetter: true },
    { label: isKo ? '변동성' : 'Volatility', current: currentMetrics.volatility, next: strategy.metrics.volatility, delta: strategy.delta.volatility, unit: '%', higherBetter: false },
    { label: isKo ? '배당' : 'Dividend', current: currentMetrics.dividend, next: strategy.metrics.dividend, delta: strategy.delta.dividend, unit: '%', higherBetter: true },
  ];

  const modal = (
    <div
      style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', zIndex: 60 }}
      onClick={onBack}
    >
      <div
        className="modal-panel bg-background border border-border rounded-3xl"
        style={{
          maxHeight: 'calc(100dvh - 32px)',
          overflowY: 'auto',
          width: '100%',
          maxWidth: 540,
          margin: '0 16px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header flex items-center gap-3 px-5 py-4 border-b border-border/50 sticky top-0 bg-background z-10">
          <button onClick={onBack} className="p-1.5 -ml-1 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={18} />
          </button>
          <span className="text-2xl">{strategy.emoji}</span>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-base leading-tight">{strategy.name}</span>
            <span className="text-xs text-muted-foreground truncate">{strategy.tagline}</span>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-5">

          {/* Reasoning */}
          <p className="text-sm text-muted-foreground leading-relaxed">{strategy.reasoning}</p>

          {/* Composition */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              {t('ai_panel_composition')}
            </span>
            {strategy.weights.map(w => {
              const isNew = !originalAssets.some(a => a.ticker === w.ticker);
              const original = originalAssets.find(a => a.ticker === w.ticker);
              const diff = original ? Math.round((w.weight - original.weight) * 10) / 10 : w.weight;
              return (
                <div key={w.ticker} className="flex items-center gap-2 text-sm">
                  <span className="font-mono font-bold w-14 shrink-0">{w.ticker}</span>
                  {isNew && (
                    <span className="text-[9px] bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded-md font-bold shrink-0">
                      {t('ai_panel_new')}
                    </span>
                  )}
                  <div className="flex-1 h-1.5 rounded-full bg-white/10 relative overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${w.weight}%`, background: isNew ? '#a78bfa' : 'hsl(212,73%,55%)' }}
                    />
                  </div>
                  <span className="font-bold w-9 text-right shrink-0">{w.weight}%</span>
                  {diff !== 0 && (
                    <span className={cn(
                      'text-[11px] font-bold w-10 text-right shrink-0',
                      diff > 0 ? 'text-emerald-400' : 'text-rose-400'
                    )}>
                      {diff > 0 ? `+${diff}` : diff}%
                    </span>
                  )}
                </div>
              );
            })}
            {/* Removed assets */}
            {originalAssets
              .filter(a => !strategy.weights.some(w => w.ticker === a.ticker))
              .map(a => (
                <div key={a.ticker} className="flex items-center gap-2 text-sm opacity-35">
                  <span className="font-mono font-bold w-14 shrink-0 line-through">{a.ticker}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/10" />
                  <span className="font-bold w-9 text-right shrink-0">0%</span>
                  <span className="text-[11px] font-bold w-10 text-right shrink-0 text-rose-400">
                    -{a.weight}%
                  </span>
                </div>
              ))}
          </div>

          {/* Comparison chart */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              {t('ai_panel_growth_compare')}
            </span>
            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sugGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="origGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(212,73%,55%)" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="hsl(212,73%,55%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    data={chartData}
                    tick={{ fill: '#64748b', fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <RechartsTooltip
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11, color: 'hsl(var(--popover-foreground))' }}
                    labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                    formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name]}
                  />
                  <Area
                    data={chartData}
                    type="monotone"
                    dataKey="original"
                    name={isKo ? '현재 포트폴리오' : 'Current'}
                    stroke="hsl(212,73%,55%)"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    fill="url(#origGrad)"
                    dot={false}
                    connectNulls
                  />
                  <Area
                    data={chartData}
                    type="monotone"
                    dataKey="suggested"
                    name={strategy.name}
                    stroke="#a78bfa"
                    strokeWidth={2}
                    fill="url(#sugGrad)"
                    dot={false}
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 justify-center">
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="w-5 border-t border-dashed border-primary/60 inline-block" />
                {isKo ? '현재 포트폴리오' : 'Current'}
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="w-5 h-px bg-violet-400 inline-block" />
                {strategy.name}
              </span>
            </div>
          </div>

          {/* Metrics comparison table */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              {t('ai_panel_vs_current')}
            </span>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 font-semibold text-muted-foreground">{isKo ? '지표' : 'Metric'}</th>
                  <th className="text-right py-2 font-semibold text-muted-foreground">{isKo ? '현재' : 'Current'}</th>
                  <th className="text-right py-2 font-bold text-violet-300">{strategy.name}</th>
                  <th className="text-right py-2 font-semibold text-muted-foreground">{isKo ? '변화' : 'Change'}</th>
                </tr>
              </thead>
              <tbody>
                {metricRows.map((row, i, arr) => {
                  const improved = row.higherBetter ? row.delta > 0 : row.delta < 0;
                  return (
                    <tr key={row.label} className={i < arr.length - 1 ? 'border-b border-border/30' : ''}>
                      <td className="py-2 text-muted-foreground">{row.label}</td>
                      <td className="py-2 text-right text-muted-foreground">{row.current}{row.unit}</td>
                      <td className={cn(
                        'py-2 text-right font-bold',
                        improved ? 'text-emerald-400' : row.delta === 0 ? 'text-foreground' : 'text-rose-400'
                      )}>
                        {row.next}{row.unit}
                      </td>
                      <td className="py-2 text-right">
                        <DeltaBadge value={row.delta} higherBetter={row.higherBetter} />
                        {row.unit && <span className="text-[10px] text-muted-foreground/60">{row.unit}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onApply}
              className="flex-1 h-11 rounded-xl border border-border text-sm font-bold text-muted-foreground hover:bg-muted/30 transition-colors"
            >
              {t('ai_panel_apply')}
            </button>
            <button
              onClick={onCompare}
              className="flex-[2] h-11 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300 text-sm font-bold hover:bg-violet-500/25 transition-colors"
            >
              {t('ai_panel_compare')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

// ── Main panel ─────────────────────────────────────────────────────────────────
export function AIImprovementPanel({
  assets,
  currentMetrics,
  currentHistory,
  onCompare,
  onApply,
}: AIImprovementPanelProps) {
  const { t } = useLang();
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [strategies, setStrategies] = useState<StrategyResult[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const { lang } = useLang();

  const analyze = useCallback(async () => {
    setStatus('loading');
    setStrategies([]);
    try {
      const res = await fetch('/api/suggest-improvements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets, metrics: currentMetrics, lang }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json() as { strategies: StrategyResult[] };
      const valid = data.strategies.filter(s => s.available);
      if (valid.length === 0) throw new Error('No valid strategies');
      setStrategies(valid);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }, [assets, currentMetrics, lang]);

  // ── Idle ────────────────────────────────────────────────────────────────────
  if (status === 'idle') {
    return (
      <div className="glass-morphism rounded-3xl border border-border/50 p-6 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-base font-bold">🤖 {t('ai_panel_title')}</span>
          <span className="text-xs text-muted-foreground">{t('ai_panel_desc')}</span>
        </div>
        <button
          onClick={analyze}
          className="h-11 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300 text-sm font-bold hover:bg-violet-500/25 transition-colors flex items-center justify-center gap-2"
        >
          <Sparkles size={15} />
          {t('ai_panel_cta')}
        </button>
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="glass-morphism rounded-3xl border border-violet-500/15 p-6 flex flex-col items-center gap-4">
        <Sparkles size={20} className="text-violet-400 animate-pulse" />
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-bold">{t('ai_panel_loading')}</span>
          <MovingDots />
        </div>
        <span className="text-xs text-muted-foreground/60 text-center max-w-[240px] leading-relaxed">
          {t('ai_panel_loading_sub')}
        </span>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="glass-morphism rounded-3xl border border-border/50 p-6 flex flex-col gap-3">
        <span className="text-sm font-bold">🤖 {t('ai_panel_title')}</span>
        <span className="text-sm text-rose-400">{t('ai_panel_error')}</span>
        <button
          onClick={() => setStatus('idle')}
          className="flex items-center gap-1.5 text-xs text-primary/70 hover:text-primary transition-colors"
        >
          <RotateCcw size={12} /> {t('ai_panel_retry')}
        </button>
      </div>
    );
  }

  // ── Results: 3 cards ─────────────────────────────────────────────────────────
  return (
    <>
      <div className="glass-morphism rounded-3xl border border-border/50 p-6 flex flex-col gap-4">
        <span className="text-base font-bold">🤖 {t('ai_panel_title')}</span>

        <div className="grid grid-cols-3 gap-2.5">
          {strategies.map((s, i) => {
            const deltaRows = [
              { label: 'CAGR', value: s.delta.cagr, higherBetter: true },
              { label: 'MDD', value: s.delta.mdd, higherBetter: false },
              { label: 'Sharpe', value: s.delta.sharpe, higherBetter: true },
            ];
            return (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className="flex flex-col gap-2 bg-muted/20 border border-border/50 rounded-2xl p-3 text-left hover:border-ai-purple/40 hover:bg-ai-purple/5 transition-all group"
              >
                <div className="text-xl">{s.emoji}</div>
                <div className="text-xs font-bold leading-tight text-foreground">{s.name}</div>
                <div className="text-[9px] text-muted-foreground leading-relaxed line-clamp-2">{s.tagline}</div>

                <div className="border-t border-border/30 pt-2 mt-auto flex flex-col gap-1 w-full">
                  {deltaRows.map(({ label, value, higherBetter }) => {
                    const good = higherBetter ? value > 0 : value < 0;
                    return (
                      <div key={label} className="flex justify-between items-center">
                        <span className="text-[9px] text-muted-foreground">{label}</span>
                        <span className={cn(
                          'text-[10px] font-bold',
                          value === 0 ? 'text-muted-foreground' : good ? 'text-emerald-400' : 'text-rose-400'
                        )}>
                          {value > 0 ? '+' : ''}{value}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-0.5 text-[9px] text-violet-400/70 font-semibold group-hover:text-violet-400 transition-colors">
                  {t('ai_panel_view_detail')} <ChevronRight size={9} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail modal */}
      {selected !== null && (
        <StrategyDetailModal
          strategy={strategies[selected]}
          originalAssets={assets}
          currentMetrics={currentMetrics}
          currentHistory={currentHistory}
          onBack={() => setSelected(null)}
          onCompare={() => {
            setSelected(null);
            onCompare(strategies[selected].name, strategies[selected].weights);
          }}
          onApply={() => {
            setSelected(null);
            onApply(strategies[selected].weights);
          }}
        />
      )}
    </>
  );
}
