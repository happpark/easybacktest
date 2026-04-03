'use client';

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ScenarioKey, ScenarioResult, ScenarioPoint } from '@/ai/flows/scenario';
import type { Asset } from '@/app/page';

interface Props {
  data: Asset[];
  backtestPeriodStart: string;
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

interface WeekCol { monday: string; days: (ScenarioPoint | null)[] }

function toWeekColumns(points: ScenarioPoint[]): WeekCol[] {
  const map = new Map<string, (ScenarioPoint | null)[]>();
  for (const p of points) {
    const d = new Date(p.date + 'T00:00:00Z');
    const dow = d.getUTCDay();
    const monOffset = dow === 0 ? -6 : 1 - dow;
    const key = new Date(d.getTime() + monOffset * 86400000).toISOString().split('T')[0];
    if (!map.has(key)) map.set(key, [null, null, null, null, null]);
    const slot = dow === 0 ? 6 : dow - 1;
    if (slot < 5) map.get(key)![slot] = p;
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monday, days]) => ({ monday, days }));
}

function pctToBg(pct: number): string {
  if (pct >= 15)  return 'rgba(74,222,128,0.75)';
  if (pct >= 8)   return 'rgba(74,222,128,0.52)';
  if (pct >= 3)   return 'rgba(74,222,128,0.30)';
  if (pct >= 0)   return 'rgba(74,222,128,0.14)';
  if (pct >= -5)  return 'rgba(248,113,113,0.22)';
  if (pct >= -12) return 'rgba(239,68,68,0.42)';
  if (pct >= -22) return 'rgba(220,38,38,0.62)';
  return 'rgba(185,28,28,0.85)';
}
function pctToText(pct: number): string { return pct >= 0 ? '#86efac' : '#fca5a5'; }

const MONTH_KO = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const MONTH_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const CELL = 14;
const GAP  = 3;
const STEP = CELL + GAP;
const WEEKS_PER_PAGE = 36;
const PAGE_JUMP      = 8;

