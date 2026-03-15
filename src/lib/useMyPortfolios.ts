"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Asset } from '@/app/page';
import type { BacktestOutput } from '@/ai/flows/backtest-portfolio';

export interface SavedPortfolio {
  id: string;
  name: string;
  savedAt: string; // ISO string
  assets: Asset[];
  result: BacktestOutput;
}

const STORAGE_KEY = 'easybacktest_portfolios';

function load(): SavedPortfolio[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function persist(data: SavedPortfolio[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useMyPortfolios() {
  const [portfolios, setPortfolios] = useState<SavedPortfolio[]>([]);

  useEffect(() => {
    setPortfolios(load());
  }, []);

  const save = useCallback((name: string, assets: Asset[], result: BacktestOutput): SavedPortfolio => {
    const entry: SavedPortfolio = {
      id: Date.now().toString(),
      name,
      savedAt: new Date().toISOString(),
      assets,
      result,
    };
    setPortfolios(prev => {
      const next = [entry, ...prev];
      persist(next);
      return next;
    });
    return entry;
  }, []);

  const rename = useCallback((id: string, name: string) => {
    setPortfolios(prev => {
      const next = prev.map(p => p.id === id ? { ...p, name } : p);
      persist(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setPortfolios(prev => {
      const next = prev.filter(p => p.id !== id);
      persist(next);
      return next;
    });
  }, []);

  return { portfolios, save, rename, remove };
}
