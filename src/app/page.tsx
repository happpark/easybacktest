"use client";

import React, { useState, useEffect } from 'react';
import { AssetInputScreen } from '@/components/screens/AssetInputScreen';
import { ResultScreen } from '@/components/screens/ResultScreen';
import { CommunityScreen } from '@/components/screens/CommunityScreen';
import { MyPortfoliosScreen } from '@/components/screens/MyPortfoliosScreen';
import { AuthButton } from '@/components/AuthButton';
import { useAuth } from '@/hooks/useAuth';
import { useLang } from '@/lib/i18n';
import { track } from '@/lib/posthog/events';
import { LayoutDashboard, Users, PlusCircle, Bookmark, Sun, Moon, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type Screen = 'input' | 'result' | 'community' | 'mine';

export interface Asset {
  ticker: string;
  weight: number;
  launch_year?: string;
}

export interface PortfolioSlot {
  name: string;
  assets: Asset[];
}

export default function AlphaFlowApp() {
  const { user } = useAuth();
  const { lang, t, toggleLang } = useLang();
  const [activeScreen, setActiveScreen] = useState<Screen>('input');
  const [portfolioData, setPortfolioData] = useState<Asset[] | null>(null);
  const [preloadedAssets, setPreloadedAssets] = useState<Asset[] | null>(null);
  const [multiPortfolioData, setMultiPortfolioData] = useState<PortfolioSlot[] | null>(null);
  const [rebalancingMonths, setRebalancingMonths] = useState<number>(12);
  const [inputMode, setInputMode] = useState<'beginner' | 'expert'>('beginner');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (saved) { setTheme(saved); document.documentElement.classList.toggle('light', saved === 'light'); }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('light', next === 'light');
    localStorage.setItem('theme', next);
  };

  const handleBacktest = (data: Asset[], rb: number) => {
    setPortfolioData(data);
    setRebalancingMonths(rb);
    setMultiPortfolioData(null);
    setActiveScreen('result');
    track.backtestRun({ assetCount: data.length, mode: inputMode, source: 'manual' });
  };

  const handleMultiBacktest = (slots: PortfolioSlot[], rb: number) => {
    setMultiPortfolioData(slots);
    setRebalancingMonths(rb);
    setPortfolioData(null);
    setActiveScreen('result');
    track.backtestRun({ assetCount: slots.reduce((s, sl) => s + sl.assets.length, 0), mode: inputMode, source: 'manual' });
  };

  const handleLoadPortfolio = (assets: Asset[], source: 'community' | 'mine' = 'community') => {
    setPreloadedAssets(assets);
    setActiveScreen('input');
    track.portfolioLoaded(source);
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case 'input':
        return (
          <AssetInputScreen
            onBacktest={handleBacktest}
            preloadedAssets={preloadedAssets}
            onPreloadConsumed={() => setPreloadedAssets(null)}
            onMultiBacktest={handleMultiBacktest}
            mode={inputMode}
            onModeChange={setInputMode}
          />
        );
      case 'result':
        return <ResultScreen data={portfolioData} multiData={multiPortfolioData} rebalancingMonths={rebalancingMonths} onReset={() => setActiveScreen('input')} />;
      case 'community':
        return <CommunityScreen onLoadPortfolio={(assets) => handleLoadPortfolio(assets, 'community')} />;
      case 'mine':
        return <MyPortfoliosScreen onLoad={(assets) => handleLoadPortfolio(assets, 'mine')} userId={user?.id} />;
      default:
        return <AssetInputScreen onBacktest={handleBacktest} onMultiBacktest={handleMultiBacktest} mode={inputMode} onModeChange={setInputMode} />;
    }
  };

  const navItems = [
    { screen: 'input' as Screen, Icon: PlusCircle, label: t('nav_compose'), disabled: false },
    { screen: 'result' as Screen, Icon: LayoutDashboard, label: t('nav_analysis'), disabled: !portfolioData && !multiPortfolioData },
    { screen: 'mine' as Screen, Icon: Bookmark, label: t('nav_mine'), disabled: false },
    { screen: 'community' as Screen, Icon: Users, label: t('nav_community'), disabled: false },
  ];

  return (
    <div className="flex h-screen bg-background font-body overflow-hidden">

      {/* ── Desktop Sidebar (hidden on mobile) ── */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-white/10 glass-morphism h-full">
        <div className="px-6 py-8">
          <button onClick={() => setActiveScreen('input')} className="text-left">
            <h1 className="text-xl font-black text-primary text-glow hover:opacity-80 transition-opacity">Easybacktest</h1>
          </button>
          <p className="text-xs text-muted-foreground mt-1">{t('app_subtitle')}</p>
        </div>
        <nav className="flex flex-col gap-1 px-3 pb-6 flex-1">
          {navItems.map(({ screen, Icon, label, disabled }) => (
            <div key={screen} className="relative group">
              <button
                onClick={() => !disabled && setActiveScreen(screen)}
                disabled={disabled}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left relative",
                  activeScreen === screen
                    ? 'bg-primary/15 text-primary'
                    : disabled
                    ? 'text-muted-foreground/30 cursor-not-allowed'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                )}
              >
                {activeScreen === screen && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
                )}
                <Icon size={18} />
                {label}
              </button>
              {disabled && (
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 hidden group-hover:block">
                  <div className="bg-popover border border-border text-xs text-muted-foreground px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                    {t('nav_backtest_first')}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="px-4 pb-6 flex flex-col gap-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            {theme === 'dark' ? t('nav_light_mode') : t('nav_dark_mode')}
          </button>
        </div>
      </aside>

      {/* ── Content area ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* ── Top header bar (mobile + desktop) ── */}
        <div className="h-14 px-6 flex items-center justify-end gap-3 border-b border-white/10 shrink-0">
          {/* Language selector dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 border border-white/10 hover:border-white/20 transition-all">
              <span className="text-sm">{lang === 'ko' ? '한국어' : 'English'}</span>
              <ChevronDown size={13} className="opacity-60" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-32 bg-popover border border-border rounded-xl shadow-xl overflow-hidden z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
              {(['ko', 'en'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => lang !== l && toggleLang()}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left transition-colors",
                    lang === l
                      ? "text-primary font-semibold bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                >
                  <span>{l === 'ko' ? '🇰🇷' : '🇺🇸'}</span>
                  <span>{l === 'ko' ? '한국어' : 'English'}</span>
                </button>
              ))}
            </div>
          </div>
          <AuthButton />
        </div>

        {/* Scrollable main — sticky elements inside screens anchor to this */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-md mx-auto md:max-w-5xl md:mx-auto">
            {renderScreen()}
          </div>
        </main>

        {/* ── Mobile bottom nav — flex child (NOT fixed), so content never hides behind it ── */}
        <nav className="md:hidden shrink-0 glass-morphism h-16 px-4 flex items-center justify-between border-t border-white/10 z-50">
          {navItems.map(({ screen, Icon, label, disabled }) => (
            <button
              key={screen}
              onClick={() => !disabled && setActiveScreen(screen)}
              disabled={disabled}
              className={cn(
                "flex flex-col items-center gap-1 transition-colors",
                activeScreen === screen ? 'text-primary' : 'text-muted-foreground',
                disabled && 'opacity-30'
              )}
            >
              <Icon size={22} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
          <button
            onClick={toggleTheme}
            className="flex flex-col items-center gap-1 text-muted-foreground transition-colors"
          >
            {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
            <span className="text-[10px] font-medium">{theme === 'dark' ? t('nav_light') : t('nav_dark')}</span>
          </button>
        </nav>

      </div>
    </div>
  );
}
