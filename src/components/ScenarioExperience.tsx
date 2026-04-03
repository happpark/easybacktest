'use client';

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { X } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ScenarioKey, ScenarioResult, ScenarioPoint } from '@/ai/flows/scenario';
import type { Asset } from '@/app/page';

interface Props {
  data: Asset[];
  backtestPeriodStart: string; // "2010.01" format
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

// Build a lookup: date string → ScenarioPoint
function buildDateMap(points: ScenarioPoint[]): Map<string, ScenarioPoint> {
  const m = new Map<string, ScenarioPoint>();
  for (const p of points) m.set(p.date, p);
  return m;
}

// Group trading dates by year-month
function groupByMonth(points: ScenarioPoint[]): { year: number; month: number; days: ScenarioPoint[] }[] {
  const map = new Map<string, ScenarioPoint[]>();
  for (const p of points) {
    const key = p.date.substring(0, 7); // "2007-10"
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, days]) => {
    const [y, m] = key.split('-').map(Number);
    return { year: y, month: m, days };
  });
}

function pctToColor(pct: number): { bg: string; text: string } {
  if (pct >= 10)  return { bg: 'rgba(74,222,128,0.35)', text: '#4ade80' };
  if (pct >= 3)   return { bg: 'rgba(74,222,128,0.20)', text: '#86efac' };
  if (pct >= 0)   return { bg: 'rgba(74,222,128,0.10)', text: '#bbf7d0' };
  if (pct >= -5)  return { bg: 'rgba(248,113,113,0.15)', text: '#fca5a5' };
  if (pct >= -15) return { bg: 'rgba(248,113,113,0.25)', text: '#f87171' };
  if (pct >= -25) return { bg: 'rgba(239,68,68,0.35)', text: '#ef4444' };
  return { bg: 'rgba(220,38,38,0.50)', text: '#dc2626' };
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
  const [opened, setOpened] = useState<Set<string>>(new Set()); // revealed dates
  const [tooltip, setTooltip] = useState<{ date: string; pct: number; value: number } | null>(null);
  const loadingRef = useRef(false);

  // Filter available scenarios: peak date must be >= backtest start
  const availableScenarios = useMemo((): ScenarioKey[] => {
    const [y, m] = backtestPeriodStart.split('.').map(Number);
    const startMs = new Date(y, (m || 1) - 1, 1).getTime();
    return (['2008', '2020', '2022'] as ScenarioKey[]).filter(k => {
      const peakMs = new Date(PEAK_DATES[k]).getTime();
      return peakMs >= startMs;
    });
  }, [backtestPeriodStart]);

  const loadScenario = useCallback(async (key: ScenarioKey) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setSelected(key);
    setResult(null);
    setOpened(new Set());
    setTooltip(null);
    setLoading(true);
    try {
      const res = await fetch('/api/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets: data, scenario: key, lang }),
      });
      const r: ScenarioResult = await res.json();
      setResult(r);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [data, lang]);

  const months = useMemo(() => result?.available ? groupByMonth(result.points) : [], [result]);
  const dateMap = useMemo(() => result?.available ? buildDateMap(result.points) : new Map(), [result]);
  const peakDate = selected ? PEAK_DATES[selected] : null;

  const toggleDate = useCallback((date: string, point: ScenarioPoint) => {
    if (date === peakDate) return;
    setOpened(prev => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
        setTooltip(null);
      } else {
        next.add(date);
        setTooltip({ date, pct: point.pctFromPeak, value: point.value });
      }
      return next;
    });
    setTooltip(t => t?.date === date ? null : { date, pct: point.pctFromPeak, value: point.value });
  }, [peakDate]);

  const meta = selected ? SCENARIO_META[selected] : null;
  const dowLabels = lang === 'ko' ? DOW_KO : DOW_EN;
  const monthNames = lang === 'ko' ? MONTH_NAMES_KO : MONTH_NAMES_EN;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-[#0B0E14] border border-white/10 rounded-t-3xl md:rounded-3xl flex flex-col max-h-[92dvh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0 border-b border-white/5">
          <div className="flex items-center gap-3">
            {selected && (
              <button onClick={() => { setSelected(null); setResult(null); }} className="text-muted-foreground hover:text-foreground transition-colors text-xs">
                ←
              </button>
            )}
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold">
                {selected && meta ? `${meta.emoji} ${t(meta.titleKey as Parameters<typeof t>[0])}` : `📉 ${t('scenario_section_title')}`}
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
            {availableScenarios.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">{t('scenario_unavailable')}</p>
            )}
            {(['2008', '2020', '2022'] as ScenarioKey[]).map(key => {
              const m = SCENARIO_META[key];
              const available = availableScenarios.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => available && loadScenario(key)}
                  disabled={!available}
                  className={cn(
                    'flex items-center justify-between px-4 py-4 rounded-2xl border text-left transition-all',
                    available
                      ? 'border-white/8 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/15'
                      : 'border-white/4 bg-white/[0.01] opacity-35 cursor-not-allowed'
                  )}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-foreground">{m.emoji} {t(m.titleKey as Parameters<typeof t>[0])}</span>
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

        {/* Calendar */}
        {selected && !loading && result?.available && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Legend + BUY info */}
            <div className="px-5 py-3 shrink-0 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">{lang === 'ko' ? '📌 매수일 기준' : '📌 From buy date'}</span>
                <span className="text-[10px] font-bold text-foreground">${(1000).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-rose-500/40 inline-block" />{lang === 'ko' ? '손실' : 'Loss'}</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-500/30 inline-block" />{lang === 'ko' ? '수익' : 'Gain'}</span>
                <span className="text-muted-foreground/40">{lang === 'ko' ? '(탭으로 오픈)' : '(tap to reveal)'}</span>
              </div>
            </div>

            {/* Tooltip bar */}
            {tooltip && (
              <div className={cn(
                'mx-5 mt-3 px-4 py-2.5 rounded-xl border flex items-center justify-between shrink-0 animate-fade-in',
                tooltip.pct >= 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-rose-500/10 border-rose-500/20'
              )}>
                <span className="text-xs text-muted-foreground font-mono">{tooltip.date}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold" style={{ color: pctToColor(tooltip.pct).text }}>
                    {tooltip.pct >= 0 ? '+' : ''}{tooltip.pct.toFixed(2)}%
                  </span>
                  <span className="text-xs text-muted-foreground">${Math.round(tooltip.value).toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Calendar months — scrollable */}
            <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-6">
              {months.map(({ year, month, days }) => {
                // Build a 5-col (Mon-Fri) grid for this month
                // Find what day-of-week the 1st falls on (0=Sun,1=Mon,...6=Sat)
                const firstDow = new Date(year, month - 1, 1).getDay(); // 0=Sun
                // Convert to Mon-based: Mon=0, Tue=1,..., Fri=4, Sat=5, Sun=6
                const firstMonBased = (firstDow + 6) % 7; // Sun→6, Mon→0
                const daysInMonth = new Date(year, month, 0).getDate();

                // Build grid cells: skip weekends
                type Cell = { date: string; day: number; point: ScenarioPoint | null } | null;
                const cells: Cell[] = [];
                // leading empty cells for Mon-Fri offset (only Mon-Fri cols)
                for (let i = 0; i < Math.min(firstMonBased, 5); i++) cells.push(null);
                for (let d = 1; d <= daysInMonth; d++) {
                  const dow = new Date(year, month - 1, d).getDay();
                  if (dow === 0 || dow === 6) continue; // skip weekends
                  const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                  cells.push({ date: dateStr, day: d, point: dateMap.get(dateStr) ?? null });
                }
                // pad to multiple of 5
                while (cells.length % 5 !== 0) cells.push(null);

                return (
                  <div key={`${year}-${month}`} className="flex flex-col gap-2">
                    <span className="text-xs font-bold text-muted-foreground">
                      {monthNames[month - 1]} {year}
                    </span>
                    {/* Day headers */}
                    <div className="grid grid-cols-5 gap-1">
                      {dowLabels.map(d => (
                        <div key={d} className="text-center text-[9px] text-muted-foreground/40 font-medium pb-0.5">{d}</div>
                      ))}
                    </div>
                    {/* Weeks */}
                    <div className="grid grid-cols-5 gap-1">
                      {cells.map((cell, i) => {
                        if (!cell) return <div key={i} />;
                        const isPeak = cell.date === peakDate;
                        const isOpen = opened.has(cell.date);
                        const hasData = cell.point !== null;
                        const isMilestone = cell.point?.milestone;
                        const colors = cell.point ? pctToColor(cell.point.pctFromPeak) : { bg: '', text: '' };
                        const isTooltipActive = tooltip?.date === cell.date;

                        return (
                          <button
                            key={cell.date}
                            onClick={() => hasData && !isPeak && cell.point && toggleDate(cell.date, cell.point)}
                            disabled={isPeak || !hasData}
                            className={cn(
                              'relative rounded-lg aspect-square flex flex-col items-center justify-center transition-all duration-200',
                              isPeak && 'ring-2 ring-primary/60',
                              !isPeak && hasData && 'cursor-pointer active:scale-95',
                              !hasData && 'opacity-20 cursor-default',
                              isTooltipActive && 'ring-1 ring-white/40',
                            )}
                            style={{
                              background: isPeak
                                ? 'rgba(99,179,237,0.2)'
                                : isOpen && cell.point
                                  ? colors.bg
                                  : 'rgba(255,255,255,0.04)',
                            }}
                          >
                            {isPeak ? (
                              <>
                                <span className="text-[9px] text-primary font-bold leading-none">BUY</span>
                                <span className="text-[11px] text-primary/80 font-mono leading-none mt-0.5">{cell.day}</span>
                              </>
                            ) : isOpen && cell.point ? (
                              <>
                                {isMilestone && (
                                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-white/60" />
                                )}
                                <span
                                  className="text-[10px] font-bold leading-none"
                                  style={{ color: colors.text }}
                                >
                                  {cell.point.pctFromPeak >= 0 ? '+' : ''}{cell.point.pctFromPeak.toFixed(1)}%
                                </span>
                              </>
                            ) : (
                              <span className="text-[12px] text-muted-foreground/50 font-mono">{cell.day}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reveal all hint */}
            <div className="px-5 pb-4 pt-2 shrink-0 text-center">
              <button
                onClick={() => {
                  if (!result?.points) return;
                  const allDates = new Set(result.points.filter(p => p.date !== peakDate).map(p => p.date));
                  setOpened(allDates);
                }}
                className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
              >
                {lang === 'ko' ? '전체 공개' : 'Reveal all'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
