"use client";

import React, { useState, useEffect } from 'react';
import { Bookmark, Trash2, TrendingUp, GitCompare, X, Pencil, Check, ChevronUp, Share2, Loader2 } from 'lucide-react';
import { RadarChart } from '@/components/RadarChart';
import { useMyPortfolios, type SavedPortfolio } from '@/lib/useMyPortfolios';
import { buildRadar } from '@/lib/radar';
import { useLang } from '@/lib/i18n';
import { shareToCommunity, deleteFromCommunity, getMySharedPortfolios, type CommunityPortfolioRow } from '@/lib/supabase/community';
import { track } from '@/lib/posthog/events';
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

// ── Share modal ────────────────────────────────────────────────────────────────
function ShareModal({ portfolio, userId, sharedId, onClose, onShared, onUnshared }: {
  portfolio: SavedPortfolio;
  userId: string;
  sharedId: string | null;
  onClose: () => void;
  onShared: (row: CommunityPortfolioRow) => void;
  onUnshared: () => void;
}) {
  const { t } = useLang();
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    if (!nickname.trim()) return;
    setLoading(true);
    const row = await shareToCommunity(userId, portfolio.name, nickname.trim(), portfolio.assets, portfolio.result);
    setLoading(false);
    if (row) { track.communityShared(); onShared(row); onClose(); }
  };

  const handleUnshare = async () => {
    if (!sharedId) return;
    setLoading(true);
    await deleteFromCommunity(sharedId);
    setLoading(false);
    track.communityUnshared();
    onUnshared();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-popover border border-border rounded-2xl p-6 w-[min(320px,calc(100vw-2rem))] flex flex-col gap-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base">{t('share_modal_title')}</h3>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>

        {sharedId ? (
          <>
            <p className="text-sm text-muted-foreground">{t('share_done')} — 커뮤니티에서 볼 수 있어요.</p>
            <button
              onClick={handleUnshare}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive text-sm font-bold border border-destructive/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              {t('share_unshare')}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{t('share_modal_desc')}</p>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">{t('share_nickname_label')}</label>
              <input
                autoFocus
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleShare(); if (e.key === 'Escape') onClose(); }}
                placeholder={t('share_nickname_placeholder')}
                className="w-full px-3 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:border-primary/50 outline-none text-sm text-foreground placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-semibold text-muted-foreground border border-white/10 transition-all">
                {t('share_cancel')}
              </button>
              <button
                onClick={handleShare}
                disabled={loading || !nickname.trim()}
                className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                {loading ? t('share_loading') : t('share_confirm')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Portfolio card ─────────────────────────────────────────────────────────────
function PortfolioCard({
  portfolio, compareMode, selected, userId, sharedId,
  onToggleSelect, onLoad, onRename, onDelete, onShared, onUnshared,
}: {
  portfolio: SavedPortfolio;
  compareMode: boolean;
  selected: boolean;
  userId?: string | null;
  sharedId: string | null;
  onToggleSelect: () => void;
  onLoad: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onShared: (row: CommunityPortfolioRow) => void;
  onUnshared: () => void;
}) {
  const { t } = useLang();
  const [renaming, setRenaming] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
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
            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{t('my_metric_cagr')}</div>
          </div>
        </div>
      </div>

      {/* ── Metrics bar ── */}
      <div className="px-5 pb-4 flex items-center gap-3">
        {/* MDD */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{t('my_metric_mdd')}</span>
          <span className="text-sm font-bold font-mono text-[#F25B5B]">{m.mdd}%</span>
        </div>
        <div className="w-px h-6 bg-white/10" />
        {/* Sharpe */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{t('my_metric_sharpe')}</span>
          <span className="text-sm font-bold font-mono text-primary">{m.sharpe}</span>
        </div>
        <div className="w-px h-6 bg-white/10" />
        {/* Volatility */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">VOL</span>
          <span className="text-sm font-bold font-mono text-foreground/70">{m.volatility}%</span>
        </div>
        {m.dividend > 0 && (
          <>
            <div className="w-px h-6 bg-white/10" />
            {/* Dividend */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">DIV</span>
              <span className="text-sm font-bold font-mono text-[#F5A623]">{m.dividend}%</span>
            </div>
          </>
        )}

        {/* Spacer + date + actions */}
        <div className="flex-1" />
        {!compareMode && !renaming && (
          <div className="flex items-center gap-0.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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
      </div>

      {/* ── Period + actions ── */}
      {!compareMode && (
        <div className="border-t border-white/5 px-5 py-3 flex items-center gap-2">
          <span className="text-xs text-muted-foreground/50 flex-1">{portfolio.result.period}</span>
          {userId && (
            <button
              onClick={e => { e.stopPropagation(); setShowShareModal(true); }}
              className={cn(
                "flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-all",
                sharedId
                  ? "text-[#7AE9AB] bg-[#7AE9AB]/10 border-[#7AE9AB]/30"
                  : "text-muted-foreground bg-white/5 border-white/10 hover:text-foreground hover:border-white/20"
              )}
            >
              <Share2 size={11} />
              {sharedId ? t('share_done') : t('share_button')}
            </button>
          )}
          <button
            onClick={e => { e.stopPropagation(); onLoad(); }}
            className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 px-3 py-2 rounded-xl transition-all"
          >
            <TrendingUp size={11} />
            {t('my_reanalyze')}
          </button>
        </div>
      )}

      {showShareModal && userId && (
        <ShareModal
          portfolio={portfolio}
          userId={userId}
          sharedId={sharedId}
          onClose={() => setShowShareModal(false)}
          onShared={onShared}
          onUnshared={onUnshared}
        />
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
    { label: t('my_metric_cagr'), key: 'cagr' as const, unit: '%', higherBetter: true },
    { label: t('my_metric_mdd'), key: 'mdd' as const, unit: '%', higherBetter: true },
    { label: t('result_volatility'), key: 'volatility' as const, unit: '%', higherBetter: false },
    { label: t('my_metric_sharpe'), key: 'sharpe' as const, unit: '', higherBetter: true },
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
      <div className="glass-morphism rounded-2xl border border-white/5 overflow-x-auto">
        <table className="w-full min-w-[360px]">
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

  // portfolioId → communityId (for tracking which are shared)
  const [sharedMap, setSharedMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!userId) return;
    getMySharedPortfolios(userId).then(rows => {
      // Match by name (simple heuristic)
      const map = new Map<string, string>();
      for (const row of rows) {
        const match = portfolios.find(p => p.name === row.name);
        if (match) map.set(match.id, row.id);
      }
      setSharedMap(map);
    });
  }, [userId, portfolios]);

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
                userId={userId}
                sharedId={sharedMap.get(p.id) ?? null}
                onToggleSelect={() => toggleSelect(p.id)}
                onLoad={() => onLoad(p.assets)}
                onRename={name => rename(p.id, name)}
                onDelete={() => remove(p.id)}
                onShared={row => setSharedMap(prev => new Map(prev).set(p.id, row.id))}
                onUnshared={() => setSharedMap(prev => { const m = new Map(prev); m.delete(p.id); return m; })}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
