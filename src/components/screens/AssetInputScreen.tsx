"use client";

import React, { useState } from 'react';
import { Search, Plus, Trash2, TrendingUp, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

const SUGGESTED_ASSETS = [
  { ticker: 'SPY', name: 'S&P 500 ETF' },
  { ticker: 'QQQ', name: 'Nasdaq 100' },
  { ticker: 'TLT', name: '20+ Yr Treasury' },
  { ticker: 'GLD', name: 'Gold Trust' },
  { ticker: 'VNQ', name: 'Real Estate' },
  { ticker: 'BTC', name: 'Bitcoin' },
];

export function AssetInputScreen({ onBacktest }: { onBacktest: (data: any) => void }) {
  const [selectedAssets, setSelectedAssets] = useState([
    { ticker: 'QQQ', weight: 40 },
    { ticker: 'GLD', weight: 30 },
    { ticker: 'TLT', weight: 30 },
  ]);
  const [searchQuery, setSearchQuery] = useState('');

  const updateWeight = (index: number, val: number[]) => {
    const newAssets = [...selectedAssets];
    newAssets[index].weight = val[0];
    setSelectedAssets(newAssets);
  };

  const removeAsset = (index: number) => {
    setSelectedAssets(selectedAssets.filter((_, i) => i !== index));
  };

  const addAsset = (asset: { ticker: string, name: string }) => {
    if (selectedAssets.find(a => a.ticker === asset.ticker)) return;
    setSelectedAssets([...selectedAssets, { ticker: asset.ticker, weight: 0 }]);
    setSearchQuery('');
  };

  const totalWeight = selectedAssets.reduce((acc, curr) => acc + curr.weight, 0);

  return (
    <div className="p-6 flex flex-col gap-8 animate-fade-in">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold font-headline tracking-tight text-glow">AlphaFlow</h1>
        <p className="text-muted-foreground text-sm">ETF 비중을 설정하고 퀀트 분석을 시작하세요.</p>
      </header>

      {/* Asset Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input 
          placeholder="ETF 티커 입력 (예: SPY, QQQ, TLT)" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
          className="pl-10 glass-morphism h-12 border-white/10"
        />
        {searchQuery && (
          <div className="absolute top-full left-0 right-0 mt-2 glass-morphism rounded-xl border border-white/10 z-10 overflow-hidden">
            {SUGGESTED_ASSETS.filter(a => a.ticker.includes(searchQuery)).map(a => (
              <button 
                key={a.ticker}
                onClick={() => addAsset(a)}
                className="w-full p-4 flex justify-between items-center hover:bg-white/5 text-left border-b border-white/5 last:border-0"
              >
                <div className="flex flex-col">
                  <span className="font-bold">{a.ticker}</span>
                  <span className="text-[10px] text-muted-foreground">{a.name}</span>
                </div>
                <Plus size={16} className="text-primary" />
              </button>
            ))}
            <button 
              onClick={() => addAsset({ ticker: searchQuery, name: 'Custom Asset' })}
              className="w-full p-4 flex justify-between items-center hover:bg-white/5 text-left bg-primary/5"
            >
              <span className="text-xs font-bold text-primary">"{searchQuery}" 추가하기</span>
              <Plus size={16} className="text-primary" />
            </button>
          </div>
        )}
      </div>

      {/* Asset List */}
      <section className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">포트폴리오 구성</h3>
          <span className="text-[10px] text-muted-foreground">{selectedAssets.length}개 자산</span>
        </div>
        <div className="flex flex-col gap-3">
          {selectedAssets.length === 0 ? (
            <div className="glass-morphism p-8 rounded-xl border-dashed border-white/10 flex flex-col items-center gap-2 text-muted-foreground">
              <AlertCircle size={24} />
              <span className="text-xs">자산을 추가해주세요.</span>
            </div>
          ) : selectedAssets.map((asset, index) => (
            <div key={asset.ticker} className="glass-morphism p-4 rounded-xl flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    {asset.ticker[0]}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold">{asset.ticker}</span>
                    <span className="text-[10px] text-muted-foreground">Asset Weight</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-secondary font-bold">{asset.weight}%</span>
                  <button onClick={() => removeAsset(index)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <Slider 
                value={[asset.weight]} 
                onValueChange={(val) => updateWeight(index, val)}
                max={100} 
                step={1}
                className="[&_.relative]:h-1.5"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Total Weight Indicator */}
      <div className={`p-4 rounded-xl flex justify-between items-center ${totalWeight === 100 ? 'bg-[#7AE9AB]/10 border-[#7AE9AB]/20' : 'bg-destructive/10 border-destructive/20'} border`}>
        <span className="text-xs font-medium uppercase">총 비중</span>
        <span className={`font-mono font-bold ${totalWeight === 100 ? 'text-[#7AE9AB]' : 'text-destructive'}`}>
          {totalWeight}% {totalWeight !== 100 && '(100%를 맞춰주세요)'}
        </span>
      </div>

      <Button 
        onClick={() => onBacktest(selectedAssets)}
        disabled={totalWeight !== 100}
        className="h-14 w-full bg-primary hover:bg-primary/90 text-white font-bold text-lg rounded-2xl shadow-xl shadow-primary/20"
      >
        <TrendingUp className="mr-2 w-5 h-5" />
        백테스트 실행
      </Button>
    </div>
  );
}
