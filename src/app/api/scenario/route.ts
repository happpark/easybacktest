import { NextRequest, NextResponse } from 'next/server';
import { runScenario, type ScenarioKey } from '@/ai/flows/backtest-portfolio';
import type { BacktestInput } from '@/ai/flows/backtest-portfolio';

export async function POST(req: NextRequest) {
  try {
    const { assets, scenario, lang } = await req.json() as {
      assets: BacktestInput['assets'];
      scenario: ScenarioKey;
      lang: 'ko' | 'en';
    };
    const result = await runScenario(assets, scenario, lang);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