export function ScenarioExperience({ data, backtestPeriodStart, onClose }: Props) {
  const { t, lang } = useLang();
  const [selected, setSelected] = useState<ScenarioKey | null>(null);
  const [result, setResult]     = useState<ScenarioResult | null>(null);
  const [loading, setLoading]   = useState(false);
  const [hovered, setHovered]   = useState<ScenarioPoint | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
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
    setSelected(key); setResult(null); setHovered(null); setWeekOffset(0); setLoading(true);
    try {
      const res = await fetch('/api/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets: data, scenario: key, lang }),
      });
      setResult(await res.json());
    } finally { setLoading(false); loadingRef.current = false; }
  }, [data, lang]);

  const weeks = useMemo(() => result?.available ? toWeekColumns(result.points) : [], [result]);
  const peakDate = selected ? PEAK_DATES[selected] : null;
  const meta = selected ? SCENARIO_META[selected] : null;
  const monthNames = lang === 'ko' ? MONTH_KO : MONTH_EN;

  // Find MDD point (lowest pctFromPeak)
  const mddDate = useMemo(() => {
    if (!result?.points?.length) return null;
    return result.points.reduce((min, p) => p.pctFromPeak < min.pctFromPeak ? p : min).date;
  }, [result]);

  const visibleWeeks = weeks.slice(weekOffset, weekOffset + WEEKS_PER_PAGE);
  const canBack = weekOffset > 0;
  const canNext = weekOffset + WEEKS_PER_PAGE < weeks.length;

  const rangeLabel = useMemo(() => {
    if (!visibleWeeks.length) return '';
    const first = new Date(visibleWeeks[0].monday + 'T00:00:00Z');
    const last  = new Date(visibleWeeks[visibleWeeks.length - 1].monday + 'T00:00:00Z');
    const fmt = (d: Date) => `${monthNames[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    return `${fmt(first)} – ${fmt(last)}`;
  }, [visibleWeeks, monthNames]);

  const monthLabels = useMemo(() => {
    const labels: { colIdx: number; label: string }[] = [];
    let lastMonth = '';
    visibleWeeks.forEach(({ monday }, i) => {
      const mo = monday.substring(0, 7);
      if (mo !== lastMonth) {
        const d = new Date(monday + 'T00:00:00Z');
        labels.push({ colIdx: i, label: monthNames[d.getUTCMonth()] + (d.getUTCMonth() === 0 || i === 0 ? ` ${d.getUTCFullYear()}` : '') });
        lastMonth = mo;
      }
    });
    return labels;
  }, [visibleWeeks, monthNames]);

  const gridWidth  = visibleWeeks.length * STEP - GAP;
  const gridHeight = 5 * STEP - GAP;
  const totalPages = Math.ceil(Math.max(1, weeks.length - WEEKS_PER_PAGE) / PAGE_JUMP) + 1;
  const currentPage = Math.floor(weekOffset / PAGE_JUMP);

  return (
    /* m-auto on the modal itself guarantees true centering regardless of page scroll */
    <div className="fixed inset-0 z-50 overflow-y-auto flex bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="m-auto w-full max-w-2xl bg-[#0B0E14] border border-white/10 rounded-3xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0 border-b border-white/5">
          <div className="flex items-center gap-3">
            {selected && (
              <button onClick={() => { setSelected(null); setResult(null); setHovered(null); }}
                className="text-muted-foreground hover:text-foreground transition-colors text-sm">←</button>
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
          <div className="px-6 py-5 flex flex-col gap-3">
            {(['2008', '2020', '2022'] as ScenarioKey[]).map(key => {
              const m = SCENARIO_META[key];
              const available = availableScenarios.includes(key);
              return (
                <button key={key} onClick={() => available && loadScenario(key)} disabled={!available}
                  className={cn(
                    'flex items-center justify-between px-5 py-4 rounded-2xl border text-left transition-all',
                    available ? 'border-white/8 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/15'
                              : 'border-white/4 bg-white/[0.01] opacity-35 cursor-not-allowed'
                  )}>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold">{m.emoji} {t(m.titleKey as Parameters<typeof t>[0])}</span>
                    <span className="text-xs" style={{ color: available ? m.color : '#666' }}>
                      {t(m.subKey as Parameters<typeof t>[0])}
                      {!available && (lang === 'ko' ? ' · 백테스트 기간 외' : ' · outside backtest period')}
                    </span>
                  </div>
                  {available && <span className="text-muted-foreground/30 text-lg">›</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Loading */}
        {selected && loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-xs text-muted-foreground">{t('scenario_loading')}</span>
            </div>
          </div>
        )}

        {/* Heatmap */}
        {selected && !loading && result?.available && (
          <div className="flex flex-col gap-4 px-6 py-5">

            {/* Tooltip bar */}
            <div className={cn(
              'px-4 py-3 rounded-xl border flex items-center justify-between transition-all duration-150',
              hovered
                ? hovered.pctFromPeak >= 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-rose-500/10 border-rose-500/20'
                : 'border-white/5 bg-white/[0.02]'
            )}>
              {hovered ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-muted-foreground">{hovered.date}</span>
                    {hovered.date === mddDate && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30">
                        {lang === 'ko' ? '최대 낙폭' : 'Max Drawdown'}
                      </span>
                    )}
                    {hovered.milestone && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/60 font-bold">{hovered.milestone}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-base font-black tabular-nums" style={{ color: pctToText(hovered.pctFromPeak) }}>
                      {hovered.pctFromPeak >= 0 ? '+' : ''}{hovered.pctFromPeak.toFixed(2)}%
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">${Math.round(hovered.value).toLocaleString()}</span>
                  </div>
                </>
              ) : (
                <span className="text-xs text-muted-foreground/40 w-full text-center">
                  {lang === 'ko' ? '날짜에 커서를 올리거나 탭하세요' : 'Hover or tap a date to see returns'}
                </span>
              )}
            </div>

            {/* Nav row */}
            <div className="flex items-center justify-between">
              <button onClick={() => setWeekOffset(o => Math.max(0, o - PAGE_JUMP))} disabled={!canBack}
                className="p-1.5 rounded-lg border border-white/10 text-muted-foreground hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-all">
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs text-muted-foreground/60 font-medium">{rangeLabel}</span>
              <button onClick={() => setWeekOffset(o => Math.min(weeks.length - WEEKS_PER_PAGE, o + PAGE_JUMP))} disabled={!canNext}
                className="p-1.5 rounded-lg border border-white/10 text-muted-foreground hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-all">
                <ChevronRight size={16} />
              </button>
            </div>

            {/* DOW labels + grid */}
            <div className="flex gap-2">
              <div className="flex flex-col shrink-0" style={{ gap: GAP, paddingTop: 20 }}>
                {(lang === 'ko' ? ['월','수','금'] : ['M','W','F']).map((label, i) => (
                  <div key={label} className="text-[9px] text-muted-foreground/40 flex items-center justify-end pr-1"
                    style={{ height: CELL, marginTop: i === 0 ? 0 : CELL + GAP }}>
                    {label}
                  </div>
                ))}
              </div>

              <div className="flex-1 overflow-hidden">
                <div style={{ width: gridWidth }}>
                  {/* Month labels */}
                  <div className="relative" style={{ height: 20, marginBottom: 2 }}>
                    {monthLabels.map(({ colIdx, label }) => (
                      <span key={colIdx} className="absolute text-[9px] text-muted-foreground/50 font-medium whitespace-nowrap"
                        style={{ left: colIdx * STEP }}>{label}</span>
                    ))}
                  </div>

                  {/* Grid */}
                  <div style={{ display: 'flex', gap: GAP, height: gridHeight }}>
                    {visibleWeeks.map(({ monday, days }) => (
                      <div key={monday} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
                        {days.map((point, di) => {
                          const isPeak = point?.date === peakDate;
                          const isMDD  = point?.date === mddDate;
                          const isHov  = hovered?.date === point?.date;
                          return (
                            <div key={di}
                              onMouseEnter={() => point && setHovered(point)}
                              onMouseLeave={() => setHovered(null)}
                              onClick={() => point && setHovered(h => h?.date === point.date ? null : point)}
                              style={{
                                width: CELL, height: CELL,
                                borderRadius: 3,
                                position: 'relative',
                                background: isPeak
                                  ? 'rgba(99,179,237,0.45)'
                                  : isMDD
                                    ? 'rgba(185,28,28,0.90)'
                                    : point ? pctToBg(point.pctFromPeak) : 'rgba(255,255,255,0.04)',
                                cursor: point ? 'pointer' : 'default',
                                outline: isPeak
                                  ? '2px solid rgba(99,179,237,0.7)'
                                  : isMDD
                                    ? '2px solid rgba(255,80,80,1)'
                                    : isHov ? '1.5px solid rgba(255,255,255,0.55)' : 'none',
                                outlineOffset: (isPeak || isMDD) ? 1 : 0,
                                transform: isHov ? 'scale(1.6)' : 'scale(1)',
                                transition: 'transform 0.08s',
                                zIndex: isHov ? 10 : isMDD ? 5 : 1,
                              }}>
                              {/* MDD ✕ mark */}
                              {isMDD && (
                                <div style={{
                                  position: 'absolute', inset: 0,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.95)',
                                  lineHeight: 1, pointerEvents: 'none',
                                }}>✕</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Progress dots + legend */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button key={i}
                    onClick={() => setWeekOffset(Math.min(i * PAGE_JUMP, Math.max(0, weeks.length - WEEKS_PER_PAGE)))}
                    className={cn('rounded-full transition-all', currentPage === i ? 'w-4 h-1.5 bg-primary/70' : 'w-1.5 h-1.5 bg-white/15 hover:bg-white/30')}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[9px] text-muted-foreground/30 mr-0.5">{lang === 'ko' ? '낮음' : 'Less'}</span>
                {['rgba(185,28,28,0.85)','rgba(239,68,68,0.42)','rgba(248,113,113,0.22)',
                  'rgba(74,222,128,0.14)','rgba(74,222,128,0.52)','rgba(74,222,128,0.75)'].map((bg, i) => (
                  <div key={i} style={{ width: CELL, height: CELL, borderRadius: 3, background: bg }} />
                ))}
                <span className="text-[9px] text-muted-foreground/30 ml-0.5">{lang === 'ko' ? '높음' : 'More'}</span>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
