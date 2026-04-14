/**
 * Scenario experience — NOT a 'use server' file.
 * Can export objects, types, and async functions freely.
 */
import YahooFinance from 'yahoo-finance2';
import type { BacktestInput } from './backtest-portfolio';

const yahooFinance = new YahooFinance({ suppressNotices: ['ripHistorical', 'yahooSurvey'] });

async function fetchAdjClose(ticker: string): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (ticker === 'CASH') return map;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  let rows;
  try {
    rows = await yahooFinance.historical(
      ticker,
      { period1: '1990-01-01', period2: yesterday, interval: '1d' },
      { validateResult: false },
    );
  } catch {
    return map;
  }
  for (const row of rows) {
    const price = (row as Record<string, unknown>).adjClose ?? row.close;
    if (typeof price === 'number' && price > 0) {
      map.set(row.date.toISOString().split('T')[0], price);
    }
  }
  return map;
}

export const SCENARIO_DEFS = {
  '2008': {
    peakDate: '2007-10-09',
    endDate: '2013-06-30',
    milestones: [
      { date: '2008-03-14', ko: '베어스턴스 붕괴', en: 'Bear Stearns Collapse' },
      { date: '2008-09-15', ko: '리먼 파산', en: 'Lehman Bankrupt' },
      { date: '2009-03-09', ko: '시장 바닥', en: 'Market Bottom' },
    ],
  },
  '2020': {
    peakDate: '2020-02-19',
    endDate: '2020-12-31',
    milestones: [
      { date: '2020-03-11', ko: 'WHO 팬데믹 선언', en: 'WHO Pandemic' },
      { date: '2020-03-23', ko: '시장 바닥', en: 'Market Bottom' },
      { date: '2020-08-18', ko: '고점 회복', en: 'Peak Recovered' },
    ],
  },
  '2022': {
    peakDate: '2022-01-03',
    endDate: '2024-06-30',
    milestones: [
      { date: '2022-03-16', ko: 'Fed 첫 금리인상', en: 'First Fed Hike' },
      { date: '2022-06-13', ko: '약세장 진입', en: 'Bear Market' },
      { date: '2022-10-12', ko: '시장 바닥', en: 'Market Bottom' },
    ],
  },
} as const;

export type ScenarioKey = keyof typeof SCENARIO_DEFS;

export interface ScenarioPoint {
  date: string;
  value: number;
  pctFromPeak: number;
  milestone?: string;
}

export interface ScenarioResult {
  available: boolean;
  points: ScenarioPoint[];
  troughIdx: number;
  maxDrawdown: number;
}

export async function runScenario(
  assets: BacktestInput['assets'],
  scenario: ScenarioKey,
  lang: 'ko' | 'en' = 'ko',
): Promise<ScenarioResult> {
  const def = SCENARIO_DEFS[scenario];
  const tickers = assets.map(a => a.ticker);
  const rawWeights = assets.map(a => a.weight);
  const totalW = rawWeights.reduce((a, b) => a + b, 0);
  const weights = rawWeights.map(w => w / totalW);

  const realTickers = tickers.filter(t => t !== 'CASH');
  if (realTickers.length === 0) return { available: false, points: [], troughIdx: 0, maxDrawdown: 0 };

  const priceMaps = await Promise.all(realTickers.map(fetchAdjClose));
  const pm: Record<string, Map<string, number>> = {};
  realTickers.forEach((t, i) => { pm[t] = priceMaps[i]; });

  let common = new Set([...pm[realTickers[0]].keys()].filter(d => d >= def.peakDate && d <= def.endDate));
  for (let i = 1; i < realTickers.length; i++) {
    const s = new Set([...pm[realTickers[i]].keys()].filter(d => d >= def.peakDate && d <= def.endDate));
    common = new Set([...common].filter(d => s.has(d)));
  }
  const allDates = [...common].sort();

  if (allDates.length < 10) return { available: false, points: [], troughIdx: 0, maxDrawdown: 0 };

  const peakPrices: Record<string, number> = {};
  for (const t of realTickers) peakPrices[t] = pm[t].get(allDates[0]) ?? 1;

  // Milestone lookup: map each milestone to nearest trading date
  const milestoneMap: Record<string, string> = {};
  for (const m of def.milestones) {
    const nearest = allDates.reduce((best, d) =>
      Math.abs(new Date(d).getTime() - new Date(m.date).getTime()) <
      Math.abs(new Date(best).getTime() - new Date(m.date).getTime()) ? d : best
    );
    milestoneMap[nearest] = lang === 'ko' ? m.ko : m.en;
  }

  // Return ALL daily trading dates (for calendar view)
  const points: ScenarioPoint[] = allDates.map(date => {
    let value = 0;
    for (let j = 0; j < tickers.length; j++) {
      const t = tickers[j];
      if (t === 'CASH') { value += weights[j] * 1000; continue; }
      const curr = pm[t].get(date) ?? peakPrices[t];
      value += weights[j] * (curr / peakPrices[t]) * 1000;
    }
    const pctFromPeak = ((value - 1000) / 1000) * 100;
    return {
      date,
      value: Math.round(value * 100) / 100,
      pctFromPeak: Math.round(pctFromPeak * 100) / 100,
      milestone: milestoneMap[date],
    };
  });

  const minValue = Math.min(...points.map(p => p.value));
  const troughIdx = points.findIndex(p => p.value === minValue);
  const maxDrawdown = Math.round(((minValue - 1000) / 1000) * 10000) / 100;

  return { available: true, points, troughIdx, maxDrawdown };
}
