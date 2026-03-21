"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, TrendingUp, Pencil, Shuffle, ImagePlus, Loader2, DollarSign, Percent, Upload, PlusCircle, ArrowLeft, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import etfDataRaw from '@/lib/etf-data.json';
import { useLang } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Asset, PortfolioSlot } from '@/app/page';

interface ETF {
  ticker: string;
  name: string;
  launch_year: string;
}

const ETF_DATA = etfDataRaw as ETF[];

interface AssetInputScreenProps {
  onBacktest: (data: Asset[], rebalancingMonths: number) => void;
  preloadedAssets?: Asset[] | null;
  onPreloadConsumed?: () => void;
  onMultiBacktest?: (slots: PortfolioSlot[], rebalancingMonths: number) => void;
  mode: 'beginner' | 'expert';
  onModeChange: (mode: 'beginner' | 'expert') => void;
}

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
function CompactProgressBar({ total, inputType, totalAmount, tDone, tOver, tLeft, tAmtDone, tAmtPlaceholder }: {
  total: number;
  inputType?: 'weight' | 'amount';
  totalAmount?: number;
  tDone: string;
  tOver: string;
  tLeft: string;
  tAmtDone: string;
  tAmtPlaceholder: string;
}) {
  if (inputType === 'amount') {
    const amt = totalAmount ?? 0;
    const hasAmt = amt > 0;
    return (
      <div className={cn("rounded-xl border px-4 py-3 flex items-center gap-3 transition-all duration-300",
        hasAmt ? 'bg-primary/10 border-primary/30' : 'bg-white/5 border-white/10')}>
        <DollarSign size={16} className={hasAmt ? 'text-primary' : 'text-muted-foreground'} />
        <span className={cn("text-base font-black font-mono tabular-nums flex-1", hasAmt ? 'text-primary' : 'text-muted-foreground')}>
          ${amt.toLocaleString()}
        </span>
        <span className={cn("text-sm font-medium", hasAmt ? 'text-primary/70' : 'text-muted-foreground')}>
          {hasAmt ? tAmtDone : tAmtPlaceholder}
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
      "rounded-xl border px-4 py-3 flex items-center gap-3 transition-all duration-300",
      ok ? 'bg-[#7AE9AB]/10 border-[#7AE9AB]/30' : 'bg-white/5 border-white/10'
    )}>
      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", barColor)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn("text-base font-black font-mono tabular-nums", ok ? 'text-[#7AE9AB]' : over ? 'text-destructive' : 'text-foreground')}>
        {total}%
      </span>
      <span className={cn("text-sm font-semibold w-16 text-right", ok ? 'text-[#7AE9AB]/80' : 'text-muted-foreground')}>
        {ok ? tDone : over ? `${total - 100}${tOver}` : `${100 - total}${tLeft}`}
      </span>
    </div>
  );
}

