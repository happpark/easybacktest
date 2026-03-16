import { NextRequest, NextResponse } from 'next/server';
import { runBacktest } from '@/ai/flows/backtest-portfolio';

export async function POST(req: NextRequest) {
  try {
    const input = await req.json();

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
    const msg = e instanceof Error ? e.message : '백테스트 중 오류가 발생했습니다.';
    console.error('[backtest API error]', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
