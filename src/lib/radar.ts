// Single source of truth for radar normalization.
// Change thresholds here → ResultScreen + MyPortfoliosScreen both update automatically.

export const RADAR_SUBJECTS = ['Attack', 'Defense', 'Volatility', 'Sharpe', 'Dividend'] as const;
export type RadarSubject = typeof RADAR_SUBJECTS[number];

export interface RadarEntry extends Record<string, string | number | undefined> {
  subject: string;
  A: number;       // portfolio score
  B?: number;      // benchmark score (optional)
  fullMark: number;
}

function normalize(val: number, subject: RadarSubject): number {
  switch (subject) {
    case 'Attack':
      // CAGR: 15% → 100pts  (5%=33, 7.5%=50, 10%=67, 12.5%=83, 15%=100)
      return Math.min(100, Math.max(0, Math.round((val / 15) * 100)));
    case 'Defense': {
      // MDD: lower is better. 1500 / |MDD|  → MDD 15%=100, MDD 30%=50, MDD 50%=30
      const abs = Math.abs(val);
      return abs === 0 ? 100 : Math.min(100, Math.max(0, Math.round(1500 / abs)));
    }
    case 'Volatility':
      // Lower vol = higher score: 0%=100, 20%=50, 40%=0
      return Math.min(100, Math.max(0, Math.round(100 - val * 2.5)));
    case 'Sharpe':
      // 1.0 → 100pts  (0.3=30, 0.5=50, 0.8=80, 1.0=100)
      return Math.min(100, Math.max(0, Math.round((val / 1.0) * 100)));
    case 'Dividend':
      // 5% → 100pts  (1%=20, 2%=40, 3%=60, 4%=80, 5%=100)
      return Math.min(100, Math.max(0, Math.round((val / 5) * 100)));
  }
}

interface Metrics {
  cagr: number;
  mdd: number;
  volatility: number;
  sharpe: number;
  dividend: number;
}

const METRIC_KEY: Record<RadarSubject, keyof Metrics> = {
  Attack:     'cagr',
  Defense:    'mdd',
  Volatility: 'volatility',
  Sharpe:     'sharpe',
  Dividend:   'dividend',
};

export function buildRadar(portfolio: Metrics, benchmark?: Metrics): RadarEntry[] {
  return RADAR_SUBJECTS.map(subject => ({
    subject,
    A: normalize(portfolio[METRIC_KEY[subject]], subject),
    ...(benchmark ? { B: normalize(benchmark[METRIC_KEY[subject]], subject) } : {}),
    fullMark: 100,
  }));
}
