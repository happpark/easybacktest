"use client";

import React, { useState } from 'react';
import { Bookmark, Trash2, TrendingUp, GitCompare, X, Pencil, Check, ChevronUp } from 'lucide-react';
import { RadarChart } from '@/components/RadarChart';
import { useMyPortfolios, type SavedPortfolio } from '@/lib/useMyPortfolios';
import { buildRadar } from '@/lib/radar';
import { useLang } from '@/lib/i18n';
import type { Asset } from '@/app/page';
import { cn } from '@/lib/utils';

interface MyPortfoliosScreenProps {
  onLoad: (assets: Asset[]) => void;
  userId?: string | null;
}

// ── Rename input ───────────────────────────────────────────────────────────────
function RenameInput({ initial, onCommit, onCancel }: { initial: string; onCommit: (v: string) => void; onCancel: () => void }) {
  const [val, setVal] = useState(initial);
  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      <input
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') onCommit(val.trim() || initial);
          if (e.key === 'Escape') onCancel();
        }}
        className="flex-1 font-bold text-base bg-transparent border-b-2 border-primary/60 outline-none text-foreground min-w-0 pb-0.5"
      />
      <button onClick={() => onCommit(val.trim() || initial)} className="p-1.5 text-primary hover:text-primary/80 transition-colors">
        <Check size={15} />
      </button>
      <button onClick={onCancel} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
        <X size={15} />
      </button>
    </div>
  );
}

