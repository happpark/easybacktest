'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Asset } from '@/app/page';
import type { BacktestOutput } from '@/ai/flows/backtest-portfolio';
import {
  savePortfolio as dbSavePortfolio,
  getPortfolios as dbGetPortfolios,
  deletePortfolio as dbDeletePortfolio,
  renamePortfolio as dbRenamePortfolio,
} from '@/lib/supabase/portfolios';

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

export function useMyPortfolios(userId?: string | null) {
  const [portfolios, setPortfolios] = useState<SavedPortfolio[]>([]);
  const [dbLoading, setDbLoading] = useState(false);

  // Load portfolios on mount or when userId changes
  useEffect(() => {
    if (userId) {
      // Authenticated: load from Supabase
      setDbLoading(true);
      dbGetPortfolios(userId)
        .then((rows) => {
          const mapped: SavedPortfolio[] = rows.map((row) => ({
            id: row.id,
            name: row.name,
            savedAt: row.created_at,
            assets: row.assets,
            result: row.result,
          }));
          setPortfolios(mapped);
        })
        .finally(() => setDbLoading(false));
    } else {
      // Unauthenticated: load from localStorage
      setPortfolios(load());
    }
  }, [userId]);

  const save = useCallback(
    async (name: string, assets: Asset[], result: BacktestOutput): Promise<SavedPortfolio> => {
      if (userId) {
        // Save to Supabase
        const row = await dbSavePortfolio(userId, name, assets, result);
        if (row) {
          const entry: SavedPortfolio = {
            id: row.id,
            name: row.name,
            savedAt: row.created_at,
            assets: row.assets,
            result: row.result,
          };
          setPortfolios((prev) => [entry, ...prev]);
          return entry;
        }
        // Fallback: create a local entry even if DB insert failed
        const fallback: SavedPortfolio = {
          id: Date.now().toString(),
          name,
          savedAt: new Date().toISOString(),
          assets,
          result,
        };
        return fallback;
      } else {
        // Save to localStorage
        const entry: SavedPortfolio = {
          id: Date.now().toString(),
          name,
          savedAt: new Date().toISOString(),
          assets,
          result,
        };
        setPortfolios((prev) => {
          const next = [entry, ...prev];
          persist(next);
          return next;
        });
        return entry;
      }
    },
    [userId]
  );

  const rename = useCallback(
    async (id: string, name: string) => {
      if (userId) {
        // Update in Supabase
        await dbRenamePortfolio(id, name);
        setPortfolios((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
      } else {
        // Update in localStorage
        setPortfolios((prev) => {
          const next = prev.map((p) => (p.id === id ? { ...p, name } : p));
          persist(next);
          return next;
        });
      }
    },
    [userId]
  );

  const remove = useCallback(
    async (id: string) => {
      if (userId) {
        // Delete from Supabase
        await dbDeletePortfolio(id);
        setPortfolios((prev) => prev.filter((p) => p.id !== id));
      } else {
        // Delete from localStorage
        setPortfolios((prev) => {
          const next = prev.filter((p) => p.id !== id);
          persist(next);
          return next;
        });
      }
    },
    [userId]
  );

  return { portfolios, save, rename, remove, dbLoading };
}
