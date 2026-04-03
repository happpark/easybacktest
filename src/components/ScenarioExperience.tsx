'use client';

import React, { useState, useCallback, useRef } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, ReferenceLine, Tooltip as RechartsTooltip } from 'recharts';
import { useLang } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ScenarioKey, ScenarioResult } from '@/ai/flows/backtest-portfolio';
import type { Asset } from '@/app/page';

interface Props {
  data: Asset[];
  onClose: () => void;
}

const SCENARIOS: { key: ScenarioKey; titleKey: string; subKey: string; color: string }[] = [
  { key: '2008', titleKey: 'scenario_2008', subKey: 'scenario_2008_sub', color: '#ef4444' },
  { key: '2020', titleKey: 'scenario_2020', subKey: 'scenario_2020_sub', color: '#f97316' },
  { key: '2022', titleKey: 'scenario_2022', subKey: 'scenario_2022_sub', color: '#eab308' },
];

function fmtDate(dateStr: string, lang: 'ko' | 'en') {
  const d = new Date(dateStr);
  if (lang === 'ko') {
    return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
  }
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function ScenarioExperience({ data, onClose }: Props) {
  const { t, lang } = useLang();
  const [selectedScenario, setSelectedScenario] = useState<ScenarioKey | null>(null);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [sliderIdx, setSliderIdx] = useState(0);
  const loadingRef = useRef(false);

  const loadScenario = useCallback(async (key: ScenarioKey) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setSelectedScenario(key);
    setResult(null);
    setSliderIdx(0);
    setLoading(true);
    try {
      const res = await fetch('/api/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets: data, scenario: key, lang }),
      });
      const r: ScenarioResult = await res.json();
      setResult(r);
      setSliderIdx(0);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [data, lang]);

  const currentPoint = result?.points[sliderIdx];
  const pct = currentPoint?.pctFromPeak ?? 0;
  const isRecovered = pct >= 0 && sliderIdx > 0;
  const scenarioDef = SCENARIOS.find(s => s.key === selectedScenario);

  // Color ramp: green at 0%, orange at -15%, deep red at -30%+
  const pctColor = pct >= -5 ? '#7AE9AB' : pct >= -15 ? '#f97316' : pct >= -25 ? '#ef4444' : '#dc2626';

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-[#0B0E14] border border-white/10 rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col max-h-[92dvh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold text-foreground">
              {selectedScenario ? t(SCENARIOS.find(s => s.key === selectedScenario)!.titleKey as Parameters<typeof t>[0]) : t('scenario_section_title')}
            </span>
            {!selectedScenario && (
              <span className="text-xs text-muted-foreground">{t('scenario_section_desc')}</span>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Scenario selector */}
        {!selectedScenario && (
          <div className="px-5 pb-6 flex flex-col gap-3">
            {SCENARIOS.map(s => (
              <button
                key={s.key}
                onClick={() => loadScenario(s.key)}
                className="flex items-center justify-between px-4 py-4 rounded-2xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/15 transition-all text-left group"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-foreground group-hover:text-white transition-colors">
                    {t(s.titleKey as Parameters<typeof t>[0])}
                  </span>
                  <span className="text-xs" style={{ color: s.color }}>
                    {t(s.subKey as Parameters<typeof t>[0])}
                  </span>
                </div>
                <ChevronRight size={16} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {selectedScenario && loading && (
          <div className="flex-1 flex items-center justify-center pb-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-xs text-muted-foreground">{t('scenario_loading')}</span>
            </div>
          </div>
        )}

        {/* Unavailable */}
        {selectedScenario && !loading && result && !result.available && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 pb-10 px-5">
            <span className="text-sm text-muted-foreground text-center">{t('scenario_unavailable')}</span>
            <button onClick={() => setSelectedScenario(null)} className="text-xs text-primary underline">
              ← {lang === 'ko' ? '다른 시나리오 선택' : 'Choose another scenario'}
            </button>
          </div>
        )}

        {/* Main experience */}
        {selectedScenario && !loading && result?.available && currentPoint && (
          <div className="flex flex-col px-5 pb-6 gap-4 flex-1 overflow-y-auto">

            {/* Date + milestone badge */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-mono">
                {fmtDate(currentPoint.date, lang)}
              </span>
              {currentPoint.milestone && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full border animate-fade-in"
                  style={{ color: scenarioDef?.color, borderColor: `${scenarioDef?.color}40`, background: `${scenarioDef?.color}15` }}
                >
                  {currentPoint.milestone}
                </span>
              )}
              {isRecovered && !currentPoint.milestone && (
                <span className="text-[10px] font-bold text-[#7AE9AB] px-2 py-0.5 rounded-full border border-[#7AE9AB]/30 bg-[#7AE9AB]/10 animate-fade-in">
                  {t('scenario_recovered')}
                </span>
              )}
            </div>

            {/* Main HTS-style display */}
            <div className="bg-black/40 border border-white/5 rounded-2xl px-5 py-5 flex flex-col gap-3">
              {/* Portfolio value */}
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{t('scenario_current_val')}</span>
                <span className="text-3xl font-black tabular-nums" style={{ color: pctColor }}>
                  ${Math.round(currentPoint.value).toLocaleString()}
                </span>
              </div>

              {/* % from peak — big red number */}
              <div className="flex items-baseline gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{t('scenario_from_peak')}</span>
                  <span
                    className="text-2xl font-black tabular-nums"
                    style={{ color: pct < 0 ? pctColor : '#7AE9AB' }}
                  >
                    {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 ml-6">
                  <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{t('scenario_max_dd')}</span>
                  <span className="text-lg font-bold text-rose-400 tabular-nums">
                    {result.maxDrawdown.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Sparkline chart */}
            <div className="h-28 relative">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={result.points.slice(0, sliderIdx + 1)} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                  <ReferenceLine y={1000} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
                  <RechartsTooltip
                    contentStyle={{ display: 'none' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={pctColor}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              {/* Peak label */}
              <div className="absolute top-0 right-3 text-[9px] text-muted-foreground/40 font-mono">
                {t('scenario_peak_val')}: $1,000
              </div>
            </div>

            {/* Slider */}
            <div className="flex flex-col gap-2">
              <input
                type="range"
                min={0}
                max={result.points.length - 1}
                value={sliderIdx}
                onChange={e => setSliderIdx(Number(e.target.value))}
                className="w-full accent-primary h-1.5 cursor-pointer"
                style={{ accentColor: pctColor }}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground/50 font-mono">
                <span>{result.points[0]?.date.substring(0, 7)}</span>
                <span className="text-muted-foreground/30 text-[9px]">{t('scenario_slide_hint')}</span>
                <span>{result.points[result.points.length - 1]?.date.substring(0, 7)}</span>
              </div>
            </div>

            {/* Back button */}
            <button
              onClick={() => { setSelectedScenario(null); setResult(null); }}
              className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors text-center"
            >
              ← {lang === 'ko' ? '다른 시나리오 선택' : 'Choose another scenario'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
