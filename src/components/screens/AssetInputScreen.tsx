"use client";

import React, { useState } from 'react';
import { Search, Plus, Trash2, TrendingUp, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import etfDataRaw from '@/lib/etf-data.json';
import { cn } from '@/lib/utils';

interface ETF {
  ticker: string;
  name: string;
  launch_year: string;
}

const ETF_DATA = etfDataRaw as ETF[];

export function AssetInputScreen({ onBacktest }: { onBacktest: (data: any) => void }) {
  const [selectedAssets, setSelectedAssets] = useState([
    { ticker: 'QQQ', weight: 40, launch_year: '1999' },
    { ticker: 'GLD', weight: 30, launch_year: '2004' },
    { ticker: 'TLT', weight: 30, launch_year: '2002' },
  ]);
  const [searchQuery, setSearchQuery] = useState('');

  const updateWeight = (index: number, val: number) => {
    const newAssets = [...selectedAssets];
    // Clamp between 0 and 100
    newAssets[index].weight = Math.min(100, Math.max(0, val));
    setSelectedAssets(newAssets);
  };

  const removeAsset = (index: number) => {
    setSelectedAssets(selectedAssets.filter((_, i) => i !== index));
  };

  const addAsset = (asset: { ticker: string, name: string, launch_year?: string }) => {
    if (selectedAssets.find(a => a.ticker === asset.ticker)) return;
    setSelectedAssets([...selectedAssets, { 
      ticker: asset.ticker, 
      weight: 0, 
      launch_year: asset.launch_year || 'Unknown' 
    }]);
    setSearchQuery('');
  };

  const totalWeight = selectedAssets.reduce((acc, curr) => acc + curr.weight, 0);

  const suggestions = searchQuery.length >= 1 
    ? ETF_DATA.filter(a => 
        a.ticker.toLowerCase().includes(searchQuery.toLowerCase()) || 
        a.name.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 8) 
    : [];

  return (
    <div className="p-6 flex flex-col gap-8 animate-fade-in">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold font-headline tracking-tight text-glow text-primary">AlphaFlow</h1>
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
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#0B0E14] rounded-xl border border-white/10 z-50 overflow-hidden shadow-2xl">
            {suggestions.length > 0 ? (
              suggestions.map(a => (
                <button 
                  key={a.ticker}
                  onClick={() => addAsset(a)}
                  className="w-full p-4 flex justify-between items-center hover:bg-white/10 text-left border-b border-white/5 last:border-0 transition-colors group"
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary group-hover:text-glow">{a.ticker}</span>
                      <span className="text-[10px] text-muted-foreground bg-white/5 px-1.5 rounded">Since {a.launch_year}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground line-clamp-1">{a.name}</span>
                  </div>
                  <Plus size={16} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))
            ) : (
              <button 
                onClick={() => addAsset({ ticker: searchQuery, name: 'Custom Asset' })}
                className="w-full p-4 flex justify-between items-center hover:bg-white/5 text-left bg-primary/5 transition-colors group"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-primary">"{searchQuery}" 커스텀 추가</span>
                  <span className="text-[10px] text-muted-foreground">목록에 없는 경우 직접 추가하세요.</span>
                </div>
                <Plus size={16} className="text-primary" />
              </button>
            )}
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
            <div key={asset.ticker} className="glass-morphism p-5 rounded-2xl flex flex-col gap-5 border border-white/5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  {/* Contrast improved: Darker background, clearer text */}
                  <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-primary font-black shadow-inner">
                    {asset.ticker[0]}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-lg leading-none">{asset.ticker}</span>
                    <span className="text-[10px] text-muted-foreground mt-1">Weight Allocation</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Input 
                      type="number" 
                      value={asset.weight === 0 ? "" : asset.weight}
                      onChange={(e) => updateWeight(index, parseInt(e.target.value) || 0)}
                      className="w-16 h-10 text-right pr-6 font-mono font-bold bg-black/20 border-white/10 focus:border-primary/50 rounded-lg"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">%</span>
                  </div>
                  <button onClick={() => removeAsset(index)} className="p-2 text-muted-foreground/40 hover:text-destructive transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="px-1">
                <div className="relative pt-1 pb-4">
                  <Slider 
                    value={[asset.weight]} 
                    onValueChange={(val) => updateWeight(index, val[0])}
                    max={100} 
                    step={1}
                    className="cursor-pointer"
                  />
                  {/* Tick marks for visual guidance */}
                  <div className="absolute top-6 left-0 right-0 flex justify-between px-0.5 pointer-events-none">
                    {[0, 25, 50, 75, 100].map((tick) => (
                      <div key={tick} className="flex flex-col items-center gap-1">
                        <div className="w-0.5 h-1.5 bg-white/20 rounded-full" />
                        <span className="text-[8px] font-mono text-muted-foreground/50">{tick}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Total Weight Indicator */}
      <div className={cn(
        "p-5 rounded-2xl flex justify-between items-center border transition-all duration-300",
        totalWeight === 100 
          ? 'bg-[#7AE9AB]/10 border-[#7AE9AB]/30 shadow-[0_0_20px_rgba(122,233,171,0.1)]' 
          : 'bg-destructive/10 border-destructive/20'
      )}>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">합계 비중</span>
          <span className={cn(
            "text-xs font-medium mt-0.5",
            totalWeight === 100 ? 'text-[#7AE9AB]' : 'text-destructive/80'
          )}>
            {totalWeight === 100 ? '분석 준비 완료' : `${100 - totalWeight}% 더 구성 필요`}
          </span>
        </div>
        <span className={cn(
          "text-2xl font-mono font-black",
          totalWeight === 100 ? 'text-[#7AE9AB]' : 'text-destructive'
        )}>
          {totalWeight}%
        </span>
      </div>

      <Button 
        onClick={() => onBacktest(selectedAssets)}
        disabled={totalWeight !== 100}
        className={cn(
          "h-16 w-full text-white font-black text-xl rounded-2xl transition-all duration-500",
          totalWeight === 100 
            ? "bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 scale-[1.02]" 
            : "bg-muted cursor-not-allowed opacity-50"
        )}
      >
        <TrendingUp className="mr-3 w-6 h-6" />
        분석 시작하기
      </Button>
    </div>
  );
}
