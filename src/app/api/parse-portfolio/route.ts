import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Pass 1: OCR — extract raw assets & values from image ─────────────────────
const EXTRACT_PROMPT = `You are a financial document parser. Extract all investment assets visible in this portfolio image.

The image may show portfolio data in ONE of two formats — detect which:
A) VALUE format: shows monetary amounts (e.g. ₩3,500,000 / $150,829)
B) PERCENTAGE format: shows allocation percentages directly (e.g. "AAPL 34%")

For EACH asset line item output:
- name: asset name/ticker exactly as shown
- value: if format A → numeric monetary amount; if format B → the percentage number as-is (e.g. 34 for "34%")
- value_type: "amount" or "percent"
- raw_text: verbatim text from the image

Rules:
- Include EVERYTHING: stocks, funds, bonds, ETFs, cash, crypto, deposits, etc.
- NEVER skip a line item
- If unreadable, set value to 0 and describe in ocr_note
- Do NOT map to ETF tickers yet — just faithfully extract names and values

Return ONLY raw JSON, no markdown:
{
  "value_type": "percent",
  "currency": "USD",
  "items": [
    { "name": "GOOGL", "value": 34, "raw_text": "GOOGL 34%" },
    { "name": "AMZN", "value": 17.6, "raw_text": "AMZN 17.6%" }
  ],
  "ocr_note": "note any unclear values or ambiguities"
}`;

// ── Pass 2: Map extracted assets to ETF tickers + compute float weights ───────
const MAP_PROMPT = `You are a financial portfolio analyzer. Map portfolio assets to US-listed ETF tickers and compute weights.

Mapping rules — ETF/fund/index names:
- S&P 500 index / fund → "SPY"
- Nasdaq / tech-heavy / growth index → "QQQ"
- US total/broad market → "VTI"
- US dividend-focused → "SCHD"
- US long-term bonds (10y+) → "TLT"
- US mid-term bonds (3–10y) → "IEF"
- US short-term bonds (<3y) → "SHY"
- TIPS / inflation-linked → "TIP"
- Gold → "GLD"
- Real estate / REITs → "VNQ"
- Developed market ex-US stocks → "EFA"
- Emerging markets → "EEM"
- Korean individual stocks / KOSPI → "EEM"
- Cash / MMF / 예금 / CMA / 청약 / 보증금 / 파킹 / 저축 → "CASH"
- Bitcoin → "IBIT"
- Other crypto → "CASH"
- If the asset IS already a US ETF ticker (e.g. QQQ, VTI, SCHD, TLT…) → use it directly

Mapping rules — individual US stocks (map to nearest sector ETF):
- Big tech / software / internet (AAPL, MSFT, GOOGL, AMZN, META, FB, NVDA, NFLX, CRM, ADBE…) → "QQQ"
- EV / growth (TSLA, RIVN, LCID…) → "QQQ"
- Healthcare / pharma (JNJ, PFE, MRK, ABBV, UNH, GSK, AZN…) → "VHT"
- Defense / aerospace (LMT, RTX, NOC, BA, GD…) → "ITA"
- Telecom / utilities (T, VZ, TMUS, NEE, DUK…) → "SCHD"
- Consumer staples / tobacco (KO, PEP, MO, PM, BTI, PG, WMT…) → "SCHD"
- Consumer discretionary (DIS, NKE, MCD, SBUX…) → "VTI"
- Finance / banks (JPM, BAC, GS, V, MA…) → "VTI"
- Energy (XOM, CVX, COP…) → "VTI"
- Other US stocks not listed above → "VTI"

Steps (mandatory):
1. Map each item to exactly one ticker using rules above
2. Merge items with the same ticker by summing their values
3. total = sum of ALL merged values
4. weight_i = round(value_i / total * 100, 2)   ← TWO decimal places
5. Adjust the largest weight so all weights sum to EXACTLY 100.00

Return ONLY raw JSON, no markdown:
{
  "assets": [
    { "ticker": "QQQ", "weight": 45.23, "original": "GOOGL, AMZN, MSFT, AAPL" },
    { "ticker": "SCHD", "weight": 34.77, "original": "BTI, T" },
    { "ticker": "VTI", "weight": 20.00, "original": "DIS" }
  ],
  "note": "한국어로 애매한 매핑 간략 설명"
}`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File | null;
    if (!file) {
      return NextResponse.json({ error: '이미지가 없습니다.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mediaType = (file.type || 'image/jpeg') as
      | 'image/jpeg'
      | 'image/png'
      | 'image/gif'
      | 'image/webp';

    // ── Pass 1: image → raw assets ────────────────────────────────────────────
    const pass1 = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: EXTRACT_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: '이 포트폴리오 이미지의 모든 자산과 금액을 추출해줘.' },
          ],
        },
      ],
    });

    const raw1 = pass1.content[0].type === 'text' ? pass1.content[0].text : '';
    const match1 = raw1.match(/\{[\s\S]*\}/);
    if (!match1) {
      throw new Error('이미지에서 자산 정보를 추출하지 못했습니다. 더 선명한 이미지를 사용해주세요.');
    }

    const extracted = JSON.parse(match1[0]) as {
      value_type: 'amount' | 'percent';
      currency: string;
      items: { name: string; value: number; raw_text: string }[];
      ocr_note?: string;
    };

    if (!extracted.items || extracted.items.length === 0) {
      throw new Error('이미지에서 자산을 찾을 수 없습니다.');
    }

    // ── Pass 2: raw assets → ETF tickers + float weights ─────────────────────
    const pass2 = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: MAP_PROMPT,
      messages: [
        {
          role: 'user',
          content: `다음 자산 목록을 ETF 티커로 매핑하고 비중을 계산해줘.\n값 형식: ${extracted.value_type === 'percent' ? '퍼센트(%)로 이미 비중이 표시됨 — 합산 후 100으로 정규화 필요' : '금액(합산 후 비중 계산 필요)'}\n\n${JSON.stringify(extracted.items, null, 2)}`,
        },
      ],
    });

    const raw2 = pass2.content[0].type === 'text' ? pass2.content[0].text : '';
    const match2 = raw2.match(/\{[\s\S]*\}/);
    if (!match2) {
      throw new Error('ETF 매핑 중 오류가 발생했습니다. 다시 시도해주세요.');
    }

    const mapped = JSON.parse(match2[0]) as {
      assets: { ticker: string; weight: number; original: string }[];
      note?: string;
    };

    // ── Server-side float rescaling (safety net) ─────────────────────────────
    const assets = mapped.assets;
    const weightSum = assets.reduce((s, a) => s + a.weight, 0);
    if (Math.abs(weightSum - 100) > 0.01) {
      const scaled = assets.map(a => ({
        ...a,
        weight: Math.round((a.weight / weightSum) * 10000) / 100,
      }));
      const scaledSum = scaled.reduce((s, a) => s + a.weight, 0);
      const diff = Math.round((100 - scaledSum) * 100) / 100;
      const maxIdx = scaled.reduce((mi, a, i, arr) => (a.weight > arr[mi].weight ? i : mi), 0);
      scaled[maxIdx].weight = Math.round((scaled[maxIdx].weight + diff) * 100) / 100;
      mapped.assets = scaled;
    }

    const note = [extracted.ocr_note, mapped.note].filter(Boolean).join(' / ') || null;
    return NextResponse.json({ assets: mapped.assets, note });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '이미지 분석 중 오류가 발생했습니다.';
    console.error('[parse-portfolio error]', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
