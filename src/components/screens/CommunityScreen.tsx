"use client";

import React, { useState, useEffect } from 'react';
import { ChevronDown, Download, Bookmark, BookmarkCheck, Loader2, Users } from 'lucide-react';
import { RadarChart } from '@/components/RadarChart';
import { useLang } from '@/lib/i18n';
import { getCommunityPortfolios, type CommunityPortfolioRow } from '@/lib/supabase/community';
import { useMyPortfolios } from '@/lib/useMyPortfolios';
import { useAuth } from '@/hooks/useAuth';
import { track } from '@/lib/posthog/events';
import type { Asset } from '@/app/page';
import { cn } from '@/lib/utils';

// ── Hardcoded preset portfolios ────────────────────────────────────────────────
const PRESET_PORTFOLIOS = [
  {
    id: 'preset-1',
    titleKey: 'cp_growth_allweather',
    author: 'KimAlpha',
    assets: [
      { ticker: 'VTI', weight: 40 },
      { ticker: 'TLT', weight: 20 },
      { ticker: 'GLD', weight: 20 },
      { ticker: 'BTC-USD', weight: 20 },
    ],
    radar: [
      { subject: 'Attack', A: 70, fullMark: 100 },
      { subject: 'Defense', A: 85, fullMark: 100 },
      { subject: 'Volatility', A: 30, fullMark: 100 },
      { subject: 'Sharpe', A: 90, fullMark: 100 },
      { subject: 'Dividend', A: 20, fullMark: 100 },
    ],
  },
  {
    id: 'preset-2',
    titleKey: 'cp_nasdaq_aggressive',
    author: 'LeeQuant',
    assets: [
      { ticker: 'TQQQ', weight: 60 },
      { ticker: 'SOXL', weight: 40 },
    ],
    radar: [
      { subject: 'Attack', A: 100, fullMark: 100 },
      { subject: 'Defense', A: 10, fullMark: 100 },
      { subject: 'Volatility', A: 95, fullMark: 100 },
      { subject: 'Sharpe', A: 60, fullMark: 100 },
      { subject: 'Dividend', A: 5, fullMark: 100 },
    ],
  },
  {
    id: 'preset-3',
    titleKey: 'cp_dividend_stable',
    author: 'ParkDividend',
    assets: [
      { ticker: 'SCHD', weight: 50 },
      { ticker: 'O', weight: 30 },
      { ticker: 'JEPI', weight: 20 },
    ],
    radar: [
      { subject: 'Attack', A: 40, fullMark: 100 },
      { subject: 'Defense', A: 80, fullMark: 100 },
      { subject: 'Volatility', A: 20, fullMark: 100 },
      { subject: 'Sharpe', A: 85, fullMark: 100 },
      { subject: 'Dividend', A: 95, fullMark: 100 },
    ],
  },
  {
    id: 'preset-4',
    titleKey: 'cp_crypto_maxi',
    author: 'ChainMaster',
    assets: [
      { ticker: 'BTC-USD', weight: 70 },
      { ticker: 'ETH-USD', weight: 30 },
    ],
    radar: [
      { subject: 'Attack', A: 95, fullMark: 100 },
      { subject: 'Defense', A: 20, fullMark: 100 },
      { subject: 'Volatility', A: 100, fullMark: 100 },
      { subject: 'Sharpe', A: 50, fullMark: 100 },
      { subject: 'Dividend', A: 0, fullMark: 100 },
    ],
  },
];

interface CommunityScreenProps {
  onLoadPortfolio: (assets: Asset[]) => void;
}

// ── Community card (user-shared) ───────────────────────────────────────────────
function SharedCard({
  row,
  onLoad,
  onSaveToMine,
  isSaved,
  isSaving,
}: {
  row: CommunityPortfolioRow;
  onLoad: () => void;
  onSaveToMine: () => void;
  isSaved: boolean;
  isSaving: boolean;
}) {
  const { t } = useLang();
  const m = row.result.metrics;
  const cagrPositive = m.cagr >= 0;
  const date = new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });

  return (
    <div className="glass-morphism rounded-2xl border border-white/8 hover:border-white/15 transition-all overflow-hidden group flex flex-col">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <span className="font-bold text-base leading-snug truncate">{row.name}</span>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-medium">@{row.nickname}</span>
            <span className="opacity-40">·</span>
            <span>{date}</span>
          </div>
          {/* Asset chips */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {row.assets.map(a => (
              <span key={a.ticker} className="text-xs font-bold bg-white/5 text-foreground/80 border border-white/10 px-2.5 py-1 rounded-lg">
                {a.ticker} <span className="text-muted-foreground font-medium">{Math.round(a.weight)}%</span>
              </span>
            ))}
          </div>
        </div>
        {/* Hero CAGR */}
        <div className="flex flex-col items-end shrink-0">
          <div className={cn("text-2xl font-black font-mono tabular-nums", cagrPositive ? "text-[#7AE9AB]" : "text-[#F25B5B]")}>
            {cagrPositive ? '+' : ''}{m.cagr}%
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('my_metric_cagr')}</div>
        </div>
      </div>

      {/* Metrics */}
      <div className="px-5 pb-4 flex items-center gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{t('my_metric_mdd')}</span>
          <span className="text-sm font-bold font-mono text-[#F25B5B]">{m.mdd}%</span>
        </div>
        <div className="w-px h-5 bg-white/10" />
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{t('my_metric_sharpe')}</span>
          <span className="text-sm font-bold font-mono text-primary">{m.sharpe}</span>
        </div>
        <div className="w-px h-5 bg-white/10" />
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">VOL</span>
          <span className="text-sm font-bold font-mono text-foreground/70">{m.volatility}%</span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-auto border-t border-white/5 px-5 py-3 flex items-center gap-2">
        <span className="text-xs text-muted-foreground/50 flex-1">{row.result.period}</span>
        <button
          onClick={onSaveToMine}
          disabled={isSaved || isSaving}
          className={cn(
            "flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-all",
            isSaved
              ? "text-[#7AE9AB] bg-[#7AE9AB]/10 border-[#7AE9AB]/30 cursor-default"
              : "text-muted-foreground bg-white/5 border-white/10 hover:text-foreground hover:border-white/20"
          )}
        >
          {isSaving ? <Loader2 size={11} className="animate-spin" /> : isSaved ? <BookmarkCheck size={11} /> : <Bookmark size={11} />}
          {isSaved ? t('community_saved') : t('community_save_mine')}
        </button>
        <button
          onClick={onLoad}
          className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 px-3 py-2 rounded-xl transition-all"
        >
          <Download size={11} />
          {t('community_load_button')}
        </button>
      </div>
    </div>
  );
}

