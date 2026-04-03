'use client';

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { X } from 'lucide-react';
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

// Week column: Monday date + 5 slots (Mon–Fri)
interface WeekCol { monday: string; days: (ScenarioPoint | null)[] }

function toWeekColumns(points: ScenarioPoint[]): WeekCol[] {
  const map = new Map<string, (ScenarioPoint | null)[]>();
  for (const p of points) {
    const d = new Date(p.date + 'T00:00:00Z');
    const dow = d.getUTCDay(); // 0=Sun,1=Mon,...6=Sat
    const monOffset = dow === 0 ? -6 : 1 - dow; // days to subtract to reach Monday
    const mondayMs = d.getTime() + monOffset * 86400000;
    const key = new Date(mondayMs).toISOString().split('T')[0];
    if (!map.has(key)) map.set(key, [null, null, null, null, null]);
    const slot = dow === 0 ? 6 : dow - 1; // Mon=0..Fri=4
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

function pctToText(pct: number): string {
  return pct >= 0 ? '#86efac' : '#fca5a5';
}

const MONTH_SHORT_KO = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const MONTH_SHORT_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const CELL = 11;   // px
const GAP  = 2;    // px
const STEP = CELL + GAP;

export function ScenarioExperience({ data, backtestPeriodStart, onClose }: Props) {
  const { t, lang } = useLang();
  const [selected, setSelected] = useState<ScenarioKey | null>(null);
  const [result, setResult]     = useState<ScenarioResult | null>(null);
  const [loading, setLoading]   = useState(false);
  const [hovered, setHovered]   = useState<ScenarioPoint | null>(null);
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
    setSelected(key); setResult(null); setHovered(null); setLoading(true);
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
  const monthNames = lang === 'ko' ? MONTH_SHORT_KO : MONTH_SHORT_EN;

  // Build month label positions: first week of each new month
  const monthLabels = useMemo(() => {
    const labels: { colIdx: number; label: string }[] = [];
    let lastMonth = '';
    weeks.forEach(({ monday }, i) => {
      const mo = monday.substring(0, 7);
      if (mo !== lastMonth) {
        const d = new Date(monday + 'T00:00:00Z');
        labels.push({ colIdx: i, label: monthNames[d.getUTCMonth()] + (d.getUTCMonth() === 0 ? ` ${d.getUTCFullYear()}` : '') });
        lastMonth = mo;
      }
    });
    return labels;
  }, [weeks, monthNames]);

  const totalWidth = weeks.length * STEP - GAP;
  const gridHeight = 5 * STEP - GAP; // Mon–Fri

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
          <div className="px-5 py-5 flex flex-col gap-3">
            {(['2008', '2020', '2022'] as ScenarioKey[]).map(key => {
              const m = SCENARIO_META[key];
              const available = availableScenarios.includes(key);
              return (
                <button key={key}
                  onClick={() => available && loadScenario(key)}
                  disabled={!available}
                  className={cn(
                    'flex items-center justify-between px-4 py-4 rounded-2xl border text-left transition-all',
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

        {/* GitHub-style heatmap */}
        {selected && !loading && result?.available && (
          <div className="flex flex-col gap-4 px-5 py-4 overflow-hidden">

            {/* Tooltip bar */}
            <div className={cn(
              'px-4 py-2.5 rounded-xl border flex items-center justify-between transition-all duration-150 shrink-0',
              hovered
                ? hovered.pctFromPeak >= 0
                  ? 'bg-green-500/10 border-green-500/20'
                  : 'bg-rose-500/10 border-rose-500/20'
                : 'border-white/5 bg-white/[0.02]'
            )}>
              {hovered ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-muted-foreground">{hovered.date}</span>
                    {hovered.milestone && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/60 font-bold">
                        {hovered.milestone}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-black tabular-nums" style={{ color: pctToText(hovered.pctFromPeak) }}>
                      {hovered.pctFromPeak >= 0 ? '+' : ''}{hovered.pctFromPeak.toFixed(2)}%
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      ${Math.round(hovered.value).toLocaleString()}
                    </span>
                  </div>
                </>
              ) : (
                <span className="text-xs text-muted-foreground/40 w-full text-center">
                  {lang === 'ko' ? '날짜에 커서를 올리거나 탭하세요' : 'Hover or tap a date'}
                </span>
              )}
            </div>

            {/* Day-of-week labels + heatmap grid */}
            <div className="flex gap-2 overflow-hidden">
              {/* DOW labels */}
              <div className="flex flex-col shrink-0" style={{ gap: GAP, paddingTop: 16 }}>
                {(lang === 'ko' ? ['월','수','금'] : ['M','W','F']).map((label, i) => (
                  <div key={label}
                    className="text-[9px] text-muted-foreground/40 flex items-center justify-end"
                    style={{ height: CELL, marginTop: i === 0 ? 0 : CELL + GAP }}>
                    {label}
                  </div>
                ))}
              </div>

              {/* Scrollable grid */}
              <div className="overflow-x-auto flex-1">
                <div style={{ width: totalWidth, userSelect: 'none' }}>
                  {/* Month labels row */}
                  <div className="relative" style={{ height: 16, marginBottom: 4 }}>
                    {monthLabels.map(({ colIdx, label }) => (
                      <span key={colIdx}
                        className="absolute text-[9px] text-muted-foreground/50 font-medium"
                        style={{ left: colIdx * STEP }}>
                        {label}
                      </span>
                    ))}
                  </div>

                  {/* Week columns */}
                  <div style={{ display: 'flex', gap: GAP, height: gridHeight }}>
                    {weeks.map(({ monday, days }) => (
                      <div key={monday} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
                        {days.map((point, dayIdx) => {
                          const isPeak = point?.date === peakDate;
                          const isHovered = hovered?.date === point?.date;
                          return (
                            <div
                              key={dayIdx}
                              onMouseEnter={() => point && setHovered(point)}
                              onMouseLeave={() => setHovered(null)}
                              onClick={() => point && setHovered(h => h?.date === point.date ? null : point)}
                              style={{
                                width: CELL,
                                height: CELL,
                                borderRadius: 2,
                                background: isPeak
                                  ? 'rgba(99,179,237,0.5)'
                                  : point
                                    ? pctToBg(point.pctFromPeak)
                                    : 'rgba(255,255,255,0.04)',
                                cursor: point ? 'pointer' : 'default',
                                outline: isPeak ? '1.5px solid rgba(99,179,237,0.8)' : isHovered ? '1px solid rgba(255,255,255,0.5)' : 'none',
                                outlineOffset: isPeak ? 1 : 0,
                                transform: isHovered ? 'scale(1.5)' : 'scale(1)',
                                transition: 'transform 0.1s, outline 0.1s',
                                zIndex: isHovered ? 10 : 1,
                                position: 'relative',
                              }}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-muted-foreground/40 mr-1">{lang === 'ko' ? '낮음' : 'Less'}</span>
                {['rgba(185,28,28,0.85)','rgba(220,38,38,0.62)','rgba(239,68,68,0.42)','rgba(248,113,113,0.22)',
                  'rgba(74,222,128,0.14)','rgba(74,222,128,0.30)','rgba(74,222,128,0.52)','rgba(74,222,128,0.75)'].map((bg, i) => (
                  <div key={i} style={{ width: CELL, height: CELL, borderRadius: 2, background: bg }} />
                ))}
                <span className="text-[9px] text-muted-foreground/40 ml-1">{lang === 'ko' ? '높음' : 'More'}</span>
              </div>
              <span className="text-[9px] text-muted-foreground/40">
                {lang === 'ko' ? `총 ${result.points.length}거래일` : `${result.points.length} trading days`}
              </span>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
