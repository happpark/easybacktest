"use client";

import React, { useState } from 'react';
import { Bookmark, Trash2, TrendingUp, GitCompare, X, Pencil, Check, ChevronUp, ChevronDown } from 'lucide-react';
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

// ── Mini metric pill ──────────────────────────────────────────────────────────
function MetricPill({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl bg-white/5 border border-white/5 min-w-0">
      <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-wide">{label}</span>
      <span className={cn("text-xs font-mono font-black", color ?? 'text-foreground')}>{value}</span>
    </div>
  );
}

// ── Rename input ──────────────────────────────────────────────────────────────
function RenameInput({ initial, onCommit, onCancel }: { initial: string; onCommit: (v: string) => void; onCancel: () => void }) {
  const [val, setVal] = useState(initial);
  return (
    <div className="flex items-center gap-1 flex-1">
      <input
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') onCommit(val.trim() || initial);
          if (e.key === 'Escape') onCancel();
        }}
        className="flex-1 font-bold text-sm bg-transparent border-b border-primary/60 outline-none text-foreground min-w-0"
      />
      <button onClick={() => onCommit(val.trim() || initial)} className="p-1 text-primary"><Check size={14} /></button>
      <button onClick={onCancel} className="p-1 text-muted-foreground"><X size={14} /></button>
    </div>
  );
}

