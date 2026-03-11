"use client";

import React, { useState } from 'react';
import { Search, Plus, Trash2, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

const SUGGESTED_ASSETS = [
  { ticker: 'AAPL', name: 'Apple Inc.' },
  { ticker: 'BTC', name: 'Bitcoin' },
  { ticker: 'KRX Gold', name: 'KRX 금현물' },
  { ticker: 'NVDA', name: 'Nvidia' },
  { ticker: 'TSLA', name: 'Tesla Motors' },
  { ticker: 'GLD', name: 'SPDR Gold Trust' },
];

export function AssetInputScreen({ onBacktest }: { onBacktest: (data: any) => void }) {
  const [selectedAssets, setSelectedAssets] = useState([
    { ticker: 'AAPL', weight: 40 },
    { ticker: 'KRX Gold', weight: 30 },
    { ticker: 'BTC', weight: 30 },
  ]);

  const updateWeight = (index: number, val: number[]) => {
    const newAssets = [...selectedAssets];
    newAssets[index].weight = val[0];
    setSelectedAssets(newAssets);
  };

  const removeAsset = (index: number) => {
    setSelectedAssets(selectedAssets.filter((_, i) => i !== index));
  };

  const totalWeight = selectedAssets.reduce((acc, curr) => acc + curr.weight, 0);

  return (
    <div className="p-6 flex flex-col gap-8 animate-fade-in">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold font-headline tracking-tight text-glow">AlphaFlow</h1>
        <p className="text-muted-foreground text-sm">자산 비중을 설정하고 포트폴리오를 구성하세요.</p>
      </header>

      {/* Asset Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input 
          placeholder="자산 검색 (예: AAPL, 금, 비트코인)" 
          className="pl-10 glass-morphism h-12 border-white/10"
        />
      </div>

      {/* Asset List */}
      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">선택된 자산</h3>
        <div className="flex flex-col gap-3">
          {selectedAssets.map((asset, index) => (
            <div key={asset.ticker} className="glass-morphism p-4 rounded-xl flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    {asset.ticker[0]}
                  </div>
                  <span className="font-bold">{asset.ticker}</span>
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
      <div className={`p-4 rounded-xl flex justify-between items-center ${totalWeight === 100 ? 'bg-mint-green/10 border-mint-green/20' : 'bg-destructive/10 border-destructive/20'} border`}>
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
        과거 성과 보기
      </Button>
    </div>
  );
}
