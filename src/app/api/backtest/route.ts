import { NextRequest, NextResponse } from 'next/server';
import { runBacktest } from '@/ai/flows/backtest-portfolio';
import { logError } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {

    const input = await req.json();

    if (input.portfolios?.length > 5) {
      return NextResponse.json({ error: 'Too many portfolios' }, { status: 400 });
    }

    // Bulk mode: { portfolios: [{assets: [...]}, ...] }
    if (Array.isArray(input.portfolios)) {
      const results = await Promise.all(
        (input.portfolios as { assets: { ticker: string; weight: number; launch_year?: string }[] }[]).map(async (p) => {
          const total = p.assets.reduce((s, a) => s + a.weight, 0);
          if (Math.abs(total - 100) > 0.01) throw new Error(`비중의 합이 100%여야 합니다. 현재: ${total.toFixed(2)}%`);
          const result = await runBacktest({ ...(p as { assets: { ticker: string; weight: number; launch_year?: string }[] }), rebalancingMonths: (input as { rebalancingMonths?: number }).rebalancingMonths ?? 12 });
          return { ...result, aiInsight: 'Analysis completed based on historical data.' };
        })
      );
      return NextResponse.json(results);
    }

    // Single mode (existing)
    const totalWeight = (input.assets as { weight: number }[]).reduce((sum, a) => sum + a.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      return NextResponse.json(
        { error: `비중의 합이 100%여야 합니다. 현재: ${totalWeight.toFixed(2)}%` },
        { status: 400 }
      );
    }
    const result = await runBacktest(input);
    return NextResponse.json({ ...result, aiInsight: 'Analysis completed based on historical data.' });
  } catch (e: unknown) {
    await logError(e, { route: '/api/backtest' });
    const msg = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