// ── Portfolio card ────────────────────────────────────────────────────────────
function PortfolioCard({
  portfolio,
  compareMode,
  selected,
  onToggleSelect,
  onLoad,
  onRename,
  onDelete,
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
  const [expanded, setExpanded] = useState(false);
  const m = portfolio.result.metrics;
  const radar = buildRadar(m); // always recomputed with latest thresholds
  const date = new Date(portfolio.savedAt).toLocaleDateString('en-US', { year: '2-digit', month: '2-digit', day: '2-digit' });

  return (
    <div
      className={cn(
        "glass-morphism rounded-2xl border transition-all duration-200",
        selected ? "border-primary/50 bg-primary/5" : "border-white/5",
        compareMode && "cursor-pointer"
      )}
      onClick={compareMode ? onToggleSelect : undefined}
    >
      {/* Card header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          {renaming ? (
            <RenameInput
              initial={portfolio.name}
              onCommit={name => { onRename(name); setRenaming(false); }}
              onCancel={() => setRenaming(false)}
            />
          ) : (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              {compareMode && (
                <div className={cn(
                  "w-4 h-4 rounded-full border-2 shrink-0 transition-all",
                  selected ? "bg-primary border-primary" : "border-white/30"
                )} />
              )}
              <span className="font-bold text-sm truncate">{portfolio.name}</span>
            </div>
          )}

          {!compareMode && !renaming && (
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-muted-foreground">{date}</span>
              <button onClick={() => setRenaming(true)} className="p-1 text-muted-foreground/40 hover:text-primary transition-colors">
                <Pencil size={12} />
              </button>
              <button onClick={onDelete} className="p-1 text-muted-foreground/40 hover:text-destructive transition-colors">
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Asset chips */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {portfolio.assets.map(a => (
            <span key={a.ticker} className="text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-lg">
              {a.ticker} <span className="text-primary/70">{a.weight}%</span>
            </span>
          ))}
        </div>
      </div>

      {/* Metrics + mini radar */}
      <div className="px-4 pb-3 flex items-center justify-between gap-3">
        <div className="flex gap-1.5 flex-wrap">
          <MetricPill label="CAGR" value={`${m.cagr}%`} color="text-[#7AE9AB]" />
          <MetricPill label="MDD" value={`${m.mdd}%`} color="text-[#F25B5B]" />
          <MetricPill label="Sharpe" value={`${m.sharpe}`} color="text-primary" />
        </div>
        <div className="w-16 h-16 shrink-0" onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}>
          <RadarChart data={radar} mini />
        </div>
      </div>

      {/* Period */}
      <div className="px-4 pb-2 flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground/60">{portfolio.result.period}</span>
        <button
          onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
          className="flex items-center gap-0.5 text-[9px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          {expanded ? t('my_collapse') : t('my_expand')}
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-white/5 pt-3 flex flex-col gap-3 animate-fade-in">
          <div className="w-full h-40">
            <RadarChart data={radar} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            {[
              { label: t('my_metric_cagr'), value: `${m.cagr}%` },
              { label: t('my_metric_mdd'), value: `${m.mdd}%` },
              { label: t('my_metric_volatility'), value: `${m.volatility}%` },
              { label: t('my_metric_sharpe'), value: `${m.sharpe}` },
              { label: t('my_metric_dividend'), value: `${m.dividend}%` },
              { label: t('my_metric_best_year'), value: `${m.best_year.year} (+${m.best_year.value}%)` },
            ].map(row => (
              <div key={row.label} className="flex justify-between bg-white/5 rounded-lg px-3 py-2">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-bold text-foreground">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Load button */}
      {!compareMode && (
        <div className="px-4 pb-4">
          <button
            onClick={onLoad}
            className="w-full h-9 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 border border-primary/20"
          >
            <TrendingUp size={12} />
            {t('my_reanalyze')}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Compare view ──────────────────────────────────────────────────────────────
function CompareView({ portfolios, onClose }: { portfolios: SavedPortfolio[]; onClose: () => void }) {
  const { t } = useLang();
  const COLORS = ['hsl(212, 73%, 55%)', '#7AE9AB', '#F5A623'];
  const labels = ['A', 'B', 'C'];

  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const toggleHidden = (i: number) =>
    setHidden(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  // Build merged radar — recompute from metrics so thresholds are always current
  const perPortfolioRadar = portfolios.map(p => buildRadar(p.result.metrics));
  const subjects = perPortfolioRadar[0].map(r => r.subject);
  const mergedRadar = subjects.map(subject => {
    const entry: Record<string, number | string> = { subject, fullMark: 100 };
    perPortfolioRadar.forEach((radar, i) => {
      entry[labels[i]] = radar.find(x => x.subject === subject)?.A ?? 0;
    });
    return entry;
  });

  const series = portfolios.map((_, i) => ({
    key: labels[i],
    color: COLORS[i],
    hidden: hidden.has(i),
  }));

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
        <h3 className="font-bold text-base">{t('compare_title')}</h3>
        <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Clickable legend */}
      <div className="flex flex-wrap gap-2">
        {portfolios.map((p, i) => {
          const isHidden = hidden.has(i);
          return (
            <button
              key={p.id}
              onClick={() => toggleHidden(i)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all duration-200",
                isHidden
                  ? "bg-white/5 border-white/10 text-muted-foreground/40 line-through"
                  : "border-white/20 text-foreground"
              )}
              style={isHidden ? {} : { borderColor: `${COLORS[i]}40`, background: `${COLORS[i]}15` }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0 transition-opacity"
                style={{ background: COLORS[i], opacity: isHidden ? 0.2 : 1 }}
              />
              <span className="truncate max-w-[90px]">{p.name}</span>
            </button>
          );
        })}
      </div>

      {/* Overlapping radar */}
      <div className="glass-morphism rounded-2xl border border-white/5 p-4">
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{t('compare_radar_label')}</span>
        <div className="h-56 mt-2">
          <RadarChart data={mergedRadar} series={series} />
        </div>
      </div>

      {/* Metrics table */}
      <div className="glass-morphism rounded-2xl border border-white/5 overflow-hidden">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="text-left px-4 py-2.5 font-bold text-muted-foreground text-[10px]">{t('compare_metric_col')}</th>
              {portfolios.map((p, i) => (
                <th key={p.id} className="text-right px-3 py-2.5 font-bold text-[10px]" style={{ color: COLORS[i] }}>
                  {labels[i]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((row, ri) => {
              const vals = portfolios.map(p => p.result.metrics[row.key]);
              const best = row.higherBetter ? Math.max(...vals) : Math.min(...vals);
              return (
                <tr key={row.key} className={ri < metrics.length - 1 ? 'border-b border-white/5' : ''}>
                  <td className="px-4 py-2.5 text-muted-foreground font-medium">{row.label}</td>
                  {vals.map((v, i) => (
                    <td key={i} className="text-right px-3 py-2.5">
                      <span className={cn(
                        "font-mono font-bold inline-flex items-center justify-end gap-0.5",
                        v === best ? "text-[#7AE9AB]" : "text-muted-foreground"
                      )}>
                        {v === best && <ChevronUp size={10} className="text-[#7AE9AB]" />}
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

// ── Main screen ───────────────────────────────────────────────────────────────
export function MyPortfoliosScreen({ onLoad, userId }: MyPortfoliosScreenProps) {
  const { t } = useLang();
  const { portfolios, rename, remove } = useMyPortfolios(userId);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const selectedPortfolios = selectedIds.map(id => portfolios.find(p => p.id === id)!).filter(Boolean);

  const exitCompare = () => {
    setCompareMode(false);
    setSelectedIds([]);
    setShowCompare(false);
  };

  if (portfolios.length === 0) {
    return (
      <div className="p-6 flex flex-col gap-4 animate-fade-in min-h-[60vh] items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Bookmark size={28} className="text-muted-foreground/40" />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="font-bold text-base">{t('my_empty_title')}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-[240px]">
            {t('my_empty_desc').split('\n')[0]}<br />
            <span className="text-primary font-semibold">{t('my_empty_save_hint')}</span>{' '}
            {t('my_empty_desc').split('\n')[1]}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-5 animate-fade-in pb-32">
      {showCompare && selectedPortfolios.length >= 2 ? (
        <CompareView portfolios={selectedPortfolios} onClose={exitCompare} />
      ) : (
        <>
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{t('my_title')}</h2>
              <p className="text-xs text-muted-foreground">{portfolios.length}{t('my_count_suffix')}</p>
            </div>
            <button
              onClick={() => compareMode ? exitCompare() : setCompareMode(true)}
              className={cn(
                "flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-colors border",
                compareMode
                  ? "bg-primary/20 text-primary border-primary/30"
                  : "bg-white/5 text-muted-foreground border-white/10 hover:border-primary/30 hover:text-primary"
              )}
            >
              <GitCompare size={13} />
              {compareMode ? t('my_cancel') : t('my_compare')}
            </button>
          </header>

          {compareMode && (
            <div className={cn(
              "flex items-center justify-between p-3 rounded-xl border transition-all",
              selectedIds.length >= 2 ? "bg-primary/10 border-primary/30" : "bg-white/5 border-white/10"
            )}>
              <span className="text-xs text-muted-foreground">
                {selectedIds.length === 0
                  ? t('my_select_hint')
                  : `${selectedIds.length}${t('my_selected_count')}`}
              </span>
              {selectedIds.length >= 2 && (
                <button
                  onClick={() => setShowCompare(true)}
                  className="text-xs font-bold text-primary bg-primary/20 px-3 py-1.5 rounded-lg hover:bg-primary/30 transition-colors"
                >
                  {t('my_compare_button')}
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col gap-4">
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