// ── Preset card ────────────────────────────────────────────────────────────────
function PresetCard({
  p,
  onLoad,
}: {
  p: typeof PRESET_PORTFOLIOS[0];
  onLoad: () => void;
}) {
  const { t } = useLang();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn(
      "glass-morphism rounded-2xl p-5 flex flex-col gap-3 transition-all border group cursor-pointer",
      expanded ? "border-primary/30 bg-primary/5" : "border-white/5 hover:border-primary/20 hover:bg-primary/3"
    )}>
      <div className="flex justify-between items-start" onClick={() => setExpanded(v => !v)}>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold">{t(p.titleKey as Parameters<typeof t>[0])}</span>
          <span className="text-xs text-muted-foreground">@{p.author}</span>
        </div>
        <ChevronDown size={15} className={cn("text-muted-foreground transition-transform duration-200 shrink-0", expanded && "rotate-180")} />
      </div>

      <div className={cn("w-full transition-all duration-300", expanded ? "h-44" : "h-24 group-hover:h-32")}>
        <RadarChart data={p.radar} mini={!expanded} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {p.assets.map(a => (
          <div key={a.ticker} className="bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20 flex items-center gap-1.5">
            <span className="text-xs font-bold">{a.ticker}</span>
            <span className="text-xs text-primary">{a.weight}%</span>
          </div>
        ))}
      </div>

      <button
        onClick={e => { e.stopPropagation(); onLoad(); }}
        className={cn(
          "w-full h-10 bg-primary/20 hover:bg-primary/30 text-primary text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2",
          expanded ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      >
        <Download size={13} />
        {t('community_load_button')}
      </button>
    </div>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
export function CommunityScreen({ onLoadPortfolio }: CommunityScreenProps) {
  const { t } = useLang();
  const { user } = useAuth();
  const { save: saveToMine, portfolios: myPortfolios } = useMyPortfolios(user?.id);

  const [sharedRows, setSharedRows] = useState<CommunityPortfolioRow[]>([]);
  const [loadingShared, setLoadingShared] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    setLoadingShared(true);
    getCommunityPortfolios()
      .then(rows => setSharedRows(rows))
      .finally(() => setLoadingShared(false));
  }, []);

  const handleLoad = (assets: { ticker: string; weight: number }[]) => {
    const mapped: Asset[] = assets.map(a => ({ ticker: a.ticker, weight: a.weight, launch_year: 'Unknown' }));
    onLoadPortfolio(mapped);
  };

  const handleSaveToMine = async (row: CommunityPortfolioRow) => {
    if (!user) return;
    setSavingId(row.id);
    await saveToMine(row.name, row.assets, row.result);
    track.communitySavedToMine();
    setSavedIds(prev => new Set(prev).add(row.id));
    setSavingId(null);
  };

  // Check if already saved (by name match)
  const isAlreadySaved = (name: string) => myPortfolios.some(p => p.name === name);

  return (
    <div className="p-6 md:p-8 flex flex-col gap-8 animate-fade-in pb-8">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-bold">{t('community_title')}</h2>
        <p className="text-sm text-muted-foreground">{t('community_subtitle')}</p>
      </header>

      {/* ── User-shared section ── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t('community_user_section')}</h3>
          {!loadingShared && (
            <span className="text-xs text-muted-foreground/60 ml-1">{sharedRows.length}</span>
          )}
        </div>

        {loadingShared ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map(i => (
              <div key={i} className="glass-morphism rounded-2xl border border-white/5 p-5 flex flex-col gap-4">
                <div className="flex justify-between">
                  <div className="flex flex-col gap-2">
                    <div className="h-4 w-32 rounded-lg bg-white/10 animate-pulse" />
                    <div className="h-3 w-20 rounded-lg bg-white/5 animate-pulse" />
                  </div>
                  <div className="h-8 w-14 rounded-lg bg-white/8 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : sharedRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center glass-morphism rounded-2xl border border-white/5">
            <Users size={28} className="text-muted-foreground/20 mb-3" />
            <p className="text-sm font-semibold text-muted-foreground">아직 공유된 포트폴리오가 없어요</p>
            <p className="text-xs text-muted-foreground/60 mt-1">내 포트폴리오에서 첫 번째로 공유해보세요!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sharedRows.map(row => (
              <SharedCard
                key={row.id}
                row={row}
                onLoad={() => handleLoad(row.assets)}
                onSaveToMine={() => handleSaveToMine(row)}
                isSaved={savedIds.has(row.id) || isAlreadySaved(row.name)}
                isSaving={savingId === row.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Preset section ── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t('community_preset_section')}</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PRESET_PORTFOLIOS.map(p => (
            <PresetCard
              key={p.id}
              p={p}
              onLoad={() => handleLoad(p.assets)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
