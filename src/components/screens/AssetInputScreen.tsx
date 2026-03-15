"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, TrendingUp, Pencil, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import etfDataRaw from '@/lib/etf-data.json';
import { cn } from '@/lib/utils';
import type { Asset } from '@/app/page';

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
      { label: '비트코인 ETF',   ticker: 'IBIT', desc: 'iShares Bitcoin Trust' },
      { label: '이더리움 ETF',   ticker: 'ETHA', desc: 'iShares Ethereum Trust' },
    ],
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
      {/* Minus */}
      <button
        onClick={() => onChange(clamp(value - 5))}
        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all text-lg font-bold select-none"
      >
        −
      </button>

      {/* Value / inline edit */}
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

      {/* Plus */}
      <button
        onClick={() => onChange(clamp(value + 5))}
        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all text-lg font-bold select-none"
      >
        +
      </button>
    </div>
  );
}

// ── Total bar ─────────────────────────────────────────────────────────────────
function TotalBar({ total }: { total: number }) {
  const ok = total === 100;
  const pct = Math.min(total, 100);
  return (
    <div className={cn(
      "rounded-2xl border transition-all duration-300 overflow-hidden",
      ok ? 'bg-[#7AE9AB]/10 border-[#7AE9AB]/30' : 'bg-destructive/10 border-destructive/20'
    )}>
      {/* Progress bar */}
      <div className="h-1 bg-black/20 w-full">
        <div
          className={cn("h-full transition-all duration-500", ok ? 'bg-[#7AE9AB]' : pct >= 80 ? 'bg-yellow-400' : 'bg-destructive')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="px-4 py-3 flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">합계 비중</span>
          <span className={cn("text-xs font-medium mt-0.5", ok ? 'text-[#7AE9AB]' : 'text-destructive/80')}>
            {ok ? '✓ 분석 준비 완료' : total > 100 ? `${total - 100}% 초과` : `${100 - total}% 더 필요`}
          </span>
        </div>
        <span className={cn("text-2xl font-mono font-black", ok ? 'text-[#7AE9AB]' : 'text-destructive')}>
          {total}%
        </span>
      </div>
    </div>
  );
}

interface AssetInputScreenProps {
  onBacktest: (data: Asset[]) => void;
  preloadedAssets?: Asset[] | null;
  onPreloadConsumed?: () => void;
}

export function AssetInputScreen({ onBacktest, preloadedAssets, onPreloadConsumed }: AssetInputScreenProps) {
  const [mode, setMode] = useState<'beginner' | 'expert'>('expert');

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

  useEffect(() => {
    if (preloadedAssets && preloadedAssets.length > 0) {
      setSelectedAssets(preloadedAssets);
      setMode('expert');
      onPreloadConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preloadedAssets]);

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
    onBacktest(assets);
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
    <div className="p-6 flex flex-col gap-6 animate-fade-in">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold font-headline tracking-tight text-glow text-primary">Easybacktest</h1>
        <p className="text-muted-foreground text-sm">포트폴리오를 구성하고 과거 수익률을 분석하세요.</p>
      </header>

      {/* Mode toggle */}
      <div className="flex bg-black/30 rounded-xl p-1 border border-white/5">
        {(['beginner', 'expert'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={cn(
              "flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-200",
              mode === m ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {m === 'beginner' ? '초심자' : '전문가'}
          </button>
        ))}
      </div>

      {/* ── BEGINNER ── */}
      {mode === 'beginner' && (
        <>
          <p className="text-xs text-muted-foreground -mt-2">
            원하는 자산에 비중을 설정하세요. 합계 100%를 채우면 분석할 수 있어요.
          </p>
          <div className="flex flex-col gap-4">
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
          <div className="flex justify-between items-center -mt-2">
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

          <Button onClick={() => onBacktest(selectedAssets)} disabled={totalWeight !== 100 || selectedAssets.length === 0}
            className={cn(
              "h-16 w-full text-white font-black text-xl rounded-2xl transition-all duration-500",
              totalWeight === 100 ? "bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 scale-[1.02]" : "bg-muted cursor-not-allowed opacity-50"
            )}
          >
            <TrendingUp className="mr-3 w-6 h-6" />분석 시작하기
          </Button>
        </>
      )}

      {/* Fixed TotalBar — always visible above bottom nav */}
      <div className="fixed bottom-20 left-0 right-0 max-w-md mx-auto px-4 z-40">
        <div className="backdrop-blur-md bg-background/80 rounded-2xl shadow-2xl">
          <TotalBar total={currentTotal} />
        </div>
      </div>
    </div>
  );
}
