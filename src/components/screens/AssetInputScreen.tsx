"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, TrendingUp, Pencil, Shuffle, ImagePlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import etfDataRaw from '@/lib/etf-data.json';
import { cn } from '@/lib/utils';
import type { Asset, PortfolioSlot } from '@/app/page';

interface ETF {
  ticker: string;
  name: string;
  launch_year: string;
}

const ETF_DATA = etfDataRaw as ETF[];

const BEGINNER_CATEGORIES = [
  {
    name: '주식',
    emoji: '📈',
    items: [
      { label: '미국 전체시장',   ticker: 'VTI',  desc: 'Vanguard Total Market' },
      { label: '기술주 / 나스닥', ticker: 'QQQ',  desc: 'Nasdaq 100' },
      { label: '배당주',          ticker: 'SCHD', desc: 'Schwab Dividend' },
      { label: 'S&P 500',        ticker: 'SPY',  desc: '미국 대형 우량주 500' },
      { label: '선진국 (미국 외)', ticker: 'EFA',  desc: '유럽·일본 등' },
      { label: '신흥국',          ticker: 'EEM',  desc: '중국·한국·인도 등' },
    ],
  },
  {
    name: '채권',
    emoji: '🏦',
    items: [
      { label: '미국 장기채', ticker: 'TLT', desc: '20년+ 국채' },
      { label: '미국 중기채', ticker: 'IEF', desc: '7-10년 국채' },
      { label: '단기 국채',   ticker: 'SHY', desc: '1-3년 국채' },
      { label: '물가연동채', ticker: 'TIP', desc: '인플레이션 헤지' },
    ],
  },
  {
    name: '원자재',
    emoji: '🪙',
    items: [
      { label: '금',         ticker: 'GLD', desc: 'SPDR Gold ETF' },
      { label: '원유',       ticker: 'USO', desc: 'WTI 원유' },
      { label: '원자재 전반', ticker: 'DBC', desc: '에너지·금속·농산물' },
    ],
  },
  {
    name: '부동산',
    emoji: '🏢',
    items: [
      { label: '미국 리츠', ticker: 'VNQ', desc: 'Vanguard REIT' },
    ],
  },
  {
    name: '현금',
    emoji: '💵',
    items: [
      { label: '현금', ticker: 'CASH', desc: '수익 0%, 변동성 0%' },
    ],
  },
  {
    name: '암호화폐',
    emoji: '₿',
    items: [
      { label: '비트코인', ticker: 'BTC-USD', desc: 'Bitcoin / USD' },
      { label: '이더리움', ticker: 'ETH-USD', desc: 'Ethereum / USD' },
    ],
  },
];

const PRESET_PORTFOLIOS = [
  {
    name: '올웨더',
    desc: 'Ray Dalio',
    emoji: '🌦️',
    weights: { SPY: 30, TLT: 40, IEF: 15, GLD: 7, DBC: 8 } as Record<string, number>,
  },
  {
    name: '60/40',
    desc: '전통 균형',
    emoji: '⚖️',
    weights: { SPY: 60, IEF: 40 } as Record<string, number>,
  },
  {
    name: '황금 나비',
    desc: 'Golden Butterfly',
    emoji: '🦋',
    weights: { SPY: 20, IEF: 20, CASH: 20, GLD: 20, VNQ: 20 } as Record<string, number>,
  },
  {
    name: '영구 포트폴리오',
    desc: 'Harry Browne',
    emoji: '🏛️',
    weights: { SPY: 25, TLT: 25, GLD: 25, CASH: 25 } as Record<string, number>,
  },
];

// ── Weight Stepper ────────────────────────────────────────────────────────────
function WeightStepper({
  value,
  onChange,
  highlight,
}: {
  value: number;
  onChange: (v: number) => void;
  highlight?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const clamp = (v: number) => Math.min(100, Math.max(0, v));

  const startEdit = () => {
    setDraft(value === 0 ? '' : String(value));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitEdit = () => {
    onChange(clamp(parseInt(draft) || 0));
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(clamp(value - 5))}
        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all text-lg font-bold select-none"
      >
        −
      </button>

      {editing ? (
        <input
          ref={inputRef}
          type="number"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
            if (e.key === 'Escape') { setEditing(false); }
          }}
          className="w-14 h-8 text-center font-mono font-bold text-sm bg-black/40 border border-primary/60 rounded-lg outline-none text-foreground"
          autoFocus
        />
      ) : (
        <button
          onClick={startEdit}
          className={cn(
            "w-14 h-8 rounded-lg font-mono font-bold text-sm transition-all select-none",
            highlight
              ? "bg-primary/20 text-primary border border-primary/30"
              : value > 0
              ? "bg-white/5 text-foreground border border-white/10 hover:border-primary/30"
              : "bg-white/5 text-muted-foreground border border-destructive/20"
          )}
        >
          {value}%
        </button>
      )}

      <button
        onClick={() => onChange(clamp(value + 5))}
        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all text-lg font-bold select-none"
      >
        +
      </button>
    </div>
  );
}

