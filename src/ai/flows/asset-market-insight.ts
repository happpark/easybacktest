'use server';
/**
 * @fileOverview An AI agent that provides market insights for a list of assets.
 *
 * - getAssetMarketInsights - A function that fetches sentiment-driven market insights for given assets.
 * - AssetMarketInsightInput - The input type for the getAssetMarketInsights function.
 * - AssetMarketInsightOutput - The return type for the getAssetMarketInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AssetMarketInsightInputSchema = z.object({
  assets: z
    .array(z.string())
    .describe(
      'A list of asset tickers or names (e.g., AAPL, KRX Gold, Bitcoin) for which to provide market insights.'
    ),
});
export type AssetMarketInsightInput = z.infer<typeof AssetMarketInsightInputSchema>;

const AssetMarketInsightOutputSchema = z.object({
  insights: z
    .array(
      z.object({
        asset: z.string().describe('The name or ticker of the asset.'),
        sentiment: z
          .enum(['positive', 'neutral', 'negative'])
          .describe('The overall market sentiment for the asset.'),
        summary: z
          .string()
          .describe(
            'A concise, sentiment-driven summary of recent financial news and market data relevant to the asset.'
          ),
      })
    )
    .describe('A list of market insights for each asset.'),
});
export type AssetMarketInsightOutput = z.infer<typeof AssetMarketInsightOutputSchema>;

export async function getAssetMarketInsights(
  input: AssetMarketInsightInput
): Promise<AssetMarketInsightOutput> {
  return assetMarketInsightFlow(input);
}

const assetMarketInsightPrompt = ai.definePrompt({
  name: 'assetMarketInsightPrompt',
  input: {schema: AssetMarketInsightInputSchema},
  output: {schema: AssetMarketInsightOutputSchema},
  prompt: `You are a highly experienced financial analyst. Your task is to provide concise, sentiment-driven market insights for a list of financial assets.

For each asset provided, analyze recent (simulated) financial news and market data to determine its current sentiment (positive, neutral, or negative) and provide a brief, actionable summary. Focus on insights that would aid a portfolio manager in making allocation decisions.

Assets to analyze: {{{assets}}}

Provide the output in the specified JSON format.`,
});

const assetMarketInsightFlow = ai.defineFlow(
  {
    name: 'assetMarketInsightFlow',
    inputSchema: AssetMarketInsightInputSchema,
    outputSchema: AssetMarketInsightOutputSchema,
  },
  async (input) => {
    try {
      const {output} = await assetMarketInsightPrompt(input);
      if (!output) {
        throw new Error('Failed to generate market insights.');
      }
      return output;
    } catch (error) {
      console.warn('Market Insights AI failed:', error);
      // Fallback response
      return {
        insights: input.assets.map(asset => ({
          asset,
          sentiment: 'neutral' as const,
          summary: 'Market data is currently being updated. Please check back later for detailed AI insights.'
        }))
      };
    }
  }
);
