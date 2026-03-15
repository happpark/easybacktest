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
import { execSync } from 'child_process';
import path from 'path';

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
    // 1. Prepare input for Python script
    const tickersWeights: Record<string, number> = {};
    input.assets.forEach(a => {
      tickersWeights[a.ticker] = a.weight / 100;
    });

    // 2. Execute Python backtest script
    const scriptPath = path.resolve(process.cwd(), 'backtest.py');
    const pythonPath = path.resolve(process.cwd(), '.venv/bin/python3');
    const inputJson = JSON.stringify(tickersWeights);
    console.log('Running backtest with input:', inputJson);
    
    let result;
    try {
      // Set LD_LIBRARY_PATH for Nix environment dependencies (libstdc++, libz)
      const env = {
        ...process.env,
        LD_LIBRARY_PATH: '/nix/store/cf1a53iqg6ncnygl698c4v0l8qam5a2q-gcc-14.3.0-lib/lib/:/nix/store/0zv8lswa9k122sixl00zjb1g1r49bs0i-zlib-1.3/lib/'
      };
      
      const output = execSync(`"${pythonPath}" "${scriptPath}" '${inputJson}'`, { 
        encoding: 'utf-8',
        env: env
      });
      console.log('Backtest output received');
      // Find the last JSON object in the output to avoid issues with warnings or logs
      const jsonMatch = output.match(/\{.*\}/s);
      if (!jsonMatch) {
        console.error('No JSON match in output:', output);
        throw new Error('No valid JSON output from backtest script');
      }
      result = JSON.parse(jsonMatch[0]);
    } catch (error: any) {
      console.error('Backtest failed:', error);
      const errorMessage = error.stdout || error.message || 'Failed to perform quantitative backtest.';
      throw new Error(`Backtest error: ${errorMessage}`);
    }

    if (result.error) {
      throw new Error(result.error);
    }

    // 3. Get AI Insight based on real data
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
