import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';
import ETF_DATA from '@/lib/etf-data.json';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Pass 1: Vision OCR — faithfully extract names + raw values ────────────────
const OCR_PROMPT = `You are a financial document OCR engine. Your ONLY job is to read every asset line from this portfolio image and return the raw data exactly as shown. Do NOT interpret, map, or calculate anything.

Detect the format:
- AMOUNT format: shows monetary values (₩3,500,000 / $12,450 / 3500000원)
- PERCENT format: shows percentage allocations (AAPL 34% / 34.5%)

For EACH asset line item, extract:
- name: exact name/ticker as shown in the image (Korean OK)
- value: the numeric value (amount OR percentage number, no symbols)
- raw_text: verbatim text from image

Rules:
- Include EVERYTHING: stocks, funds, ETFs, bonds, cash, crypto, 예금, CMA, 청약, 보증금, etc.
- NEVER skip a line item, even if value is 0
- For Korean stocks: include the full name as shown (e.g. "삼성전자", "카카오")
- If value is unreadable, set to 0

Return ONLY valid JSON, no markdown fences:
{
  "value_type": "amount",
  "items": [
    { "name": "삼성전자", "value": 3500000, "raw_text": "삼성전자 3,500,000" },
    { "name": "QQQ", "value": 1200000, "raw_text": "QQQ 1,200,000" }
  ]
}`;

// ── DB pre-match: etf-data.json에서 ticker/name으로 직접 매칭 ─────────────────
interface EtfEntry { ticker: string; name: string; launch_year: string; }
const ETF_DB = ETF_DATA as EtfEntry[];

function preMatchTicker(name: string): string | null {
  const trimmed = name.trim();
  const upper = trimmed.toUpperCase();
  const lower = trimmed.toLowerCase();

  // 1. Exact ticker match (case-insensitive)
  const byTicker = ETF_DB.find(e => e.ticker.toUpperCase() === upper);
  if (byTicker) return byTicker.ticker;

  // 2. Exact name match (case-insensitive)
  const byName = ETF_DB.find(e => e.name.toLowerCase() === lower);
  if (byName) return byName.ticker;

  // 3. Yahoo Finance 형식 ticker는 DB에 없어도 그대로 사용
  // (.KS .KQ = 한국주식, =F = 선물, ^ = 지수, -USD = 크립토, =X = 환율)
  if (/\.(KS|KQ)$/i.test(trimmed)) return trimmed.toUpperCase();
  if (/=F$/i.test(trimmed)) return trimmed.toUpperCase();
  if (/^[\^]/.test(trimmed)) return trimmed.toUpperCase();
  if (/-USD$/i.test(trimmed)) return trimmed.toUpperCase();
  if (/=X$/i.test(trimmed)) return trimmed.toUpperCase();

  return null;
}

// ── Pass 2: DB 매칭 실패한 것만 AI로 처리 ────────────────────────────────────
const MAP_PROMPT = `You are a financial asset ticker mapper. Given a list of asset names that could NOT be matched to a known ticker, return the single best ticker for each one. Do NOT calculate weights — just map names to tickers.

RULES:
1. If it looks like a Korean stock by English name → use Yahoo Finance .KS ticker:
   - Samsung Electronics / Samsung / 삼성전자 → "005930.KS"
   - SK Hynix / SK하이닉스 → "000660.KS"
   - NAVER / 네이버 → "035420.KS"
   - Kakao / 카카오 → "035720.KS"
   - Hyundai Motor / 현대차 / 현대자동차 → "005380.KS"
   - Kia / 기아 → "000270.KS"
   - LG Chem / LG화학 → "051910.KS"
   - Samsung SDI / 삼성SDI → "006400.KS"
   - POSCO / 포스코 → "005490.KS"
   - KB Financial / KB금융 → "105560.KS"
   - Kakao Bank / 카카오뱅크 → "323410.KS"
   - HYBE / 하이브 → "352820.KQ"
   - Krafton / 크래프톤 → "259960.KS"

2. KOSPI market / 코스피 general → "069500.KS" (KODEX 200)
   KOSDAQ market / 코스닥 general → "229200.KS" (KODEX 코스닥150)

3. US broad indexes / funds:
   - S&P 500 / 인덱스 / 500 → "SPY"
   - Nasdaq / 나스닥 / tech index → "QQQ"
   - US total market → "VTI"
   - Dividend / 배당 → "SCHD"

4. Bonds:
   - Long-term bond 20yr+ / 장기채 → "TLT"
   - Mid-term bond 7-10yr / US Treasury Bond 10Y / 중기채 → "IEF"
   - Short-term bond / 단기채 → "SHY"
   - TIPS / inflation / 물가연동 → "TIP"

5. Alternatives:
   - Gold / 금 → "GLD"
   - REITs / 리츠 / 부동산 → "VNQ"
   - Oil / 원유 → "USO"
   - Developed ex-US / 선진국 → "EFA"
   - Emerging markets / 신흥국 (not Korea-specific) → "EEM"

6. Cash equivalents:
   - Cash / MMF / 예금 / CMA / 청약 / 보증금 / 파킹통장 / 저축 → "CASH"

7. Crypto:
   - Bitcoin / BTC → "IBIT"
   - Ethereum / ETH → "ETH-USD"
   - Other crypto → "CASH"

8. Individual US stocks → nearest sector ETF:
   - Big tech (AAPL, MSFT, GOOGL, AMZN, META, NVDA, NFLX, TSLA) → "QQQ"
   - Healthcare → "VHT"
   - Finance → "VTI"
   - Energy → "VTI"
   - Other → "VTI"

Return ONLY valid JSON, no markdown fences:
{
  "mappings": [
    { "name": "Samsung Electronics", "ticker": "005930.KS" },
    { "name": "US Treasury Bond 10Y", "ticker": "IEF" }
  ]
}`;

