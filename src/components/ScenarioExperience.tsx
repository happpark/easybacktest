'use client';

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { X } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ScenarioKey, ScenarioResult, ScenarioPoint } from '@/ai/flows/scenario';
import type { Asset } from '@/app/page';

interface Props {
  data: Asset[];
  backtestPeriodStart: string; // "2010.01"
  onClose: () => void;
}

const SCENARIO_META: Record<ScenarioKey, { titleKey: string; subKey: string; color: string; emoji: string }> = {
  '2008': { titleKey: 'scenario_2008', subKey: 'scenario_2008_sub', color: '#ef4444', emoji: '🏦' },
  '2020': { titleKey: 'scenario_2020', subKey: 'scenario_2020_sub', color: '#f97316', emoji: '🦠' },
  '2022': { titleKey: 'scenario_2022', subKey: 'scenario_2022_sub', color: '#eab308', emoji: '📈' },
};

const PEAK_DATES: Record<ScenarioKey, string> = {
  '2008': '2007-10-09',
  '2020': '2020-02-19',
  '2022': '2022-01-03',
};

function groupByMonth(points: ScenarioPoint[]): { year: number; month: number; days: ScenarioPoint[] }[] {
  const map = new Map<string, ScenarioPoint[]>();
  for (const p of points) {
    const key = p.date.substring(0, 7);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, days]) => {
      const [y, m] = key.split('-').map(Number);
      return { year: y, month: m, days };
    });
}

function pctToBg(pct: number): string {
  if (pct >= 15)  return 'rgba(74,222,128,0.70)';
  if (pct >= 8)   return 'rgba(74,222,128,0.50)';
  if (pct >= 3)   return 'rgba(74,222,128,0.30)';
  if (pct >= 0)   return 'rgba(74,222,128,0.14)';
  if (pct >= -5)  return 'rgba(248,113,113,0.20)';
  if (pct >= -12) return 'rgba(239,68,68,0.38)';
  if (pct >= -22) return 'rgba(220,38,38,0.58)';
  return 'rgba(185,28,28,0.80)';
}

function pctToText(pct: number): string {
  if (pct >= 0) return '#86efac';
  if (pct >= -12) return '#fca5a5';
  return '#fecaca';
}

const MONTH_NAMES_KO = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const MONTH_NAMES_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOW_KO = ['월','화','수','목','금'];
const DOW_EN = ['Mon','Tue','Wed','Thu','Fri'];