// ── Portfolio card ─────────────────────────────────────────────────────────────
function PortfolioCard({
  portfolio, compareMode, selected,
  onToggleSelect, onLoad, onRename, onDelete,
}: {
  portfolio: SavedPortfolio;
  compareMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onLoad: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const { t } = useLang();
  const [renaming, setRenaming] = useState(false);
  const m = portfolio.result.metrics;

  const cagrPositive = m.cagr >= 0;
  const date = new Date(portfolio.savedAt).toLocaleDateString('en-US', { year: '2-digit', month: 'short', day: 'numeric' });

  return (
    <div
      onClick={compareMode ? onToggleSelect : undefined}
      className={cn(
        "glass-morphism rounded-2xl border transition-all duration-200 overflow-hidden group",
        selected ? "border-primary/60 bg-primary/5 shadow-lg shadow-primary/10" : "border-white/8 hover:border-white/15",
        compareMode && "cursor-pointer"
      )}
    >
      {/* ── Top section ── */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">

          {/* Left: name + chips */}
          <div className="flex flex-col gap-2.5 flex-1 min-w-0">
            {/* Name row */}
            <div className="flex items-center gap-2 min-w-0">
              {compareMode && (
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 shrink-0 transition-all",
                  selected ? "bg-primary border-primary" : "border-white/30"
                )} />
              )}
              {renaming ? (
                <RenameInput
                  initial={portfolio.name}
                  onCommit={name => { onRename(name); setRenaming(false); }}
                  onCancel={() => setRenaming(false)}
                />
              ) : (
                <span className="font-bold text-base leading-snug truncate">{portfolio.name}</span>
              )}
            </div>

            {/* Asset chips */}
            <div className="flex flex-wrap gap-1.5">
              {portfolio.assets.map(a => (
                <span
                  key={a.ticker}
                  className="text-xs font-bold bg-white/5 text-foreground/80 border border-white/10 px-2.5 py-1 rounded-lg tracking-wide"
                >
                  {a.ticker}
                  <span className="text-muted-foreground font-medium ml-1">{Math.round(a.weight)}%</span>
                </span>
              ))}
            </div>
          </div>

          {/* Right: hero CAGR */}
          <div className="flex flex-col items-end shrink-0 gap-1">
            <div className={cn(
              "text-3xl font-black font-mono tabular-nums leading-none",
              cagrPositive ? "text-[#7AE9AB]" : "text-[#F25B5B]"
            )}>
              {cagrPositive ? '+' : ''}{m.cagr}%
            </div>
            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">CAGR</div>
          </div>
        </div>
      </div>

      {/* ── Metrics bar ── */}
      <div className="px-5 pb-4 flex items-center gap-3">
        {/* MDD */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">MDD</span>
          <span className="text-sm font-bold font-mono text-[#F25B5B]">{m.mdd}%</span>
        </div>
        <div className="w-px h-6 bg-white/10" />
        {/* Sharpe */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Sharpe</span>
          <span className="text-sm font-bold font-mono text-primary">{m.sharpe}</span>
        </div>
        <div className="w-px h-6 bg-white/10" />
        {/* Volatility */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">VOL</span>
          <span className="text-sm font-bold font-mono text-foreground/70">{m.volatility}%</span>
        </div>

        {/* Spacer + date + actions */}
        <div className="flex-1" />
        {!compareMode && !renaming && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-xs text-muted-foreground/60 mr-1.5">{date}</span>
            <button
              onClick={e => { e.stopPropagation(); setRenaming(true); }}
              className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-all"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-all"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
        {/* Always show date on mobile (no hover) */}
        {!compareMode && !renaming && (
          <span className="text-xs text-muted-foreground/50 md:hidden">{date}</span>
        )}
      </div>

      {/* ── Period + load button ── */}
      {!compareMode && (
        <div className="border-t border-white/5 px-5 py-3 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground/50">{portfolio.result.period}</span>
          <button
            onClick={e => { e.stopPropagation(); onLoad(); }}
            className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 px-4 py-2 rounded-xl transition-all"
          >
            <TrendingUp size={12} />
            {t('my_reanalyze')}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Compare view ───────────────────────────────────────────────────────────────
function CompareView({ portfolios, onClose }: { portfolios: SavedPortfolio[]; onClose: () => void }) {
  const { t } = useLang();
  const COLORS = ['hsl(212, 73%, 55%)', '#7AE9AB', '#F5A623'];
  const labels = ['A', 'B', 'C'];

  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const toggleHidden = (i: number) =>
    setHidden(prev => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next; });

  const perPortfolioRadar = portfolios.map(p => buildRadar(p.result.metrics));
  const subjects = perPortfolioRadar[0].map(r => r.subject);
  const mergedRadar = subjects.map(subject => {
    const entry: Record<string, number | string> = { subject, fullMark: 100 };
    perPortfolioRadar.forEach((radar, i) => { entry[labels[i]] = radar.find(x => x.subject === subject)?.A ?? 0; });
    return entry;
  });

  const series = portfolios.map((_, i) => ({ key: labels[i], color: COLORS[i], hidden: hidden.has(i) }));

  const metrics = [
    { label: 'CAGR', key: 'cagr' as const, unit: '%', higherBetter: true },
    { label: 'MDD', key: 'mdd' as const, unit: '%', higherBetter: true },
    { label: t('result_volatility'), key: 'volatility' as const, unit: '%', higherBetter: false },
    { label: 'Sharpe', key: 'sharpe' as const, unit: '', higherBetter: true },
    { label: t('result_dividend'), key: 'dividend' as const, unit: '%', higherBetter: true },
  ];

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">{t('compare_title')}</h3>
        <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
          <X size={18} />
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {portfolios.map((p, i) => (
          <button
            key={p.id}
            onClick={() => toggleHidden(i)}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-semibold transition-all duration-200",
              hidden.has(i)
                ? "bg-white/5 border-white/10 text-muted-foreground/40 line-through"
                : "border-white/20 text-foreground"
            )}
            style={hidden.has(i) ? {} : { borderColor: `${COLORS[i]}50`, background: `${COLORS[i]}15` }}
          >
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i], opacity: hidden.has(i) ? 0.2 : 1 }} />
            <span className="truncate max-w-[100px]">{p.name}</span>
          </button>
        ))}
      </div>

      {/* Radar */}
      <div className="glass-morphism rounded-2xl border border-white/5 p-5">
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-3">{t('compare_radar_label')}</p>
        <div className="h-60">
          <RadarChart data={mergedRadar} series={series} />
        </div>
      </div>

      {/* Metrics table */}
      <div className="glass-morphism rounded-2xl border border-white/5 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">{t('compare_metric_col')}</th>
              {portfolios.map((p, i) => (
                <th key={p.id} className="text-right px-4 py-3 font-bold text-sm" style={{ color: COLORS[i] }}>
                  {labels[i]}. <span className="text-xs font-medium opacity-70 truncate">{p.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((row, ri) => {
              const vals = portfolios.map(p => p.result.metrics[row.key]);
              const best = row.higherBetter ? Math.max(...vals) : Math.min(...vals);
              return (
                <tr key={row.key} className={cn("transition-colors hover:bg-white/3", ri < metrics.length - 1 && "border-b border-white/5")}>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground font-medium">{row.label}</td>
                  {vals.map((v, i) => (
                    <td key={i} className="text-right px-4 py-3.5">
                      <span className={cn(
                        "font-mono font-bold text-sm inline-flex items-center justify-end gap-1",
                        v === best ? "text-[#7AE9AB]" : "text-muted-foreground/70"
                      )}>
                        {v === best && <ChevronUp size={11} className="text-[#7AE9AB]" />}
                        {v}{row.unit}
                      </span>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
export function MyPortfoliosScreen({ onLoad, userId }: MyPortfoliosScreenProps) {
  const { t } = useLang();
  const { portfolios, rename, remove, dbLoading } = useMyPortfolios(userId);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev);

  const selectedPortfolios = selectedIds.map(id => portfolios.find(p => p.id === id)!).filter(Boolean);

  const exitCompare = () => { setCompareMode(false); setSelectedIds([]); setShowCompare(false); };

  // ── Loading skeleton ──
  if (dbLoading) {
    return (
      <div className="p-6 md:p-8 flex flex-col gap-4 animate-fade-in">
        <div className="h-7 w-44 rounded-xl bg-white/10 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-morphism rounded-2xl border border-white/5 p-5 flex flex-col gap-4">
              <div className="flex justify-between">
                <div className="flex flex-col gap-2 flex-1">
                  <div className="h-4 w-32 rounded-lg bg-white/10 animate-pulse" />
                  <div className="flex gap-1.5">
                    <div className="h-7 w-16 rounded-lg bg-white/8 animate-pulse" />
                    <div className="h-7 w-14 rounded-lg bg-white/8 animate-pulse" />
                    <div className="h-7 w-16 rounded-lg bg-white/8 animate-pulse" />
                  </div>
                </div>
                <div className="h-9 w-16 rounded-lg bg-white/8 animate-pulse" />
              </div>
              <div className="flex gap-4">
                <div className="h-5 w-20 rounded-lg bg-white/5 animate-pulse" />
                <div className="h-5 w-20 rounded-lg bg-white/5 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Empty state ──
  if (portfolios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-[calc(100vh-7rem)] text-center px-6 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Bookmark size={28} className="text-muted-foreground/30" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h3 className="font-bold text-base">{t('my_empty_title')}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-[260px]">
            {t('my_empty_desc').split('\n')[0]}<br />
            <span className="text-primary font-semibold">{t('my_empty_save_hint')}</span>{' '}
            {t('my_empty_desc').split('\n')[1]}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6 animate-fade-in pb-8">

      {showCompare && selectedPortfolios.length >= 2 ? (
        <CompareView portfolios={selectedPortfolios} onClose={exitCompare} />
      ) : (
        <>
          {/* ── Header ── */}
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2.5">
              <h2 className="text-xl font-bold">{t('my_title')}</h2>
              <span className="text-sm text-muted-foreground font-medium">{portfolios.length}{t('my_count_suffix')}</span>
            </div>
            <button
              onClick={() => compareMode ? exitCompare() : setCompareMode(true)}
              className={cn(
                "flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all border",
                compareMode
                  ? "bg-primary/20 text-primary border-primary/40"
                  : "bg-white/5 text-muted-foreground border-white/10 hover:text-foreground hover:border-white/20"
              )}
            >
              <GitCompare size={14} />
              {compareMode ? t('my_cancel') : t('my_compare')}
            </button>
          </div>

          {/* ── Compare banner ── */}
          {compareMode && (
            <div className={cn(
              "flex items-center justify-between px-4 py-3 rounded-xl border transition-all",
              selectedIds.length >= 2 ? "bg-primary/10 border-primary/30" : "bg-white/5 border-white/10"
            )}>
              <span className="text-sm text-muted-foreground">
                {selectedIds.length === 0
                  ? t('my_select_hint')
                  : `${selectedIds.length}${t('my_selected_count')}`}
              </span>
              {selectedIds.length >= 2 && (
                <button
                  onClick={() => setShowCompare(true)}
                  className="text-sm font-bold text-primary bg-primary/20 hover:bg-primary/30 px-4 py-1.5 rounded-lg transition-colors"
                >
                  {t('my_compare_button')}
                </button>
              )}
            </div>
          )}

          {/* ── Portfolio grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {portfolios.map(p => (
              <PortfolioCard
                key={p.id}
                portfolio={p}
                compareMode={compareMode}
                selected={selectedIds.includes(p.id)}
                onToggleSelect={() => toggleSelect(p.id)}
                onLoad={() => onLoad(p.assets)}
                onRename={name => rename(p.id, name)}
                onDelete={() => remove(p.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
