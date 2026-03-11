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

const BacktestInputSchema = z.object({
  assets: z.array(z.object({
    ticker: z.string(),
    weight: z.number(),
  })),
});
export type BacktestInput = z.infer<typeof BacktestInputSchema>;

const BacktestOutputSchema = z.object({
  metrics: z.object({
    cagr: z.number().describe('Compound Annual Growth Rate in percentage'),
    mdd: z.number().describe('Maximum Drawdown in percentage'),
    sharpe: z.number().describe('Sharpe Ratio'),
    period: z.string().describe('Analysis period string (e.g., "2014-2024")'),
  }),
  radar: z.array(z.object({
    subject: z.string(),
    A: z.number(),
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

const backtestPrompt = ai.definePrompt({
  name: 'backtestPrompt',
  input: { schema: BacktestInputSchema },
  output: { schema: BacktestOutputSchema },
  prompt: `You are an expert quantitative financial analyst. 
Analyze the following portfolio composition and provide a highly realistic backtest simulation based on historical market data trends (2014-2024).

Portfolio:
{{#each assets}}
- {{{ticker}}}: {{{weight}}}%
{{/each}}

Tasks:
1. Calculate realistic CAGR, MDD, and Sharpe Ratio for this specific allocation.
2. Generate radar chart data (0-100) for: Attack (Growth), Defense (Stability), Volatility (Risk), Sharpe (Efficiency), Dividend (Income).
3. Generate a 12-point historical value series (one for each year/period) starting from 1000.
4. Provide a 2-sentence AI insight.

Return the result in the specified JSON format.`,
});

const backtestFlow = ai.defineFlow(
  {
    name: 'backtestFlow',
    inputSchema: BacktestInputSchema,
    outputSchema: BacktestOutputSchema,
  },
  async (input) => {
    const { output } = await backtestPrompt(input);
    if (!output) {
      throw new Error('Failed to perform backtest.');
    }
    return output;
  }
);
