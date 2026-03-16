'use server';
/**
 * @fileOverview Portfolio backtesting — pure TypeScript (no Python dependency).
 * Uses yahoo-finance2 for historical price data so it works on Vercel serverless.
 */

import { z } from 'zod';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['ripHistorical', 'yahooSurvey'] });

const RISK_FREE_RATE = 0.02; // 2% annual
const TRADING_DAYS = 252;

// ── Schemas ───────────────────────────────────────────────────────────────────

const BacktestInputSchema = z.object({
  assets: z.array(z.object({
    ticker: z.string(),
    weight: z.number(),
    launch_year: z.string().optional(),
  })),
});
export type BacktestInput = z.infer<typeof BacktestInputSchema>;

const BacktestOutputSchema = z.object({
  metrics: z.object({
    cagr: z.number(),
    mdd: z.number(),
    mdd_year: z.string(),
    sharpe: z.number(),
    volatility: z.number(),
    dividend: z.number(),
    best_year: z.object({ year: z.string(), value: z.number() }),
    period: z.string().optional(),
  }),
  benchmark_metrics: z.object({
    cagr: z.number(),
    mdd: z.number(),
    sharpe: z.number(),
    volatility: z.number(),
    dividend: z.number(),
  }).optional(),
  period: z.string(),
  radar: z.array(z.object({
    subject: z.string(),
    A: z.number(),
    B: z.number().optional(),
    fullMark: z.number().default(100),
  })),
  history: z.array(z.object({ date: z.string(), value: z.number() })),
  aiInsight: z.string(),
});
export type BacktestOutput = z.infer<typeof BacktestOutputSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalize(val: number, subject: string): number {
  if (subject === 'Attack')    return Math.min(100, Math.max(0, Math.round((val / 15) * 100)));
  if (subject === 'Defense') {
    const abs = Math.abs(val);
    return abs === 0 ? 100 : Math.min(100, Math.max(0, Math.round(1500 / abs)));
  }
  if (subject === 'Volatility') return Math.min(100, Math.max(0, Math.round(100 - val * 2.5)));
  if (subject === 'Sharpe')    return Math.min(100, Math.max(0, Math.round((val / 1.0) * 100)));
  if (subject === 'Dividend')  return Math.min(100, Math.max(0, Math.round((val / 5) * 100)));
  return 0;
}

async function fetchAdjClose(ticker: string): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (ticker === 'CASH') return map;
  const today = new Date();
  const rows = await yahooFinance.historical(
    ticker,
    { period1: '1970-01-01', period2: today, interval: '1d' },
    { validateResult: false },
  );
  for (const row of rows) {
    const price = (row as Record<string, unknown>).adjClose ?? row.close;
    if (typeof price === 'number' && price > 0) {
      map.set(row.date.toISOString().split('T')[0], price);
    }
  }
  return map;
}

async function fetchDivYield(ticker: string): Promise<number> {
  if (ticker === 'CASH') return 0;
  try {
    const s = await yahooFinance.quoteSummary(
      ticker,
      { modules: ['summaryDetail'] },
      { validateResult: false },
    );
    const dy = (s.summaryDetail as Record<string, unknown> | undefined)?.trailingAnnualDividendYield;
    return typeof dy === 'number' ? dy * 100 : 0;
  } catch {
    return 0;
  }
}

interface Metrics {
  cagr: number; mdd: number; mdd_year: string;
  sharpe: number; volatility: number; dividend: number;
  best_year: { year: string; value: number };
}

function computeMetrics(
  dailyReturns: number[],
  cumReturns: number[],
  dates: string[],
  divYield: number,
  years: number,
): Metrics {
  const r = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

  const finalVal = cumReturns[cumReturns.length - 1];
  const cagr = Math.pow(finalVal, 1 / years) - 1;

  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((a, b) => a + (b - mean) ** 2, 0) / (dailyReturns.length - 1);
  const vol = Math.sqrt(variance) * Math.sqrt(TRADING_DAYS);
  const sharpe = vol > 0 ? (mean * TRADING_DAYS - RISK_FREE_RATE) / vol : 0;

  let runMax = cumReturns[0];
  let mdd = 0;
  let mddIdx = 0;
  for (let i = 0; i < cumReturns.length; i++) {
    if (cumReturns[i] > runMax) runMax = cumReturns[i];
    const dd = (cumReturns[i] - runMax) / runMax;
    if (dd < mdd) { mdd = dd; mddIdx = i; }
  }
  const mddYear = new Date(dates[mddIdx + 1]).getFullYear().toString();

  // Best calendar year
  const yearProds: Record<string, number> = {};
  let prod = 1.0;
  let curYear = new Date(dates[1]).getFullYear().toString();
  for (let i = 0; i < dailyReturns.length; i++) {
    const yr = new Date(dates[i + 1]).getFullYear().toString();
    if (yr !== curYear) { yearProds[curYear] = prod - 1; prod = 1.0; curYear = yr; }
    prod *= (1 + dailyReturns[i]);
  }
  yearProds[curYear] = prod - 1;
  let bestYear = '';
  let bestVal = -Infinity;
  for (const [yr, v] of Object.entries(yearProds)) {
    if (v > bestVal) { bestVal = v; bestYear = yr; }
  }

  return {
    cagr: r(cagr * 100, 2),
    mdd: r(mdd * 100, 2),
    mdd_year: mddYear,
    sharpe: r(sharpe, 2),
    volatility: r(vol * 100, 2),
    dividend: r(divYield, 2),
    best_year: { year: bestYear, value: r(bestVal * 100, 2) },
  };
}