// ── Server-side weight calculation (JS math, 100% accurate) ──────────────────
function computeWeights(
  items: { name: string; value: number }[],
  mappings: { name: string; ticker: string }[],
  valueType: 'amount' | 'percent'
): { ticker: string; weight: number; original: string }[] {
  const nameToTicker = new Map(mappings.map(m => [m.name, m.ticker]));

  // Merge items by ticker
  const byTicker = new Map<string, { total: number; names: string[] }>();
  for (const item of items) {
    if (item.value <= 0) continue;
    const ticker = nameToTicker.get(item.name) ?? 'VTI';
    const existing = byTicker.get(ticker) ?? { total: 0, names: [] };
    byTicker.set(ticker, { total: existing.total + item.value, names: [...existing.names, item.name] });
  }

  if (byTicker.size === 0) throw new Error('유효한 자산을 찾을 수 없습니다.');

  const total = [...byTicker.values()].reduce((s, v) => s + v.total, 0);
  if (total <= 0) throw new Error('자산 합계가 0입니다. 이미지를 확인해주세요.');

  // Calculate weights with full JS precision
  const assets = [...byTicker.entries()].map(([ticker, { total: v, names }]) => ({
    ticker,
    weight: (v / total) * 100,
    original: names.join(', '),
  }));

  // Round to 1 decimal, then fix rounding error on largest item
  const round1 = (n: number) => Math.round(n * 10) / 10;
  const rounded = assets.map(a => ({ ...a, weight: round1(a.weight) }));
  const sum = round1(rounded.reduce((s, a) => s + a.weight, 0));
  const diff = round1(100 - sum);
  if (diff !== 0) {
    const maxIdx = rounded.reduce((mi, a, i, arr) => (a.weight > arr[mi].weight ? i : mi), 0);
    rounded[maxIdx].weight = round1(rounded[maxIdx].weight + diff);
  }

  // Sort by weight descending
  return rounded.sort((a, b) => b.weight - a.weight);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('image') as File | null;
    if (!file) return NextResponse.json({ error: '이미지가 없습니다.' }, { status: 400 });

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mediaType = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

    // ── Pass 1: OCR (Sonnet vision) ───────────────────────────────────────────
    const pass1 = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: OCR_PROMPT,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: '이 포트폴리오 이미지의 모든 자산 항목을 추출해줘.' },
        ],
      }],
    });

    const ocr_raw = pass1.content[0].type === 'text' ? pass1.content[0].text : '';
    const ocr_match = ocr_raw.match(/\{[\s\S]*\}/);
    if (!ocr_match) throw new Error('이미지에서 자산 정보를 추출하지 못했습니다. 더 선명한 이미지를 사용해주세요.');

    const ocr = JSON.parse(ocr_match[0]) as {
      value_type: 'amount' | 'percent';
      items: { name: string; value: number; raw_text: string }[];
    };

    if (!ocr.items?.length) throw new Error('이미지에서 자산을 찾을 수 없습니다.');

    // ── Pass 2: DB pre-match → 미매칭만 AI로 처리 ───────────────────────────
    const preMapped = new Map<string, string>();
    const needsAI: string[] = [];

    for (const item of ocr.items) {
      const match = preMatchTicker(item.name);
      if (match) {
        preMapped.set(item.name, match);
      } else {
        needsAI.push(item.name);
      }
    }

    let aiMappings: { name: string; ticker: string }[] = [];
    if (needsAI.length > 0) {
      const pass2 = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: MAP_PROMPT,
        messages: [{
          role: 'user',
          content: `다음 자산 이름들을 티커로 매핑해줘 (이름→티커 변환만):\n${JSON.stringify(needsAI)}`,
        }],
      });

      const map_raw = pass2.content[0].type === 'text' ? pass2.content[0].text : '';
      const map_match = map_raw.match(/\{[\s\S]*\}/);
      if (!map_match) throw new Error('ETF 매핑 중 오류가 발생했습니다. 다시 시도해주세요.');

      const { mappings: aiResult } = JSON.parse(map_match[0]) as {
        mappings: { name: string; ticker: string }[];
      };
      aiMappings = aiResult;
    }

    const mappings = [
      ...Array.from(preMapped.entries()).map(([name, ticker]) => ({ name, ticker })),
      ...aiMappings,
    ];

    // ── Server: all math in JS ────────────────────────────────────────────────
    const assets = computeWeights(ocr.items, mappings, ocr.value_type);

    return NextResponse.json({ assets });
  } catch (e: unknown) {
    await logError(e, { route: '/api/parse-portfolio' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
