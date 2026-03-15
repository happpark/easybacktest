'use server';
/**
 * @fileOverview 포트폴리오 자산 구성에 따른 백테스팅 및 성과 분석 AI 에이전트.
 *
 * - analyzePortfolio - 자산 비중을 바탕으로 과거 성과 지표와 분석 데이터를 생성합니다.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PortfolioAnalysisInputSchema = z.object({
  assets: z.array(z.object({
    ticker: z.string().describe('자산 티커 (예: AAPL, BTC, GLD)'),
    weight: z.number().describe('자산 비중 (%)'),
    launch_year: z.string().optional().describe('자산 상장 연도'),
  })),
});
export type PortfolioAnalysisInput = z.infer<typeof PortfolioAnalysisInputSchema>;

const PortfolioAnalysisOutputSchema = z.object({
  summary: z.object({
    cagr: z.number().describe('연평균 수익률 (%)'),
    mdd: z.number().describe('최대 낙폭 (%)'),
    sharpe: z.number().describe('샤프 지수'),
    period: z.string().describe('분석 기간 (예: 2007-05-15 ~ 2024-03-13)'),
  }),
  radarData: z.array(z.object({
    subject: z.string(),
    A: z.number(),
    fullMark: z.number(),
  })).describe('오각형 차트 데이터 (Attack, Defense, Volatility, Sharpe, Dividend)'),
  performanceHistory: z.array(z.object({
    year: z.number(),
    return: z.number(),
  })).describe('가용한 전 기간에 걸친 연도별 수익률 추이'),
});
export type PortfolioAnalysisOutput = z.infer<typeof PortfolioAnalysisOutputSchema>;

export async function analyzePortfolio(
  input: PortfolioAnalysisInput
): Promise<PortfolioAnalysisOutput> {
  return portfolioAnalysisFlow(input);
}

const portfolioAnalysisPrompt = ai.definePrompt({
  name: 'portfolioAnalysisPrompt',
  input: {schema: PortfolioAnalysisInputSchema},
  output: {schema: PortfolioAnalysisOutputSchema},
  prompt: `당신은 세계 최고의 퀀트 투자 분석가입니다. 
제공된 자산 구성(티커 및 비중)을 바탕으로 실제 시장의 역사적 데이터를 분석하여 사실적인 백테스팅 결과를 도출하세요.

입력된 자산들 중 가장 최근에 상장된(Inception Date가 가장 늦은) ETF의 상장일부터 현재까지의 전 기간을 대상으로 실제 역사적 데이터를 바탕으로 한 사실적인 백테스팅 결과를 도출하세요. (최대한 길게 분석하는 것이 목표입니다.)

입력된 자산들:
{{#each assets}}
- {{ticker}}: {{weight}}%
{{/each}}

다음 가이드라인에 따라 분석하세요:
1. 포트폴리오의 모든 자산이 데이터가 존재하는 가장 이른 시점(가장 최신 ETF의 상장일)부터 현재까지의 CAGR(연평균 수익률), MDD(최대 낙폭), 샤프 지수를 계산하세요.
2. 분석 기간(summary.period)은 "YYYY-MM-DD ~ YYYY-MM-DD" 형식으로 실제 분석된 기간을 정확히 명시하세요.
3. 오각형 차트 데이터(radarData)는 0~100점 사이로 산출하세요:
   - Attack: 수익성
   - Defense: 하락장 방어력 (MDD가 낮을수록 높음)
   - Volatility: 변동성 관리 (변동성이 낮을수록 높음)
   - Sharpe: 위험 대비 수익성
   - Dividend: 배당 성향
4. 해당 분석 기간 전체를 반영한 연도별 수익률 데이터를 performanceHistory에 포함시키세요.
5. 결과는 반드시 지정된 JSON 형식을 준수해야 합니다.
`,
});

const portfolioAnalysisFlow = ai.defineFlow(
  {
    name: 'portfolioAnalysisFlow',
    inputSchema: PortfolioAnalysisInputSchema,
    outputSchema: PortfolioAnalysisOutputSchema,
  },
  async (input) => {
    const {output} = await portfolioAnalysisPrompt(input);
    if (!output) {
      throw new Error('포트폴리오 분석에 실패했습니다.');
    }
    return output;
  }
);
