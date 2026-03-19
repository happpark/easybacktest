import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

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

// ── Pass 2: Name → Ticker mapping ONLY (zero math) ───────────────────────────
const MAP_PROMPT = `You are a financial asset ticker mapper. Given a list of asset names, return the single best US ETF ticker for each one. Do NOT calculate weights or percentages — just map names to tickers.

MAPPING TABLE:

Indexes / broad funds:
- S&P 500 (SPY, IVV, 인덱스, 500) → "SPY"
- Nasdaq / QQQ / 나스닥 / tech index → "QQQ"
- US total market / VTI / 미국전체 → "VTI"
- Dividend / 배당 / SCHD → "SCHD"

Bonds:
- Long-term bond 20yr+ / TLT / 장기채 → "TLT"
- Mid-term bond 7-10yr / IEF / 중기채 → "IEF"
- Short-term bond / SHY / 단기채 → "SHY"
- TIPS / inflation / 물가연동 → "TIP"

Alternatives:
- Gold / 금 / GLD → "GLD"
- REITs / 리츠 / 부동산 / VNQ → "VNQ"
- Oil / 원유 / USO → "USO"

International:
- Developed ex-US / EFA / 선진국 → "EFA"
- Emerging markets / EEM / 신흥국 → "EEM"
- Korea stocks / 한국 / KOSPI / 코스피 individual stocks → "EEM"

Cash equivalents:
- Cash / MMF / 예금 / CMA / 청약 / 보증금 / 파킹통장 / 저축 / 달러예금 / 외화예금 → "CASH"

Crypto:
- Bitcoin / BTC → "IBIT"
- Other crypto / 코인 → "CASH"

Already a US ETF ticker (e.g. SCHD, VTI, TLT, QQQ, SPY, GLD...):
- Use it directly as-is

Individual US stocks → map to nearest sector ETF:
- Big tech (AAPL, MSFT, GOOGL, AMZN, META, NVDA, NFLX, TSLA...) → "QQQ"
- Healthcare (JNJ, PFE, UNH, ABBV...) → "VHT"
- Defense (LMT, RTX, NOC, BA...) → "ITA"
- Telecom/utilities (T, VZ, NEE...) → "SCHD"
- Staples (KO, PEP, WMT, PG...) → "SCHD"
- Finance (JPM, BAC, GS, V, MA...) → "VTI"
- Energy (XOM, CVX...) → "VTI"
- Other → "VTI"

Return ONLY valid JSON, no markdown fences:
{
  "mappings": [
    { "name": "삼성전자", "ticker": "EEM" },
    { "name": "QQQ", "ticker": "QQQ" }
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
    const formData = await req.formData();
    const file = formData.get('image') as File | null;
    if (!file) return NextResponse.json({ error: '이미지가 없습니다.' }, { status: 400 });

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

    // ── Pass 2: Name → Ticker mapping only (Haiku, no math) ──────────────────
    const pass2 = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: MAP_PROMPT,
      messages: [{
        role: 'user',
        content: `다음 자산 이름들을 ETF 티커로 매핑해줘 (수학 계산 없이 이름→티커 변환만):\n${JSON.stringify(ocr.items.map(i => i.name))}`,
      }],
    });

    const map_raw = pass2.content[0].type === 'text' ? pass2.content[0].text : '';
    const map_match = map_raw.match(/\{[\s\S]*\}/);
    if (!map_match) throw new Error('ETF 매핑 중 오류가 발생했습니다. 다시 시도해주세요.');

    const { mappings } = JSON.parse(map_match[0]) as {
      mappings: { name: string; ticker: string }[];
    };

    // ── Server: all math in JS ────────────────────────────────────────────────
    const assets = computeWeights(ocr.items, mappings, ocr.value_type);

    return NextResponse.json({ assets });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '이미지 분석 중 오류가 발생했습니다.';
    console.error('[parse-portfolio error]', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
