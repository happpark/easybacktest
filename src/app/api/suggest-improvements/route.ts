import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { runBacktest } from '@/ai/flows/backtest-portfolio';
import { logError } from '@/lib/logger';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SUPPLEMENTAL_ASSETS = `
Supplemental assets you may add (only from this list):
- TLT: US Long-term Treasury 20yr+, deflation/recession hedge
- IEF: US Mid-term Treasury 7-10yr, moderate bond
- BND: Total US Bond Market, broad bonds
- TIP: TIPS, inflation-protected bonds
- GLD: Gold, crisis hedge
- IAU: Gold (alternative to GLD)
- SCHD: US Dividend ETF, income-focused
- VYM: High Dividend Yield ETF
- JEPI: Equity Premium Income (covered calls + dividends)
- VEA: Developed Markets ex-US, international
- EEM: Emerging Markets, growth potential
- VNQ: US REITs, real estate
- IWM: US Small-cap Russell 2000
- VBR: Small-cap Value
- XLP: Consumer Staples, defensive
- PDBC: Diversified Commodities
`.trim();

export async function POST(req: NextRequest) {
  try {
    const { assets, metrics, lang } = await req.json() as {
      assets: { ticker: string; weight: number }[];
      metrics: {
        cagr: number; mdd: number; sharpe: number;
        volatility: number; dividend: number;
      };
      lang: 'ko' | 'en';
    };

    const isKo = lang === 'ko';

    // ── Step 1: Haiku designs 3 strategies ────────────────────────────────────
    const prompt = `You are an expert portfolio strategist. Analyze this portfolio and design exactly 3 different improvement strategies.

Current Portfolio:
${assets.map(a => `  ${a.ticker}: ${a.weight}%`).join('\n')}

Historical Performance Metrics:
  CAGR: ${metrics.cagr}%
  Max Drawdown (MDD): ${metrics.mdd}%
  Sharpe Ratio: ${metrics.sharpe}
  Volatility: ${metrics.volatility}%
  Dividend Yield: ${metrics.dividend}%

${SUPPLEMENTAL_ASSETS}

Instructions:
1. Identify this portfolio's key weaknesses and strengths from the metrics above
2. Design 3 strategies with meaningfully DIFFERENT optimization goals (e.g. higher growth, lower drawdown, better efficiency, income, etc.)
3. Choose goals that directly address this portfolio's specific weaknesses
4. For each strategy: add tickers from the supplemental list if the portfolio genuinely needs them, otherwise just adjust existing weights
5. All weights in each strategy must sum to exactly 100
6. Write name, tagline, and reasoning in ${isKo ? 'Korean' : 'English'}
7. Names should be concise and catchy (max 4 words)

Return ONLY valid JSON, no markdown fences:
{
  "strategies": [
    {
      "name": "전략 이름",
      "emoji": "🛡️",
      "tagline": "한줄 설명",
      "goal": "optimize_for_X",
      "weights": [{"ticker": "VTI", "weight": 60}, {"ticker": "TLT", "weight": 40}],
      "reasoning": "이 전략이 왜 도움이 되는지 2-3문장 설명"
    }
  ]
}`;

    const aiResponse = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI response parsing failed');

    const parsed = JSON.parse(match[0]) as {
      strategies: {
        name: string;
        emoji: string;
        tagline: string;
        goal: string;
        weights: { ticker: string; weight: number }[];
        reasoning: string;
      }[];
    };

    // ── Step 2: Backtest all 3 strategies in parallel ─────────────────────────
    const results = await Promise.all(
      parsed.strategies.map(async (s) => {
        // Normalize weights to sum to 100
        const totalW = s.weights.reduce((a, b) => a + b.weight, 0);
        const normalizedWeights = s.weights.map(w => ({
          ticker: w.ticker,
          weight: Math.round((w.weight / totalW) * 1000) / 10,
        }));
        // Fix rounding
        const wSum = normalizedWeights.reduce((a, b) => a + b.weight, 0);
        const diff = Math.round((100 - wSum) * 10) / 10;
        if (diff !== 0 && normalizedWeights.length > 0) {
          const maxIdx = normalizedWeights.reduce((mi, w, i, arr) =>
            w.weight > arr[mi].weight ? i : mi, 0);
          normalizedWeights[maxIdx].weight = Math.round((normalizedWeights[maxIdx].weight + diff) * 10) / 10;
        }

        try {
          const result = await runBacktest({ assets: normalizedWeights });
          return {
            name: s.name,
            emoji: s.emoji,
            tagline: s.tagline,
            reasoning: s.reasoning,
            weights: normalizedWeights,
            metrics: result.metrics,
            history: result.history,
            delta: {
              cagr: Math.round((result.metrics.cagr - metrics.cagr) * 100) / 100,
              mdd: Math.round((result.metrics.mdd - metrics.mdd) * 100) / 100,
              sharpe: Math.round((result.metrics.sharpe - metrics.sharpe) * 100) / 100,
              volatility: Math.round((result.metrics.volatility - metrics.volatility) * 100) / 100,
              dividend: Math.round((result.metrics.dividend - metrics.dividend) * 100) / 100,
            },
            available: true,
          };
        } catch {
          return {
            name: s.name, emoji: s.emoji, tagline: s.tagline, reasoning: s.reasoning,
            weights: normalizedWeights, metrics: null, history: [], delta: null, available: false,
          };
        }
      })
    );

    return NextResponse.json({ strategies: results });
  } catch (e: unknown) {
    await logError(e, { route: '/api/suggest-improvements' });
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 });
  }
}