export function ScenarioExperience({ data, backtestPeriodStart, onClose }: Props) {
  const { t, lang } = useLang();
  const [selected, setSelected] = useState<ScenarioKey | null>(null);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState<ScenarioPoint | null>(null);
  const loadingRef = useRef(false);

  const availableScenarios = useMemo((): ScenarioKey[] => {
    const [y, m] = backtestPeriodStart.split('.').map(Number);
    const startMs = new Date(y, (m || 1) - 1, 1).getTime();
    return (['2008', '2020', '2022'] as ScenarioKey[]).filter(k =>
      new Date(PEAK_DATES[k]).getTime() >= startMs
    );
  }, [backtestPeriodStart]);

  const loadScenario = useCallback(async (key: ScenarioKey) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setSelected(key);
    setResult(null);
    setHovered(null);
    setLoading(true);
    try {
      const res = await fetch('/api/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets: data, scenario: key, lang }),
      });
      setResult(await res.json());
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [data, lang]);

  const dateMap = useMemo(() => {
    const m = new Map<string, ScenarioPoint>();
    result?.points?.forEach(p => m.set(p.date, p));
    return m;
  }, [result]);

  const months = useMemo(() =>
    result?.available ? groupByMonth(result.points) : [],
    [result]
  );

  const meta = selected ? SCENARIO_META[selected] : null;
  const peakDate = selected ? PEAK_DATES[selected] : null;
  const monthNames = lang === 'ko' ? MONTH_NAMES_KO : MONTH_NAMES_EN;
  const dowLabels = lang === 'ko' ? DOW_KO : DOW_EN;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-[#0B0E14] border border-white/10 rounded-t-3xl md:rounded-3xl flex flex-col max-h-[92dvh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0 border-b border-white/5">
          <div className="flex items-center gap-3">
            {selected && (
              <button onClick={() => { setSelected(null); setResult(null); setHovered(null); }}
                className="text-muted-foreground hover:text-foreground transition-colors text-sm px-1">←</button>
            )}
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold">
                {selected && meta
                  ? `${meta.emoji} ${t(meta.titleKey as Parameters<typeof t>[0])}`
                  : `📉 ${t('scenario_section_title')}`}
              </span>
              {!selected && <span className="text-xs text-muted-foreground">{t('scenario_section_desc')}</span>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/5 text-muted-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Scenario picker */}
        {!selected && (
          <div className="px-5 py-5 flex flex-col gap-3 overflow-y-auto">
            {(['2008', '2020', '2022'] as ScenarioKey[]).map(key => {
              const m = SCENARIO_META[key];
              const available = availableScenarios.includes(key);
              return (
                <button key={key}
                  onClick={() => available && loadScenario(key)}
                  disabled={!available}
                  className={cn(
                    'flex items-center justify-between px-4 py-4 rounded-2xl border text-left transition-all',
                    available
                      ? 'border-white/8 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/15'
                      : 'border-white/4 bg-white/[0.01] opacity-35 cursor-not-allowed'
                  )}>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold">{m.emoji} {t(m.titleKey as Parameters<typeof t>[0])}</span>
                    <span className="text-xs" style={{ color: available ? m.color : '#666' }}>
                      {t(m.subKey as Parameters<typeof t>[0])}
                      {!available && (lang === 'ko' ? ' · 백테스트 기간 외' : ' · outside backtest period')}
                    </span>
                  </div>
                  {available && <span className="text-muted-foreground/30 text-sm">›</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Loading */}
        {selected && loading && (
          <div className="flex-1 flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-xs text-muted-foreground">{t('scenario_loading')}</span>
            </div>
          </div>
        )}

        {/* Heatmap calendar */}
        {selected && !loading && result?.available && (
          <div className="flex flex-col flex-1 overflow-hidden">

            {/* Sticky tooltip bar */}
            <div className={cn(
              'mx-5 mt-3 mb-1 px-4 py-2.5 rounded-xl border flex items-center justify-between shrink-0 transition-all duration-150',
              hovered
                ? hovered.pctFromPeak >= 0
                  ? 'bg-green-500/10 border-green-500/20 opacity-100'
                  : 'bg-rose-500/10 border-rose-500/20 opacity-100'
                : 'border-white/5 bg-white/[0.02] opacity-60'
            )}>
              {hovered ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{hovered.date}</span>
                    {hovered.milestone && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/10 text-white/60">
                        {hovered.milestone}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black tabular-nums" style={{ color: pctToText(hovered.pctFromPeak) }}>
                      {hovered.pctFromPeak >= 0 ? '+' : ''}{hovered.pctFromPeak.toFixed(2)}%
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      ${Math.round(hovered.value).toLocaleString()}
                    </span>
                  </div>
                </>
              ) : (
                <span className="text-xs text-muted-foreground/50 w-full text-center">
                  {lang === 'ko' ? '날짜에 커서를 올리거나 탭하세요' : 'Hover or tap a date to see returns'}
                </span>
              )}
            </div>

            {/* Legend */}
            <div className="px-5 py-2 shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-1">
                {[
                  { bg: 'rgba(185,28,28,0.80)', label: lang === 'ko' ? '-20%↓' : '-20%↓' },
                  { bg: 'rgba(220,38,38,0.58)', label: '' },
                  { bg: 'rgba(239,68,68,0.38)', label: '' },
                  { bg: 'rgba(248,113,113,0.20)', label: '' },
                  { bg: 'rgba(74,222,128,0.14)', label: '' },
                  { bg: 'rgba(74,222,128,0.30)', label: '' },
                  { bg: 'rgba(74,222,128,0.70)', label: lang === 'ko' ? '+15%↑' : '+15%↑' },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-0.5">
                    <div className="w-4 h-4 rounded-[3px]" style={{ background: s.bg }} />
                    {s.label && <span className="text-[9px] text-muted-foreground/50 ml-0.5">{s.label}</span>}
                  </div>
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground/40">
                {lang === 'ko' ? '📌 = 매수일' : '📌 = buy date'}
              </span>
            </div>

            {/* Scrollable calendar */}
            <div className="overflow-y-auto flex-1 px-5 pb-5 flex flex-col gap-5">
              {months.map(({ year, month }) => {
                const firstDow = new Date(year, month - 1, 1).getDay();
                const firstMonBased = (firstDow + 6) % 7;
                const daysInMonth = new Date(year, month, 0).getDate();

                type Cell = { date: string; day: number; point: ScenarioPoint | null } | null;
                const cells: Cell[] = [];
                for (let i = 0; i < Math.min(firstMonBased, 5); i++) cells.push(null);
                for (let d = 1; d <= daysInMonth; d++) {
                  const dow = new Date(year, month - 1, d).getDay();
                  if (dow === 0 || dow === 6) continue;
                  const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                  cells.push({ date: dateStr, day: d, point: dateMap.get(dateStr) ?? null });
                }
                while (cells.length % 5 !== 0) cells.push(null);

                return (
                  <div key={`${year}-${month}`} className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-muted-foreground/70">
                      {monthNames[month - 1]} {year}
                    </span>
                    <div className="grid grid-cols-5 gap-1">
                      {dowLabels.map(d => (
                        <div key={d} className="text-center text-[9px] text-muted-foreground/30 pb-0.5">{d}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {cells.map((cell, i) => {
                        if (!cell) return <div key={i} />;
                        const isPeak = cell.date === peakDate;
                        const p = cell.point;
                        const isHovered = hovered?.date === cell.date;

                        return (
                          <button
                            key={cell.date}
                            onMouseEnter={() => p && setHovered(p)}
                            onMouseLeave={() => setHovered(null)}
                            onClick={() => p && setHovered(h => h?.date === cell.date ? null : p)}
                            className={cn(
                              'relative rounded-lg aspect-square flex flex-col items-center justify-center transition-all duration-100',
                              p ? 'cursor-pointer' : 'cursor-default opacity-20',
                              isHovered && 'ring-1 ring-white/50 scale-110 z-10',
                              isPeak && 'ring-2 ring-primary/70',
                            )}
                            style={{
                              background: isPeak
                                ? 'rgba(99,179,237,0.25)'
                                : p
                                  ? pctToBg(p.pctFromPeak)
                                  : 'rgba(255,255,255,0.03)',
                            }}
                          >
                            {isPeak ? (
                              <span className="text-[9px] text-primary font-bold leading-none">📌</span>
                            ) : (
                              <span className="text-[11px] text-white/70 font-mono leading-none">{cell.day}</span>
                            )}
                            {p?.milestone && (
                              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-white/80" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
