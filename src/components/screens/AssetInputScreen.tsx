"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, TrendingUp, Pencil, Shuffle, ImagePlus, Loader2, DollarSign, Percent, Upload, PlusCircle, ArrowLeft, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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

// ── Amount Stepper ─────────────────────────────────────────────────────────────
function AmountStepper({ value, onChange, highlight }: { value: number; onChange: (v: number) => void; highlight?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const STEP = 500;

  const startEdit = () => { setDraft(value === 0 ? '' : String(value)); setEditing(true); setTimeout(() => inputRef.current?.select(), 0); };
  const commit = () => { onChange(Math.max(0, parseInt(draft.replace(/,/g, '')) || 0)); setEditing(false); };

  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(Math.max(0, value - STEP))}
        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all text-lg font-bold select-none">−</button>
      {editing ? (
        <input ref={inputRef} type="number" value={draft} onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } if (e.key === 'Escape') setEditing(false); }}
          className="w-20 h-8 text-center font-mono font-bold text-sm bg-black/40 border border-primary/60 rounded-lg outline-none text-foreground" autoFocus />
      ) : (
        <button onClick={startEdit} className={cn(
          "w-20 h-8 rounded-lg font-mono font-bold text-xs transition-all select-none",
          highlight ? "bg-primary/20 text-primary border border-primary/30"
            : value > 0 ? "bg-white/5 text-foreground border border-white/10 hover:border-primary/30"
            : "bg-white/5 text-muted-foreground border border-white/10"
        )}>
          ${value > 0 ? value.toLocaleString() : '0'}
        </button>
      )}
      <button onClick={() => onChange(value + STEP)}
        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all text-lg font-bold select-none">+</button>
    </div>
  );
}

