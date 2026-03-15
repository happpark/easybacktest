"use client";

import React, { useState } from 'react';
import { AssetInputScreen } from '@/components/screens/AssetInputScreen';
import { ResultScreen } from '@/components/screens/ResultScreen';
import { CommunityScreen } from '@/components/screens/CommunityScreen';
import { MyPortfoliosScreen } from '@/components/screens/MyPortfoliosScreen';
import { LayoutDashboard, Users, PlusCircle, Bookmark } from 'lucide-react';

type Screen = 'input' | 'result' | 'community' | 'mine';

export interface Asset {
  ticker: string;
  weight: number;
  launch_year?: string;
}

export default function AlphaFlowApp() {
  const [activeScreen, setActiveScreen] = useState<Screen>('input');
  const [portfolioData, setPortfolioData] = useState<Asset[] | null>(null);
  const [preloadedAssets, setPreloadedAssets] = useState<Asset[] | null>(null);

  const handleBacktest = (data: Asset[]) => {
    setPortfolioData(data);
    setActiveScreen('result');
  };

  const handleLoadPortfolio = (assets: Asset[]) => {
    setPreloadedAssets(assets);
    setActiveScreen('input');
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case 'input':
        return (
          <AssetInputScreen
            onBacktest={handleBacktest}
            preloadedAssets={preloadedAssets}
            onPreloadConsumed={() => setPreloadedAssets(null)}
          />
        );
      case 'result':
        return <ResultScreen data={portfolioData!} onReset={() => setActiveScreen('input')} />;
      case 'community':
        return <CommunityScreen onLoadPortfolio={handleLoadPortfolio} />;
      case 'mine':
        return <MyPortfoliosScreen onLoad={handleLoadPortfolio} />;
      default:
        return <AssetInputScreen onBacktest={handleBacktest} />;
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto relative overflow-hidden bg-background font-body">
      <main className={`flex-1 overflow-y-auto ${activeScreen === 'input' ? 'pb-44' : 'pb-24'}`}>
        {renderScreen()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto glass-morphism h-20 px-6 flex items-center justify-between border-t border-white/10 z-50">
        <button
          onClick={() => setActiveScreen('input')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeScreen === 'input' ? 'text-primary' : 'text-muted-foreground'}`}
        >
          <PlusCircle size={22} />
          <span className="text-[10px] font-medium">구성</span>
        </button>
        <button
          onClick={() => setActiveScreen('result')}
          disabled={!portfolioData}
          className={`flex flex-col items-center gap-1 transition-colors ${activeScreen === 'result' ? 'text-primary' : 'text-muted-foreground'} ${!portfolioData ? 'opacity-30' : ''}`}
        >
          <LayoutDashboard size={22} />
          <span className="text-[10px] font-medium">분석</span>
        </button>
        <button
          onClick={() => setActiveScreen('mine')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeScreen === 'mine' ? 'text-primary' : 'text-muted-foreground'}`}
        >
          <Bookmark size={22} />
          <span className="text-[10px] font-medium">내 기록</span>
        </button>
        <button
          onClick={() => setActiveScreen('community')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeScreen === 'community' ? 'text-primary' : 'text-muted-foreground'}`}
        >
          <Users size={22} />
          <span className="text-[10px] font-medium">커뮤니티</span>
        </button>
      </nav>
    </div>
  );
}