// ── Compact Progress Bar (for sticky header) ──────────────────────────────────
function CompactProgressBar({ total }: { total: number }) {
  const ok = total === 100;
  const over = total > 100;
  const pct = Math.min(total, 100);
  const barColor = ok ? 'bg-[#7AE9AB]' : pct >= 80 ? 'bg-yellow-400' : 'bg-destructive';

  return (
    <div className={cn(
      "rounded-xl border px-3 py-2 flex items-center gap-3 transition-all duration-300",
      ok ? 'bg-[#7AE9AB]/10 border-[#7AE9AB]/30' : 'bg-white/5 border-white/10'
    )}>
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn(
        "text-sm font-black font-mono tabular-nums",
        ok ? 'text-[#7AE9AB]' : over ? 'text-destructive' : 'text-foreground'
      )}>
        {total}%
      </span>
      <span className={cn(
        "text-xs font-medium w-14 text-right",
        ok ? 'text-[#7AE9AB]/80' : 'text-muted-foreground'
      )}>
        {ok ? '✓ 완료' : over ? `${total - 100}% 초과` : `${100 - total}% 남음`}
      </span>
    </div>
  );
}

// ── Rebalancing Picker ─────────────────────────────────────────────────────
type RbOpt = 1 | 3 | 12 | 'custom';
function RebalancingPicker({
  options,
  value,
  onChange,
  customVal,
  onCustomChange,
}: {
  options: { label: string; value: RbOpt }[];
  value: RbOpt;
  onChange: (v: RbOpt) => void;
  customVal: number;
  onCustomChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">리밸런싱 주기</span>
      <div className="flex items-center gap-1.5 flex-wrap">
        {options.map(opt => (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold border transition-all',
              value === opt.value
                ? 'bg-primary/20 text-primary border-primary/30'
                : 'bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10 hover:text-foreground'
            )}
          >
            {opt.label}
          </button>
        ))}
        {value === 'custom' && (
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={1}
              max={120}
              value={customVal}
              onChange={e => onCustomChange(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-14 h-8 text-center font-mono font-bold text-xs bg-black/40 border border-primary/60 rounded-lg outline-none text-foreground"
            />
            <span className="text-xs text-muted-foreground">개월</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface AssetInputScreenProps {
  onBacktest: (data: Asset[], rebalancingMonths: number) => void;
  preloadedAssets?: Asset[] | null;
  onPreloadConsumed?: () => void;
  onMultiBacktest?: (slots: PortfolioSlot[], rebalancingMonths: number) => void;
  mode: 'beginner' | 'expert';
  onModeChange: (mode: 'beginner' | 'expert') => void;
}

export function AssetInputScreen({ onBacktest, preloadedAssets, onPreloadConsumed, onMultiBacktest, mode, onModeChange }: AssetInputScreenProps) {

  // Expert
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([
    { ticker: 'QQQ', weight: 40, launch_year: '1999' },
    { ticker: 'GLD', weight: 30, launch_year: '2004' },
    { ticker: 'TLT', weight: 30, launch_year: '2002' },
  ]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Beginner
  const [beginnerWeights, setBeginnerWeights] = useState<Record<string, number>>({});

  // Image OCR state
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseNote, setParseNote] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // reset input so same file can be re-selected
    e.target.value = '';
    setParsing(true);
    setParseError(null);
    setParseNote(null);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch('/api/parse-portfolio', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? '분석 실패');
      const assets: Asset[] = (json.assets as { ticker: string; weight: number; original?: string }[]).map(a => {
        const etf = ETF_DATA.find(e => e.ticker === a.ticker);
        return { ticker: a.ticker, weight: a.weight, launch_year: etf?.launch_year };
      });
      setSelectedAssets(assets);
      onModeChange('expert');
      if (json.note) setParseNote(json.note);
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : '이미지 분석 중 오류가 발생했습니다.');
    } finally {
      setParsing(false);
    }
  };

  // Multi-portfolio state
  const [slotNames, setSlotNames] = useState(['포트폴리오 A', '포트폴리오 B', '포트폴리오 C']);
  // slotWeights[slotIdx][assetIdx] = weight
  const [slotWeights, setSlotWeights] = useState<number[][]>([
    [40, 30, 30],
    [60, 20, 20],
    [33, 34, 33],
  ]);

  // Rebalancing
  type RbOption = 1 | 3 | 12 | 'custom';
  const [rbOption, setRbOption] = useState<RbOption>(12);
  const [rbCustom, setRbCustom] = useState<number>(6);
  const rbMonths: number = rbOption === 'custom' ? Math.max(1, rbCustom) : rbOption;

  useEffect(() => {
    if (preloadedAssets && preloadedAssets.length > 0) {
      setSelectedAssets(preloadedAssets);
      onModeChange('expert');
      onPreloadConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preloadedAssets]);

  // Sync slotWeights when selectedAssets length changes
  useEffect(() => {
    setSlotWeights(prev => prev.map(slot => {
      const next = [...slot];
      while (next.length < selectedAssets.length) next.push(0);
      while (next.length > selectedAssets.length) next.pop();
      return next;
    }));
  }, [selectedAssets.length]);

  // Expert helpers
  const tickerSuggestions: ETF[] = editingIndex !== null && editingValue.length >= 1
    ? ETF_DATA.filter(a =>
        a.ticker.toLowerCase().startsWith(editingValue.toLowerCase()) ||
        a.name.toLowerCase().includes(editingValue.toLowerCase())
      ).slice(0, 6)
    : [];

  const commitEdit = (ticker: string, etf?: ETF) => {
    clearTimeout(blurTimerRef.current);
    const raw = ticker.trim().toUpperCase();
    const resolved = etf ?? ETF_DATA.find(e => e.ticker === raw);
    if (editingIndex === -1) {
      if (raw && !selectedAssets.find(a => a.ticker === raw)) {
        setSelectedAssets(prev => [...prev, { ticker: raw, weight: 0, launch_year: resolved?.launch_year ?? 'Unknown' }]);
      }
    } else if (editingIndex !== null) {
      if (raw && raw !== selectedAssets[editingIndex].ticker &&
          !selectedAssets.find((a, i) => a.ticker === raw && i !== editingIndex)) {
        setSelectedAssets(prev => {
          const next = [...prev];
          next[editingIndex] = { ...next[editingIndex], ticker: raw, launch_year: resolved?.launch_year ?? 'Unknown' };
          return next;
        });
      }
    }
    setEditingIndex(null);
    setEditingValue('');
  };

  const updateWeight = (index: number, val: number) =>
    setSelectedAssets(prev => { const n = [...prev]; n[index] = { ...n[index], weight: val }; return n; });

  const removeAsset = (index: number) => {
    setSelectedAssets(prev => prev.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  const distributeEvenly = () => {
    const share = Math.floor(100 / selectedAssets.length);
    const remainder = 100 - share * selectedAssets.length;
    setSelectedAssets(prev => prev.map((a, i) => ({ ...a, weight: share + (i === 0 ? remainder : 0) })));
  };

  const totalWeight = selectedAssets.reduce((a, c) => a + c.weight, 0);

  // Beginner helpers
  const updateBeginnerWeight = (ticker: string, val: number) =>
    setBeginnerWeights(prev => ({ ...prev, [ticker]: val }));

  const beginnerTotal = Object.values(beginnerWeights).reduce((a, b) => a + b, 0);

  const handleBeginnerBacktest = () => {
    const assets: Asset[] = Object.entries(beginnerWeights)
      .filter(([, w]) => w > 0)
      .map(([ticker, weight]) => ({
        ticker, weight,
        launch_year: ETF_DATA.find(e => e.ticker === ticker)?.launch_year ?? 'Unknown',
      }));
    onBacktest(assets, rbMonths);
  };

  // Multi-portfolio helpers
  const slotTotals = slotWeights.map(sw => sw.reduce((a, b) => a + b, 0));
  const allSlotsValid = slotTotals.every(t => t === 100);

  const updateSlotWeight = (slotIdx: number, assetIdx: number, val: number) => {
    setSlotWeights(prev => {
      const next = prev.map(s => [...s]);
      next[slotIdx][assetIdx] = Math.min(100, Math.max(0, val));
      return next;
    });
  };

  const distributeSlotEvenly = (slotIdx: number) => {
    const n = selectedAssets.length;
    if (n === 0) return;
    const share = Math.floor(100 / n);
    const rem = 100 - share * n;
    setSlotWeights(prev => {
      const next = prev.map(s => [...s]);
      next[slotIdx] = next[slotIdx].map((_, i) => share + (i === 0 ? rem : 0));
      return next;
    });
  };

  const handleMultiBacktestSubmit = () => {
    if (!onMultiBacktest) return;
    const slots: PortfolioSlot[] = slotNames.map((name, si) => ({
      name,
      assets: selectedAssets.map((a, ai) => ({ ...a, weight: slotWeights[si][ai] })),
    }));
    onMultiBacktest(slots, rbMonths);
  };

  const TickerDropdown = ({ forIndex }: { forIndex: number }) => {
    if (editingIndex !== forIndex || editingValue.length < 1) return null;
    return (
      <div className="absolute left-0 right-0 top-full mt-1 bg-[#0B0E14] rounded-xl border border-white/10 z-50 overflow-hidden shadow-2xl">
        {tickerSuggestions.length > 0 ? (
          tickerSuggestions.map(a => (
            <button key={a.ticker}
              onMouseDown={(e) => { e.preventDefault(); clearTimeout(blurTimerRef.current); commitEdit(a.ticker, a); }}
              className="w-full px-4 py-3 flex justify-between items-center hover:bg-white/10 text-left border-b border-white/5 last:border-0 transition-colors group"
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-primary">{a.ticker}</span>
                  <span className="text-[10px] text-muted-foreground bg-white/5 px-1.5 rounded">Since {a.launch_year}</span>
                </div>
                <span className="text-[11px] text-muted-foreground line-clamp-1">{a.name}</span>
              </div>
              <Plus size={14} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          ))
        ) : (
          <div className="px-4 py-3 flex justify-between items-center">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-primary">&quot;{editingValue.toUpperCase()}&quot; 커스텀 추가</span>
              <span className="text-[10px] text-muted-foreground">데이터베이스에 없는 종목입니다.</span>
            </div>
            <button
              onMouseDown={(e) => { e.preventDefault(); commitEdit(editingValue); }}
              className="shrink-0 bg-primary/20 text-primary text-[10px] font-bold px-2 py-1 rounded-lg hover:bg-primary/30 transition-colors"
            >추가</button>
          </div>
        )}
      </div>
    );
  };

  const currentTotal = mode === 'beginner' ? beginnerTotal : totalWeight;

  return (
    <div className="flex flex-col animate-fade-in">

      {/* ── Sticky header: always visible while scrolling ── */}
      {/* sticky top-0 anchors to <main className="overflow-y-auto"> in page.tsx */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md px-6 pt-5 pb-3 flex flex-col gap-3 border-b border-white/5">

        {/* App title — hidden on desktop (sidebar shows it) */}
        <header className="flex flex-col gap-0.5 md:hidden">
          <h1 className="text-2xl font-bold font-headline tracking-tight text-glow text-primary">Easybacktest</h1>
          <p className="text-muted-foreground text-xs">포트폴리오를 구성하고 과거 수익률을 분석하세요.</p>
        </header>

        {/* Mode toggle + Image import — single row */}
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        <div className="flex items-center gap-2">
          <div className="flex flex-1 bg-black/30 rounded-xl p-1 border border-white/5">
            {(['beginner', 'expert'] as const).map(m => (
              <button key={m} onClick={() => onModeChange(m)}
                className={cn(
                  "flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-200",
                  mode === m ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {m === 'beginner' ? '초심자' : '전문가'}
              </button>
            ))}
          </div>
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={parsing}
            title="이미지로 불러오기 (캡처 / 엑셀 스크린샷)"
            className="shrink-0 flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl border border-primary/25 bg-primary/5 hover:bg-primary/15 hover:border-primary/50 transition-all text-[11px] font-semibold text-primary disabled:opacity-40"
          >
            {parsing ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
            <span className="hidden sm:inline">{parsing ? '분석 중…' : '이미지'}</span>
          </button>
        </div>
        {parseError && <p className="text-[11px] text-destructive text-center -mt-1">{parseError}</p>}
        {parseNote && <p className="text-[11px] text-muted-foreground text-center -mt-1">💡 {parseNote}</p>}

        {/* Compact progress bar — always visible while scrolling ETF list */}
        <CompactProgressBar total={currentTotal} />
      </div>

      {/* ── Scrollable content ── */}
      <div className="px-6 py-5 flex flex-col gap-5">

        {/* ── BEGINNER ── */}
        {mode === 'beginner' && (
          <>
            <p className="text-sm font-semibold text-foreground/70 text-center">
              원하는 자산에 비중을 설정하세요.<br />
              <span className="text-xs font-normal text-muted-foreground">합계 100%를 채우면 분석할 수 있어요.</span>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 md:gap-4 gap-4">
              {BEGINNER_CATEGORIES.map(cat => (
                <div key={cat.name} className="glass-morphism rounded-2xl border border-white/5 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                    <span className="text-base">{cat.emoji}</span>
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{cat.name}</span>
                  </div>
                  {cat.items.map((item, i) => {
                    const w = beginnerWeights[item.ticker] ?? 0;
                    return (
                      <div key={item.ticker} className={cn(
                        "flex items-center justify-between px-4 py-3 gap-3",
                        i < cat.items.length - 1 && "border-b border-white/5",
                        w > 0 && "bg-primary/5"
                      )}>
                        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                          <span className="text-sm font-semibold">{item.label}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-primary">{item.ticker}</span>
                            <span className="text-[10px] text-muted-foreground">· {item.desc}</span>
                          </div>
                        </div>
                        <WeightStepper value={w} onChange={(v) => updateBeginnerWeight(item.ticker, v)} highlight={w > 0} />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Preset portfolios — PC only */}
            <div className="hidden md:flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">유명 포트폴리오 바로 테스트</span>
              <div className="flex gap-2">
                {PRESET_PORTFOLIOS.map(preset => (
                  <button
                    key={preset.name}
                    onClick={() => setBeginnerWeights(preset.weights)}
                    className="flex-1 glass-morphism rounded-2xl p-3 border border-white/5 hover:border-primary/30 hover:bg-primary/5 transition-all text-left"
                  >
                    <div className="text-lg mb-1">{preset.emoji}</div>
                    <div className="text-xs font-bold">{preset.name}</div>
                    <div className="text-[10px] text-muted-foreground">{preset.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <RebalancingPicker
              options={[
                { label: '매월', value: 1 },
                { label: '매년', value: 12 },
              ]}
              value={rbOption}
              onChange={v => setRbOption(v as RbOption)}
              customVal={rbCustom}
              onCustomChange={setRbCustom}
            />

            <Button onClick={handleBeginnerBacktest} disabled={beginnerTotal !== 100}
              className={cn(
                "h-16 w-full text-white font-black text-xl rounded-2xl transition-all duration-500",
                beginnerTotal === 100 ? "bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 scale-[1.02]" : "bg-muted cursor-not-allowed opacity-50"
              )}
            >
              <TrendingUp className="mr-3 w-6 h-6" />분석 시작하기
            </Button>
          </>
        )}

        {/* ── EXPERT ── */}
        {mode === 'expert' && (
          <>
            {/* Mobile expert UI */}
            <div className="md:hidden flex flex-col gap-5">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">포트폴리오 구성</h3>
                <button onClick={distributeEvenly}
                  className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-primary/10"
                >
                  <Shuffle size={10} />균등 배분
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {selectedAssets.map((asset, index) => (
                  <div key={`${asset.ticker}-${index}`} className="relative">
                    <div className={cn(
                      "glass-morphism px-5 py-4 rounded-2xl border transition-all duration-200",
                      editingIndex === index ? 'border-primary/30' : 'border-white/5'
                    )}>
                      <div className="flex justify-between items-center gap-3">
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                          {editingIndex === index ? (
                            <input autoFocus value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value.toUpperCase())}
                              onBlur={() => { blurTimerRef.current = setTimeout(() => commitEdit(editingValue), 150); }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); commitEdit(editingValue); }
                                if (e.key === 'Escape') { clearTimeout(blurTimerRef.current); setEditingIndex(null); setEditingValue(''); }
                              }}
                              placeholder="티커 입력..."
                              className="font-bold text-base leading-none bg-transparent border-b border-primary/60 outline-none w-28 text-foreground placeholder:text-muted-foreground/40"
                            />
                          ) : (
                            <button onClick={() => { setEditingIndex(index); setEditingValue(asset.ticker); }}
                              className="font-bold text-base leading-none text-left flex items-center gap-1.5 group w-fit"
                            >
                              {asset.ticker}
                              <Pencil size={10} className="text-muted-foreground/40 group-hover:text-primary transition-colors" />
                            </button>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {asset.launch_year && asset.launch_year !== 'Unknown' ? `Since ${asset.launch_year}` : 'Custom'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <WeightStepper
                            value={asset.weight}
                            onChange={(v) => updateWeight(index, v)}
                            highlight={asset.weight > 0}
                          />
                          <button onClick={() => removeAsset(index)} className="p-1.5 text-muted-foreground/30 hover:text-destructive transition-colors">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <TickerDropdown forIndex={index} />
                  </div>
                ))}

                {/* Add new */}
                <div className="relative">
                  {editingIndex === -1 ? (
                    <div className="glass-morphism p-5 rounded-2xl flex flex-col gap-3 border border-primary/30">
                      <input autoFocus value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value.toUpperCase())}
                        onBlur={() => { blurTimerRef.current = setTimeout(() => commitEdit(editingValue), 150); }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); commitEdit(editingValue); }
                          if (e.key === 'Escape') { clearTimeout(blurTimerRef.current); setEditingIndex(null); setEditingValue(''); }
                        }}
                        placeholder="티커 입력 (예: SPY)"
                        className="font-bold text-base leading-none bg-transparent border-b border-primary/60 outline-none w-40 text-foreground placeholder:text-muted-foreground/40"
                      />
                      <span className="text-[10px] text-muted-foreground">새 종목 추가</span>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingIndex(-1); setEditingValue(''); }}
                      className="w-full glass-morphism p-4 rounded-2xl border border-dashed border-white/10 flex items-center justify-center gap-2 hover:border-primary/40 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary"
                    >
                      <Plus size={18} />
                      <span className="text-sm font-medium">자산 추가</span>
                    </button>
                  )}
                  <TickerDropdown forIndex={-1} />
                </div>
              </div>

              <RebalancingPicker
                options={[
                  { label: '매월', value: 1 },
                  { label: '매분기', value: 3 },
                  { label: '매년', value: 12 },
                  { label: '직접입력', value: 'custom' },
                ]}
                value={rbOption}
                onChange={v => setRbOption(v as RbOption)}
                customVal={rbCustom}
                onCustomChange={setRbCustom}
              />

              <Button onClick={() => onBacktest(selectedAssets, rbMonths)} disabled={totalWeight !== 100 || selectedAssets.length === 0}
                className={cn(
                  "h-16 w-full text-white font-black text-xl rounded-2xl transition-all duration-500",
                  totalWeight === 100 ? "bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 scale-[1.02]" : "bg-muted cursor-not-allowed opacity-50"
                )}
              >
                <TrendingUp className="mr-3 w-6 h-6" />분석 시작하기
              </Button>
            </div>

            {/* PC Multi-Portfolio Mode */}
            <div className="hidden md:flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">다중 포트폴리오 비교</h3>
              </div>

              {/* Table */}
              <div className="glass-morphism rounded-2xl border border-white/5 overflow-visible">
                {/* Header row: asset col + 3 portfolio name cols */}
                <div className="grid grid-cols-4 border-b border-white/10">
                  <div className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">자산</div>
                  {slotNames.map((name, si) => (
                    <div key={si} className="px-4 py-3 border-l border-white/5">
                      <input
                        value={name}
                        onChange={e => setSlotNames(prev => { const n = [...prev]; n[si] = e.target.value; return n; })}
                        className="w-full bg-transparent text-xs font-bold text-primary outline-none border-b border-primary/20 focus:border-primary/60 pb-0.5"
                      />
                      <div className={cn("text-[10px] mt-1", slotTotals[si] === 100 ? 'text-[#7AE9AB]' : slotTotals[si] > 100 ? 'text-destructive' : 'text-muted-foreground')}>
                        {slotTotals[si]}% {slotTotals[si] === 100 ? '✓' : `(${100 - slotTotals[si]}% 남음)`}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Asset rows */}
                {selectedAssets.map((asset, ai) => (
                  <div key={`${asset.ticker}-${ai}`} className="grid grid-cols-4 border-b border-white/5 last:border-0 hover:bg-white/2">
                    <div className="px-4 py-3 flex items-center gap-2">
                      <div className="flex flex-col gap-0.5 flex-1 min-w-0 relative">
                        {editingIndex === ai ? (
                          <>
                            <input autoFocus value={editingValue}
                              onChange={e => setEditingValue(e.target.value.toUpperCase())}
                              onBlur={() => { blurTimerRef.current = setTimeout(() => commitEdit(editingValue), 150); }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') { e.preventDefault(); commitEdit(editingValue); }
                                if (e.key === 'Escape') { clearTimeout(blurTimerRef.current); setEditingIndex(null); setEditingValue(''); }
                              }}
                              className="font-bold text-sm bg-transparent border-b border-primary/60 outline-none w-24 text-foreground"
                            />
                            <TickerDropdown forIndex={ai} />
                          </>
                        ) : (
                          <button onClick={() => { setEditingIndex(ai); setEditingValue(asset.ticker); }}
                            className="font-bold text-sm text-left flex items-center gap-1 group w-fit"
                          >
                            {asset.ticker}
                            <Pencil size={9} className="text-muted-foreground/40 group-hover:text-primary transition-colors" />
                          </button>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {asset.launch_year && asset.launch_year !== 'Unknown' ? `Since ${asset.launch_year}` : 'Custom'}
                        </span>
                      </div>
                      <button onClick={() => removeAsset(ai)} className="p-1 text-muted-foreground/20 hover:text-destructive transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    {slotWeights.map((sw, si) => (
                      <div key={si} className="px-4 py-3 border-l border-white/5 flex items-center">
                        <WeightStepper value={sw[ai] ?? 0} onChange={v => updateSlotWeight(si, ai, v)} highlight={(sw[ai] ?? 0) > 0} />
                      </div>
                    ))}
                  </div>
                ))}

                {/* Add row */}
                <div className="px-4 py-2 border-t border-white/5">
                  {editingIndex === -1 ? (
                    <div className="relative flex items-center gap-2">
                      <input autoFocus value={editingValue}
                        onChange={e => setEditingValue(e.target.value.toUpperCase())}
                        onBlur={() => { blurTimerRef.current = setTimeout(() => commitEdit(editingValue), 150); }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { e.preventDefault(); commitEdit(editingValue); }
                          if (e.key === 'Escape') { clearTimeout(blurTimerRef.current); setEditingIndex(null); setEditingValue(''); }
                        }}
                        placeholder="티커 입력 (예: SPY)"
                        className="font-bold text-sm bg-transparent border-b border-primary/60 outline-none w-36 text-foreground placeholder:text-muted-foreground/40"
                      />
                      <TickerDropdown forIndex={-1} />
                    </div>
                  ) : (
                    <button onClick={() => { setEditingIndex(-1); setEditingValue(''); }}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors py-1"
                    >
                      <Plus size={14} />자산 추가
                    </button>
                  )}
                </div>

                {/* Totals row */}
                <div className="grid grid-cols-4 border-t border-white/10 bg-white/[0.03]">
                  <div className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase">합계</div>
                  {slotTotals.map((t, si) => (
                    <div key={si} className={cn("px-4 py-2 border-l border-white/5 text-sm font-black font-mono", t === 100 ? 'text-[#7AE9AB]' : t > 100 ? 'text-destructive' : 'text-foreground')}>
                      {t}%
                    </div>
                  ))}
                </div>
              </div>

              <RebalancingPicker
                options={[
                  { label: '매월', value: 1 },
                  { label: '매분기', value: 3 },
                  { label: '매년', value: 12 },
                  { label: '직접입력', value: 'custom' },
                ]}
                value={rbOption}
                onChange={v => setRbOption(v as RbOption)}
                customVal={rbCustom}
                onCustomChange={setRbCustom}
              />

              <Button
                onClick={handleMultiBacktestSubmit}
                disabled={!allSlotsValid || selectedAssets.length === 0 || !onMultiBacktest}
                className={cn(
                  "h-16 w-full text-white font-black text-xl rounded-2xl transition-all duration-500",
                  allSlotsValid && selectedAssets.length > 0 ? "bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 scale-[1.02]" : "bg-muted cursor-not-allowed opacity-50"
                )}
              >
                <TrendingUp className="mr-3 w-6 h-6" />3개 포트폴리오 비교 분석
              </Button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