// ── Rebalancing Picker ─────────────────────────────────────────────────────
type RbOpt = 1 | 3 | 12 | 'custom';
function RebalancingPicker({
  label,
  options,
  value,
  onChange,
  customVal,
  onCustomChange,
  monthsUnit,
}: {
  label: string;
  options: { label: string; value: RbOpt }[];
  value: RbOpt;
  onChange: (v: RbOpt) => void;
  customVal: number;
  onCustomChange: (v: number) => void;
  monthsUnit: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
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
            <span className="text-xs text-muted-foreground">{monthsUnit}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function AssetInputScreen({ onBacktest, preloadedAssets, onPreloadConsumed, onMultiBacktest, mode, onModeChange }: AssetInputScreenProps) {
  const { t, lang } = useLang();

  // Build translated BEGINNER_CATEGORIES
  const BEGINNER_CATEGORIES = [
    {
      name: t('cat_stocks'),
      emoji: '📈',
      items: [
        { label: t('etf_us_total'),        ticker: 'VTI',      desc: 'Vanguard Total Market' },
        { label: t('etf_tech_nasdaq'),     ticker: 'QQQ',      desc: 'Nasdaq 100' },
        { label: t('etf_dividend'),        ticker: 'SCHD',     desc: 'Schwab Dividend' },
        { label: 'S&P 500',               ticker: 'SPY',      desc: t('etf_sp500_desc') },
        { label: t('etf_developed'),       ticker: 'EFA',      desc: t('etf_developed_desc') },
        { label: t('etf_emerging'),        ticker: 'EEM',      desc: t('etf_emerging_desc') },
      ],
    },
    {
      name: t('cat_bonds'),
      emoji: '🏦',
      items: [
        { label: t('etf_longbond'),        ticker: 'TLT',  desc: t('etf_longbond_desc') },
        { label: t('etf_midbond'),         ticker: 'IEF',  desc: t('etf_midbond_desc') },
        { label: t('etf_shortbond'),       ticker: 'SHY',  desc: t('etf_shortbond_desc') },
        { label: t('etf_tips'),            ticker: 'TIP',  desc: t('etf_tips_desc') },
      ],
    },
    {
      name: t('cat_commodities'),
      emoji: '🪙',
      items: [
        { label: t('etf_gold'),                  ticker: 'GLD', desc: 'SPDR Gold ETF' },
        { label: t('etf_oil'),                   ticker: 'USO', desc: t('etf_oil_desc') },
        { label: t('etf_commodities_broad'),     ticker: 'DBC', desc: t('etf_commodities_broad_desc') },
      ],
    },
    {
      name: t('cat_realestate'),
      emoji: '🏢',
      items: [
        { label: t('etf_reit'),            ticker: 'VNQ', desc: 'Vanguard REIT' },
      ],
    },
    {
      name: t('cat_cash'),
      emoji: '💵',
      items: [
        { label: t('etf_cash'),            ticker: 'CASH', desc: t('etf_cash_desc') },
      ],
    },
    {
      name: t('cat_crypto'),
      emoji: '₿',
      items: [
        { label: t('etf_bitcoin'),         ticker: 'BTC-USD', desc: 'Bitcoin / USD' },
        { label: t('etf_ethereum'),        ticker: 'ETH-USD', desc: 'Ethereum / USD' },
      ],
    },
  ];

  const PRESET_PORTFOLIOS = [
    {
      name: t('preset_allweather'),
      desc: 'Ray Dalio',
      emoji: '🌦️',
      weights: { SPY: 30, TLT: 40, IEF: 15, GLD: 7, DBC: 8 } as Record<string, number>,
    },
    {
      name: '60/40',
      desc: t('preset_6040_desc'),
      emoji: '⚖️',
      weights: { SPY: 60, IEF: 40 } as Record<string, number>,
    },
    {
      name: t('preset_golden_butterfly'),
      desc: 'Golden Butterfly',
      emoji: '🦋',
      weights: { SPY: 20, IEF: 20, CASH: 20, GLD: 20, VNQ: 20 } as Record<string, number>,
    },
    {
      name: t('preset_permanent'),
      desc: 'Harry Browne',
      emoji: '🏛️',
      weights: { SPY: 25, TLT: 25, GLD: 25, CASH: 25 } as Record<string, number>,
    },
  ];

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
    setPortfolioSlots([{ name: `${t('nav_compose')} A`, weights: assets.map(a => a.weight) }]);
    onModeChange('expert');
    setView('input');
  };

  const uploadImageFile = async (file: File) => {
    setParseStep('ocr');
    setParseError(null);
    const timer = setTimeout(() => setParseStep('map'), 5000);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch('/api/parse-portfolio', { method: 'POST', body: form });
      const json = await res.json();
      if (res.status === 401) throw new Error(t('parse_login_required'));
      if (!res.ok || json.error) throw new Error(json.error ?? t('parse_dialog_title'));

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
      setParseError(err instanceof Error ? err.message : t('ocr_analyzing_desc'));
    } finally {
      clearTimeout(timer);
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
    { name: `Portfolio A`, weights: [40, 30, 30] },
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

  // 한국 주식(.KS/.KQ)은 ticker 대신 종목명 표시
  const displayLabel = (ticker: string) => {
    if (ticker.endsWith('.KS') || ticker.endsWith('.KQ')) {
      return ETF_DATA.find(e => e.ticker === ticker)?.name ?? ticker;
    }
    return ticker;
  };

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
      const base = src.name.replace(/ \(Copy\d*\)$/, '').replace(/ \(복사\d*\)$/, '');
      let suffix = 1;
      while (names.includes(suffix === 1 ? `${base} (Copy)` : `${base} (Copy ${suffix})`)) suffix++;
      const newName = suffix === 1 ? `${base} (Copy)` : `${base} (Copy ${suffix})`;
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
              <span className="text-xs font-bold text-primary">&quot;{editingValue.toUpperCase()}&quot; {t('expert_custom_add_label')}</span>
              <span className="text-[10px] text-muted-foreground">{t('expert_not_in_db')}</span>
            </div>
            <button
              onMouseDown={(e) => { e.preventDefault(); commitEdit(editingValue); }}
              className="shrink-0 bg-primary/20 text-primary text-[10px] font-bold px-2 py-1 rounded-lg hover:bg-primary/30 transition-colors"
            >{t('expert_add_btn')}</button>
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
              {parseStep === 'ocr' ? t('ocr_analyzing') : t('ocr_mapping')}
            </p>
            <p className="text-sm text-muted-foreground">
              {parseStep === 'ocr' ? t('ocr_analyzing_desc') : t('ocr_mapping_desc')}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {t('ocr_busy_note')}<br />
              {t('ocr_busy_prefix')}{' '}
              <span className="font-bold text-primary">
                {(() => {
                  const h = new Date().getHours();
                  const isQuiet = h >= 1 && h < 9;
                  const [min, max] = isQuiet ? [0, 20] : [20, 50];
                  return min + Math.floor(Math.random() * (max - min + 1));
                })()}
              </span>
              {' '}{t('ocr_busy_suffix')}
            </p>
          </div>
        </div>
      )}
      <div className={cn("flex flex-col min-h-[calc(100vh-7.5rem)] md:min-h-[calc(100vh-3.5rem)] p-6 md:p-10 gap-8 animate-fade-in pb-8 justify-center", parseStep && "pointer-events-none")}>
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black text-primary text-glow md:hidden">Easybacktest</h1>
          <p className="text-foreground/80 font-semibold text-xl md:text-2xl whitespace-pre-line">{t('landing_headline')}</p>
          <p className="text-muted-foreground text-sm md:text-base">{t('landing_subtext')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
          {/* Image path — primary action, wider on PC */}
          <div className="glass-morphism rounded-3xl border border-primary/30 p-6 md:p-8 flex flex-col gap-5">
            <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center">
              <ImagePlus size={28} className="text-primary" />
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-lg font-bold">{t('landing_screenshot_title')}</h3>
              <p className="text-sm text-muted-foreground">{t('landing_screenshot_desc')}</p>
            </div>
            {!parseStep && (
              <div className="mt-auto flex flex-col gap-3">
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="bg-primary text-white font-bold py-4 rounded-2xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25 text-base"
                >
                  <Upload size={18} /> {t('landing_upload_button')}
                </button>
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-2 py-1 rounded bg-muted border border-border text-xs font-mono font-bold">⌘V</kbd>
                    <span className="text-xs text-muted-foreground">/</span>
                    <kbd className="px-2 py-1 rounded bg-muted border border-border text-xs font-mono font-bold">Ctrl+V</kbd>
                  </div>
                  <span className="text-xs text-muted-foreground">{t('landing_paste_hint')}</span>
                </div>
              </div>
            )}
            {parseError && <p className="text-xs text-destructive">{parseError}</p>}
          </div>

          {/* Manual path — secondary */}
          <div className="glass-morphism rounded-3xl border border-white/10 p-6 md:p-8 flex flex-col gap-5">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
              <PlusCircle size={28} className="text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-lg font-bold">{t('landing_manual_title')}</h3>
              <p className="text-sm text-muted-foreground">{t('landing_manual_desc')}</p>
            </div>
            <button
              onClick={() => setView('input')}
              className="mt-auto bg-white/10 border border-white/15 text-foreground font-bold py-4 rounded-2xl hover:bg-white/15 transition-all flex items-center justify-center gap-2 text-base"
            >
              {t('landing_start_button')}
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
              {t('parse_dialog_title')}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-sm text-muted-foreground">{t('parse_dialog_desc')}</div>
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
                    {!a.knownTicker && <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">{t('parse_unknown_ticker')}</span>}
                    <p className="text-xs text-muted-foreground truncate">{a.original}</p>
                  </div>
                </div>
                <span className="font-semibold tabular-nums ml-2 shrink-0">{a.weight.toFixed(1)}%</span>
              </div>
            ))}
          </div>
          {parseConfirm?.assets.some(a => !a.knownTicker) && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle size={12} />{t('parse_unknown_warning')}
            </p>
          )}
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setParseConfirm(null)}>{t('parse_cancel')}</Button>
            <Button
              className="flex-1"
              onClick={() => { if (parseConfirm) { applyParsedAssets(parseConfirm.assets); setParseConfirm(null); } }}
            >
              {t('parse_apply')}
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
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md px-6 pt-5 pb-3 flex flex-col gap-3 border-b border-white/5">

        {/* Header row: back + input type toggle + mode toggle */}
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        <div className="flex items-center gap-2">
          {/* Back to landing */}
          <button onClick={() => setView('landing')} className="shrink-0 p-2 -ml-1 text-muted-foreground hover:text-foreground transition-colors" title={lang === 'ko' ? '처음으로' : 'Back to Home'}>
            <ArrowLeft size={18} />
          </button>

          {/* Input type toggle: Weight / Amount */}
          <div className="flex bg-black/30 rounded-xl p-1 border border-white/5">
            <button onClick={() => setInputType('weight')}
              className={cn("flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                inputType === 'weight' ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:text-foreground')}>
              <Percent size={11} />{t('input_weight_label')}
            </button>
            <button onClick={() => setInputType('amount')}
              className={cn("flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                inputType === 'amount' ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:text-foreground')}>
              <DollarSign size={11} />{t('input_amount_label')}
            </button>
          </div>

          <div className="flex-1" />

          {/* Mode toggle */}
          <span className="text-[11px] text-muted-foreground shrink-0">{t('input_custom_label')}</span>
          <button
            onClick={() => onModeChange(mode === 'beginner' ? 'expert' : 'beginner')}
            className={cn("shrink-0 relative w-10 h-5 rounded-full transition-colors duration-200", mode === 'expert' ? 'bg-primary' : 'bg-white/20')}
          >
            <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200", mode === 'expert' ? 'left-[22px]' : 'left-0.5')} />
          </button>
        </div>

        {/* Compact progress bar — hidden on PC when expert mode (each slot card shows its own) */}
        <div className={cn(mode === 'expert' && 'md:hidden')}>
          <CompactProgressBar
            total={currentTotal}
            inputType={inputType}
            totalAmount={currentTotalAmount}
            tDone={t('input_weight_done')}
            tOver={t('input_weight_over')}
            tLeft={t('input_weight_left')}
            tAmtDone={t('input_amount_done')}
            tAmtPlaceholder={t('input_amount_placeholder')}
          />
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
                            <span className="text-xs font-bold text-primary">{item.ticker}</span>
                            <span className="text-xs text-muted-foreground">· {item.desc}</span>
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
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('preset_section_label')}</span>
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
              label={t('rb_label')}
              options={[
                { label: t('rb_monthly'), value: 1 },
                { label: t('rb_yearly'), value: 12 },
              ]}
              value={rbOption}
              onChange={v => setRbOption(v as RbOption)}
              customVal={rbCustom}
              onCustomChange={setRbCustom}
              monthsUnit={t('rb_months_unit')}
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
                  <TrendingUp className="mr-3 w-6 h-6" />{t('run_backtest')}
                </Button>
              );
            })()}
          </>
        )}

        {/* ── EXPERT ── */}
        {mode === 'expert' && (
          <>
            {/* Mobile expert UI */}
            <div className="md:hidden flex flex-col gap-5 min-h-[calc(100vh-8rem)] justify-center">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-semibold uppercase tracking-wider text-muted-foreground">{t('expert_portfolio_label')}</h3>
                <button onClick={distributeEvenly}
                  className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-primary/10"
                >
                  <Shuffle size={10} />{t('expert_distribute')}
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
                              placeholder={t('expert_ticker_placeholder')}
                              className="font-bold text-base leading-none bg-transparent border-b border-primary/60 outline-none w-28 text-foreground placeholder:text-muted-foreground/40"
                            />
                          ) : (
                            <button onClick={() => { setEditingIndex(index); setEditingValue(asset.ticker); }}
                              className="font-bold text-base leading-none text-left flex items-center gap-1.5 group w-fit"
                            >
                              {displayLabel(asset.ticker)}
                              <Pencil size={10} className="text-muted-foreground/40 group-hover:text-primary transition-colors" />
                            </button>
                          )}
                          <span className="text-sm text-muted-foreground">
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
                        placeholder={t('expert_ticker_input_placeholder')}
                        className="font-bold text-base leading-none bg-transparent border-b border-primary/60 outline-none w-40 text-foreground placeholder:text-muted-foreground/40"
                      />
                      <span className="text-xs text-muted-foreground">{t('expert_ticker_add_new')}</span>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingIndex(-1); setEditingValue(''); }}
                      className="w-full glass-morphism p-4 rounded-2xl border border-dashed border-white/10 flex items-center justify-center gap-2 hover:border-primary/40 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary"
                    >
                      <Plus size={18} />
                      <span className="text-base font-medium">{t('expert_add_asset')}</span>
                    </button>
                  )}
                  <TickerDropdown forIndex={-1} />
                </div>
              </div>

              <RebalancingPicker
                label={t('rb_label')}
                options={[
                  { label: t('rb_monthly'), value: 1 },
                  { label: t('rb_quarterly'), value: 3 },
                  { label: t('rb_yearly'), value: 12 },
                  { label: t('rb_custom'), value: 'custom' },
                ]}
                value={rbOption}
                onChange={v => setRbOption(v as RbOption)}
                customVal={rbCustom}
                onCustomChange={setRbCustom}
                monthsUnit={t('rb_months_unit')}
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
                <TrendingUp className="mr-3 w-6 h-6" />{t('run_backtest')}
              </Button>
            </div>

            {/* PC Portfolio Slots */}
            <div className={cn("hidden md:grid gap-4", portfolioSlots.length > 1 ? "grid-cols-2" : "grid-cols-1")}>

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
                        {total}% {total === 100 ? '✓' : `(${100 - total}% ${t('expert_slot_left')})`}
                      </div>
                      <button onClick={() => distributeSlotEvenly(si)}
                        className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-primary/10 ml-1">
                        <Shuffle size={9} />{t('expert_slot_distribute')}
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
                                  {displayLabel(asset.ticker)}
                                  <Pencil size={8} className="text-muted-foreground/30 group-hover:text-primary transition-colors" />
                                </button>
                              )
                            ) : (
                              <span className="font-bold text-xs">{displayLabel(asset.ticker)}</span>
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
                              <span className="text-[10px] font-medium">{t('expert_add_asset')}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Copy button */}
                    <button onClick={() => copySlot(si)}
                      className="self-start flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary border border-white/10 hover:border-primary/30 hover:bg-primary/5 transition-all px-3 py-1.5 rounded-lg font-semibold"
                    >
                      <Plus size={11} />{t('expert_copy_portfolio')}
                    </button>
                  </div>
                );
              })}

              <RebalancingPicker
                label={t('rb_label')}
                options={[
                  { label: t('rb_monthly'), value: 1 },
                  { label: t('rb_quarterly'), value: 3 },
                  { label: t('rb_yearly'), value: 12 },
                  { label: t('rb_custom'), value: 'custom' },
                ]}
                value={rbOption}
                onChange={v => setRbOption(v as RbOption)}
                customVal={rbCustom}
                onCustomChange={setRbCustom}
                monthsUnit={t('rb_months_unit')}
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
                {portfolioSlots.length > 1 ? `${portfolioSlots.length}${t('run_backtest_multi')}` : t('run_backtest')}
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
            {t('parse_dialog_title')}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-muted-foreground">
              {t('parse_dialog_desc')}
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
                    <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">{t('parse_unknown_ticker')}</span>
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
            {t('parse_unknown_warning')}
          </p>
        )}

        <div className="flex gap-2 mt-2">
          <Button variant="outline" className="flex-1" onClick={() => setParseConfirm(null)}>
            {t('parse_cancel')}
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
            {t('parse_apply')}
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
            {t('short_history_title')}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-muted-foreground mt-1">
              <p>{t('short_history_desc')}</p>
              <ul className="mt-2 space-y-1">
                {shortHistoryWarning?.shortAssets.map(a => (
                  <li key={a.ticker} className="flex justify-between font-mono text-xs bg-muted rounded px-2 py-1">
                    <span className="font-semibold">{a.ticker}</span>
                    <span className="text-muted-foreground">{t('short_history_listed')} {a.launch_year}{t('short_history_year')}</span>
                  </li>
                ))}
              </ul>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 mt-2">
          <Button variant="outline" className="flex-1" onClick={() => setShortHistoryWarning(null)}>
            {t('short_history_cancel')}
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
            {t('short_history_proceed')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