// ── Core backtest ─────────────────────────────────────────────────────────────

export async function runBacktest(input: BacktestInput) {
  const tickers = input.assets.map(a => a.ticker);
  const rawWeights = input.assets.map(a => a.weight);
  const totalW = rawWeights.reduce((a, b) => a + b, 0);
  const weights = rawWeights.map(w => w / totalW);

  const realTickers = tickers.filter(t => t !== 'CASH');
  const toFetch = [...new Set([...realTickers, 'SPY'])];

  // Fetch all price histories in parallel
  const priceMaps = await Promise.all(toFetch.map(fetchAdjClose));
  const pm: Record<string, Map<string, number>> = {};
  toFetch.forEach((t, i) => { pm[t] = priceMaps[i]; });

  // Intersect dates across all portfolio real tickers + SPY
  const setsToIntersect = [...realTickers, 'SPY'].map(t => [...pm[t].keys()]);
  let common = new Set(setsToIntersect[0]);
  for (let i = 1; i < setsToIntersect.length; i++) {
    const s = new Set(setsToIntersect[i]);
    common = new Set([...common].filter(d => s.has(d)));
  }
  const dates = [...common].sort();
  if (dates.length < 120) {
    throw new Error('포트폴리오 종목 간 공통 가격 데이터가 충분하지 않습니다 (최소 6개월 필요).');
  }
  const n = dates.length;

  // Build daily returns
  const portDaily: number[] = [];
  const spyDaily: number[] = [];
  for (let i = 1; i < n; i++) {
    let portRet = 0;
    for (let j = 0; j < tickers.length; j++) {
      const t = tickers[j];
      const prev = t === 'CASH' ? 1 : pm[t].get(dates[i - 1])!;
      const curr = t === 'CASH' ? 1 : pm[t].get(dates[i])!;
      portRet += weights[j] * (curr / prev - 1);
    }
    portDaily.push(portRet);
    spyDaily.push(pm['SPY'].get(dates[i])! / pm['SPY'].get(dates[i - 1])! - 1);
  }

  // Cumulative returns
  const portCum: number[] = [];
  const spyCum: number[] = [];
  let pv = 1, sv = 1;
  for (let i = 0; i < portDaily.length; i++) {
    pv *= (1 + portDaily[i]); portCum.push(pv);
    sv *= (1 + spyDaily[i]); spyCum.push(sv);
  }

  const years = (new Date(dates[n - 1]).getTime() - new Date(dates[0]).getTime()) / (365.25 * 86400000);

  // Fetch dividend yields in parallel
  const divYields = await Promise.all(tickers.map(fetchDivYield));
  const portDivYield = divYields.reduce((a, dy, i) => a + dy * weights[i], 0);
  const spyDivYield = await fetchDivYield('SPY');

  const portMetrics = computeMetrics(portDaily, portCum, dates, portDivYield, years);
  const benchMetrics = computeMetrics(spyDaily, spyCum, dates, spyDivYield, years);

  const keyMap: Record<string, keyof Metrics> = {
    Attack: 'cagr', Defense: 'mdd', Volatility: 'volatility', Sharpe: 'sharpe', Dividend: 'dividend',
  };
  const radar = ['Attack', 'Defense', 'Volatility', 'Sharpe', 'Dividend'].map(s => ({
    subject: s,
    A: normalize(portMetrics[keyMap[s]] as number, s),
    B: normalize(benchMetrics[keyMap[s]] as number, s),
    fullMark: 100,
  }));

  // History — up to 100 sampled points
  const nS = Math.min(portCum.length, 100);
  const history = [{ date: dates[0], value: 1000.0 }];
  for (let i = 0; i < nS; i++) {
    const idx = Math.round(i * (portCum.length - 1) / Math.max(nS - 1, 1));
    history.push({ date: dates[idx + 1], value: Math.round(portCum[idx] * 1000 * 100) / 100 });
  }

  const fmt = (d: string) => d.substring(0, 7).replace('-', '.');
  return {
    metrics: portMetrics,
    benchmark_metrics: {
      cagr: benchMetrics.cagr, mdd: benchMetrics.mdd,
      sharpe: benchMetrics.sharpe, volatility: benchMetrics.volatility,
      dividend: benchMetrics.dividend,
    },
    period: `${fmt(dates[0])} ~ ${fmt(dates[n - 1])}`,
    radar,
    history,
  };
}

// ── Server Action ─────────────────────────────────────────────────────────────

export async function backtestPortfolio(input: BacktestInput): Promise<BacktestOutput> {
  const totalWeight = input.assets.reduce((sum, a) => sum + a.weight, 0);
  if (Math.abs(totalWeight - 100) > 0.01) {
    throw new Error(`비중의 합이 100%여야 합니다. 현재: ${totalWeight.toFixed(2)}%`);
  }

  const result = await runBacktest(input);

  return { ...result, aiInsight: 'Analysis completed based on historical data.' };
}
