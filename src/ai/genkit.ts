import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// API 키가 없을 경우를 대비하여 더 안전하게 초기화합니다.
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

export const ai = genkit({
  plugins: apiKey ? [googleAI({ apiKey })] : [],
  model: 'googleai/gemini-2.0-flash', // 안정적인 모델명으로 수정
});