// ── Compact Progress Bar (for sticky header) ──────────────────────────────────
function CompactProgressBar({ total, inputType, totalAmount }: { total: number; inputType?: 'weight' | 'amount'; totalAmount?: number }) {
  if (inputType === 'amount') {
    const amt = totalAmount ?? 0;
    const hasAmt = amt > 0;
    return (
      <div className={cn("rounded-xl border px-3 py-2 flex items-center gap-3 transition-all duration-300",
        hasAmt ? 'bg-primary/10 border-primary/30' : 'bg-white/5 border-white/10')}>
        <DollarSign size={14} className={hasAmt ? 'text-primary' : 'text-muted-foreground'} />
        <span className={cn("text-sm font-black font-mono tabular-nums flex-1", hasAmt ? 'text-primary' : 'text-muted-foreground')}>
          ${amt.toLocaleString()}
        </span>
        <span className={cn("text-xs font-medium", hasAmt ? 'text-primary/70' : 'text-muted-foreground')}>
          {hasAmt ? '✓ 입력됨' : '금액 입력하세요'}
        </span>
      </div>
    );
  }

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
        <div className={cn("h-full rounded-full transition-all duration-500", barColor)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn("text-sm font-black font-mono tabular-nums", ok ? 'text-[#7AE9AB]' : over ? 'text-destructive' : 'text-foreground')}>
        {total}%
      </span>
      <span className={cn("text-xs font-medium w-14 text-right", ok ? 'text-[#7AE9AB]/80' : 'text-muted-foreground')}>
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
  const [beginnerAmounts, setBeginnerAmounts] = useState<Record<string, number>>({});

  // Input type: weight(%) or amount($)
  const [inputType, setInputType] = useState<'weight' | 'amount'>('weight');

  // Expert amount mode (parallel to selectedAssets)
  const [assetAmounts, setAssetAmounts] = useState<number[]>([0, 0, 0]);

  // View: landing (entry) or input (asset editing)
  const [view, setView] = useState<'landing' | 'input'>('landing');

  // Image OCR state
  const [parseStep, setParseStep] = useState<'ocr' | 'map' | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Parsed result pending user confirmation
  type ParsedAsset = { ticker: string; weight: number; original: string; knownTicker: boolean };
  const [parseConfirm, setParseConfirm] = useState<{
    assets: ParsedAsset[];
    note: string | null;
  } | null>(null);

  const applyParsedAssets = (parsed: ParsedAsset[]) => {
    const assets: Asset[] = parsed.map(a => {
      const etf = ETF_DATA.find(e => e.ticker === a.ticker);
      return { ticker: a.ticker, weight: a.weight, launch_year: etf?.launch_year };
    });
    setSelectedAssets(assets);
    setInputType('weight');
    setAssetAmounts(new Array(assets.length).fill(0));
    setPortfolioSlots([{ name: '포트폴리오 A', weights: assets.map(a => a.weight) }]);
    onModeChange('expert');
    setView('input');
  };

  const uploadImageFile = async (file: File) => {
    setParseStep('ocr');
    setParseError(null);
    try {
      // Step 1: OCR — image → raw items
      const form = new FormData();
      form.append('image', file);
      const res1 = await fetch('/api/parse-portfolio', { method: 'POST', body: form });
      const extracted = await res1.json();
      if (!res1.ok || extracted.error) throw new Error(extracted.error ?? '이미지 분석 실패');

      // Step 2: Map — raw items → ETF tickers
      setParseStep('map');
      const res2 = await fetch('/api/parse-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value_type: extracted.value_type, items: extracted.items }),
      });
      const json = await res2.json();
      if (!res2.ok || json.error) throw new Error(json.error ?? '매핑 실패');

      const KNOWN_EXTRA = new Set(['CASH']);
      const parsed: ParsedAsset[] = (
        json.assets as { ticker: string; weight: number; original?: string }[]
      ).map(a => ({
        ticker: a.ticker,
        weight: a.weight,
        original: a.original ?? a.ticker,
        knownTicker: !!ETF_DATA.find(e => e.ticker === a.ticker) || KNOWN_EXTRA.has(a.ticker),
      }));

      setParseConfirm({ assets: parsed, note: null });
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : '이미지 분석 중 오류가 발생했습니다.');
    } finally {
      setParseStep(null);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await uploadImageFile(file);
  };

  // Clipboard paste → image upload
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) { uploadImageFile(file); }
          break;
        }
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // PC Multi-portfolio slots
  const [portfolioSlots, setPortfolioSlots] = useState<{ name: string; weights: number[] }[]>([
    { name: '포트폴리오 A', weights: [40, 30, 30] },
  ]);

  // Rebalancing
  type RbOption = 1 | 3 | 12 | 'custom';
  const [rbOption, setRbOption] = useState<RbOption>(12);
  const [rbCustom, setRbCustom] = useState<number>(6);
  const rbMonths: number = rbOption === 'custom' ? Math.max(1, rbCustom) : rbOption;

  useEffect(() => {
    if (preloadedAssets && preloadedAssets.length > 0) {
      setSelectedAssets(preloadedAssets);
      setInputType('weight');
      onModeChange('expert');
      setView('input');
      onPreloadConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preloadedAssets]);

  // Sync portfolioSlots and assetAmounts when selectedAssets length changes
  useEffect(() => {
    setPortfolioSlots(prev => prev.map(slot => {
      const next = [...slot.weights];
      while (next.length < selectedAssets.length) next.push(0);
      while (next.length > selectedAssets.length) next.pop();
      return { ...slot, weights: next };
    }));
    setAssetAmounts(prev => {
      const next = [...prev];
      while (next.length < selectedAssets.length) next.push(0);
      while (next.length > selectedAssets.length) next.pop();
      return next;
    });
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

  const totalWeight = Math.round(selectedAssets.reduce((a, c) => a + c.weight, 0) * 10) / 10;

  // Beginner helpers
  const updateBeginnerWeight = (ticker: string, val: number) =>
    setBeginnerWeights(prev => ({ ...prev, [ticker]: val }));
  const updateBeginnerAmount = (ticker: string, val: number) =>
    setBeginnerAmounts(prev => ({ ...prev, [ticker]: val }));

  const beginnerTotal = Object.values(beginnerWeights).reduce((a, b) => a + b, 0);
  const beginnerTotalAmount = Object.values(beginnerAmounts).reduce((a, b) => a + b, 0);

  const handleBeginnerBacktest = () => {
    let assets: Asset[];
    if (inputType === 'weight') {
      assets = Object.entries(beginnerWeights)
        .filter(([, w]) => w > 0)
        .map(([ticker, weight]) => ({
          ticker, weight,
          launch_year: ETF_DATA.find(e => e.ticker === ticker)?.launch_year ?? 'Unknown',
        }));
    } else {
      const total = beginnerTotalAmount;
      if (total <= 0) return;
      assets = Object.entries(beginnerAmounts)
        .filter(([, a]) => a > 0)
        .map(([ticker, amount]) => ({
          ticker,
          weight: (amount / total) * 100,
          launch_year: ETF_DATA.find(e => e.ticker === ticker)?.launch_year ?? 'Unknown',
        }));
    }
    checkAndRun(assets, a => onBacktest(a, rbMonths));
  };

  // PC Multi-portfolio helpers
  const slotTotals = portfolioSlots.map(s => Math.round(s.weights.reduce((a, b) => a + b, 0) * 10) / 10);
  const allSlotsValid = slotTotals.every(t => t === 100);

  const updateSlotWeight = (slotIdx: number, assetIdx: number, val: number) => {
    setPortfolioSlots(prev => prev.map((s, si) =>
      si === slotIdx ? { ...s, weights: s.weights.map((w, ai) => ai === assetIdx ? Math.min(100, Math.max(0, val)) : w) } : s
    ));
  };

  const copySlot = (slotIdx: number) => {
    setPortfolioSlots(prev => {
      const src = prev[slotIdx];
      const names = prev.map(s => s.name);
      const base = src.name.replace(/ \(복사\d*\)$/, '');
      let suffix = 1;
      while (names.includes(suffix === 1 ? `${base} (복사)` : `${base} (복사${suffix})`)) suffix++;
      const newName = suffix === 1 ? `${base} (복사)` : `${base} (복사${suffix})`;
      const next = [...prev];
      next.splice(slotIdx + 1, 0, { name: newName, weights: [...src.weights] });
      return next;
    });
  };

  const deleteSlot = (slotIdx: number) => {
    setPortfolioSlots(prev => prev.filter((_, i) => i !== slotIdx));
  };

  const distributeSlotEvenly = (slotIdx: number) => {
    const n = selectedAssets.length;
    if (n === 0) return;
    const share = Math.floor(100 / n);
    const rem = 100 - share * n;
    setPortfolioSlots(prev => prev.map((s, si) =>
      si === slotIdx ? { ...s, weights: s.weights.map((_, i) => share + (i === 0 ? rem : 0)) } : s
    ));
  };

  const handlePCBacktest = () => {
    if (portfolioSlots.length === 1) {
      const assets = selectedAssets.map((a, ai) => ({ ...a, weight: portfolioSlots[0].weights[ai] ?? 0 })).filter(a => a.weight > 0);
      checkAndRun(assets, a => onBacktest(a, rbMonths));
    } else if (onMultiBacktest) {
      const slots: PortfolioSlot[] = portfolioSlots.map(s => ({
        name: s.name,
        assets: selectedAssets.map((a, ai) => ({ ...a, weight: s.weights[ai] ?? 0 })),
      }));
      // For multi-slot, check first slot assets for short history warning
      const firstSlotAssets = slots[0].assets.filter(a => a.weight > 0);
      checkAndRun(firstSlotAssets, () => onMultiBacktest(slots, rbMonths));
    }
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

  const expertAmountTotal = assetAmounts.reduce((a, b) => a + b, 0);
  const currentTotal = mode === 'beginner' ? beginnerTotal : totalWeight;
  const currentTotalAmount = mode === 'beginner' ? beginnerTotalAmount : expertAmountTotal;

  // ── Short-history warning ─────────────────────────────────────────────────
  const CURRENT_YEAR = new Date().getFullYear();
  const [shortHistoryWarning, setShortHistoryWarning] = useState<{
    shortAssets: Asset[];
    allAssets: Asset[];
    pendingAction: (assetsToRun: Asset[]) => void;
  } | null>(null);

  const checkAndRun = (assets: Asset[], action: (a: Asset[]) => void) => {
    const short = assets.filter(a => {
      const yr = parseInt(a.launch_year ?? '0');
      return yr > 0 && yr !== parseInt('Unknown') && (CURRENT_YEAR - yr) < 10;
    });
    if (short.length > 0) {
      setShortHistoryWarning({ shortAssets: short, allAssets: assets, pendingAction: action });
    } else {
      action(assets);
    }
  };

  // ── Landing view ──────────────────────────────────────────────────────────
  if (view === 'landing') {
    return (
      <>
      {/* ── Full-screen parsing overlay ─────────────────────────────────────── */}
      {parseStep && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background/80 backdrop-blur-sm">
          <div className="relative flex items-center justify-center">
            <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <ImagePlus size={28} className="absolute text-primary" />
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-lg font-bold text-foreground">
              {parseStep === 'ocr' ? '이미지 읽는 중 ...' : '자산별 비중 계산 중 ...'}
            </p>
            <p className="text-sm text-muted-foreground">
              {parseStep === 'ocr' ? '포트폴리오 이미지를 분석하고 있어요.' : 'ETF 티커로 매핑하고 있어요.'}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              접속자가 많으면 오래 걸릴 수 있어요.<br />
              현재{' '}
              <span className="font-bold text-primary">
                {(() => {
                  const h = new Date().getHours();
                  const isQuiet = h >= 1 && h < 9;
                  const [min, max] = isQuiet ? [0, 20] : [20, 50];
                  return min + Math.floor(Math.random() * (max - min + 1));
                })()}명
              </span>
              {' '}동시 분석 중
            </p>
          </div>
        </div>
      )}
      <div className={cn("flex flex-col min-h-[calc(100vh-4rem)] p-6 gap-8 animate-fade-in pb-32", parseStep && "pointer-events-none")}>
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

        <div className="pt-6 md:pt-10 flex flex-col gap-2">
          <h1 className="text-3xl font-black text-primary text-glow md:hidden">Easybacktest</h1>
          <p className="text-foreground/80 font-semibold text-lg">내 포트폴리오,<br />과거엔 어떤 성과였을까?</p>
          <p className="text-muted-foreground text-sm">보유 종목을 입력하면 역대 수익률·리스크를 분석해드려요.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Image path */}
          <div className="glass-morphism rounded-3xl border border-primary/30 p-6 flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
              <ImagePlus size={24} className="text-primary" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold">스크린샷으로 바로 분석</h3>
              <p className="text-sm text-muted-foreground">증권사 앱·엑셀 화면을 캡처해서 올리면 AI가 자동으로 포트폴리오를 읽어요</p>
            </div>
            {!parseStep && (
              <div className="mt-auto flex flex-col gap-2">
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="bg-primary text-white font-bold py-3.5 rounded-2xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
                >
                  <Upload size={16} /> 이미지 파일 선택
                </button>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs">또는</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="flex items-center justify-center gap-2 py-2 rounded-2xl border border-dashed border-border bg-muted/30">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-xs font-mono font-semibold">⌘V</kbd>
                  <span className="text-xs text-muted-foreground">/</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-xs font-mono font-semibold">Ctrl V</kbd>
                  <span className="text-xs text-muted-foreground">로 클립보드에서 붙여넣기</span>
                </div>
              </div>
            )}
            {parseError && <p className="text-[11px] text-destructive -mt-2">{parseError}</p>}
          </div>

          {/* Manual path */}
          <div className="glass-morphism rounded-3xl border border-white/10 p-6 flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
              <PlusCircle size={24} className="text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold">직접 구성하기</h3>
              <p className="text-sm text-muted-foreground">원하는 자산을 선택하거나 티커를 직접 입력해서 포트폴리오를 만들어요</p>
            </div>
            <button
              onClick={() => setView('input')}
              className="mt-auto bg-white/10 border border-white/15 text-foreground font-bold py-3.5 rounded-2xl hover:bg-white/15 transition-all flex items-center justify-center gap-2"
            >
              시작하기 →
            </button>
          </div>
        </div>
      </div>

      {/* ── Parse-portfolio confirmation dialog (landing) ─────────────────── */}
      <Dialog open={!!parseConfirm} onOpenChange={open => { if (!open) setParseConfirm(null); }}>
        <DialogContent className="max-w-sm rounded-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImagePlus size={18} className="text-primary" />
              이미지 분석 결과 확인
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-sm text-muted-foreground">아래 매핑이 맞는지 확인 후 적용해주세요.</div>
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 space-y-1 pr-1">
            {parseConfirm?.assets.map((a, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-center justify-between rounded-lg px-3 py-2 text-sm',
                  a.knownTicker ? 'bg-muted' : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700'
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {a.knownTicker
                    ? <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                    : <XCircle size={14} className="text-amber-500 shrink-0" />
                  }
                  <div className="min-w-0">
                    <span className="font-mono font-bold">{a.ticker}</span>
                    {!a.knownTicker && <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">미지원</span>}
                    <p className="text-xs text-muted-foreground truncate">{a.original}</p>
                  </div>
                </div>
                <span className="font-semibold tabular-nums ml-2 shrink-0">{a.weight.toFixed(1)}%</span>
              </div>
            ))}
          </div>
          {parseConfirm?.assets.some(a => !a.knownTicker) && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle size={12} />미지원 티커는 적용 후 직접 수정해주세요.
            </p>
          )}
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setParseConfirm(null)}>취소</Button>
            <Button
              className="flex-1"
              onClick={() => { if (parseConfirm) { applyParsedAssets(parseConfirm.assets); setParseConfirm(null); } }}
            >
              이 비중으로 적용
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
    );
  }

  return (
    <>
    <div className="flex flex-col animate-fade-in">

      {/* ── Sticky header: always visible while scrolling ── */}
      {/* sticky top-0 anchors to <main className="overflow-y-auto"> in page.tsx */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md px-6 pt-5 pb-3 flex flex-col gap-3 border-b border-white/5">

        {/* Header row: back + input type toggle + mode toggle */}
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        <div className="flex items-center gap-2">
          {/* Back to landing */}
          <button onClick={() => setView('landing')} className="shrink-0 p-2 -ml-1 text-muted-foreground hover:text-foreground transition-colors" title="처음으로">
            <ArrowLeft size={18} />
          </button>

          {/* Input type toggle: 비중 / 금액 */}
          <div className="flex bg-black/30 rounded-xl p-1 border border-white/5">
            <button onClick={() => setInputType('weight')}
              className={cn("flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                inputType === 'weight' ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:text-foreground')}>
              <Percent size={11} />비중
            </button>
            <button onClick={() => setInputType('amount')}
              className={cn("flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                inputType === 'amount' ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:text-foreground')}>
              <DollarSign size={11} />금액
            </button>
          </div>

          <div className="flex-1" />

          {/* Mode toggle: 추천 / 커스텀 — small on/off style */}
          <span className="text-[11px] text-muted-foreground shrink-0">커스텀</span>
          <button
            onClick={() => onModeChange(mode === 'beginner' ? 'expert' : 'beginner')}
            className={cn("shrink-0 relative w-10 h-5 rounded-full transition-colors duration-200", mode === 'expert' ? 'bg-primary' : 'bg-white/20')}
          >
            <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200", mode === 'expert' ? 'left-[22px]' : 'left-0.5')} />
          </button>
        </div>

        {/* Compact progress bar — hidden on PC when expert mode (each slot card shows its own) */}
        <div className={cn(mode === 'expert' && 'md:hidden')}>
          <CompactProgressBar total={currentTotal} inputType={inputType} totalAmount={currentTotalAmount} />
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="px-6 py-5 flex flex-col gap-5">

        {/* ── BEGINNER ── */}
        {mode === 'beginner' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 md:gap-4 gap-4">
              {BEGINNER_CATEGORIES.map(cat => (
                <div key={cat.name} className="glass-morphism rounded-2xl border border-white/5 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                    <span className="text-base">{cat.emoji}</span>
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{cat.name}</span>
                  </div>
                  {cat.items.map((item, i) => {
                    const w = beginnerWeights[item.ticker] ?? 0;
                    const a = beginnerAmounts[item.ticker] ?? 0;
                    const active = inputType === 'weight' ? w > 0 : a > 0;
                    return (
                      <div key={item.ticker} className={cn(
                        "flex items-center justify-between px-4 py-3 gap-3",
                        i < cat.items.length - 1 && "border-b border-white/5",
                        active && "bg-primary/5"
                      )}>
                        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                          <span className="text-sm font-semibold">{item.label}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-primary">{item.ticker}</span>
                            <span className="text-[10px] text-muted-foreground">· {item.desc}</span>
                          </div>
                        </div>
                        {inputType === 'weight'
                          ? <WeightStepper value={w} onChange={(v) => updateBeginnerWeight(item.ticker, v)} highlight={w > 0} />
                          : <AmountStepper value={a} onChange={(v) => updateBeginnerAmount(item.ticker, v)} highlight={a > 0} />}
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

            {(() => {
              const canRun = inputType === 'weight' ? beginnerTotal === 100 : beginnerTotalAmount > 0;
              return (
                <Button onClick={handleBeginnerBacktest} disabled={!canRun}
                  className={cn(
                    "h-16 w-full text-white font-black text-xl rounded-2xl transition-all duration-500",
                    canRun ? "bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 scale-[1.02]" : "bg-muted cursor-not-allowed opacity-50"
                  )}
                >
                  <TrendingUp className="mr-3 w-6 h-6" />분석 시작하기
                </Button>
              );
            })()}
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
                          {inputType === 'weight'
                            ? <WeightStepper value={asset.weight} onChange={(v) => updateWeight(index, v)} highlight={asset.weight > 0} />
                            : <AmountStepper value={assetAmounts[index] ?? 0} onChange={(v) => setAssetAmounts(prev => { const n=[...prev]; n[index]=v; return n; })} highlight={(assetAmounts[index] ?? 0) > 0} />}
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

              <Button onClick={() => {
                if (inputType === 'weight') { onBacktest(selectedAssets, rbMonths); }
                else {
                  const tot = assetAmounts.reduce((a,b)=>a+b,0);
                  if (tot <= 0) return;
                  const assets = selectedAssets.map((a,i)=>({...a, weight:(assetAmounts[i]??0)/tot*100})).filter(a=>a.weight>0);
                  onBacktest(assets, rbMonths);
                }
              }} disabled={(inputType==='weight' ? totalWeight !== 100 : expertAmountTotal <= 0) || selectedAssets.length === 0}
                className={cn(
                  "h-16 w-full text-white font-black text-xl rounded-2xl transition-all duration-500",
                  (inputType==='weight' ? totalWeight===100 : expertAmountTotal>0) && selectedAssets.length>0 ? "bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 scale-[1.02]" : "bg-muted cursor-not-allowed opacity-50"
                )}
              >
                <TrendingUp className="mr-3 w-6 h-6" />분석 시작하기
              </Button>
            </div>

            {/* PC Portfolio Slots */}
            <div className="hidden md:flex flex-col gap-4">

              {portfolioSlots.map((slot, si) => {
                const total = slotTotals[si] ?? 0;
                return (
                  <div key={si} className="glass-morphism rounded-2xl border border-white/5 p-5 flex flex-col gap-4">
                    {/* Slot header */}
                    <div className="flex items-center gap-3">
                      <input
                        value={slot.name}
                        onChange={e => setPortfolioSlots(prev => prev.map((s, i) => i === si ? { ...s, name: e.target.value } : s))}
                        className="bg-transparent text-sm font-bold text-primary outline-none border-b border-primary/20 focus:border-primary/60 pb-0.5 w-36"
                      />
                      <div className={cn("text-xs font-bold font-mono", total === 100 ? 'text-[#7AE9AB]' : total > 100 ? 'text-destructive' : 'text-muted-foreground')}>
                        {total}% {total === 100 ? '✓' : `(${100 - total}% 남음)`}
                      </div>
                      <button onClick={() => distributeSlotEvenly(si)}
                        className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-primary/10 ml-1">
                        <Shuffle size={9} />균등
                      </button>
                      <div className="flex-1" />
                      {portfolioSlots.length > 1 && (
                        <button onClick={() => deleteSlot(si)} className="p-1.5 text-muted-foreground/30 hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Horizontal ticker cards */}
                    <div className="flex flex-wrap gap-2">
                      {selectedAssets.map((asset, ai) => (
                        <div key={`${asset.ticker}-${ai}`} className="flex flex-col items-center gap-2 bg-black/20 border border-white/5 rounded-xl px-3 py-3 min-w-[100px]">
                          {/* Ticker label — editable only on first slot */}
                          <div className="relative w-full flex justify-center">
                            {si === 0 ? (
                              editingIndex === ai ? (
                                <>
                                  <input autoFocus value={editingValue}
                                    onChange={e => setEditingValue(e.target.value.toUpperCase())}
                                    onBlur={() => { blurTimerRef.current = setTimeout(() => commitEdit(editingValue), 150); }}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') { e.preventDefault(); commitEdit(editingValue); }
                                      if (e.key === 'Escape') { clearTimeout(blurTimerRef.current); setEditingIndex(null); setEditingValue(''); }
                                    }}
                                    className="font-bold text-xs bg-transparent border-b border-primary/60 outline-none w-16 text-center text-foreground"
                                  />
                                  <TickerDropdown forIndex={ai} />
                                </>
                              ) : (
                                <button onClick={() => { setEditingIndex(ai); setEditingValue(asset.ticker); }}
                                  className="font-bold text-xs flex items-center gap-0.5 group"
                                >
                                  {asset.ticker}
                                  <Pencil size={8} className="text-muted-foreground/30 group-hover:text-primary transition-colors" />
                                </button>
                              )
                            ) : (
                              <span className="font-bold text-xs">{asset.ticker}</span>
                            )}
                          </div>
                          <span className="text-[9px] text-muted-foreground">
                            {asset.launch_year && asset.launch_year !== 'Unknown' ? `Since ${asset.launch_year}` : 'Custom'}
                          </span>
                          <WeightStepper value={slot.weights[ai] ?? 0} onChange={v => updateSlotWeight(si, ai, v)} highlight={(slot.weights[ai] ?? 0) > 0} />
                          {/* Remove ticker (only on first slot) */}
                          {si === 0 && (
                            <button onClick={() => removeAsset(ai)} className="text-muted-foreground/20 hover:text-destructive transition-colors">
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      ))}

                      {/* Add ticker — only on first slot */}
                      {si === 0 && (
                        <div className="relative">
                          {editingIndex === -1 ? (
                            <div className="flex flex-col gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-3 min-w-[100px] items-center">
                              <input autoFocus value={editingValue}
                                onChange={e => setEditingValue(e.target.value.toUpperCase())}
                                onBlur={() => { blurTimerRef.current = setTimeout(() => commitEdit(editingValue), 150); }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') { e.preventDefault(); commitEdit(editingValue); }
                                  if (e.key === 'Escape') { clearTimeout(blurTimerRef.current); setEditingIndex(null); setEditingValue(''); }
                                }}
                                placeholder="SPY"
                                className="font-bold text-xs bg-transparent border-b border-primary/60 outline-none w-16 text-center text-foreground placeholder:text-muted-foreground/40"
                              />
                              <TickerDropdown forIndex={-1} />
                            </div>
                          ) : (
                            <button onClick={() => { setEditingIndex(-1); setEditingValue(''); }}
                              className="flex flex-col items-center justify-center gap-1 bg-black/20 border border-dashed border-white/10 rounded-xl px-3 py-3 min-w-[100px] min-h-[90px] hover:border-primary/40 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary"
                            >
                              <Plus size={16} />
                              <span className="text-[10px] font-medium">자산 추가</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Copy button */}
                    <button onClick={() => copySlot(si)}
                      className="self-start flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary border border-white/10 hover:border-primary/30 hover:bg-primary/5 transition-all px-3 py-1.5 rounded-lg font-semibold"
                    >
                      <Plus size={11} />이 포트폴리오 복사
                    </button>
                  </div>
                );
              })}

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
                onClick={handlePCBacktest}
                disabled={!allSlotsValid || selectedAssets.length === 0}
                className={cn(
                  "h-16 w-full text-white font-black text-xl rounded-2xl transition-all duration-500",
                  allSlotsValid && selectedAssets.length > 0 ? "bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 scale-[1.02]" : "bg-muted cursor-not-allowed opacity-50"
                )}
              >
                <TrendingUp className="mr-3 w-6 h-6" />
                {portfolioSlots.length > 1 ? `${portfolioSlots.length}개 포트폴리오 비교 분석` : '분석 시작하기'}
              </Button>
            </div>
          </>
        )}

      </div>
    </div>

    {/* ── Parse-portfolio confirmation dialog ──────────────────────────────── */}
    <Dialog open={!!parseConfirm} onOpenChange={open => { if (!open) setParseConfirm(null); }}>
      <DialogContent className="max-w-sm rounded-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImagePlus size={18} className="text-primary" />
            이미지 분석 결과 확인
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-muted-foreground">
              아래 매핑이 맞는지 확인 후 적용해주세요.
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-1 pr-1">
          {parseConfirm?.assets.map((a, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center justify-between rounded-lg px-3 py-2 text-sm',
                a.knownTicker ? 'bg-muted' : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700'
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                {a.knownTicker
                  ? <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                  : <XCircle size={14} className="text-amber-500 shrink-0" />
                }
                <div className="min-w-0">
                  <span className="font-mono font-bold">{a.ticker}</span>
                  {!a.knownTicker && (
                    <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">미지원</span>
                  )}
                  <p className="text-xs text-muted-foreground truncate">{a.original}</p>
                </div>
              </div>
              <span className="font-semibold tabular-nums ml-2 shrink-0">
                {a.weight.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>

        {parseConfirm?.assets.some(a => !a.knownTicker) && (
          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <AlertTriangle size={12} />
            미지원 티커는 적용 후 직접 수정해주세요.
          </p>
        )}

        <div className="flex gap-2 mt-2">
          <Button variant="outline" className="flex-1" onClick={() => setParseConfirm(null)}>
            취소
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              if (parseConfirm) {
                applyParsedAssets(parseConfirm.assets);
                setParseConfirm(null);
              }
            }}
          >
            이 비중으로 적용
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* ── Short-history warning dialog ─────────────────────────────────────── */}
    <Dialog open={!!shortHistoryWarning} onOpenChange={open => { if (!open) setShortHistoryWarning(null); }}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-500">
            <AlertTriangle size={20} />
            데이터 부족 경고
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-muted-foreground mt-1">
              <p>선택한 자산 중 상장 10년 미만인 항목이 있어 백테스트 결과가 제한될 수 있습니다.</p>
              <ul className="mt-2 space-y-1">
                {shortHistoryWarning?.shortAssets.map(a => (
                  <li key={a.ticker} className="flex justify-between font-mono text-xs bg-muted rounded px-2 py-1">
                    <span className="font-semibold">{a.ticker}</span>
                    <span className="text-muted-foreground">상장 {a.launch_year}년</span>
                  </li>
                ))}
              </ul>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 mt-2">
          <Button variant="outline" className="flex-1" onClick={() => setShortHistoryWarning(null)}>
            취소
          </Button>
          <Button
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
            onClick={() => {
              if (shortHistoryWarning) {
                shortHistoryWarning.pendingAction(shortHistoryWarning.allAssets);
                setShortHistoryWarning(null);
              }
            }}
          >
            그래도 분석하기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
