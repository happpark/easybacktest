'use server';
/**
 * @fileOverview AI-powered portfolio backtesting flow.
 *
 * - backtestPortfolio - Simulates historical performance for a given set of assets and weights.
 * - BacktestInput - Tickers and weights.
 * - BacktestOutput - Performance metrics, radar data, and historical trend.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

function getPythonPath(cwd: string): string {
  const venvPath = path.resolve(cwd, '.venv/bin/python3');
  if (existsSync(venvPath)) return venvPath;
  for (const candidate of ['python3', 'python']) {
    try {
      execFileSync(candidate, ['--version'], { stdio: 'ignore' });
      return candidate;
    } catch {}
  }
  throw new Error('Python 3이 설치되어 있지 않습니다. Python을 설치하거나 가상환경(.venv)을 설정해주세요.');
}

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
    cagr: z.number().describe('Compound Annual Growth Rate in percentage'),
    mdd: z.number().describe('Maximum Drawdown in percentage'),
    mdd_year: z.string().describe('Year of Maximum Drawdown'),
    sharpe: z.number().describe('Sharpe Ratio'),
    volatility: z.number().describe('Volatility in percentage'),
    dividend: z.number().describe('Dividend Yield in percentage'),
    best_year: z.object({
      year: z.string(),
      value: z.number(),
    }),
    period: z.string().optional(),
  }),
  benchmark_metrics: z.object({
    cagr: z.number(),
    mdd: z.number(),
    sharpe: z.number(),
    volatility: z.number(),
    dividend: z.number(),
  }).optional(),
  period: z.string().describe('Analysis period string (e.g., "2007.05 ~ 2024.03")'),
  radar: z.array(z.object({
    subject: z.string(),
    A: z.number().describe('Portfolio value'),
    B: z.number().optional().describe('Benchmark value'),
    fullMark: z.number().default(100),
  })).describe('Radar chart data for Attack, Defense, Volatility, Sharpe, Dividend'),
  history: z.array(z.object({
    date: z.string(),
    value: z.number(),
  })).describe('Historical portfolio value data for chart visualization'),
  aiInsight: z.string().describe('Brief AI interpretation of the backtest results'),
});
export type BacktestOutput = z.infer<typeof BacktestOutputSchema>;

export async function backtestPortfolio(input: BacktestInput): Promise<BacktestOutput> {
  return backtestFlow(input);
}

const insightPrompt = ai.definePrompt({
  name: 'insightPrompt',
  input: { schema: z.object({ metrics: z.any(), assets: z.any() }) },
  output: { schema: z.object({ insight: z.string() }) },
  prompt: `You are an expert quantitative financial analyst. 
Based on the following backtest results and portfolio composition, provide a concise 2-sentence interpretation.

Portfolio:
{{#each assets}}
- {{{ticker}}}: {{{weight}}}%
{{/each}}

Metrics:
CAGR: {{metrics.cagr}}%
MDD: {{metrics.mdd}}%
Sharpe Ratio: {{metrics.sharpe}}
Period: {{metrics.period}}

Return a brief AI insight.`,
});

const backtestFlow = ai.defineFlow(
  {
    name: 'backtestFlow',
    inputSchema: BacktestInputSchema,
    outputSchema: BacktestOutputSchema,
  },
  async (input) => {
    // 1. Validate input
    const totalWeight = input.assets.reduce((sum, a) => sum + a.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new Error(`비중의 합이 100%여야 합니다. 현재: ${totalWeight.toFixed(2)}%`);
    }

    // 2. Prepare input for Python script
    const tickersWeights: Record<string, number> = {};
    input.assets.forEach(a => {
      tickersWeights[a.ticker] = a.weight / 100;
    });

    // 3. Execute Python backtest script
    const scriptPath = path.resolve(process.cwd(), 'backtest.py');
    const inputJson = JSON.stringify(tickersWeights);
    console.log('Running backtest with assets:', Object.keys(tickersWeights).join(', '));
    
    let result;
    try {
      const pythonPath = getPythonPath(process.cwd());
      const output = execFileSync(pythonPath, [scriptPath, inputJson], {
        encoding: 'utf-8',
        timeout: 60000,
      });
      console.log('Backtest output received');
      // Find the last JSON object in the output (avoids picking up partial warnings)
      const jsonMatches = output.match(/\{[\s\S]*\}/g);
      if (!jsonMatches) {
        console.error('No JSON match in output:', output);
        throw new Error('백테스트 스크립트에서 유효한 JSON 출력이 없습니다.');
      }
      result = JSON.parse(jsonMatches[jsonMatches.length - 1]);
    } catch (error: unknown) {
      console.error('Backtest failed:', error);
      const err = error as { stdout?: string; stderr?: string; message?: string };
      const errorMessage = err.stderr || err.stdout || err.message || '백테스트 실행에 실패했습니다.';
      throw new Error(`Backtest error: ${errorMessage}`);
    }

    if (result.error) {
      throw new Error(result.error);
    }

    // 4. Get AI Insight based on real data
    let aiInsight = "Analysis completed based on historical data.";
    try {
      const { output: insightOutput } = await insightPrompt({ 
        metrics: result.metrics, 
        assets: input.assets 
      });
      if (insightOutput?.insight) {
        aiInsight = insightOutput.insight;
      }
    } catch (aiError) {
      console.warn('AI Insight generation failed (likely due to missing API key):', aiError);
      // We continue since the quantitative data is the most important part
    }

    return {
      metrics: result.metrics,
      benchmark_metrics: result.benchmark_metrics,
      period: result.period,
      radar: result.radar,
      history: result.history,
      aiInsight: aiInsight
    };
  }
);
