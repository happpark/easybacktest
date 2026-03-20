import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Easybacktest — Screenshot to Backtest';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const rows = [
  { ticker: 'SPY',  pct: '40%', w: 200, color: '#63b3ed' },
  { ticker: 'QQQ',  pct: '25%', w: 125, color: '#7ae9ab' },
  { ticker: 'GLD',  pct: '20%', w: 100, color: '#F5A623' },
  { ticker: 'TLT',  pct: '15%', w: 75,  color: '#a78bfa' },
];

const metrics = [
  { label: 'CAGR',         value: '+12.4%', color: '#7ae9ab' },
  { label: 'Max Drawdown', value: '−18.3%', color: '#f25b5b' },
  { label: 'Sharpe',       value: '0.87',   color: '#63b3ed' },
];

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center',
          background: 'linear-gradient(140deg, #080c18 0%, #0d1a2e 55%, #080c18 100%)',
          padding: '0 72px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* subtle grid */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(90deg,rgba(255,255,255,0.025) 0,rgba(255,255,255,0.025) 1px,transparent 1px,transparent 96px)',
          display: 'flex',
        }} />

        {/* ── LEFT: mock portfolio card ── */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          width: 340, flexShrink: 0,
          background: 'rgba(255,255,255,0.045)',
          border: '1px solid rgba(255,255,255,0.11)',
          borderRadius: 20,
          padding: '26px 28px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 22 }}>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em' }}>MY PORTFOLIO</span>
            <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 12 }}>Screenshot</span>
          </div>
          {rows.map(r => (
            <div key={r.ticker} style={{ display: 'flex', flexDirection: 'column', marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                <span style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>{r.ticker}</span>
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>{r.pct}</span>
              </div>
              <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, display: 'flex' }}>
                <div style={{ width: r.w, height: 4, background: r.color, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>

        {/* ── CENTER: arrow ── */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          flex: 1, gap: 10, padding: '0 32px',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 11, letterSpacing: '0.12em', fontWeight: 700 }}>ANY SCREENSHOT</span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 0,
            width: '100%',
          }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(99,179,237,0.25)', display: 'flex' }} />
            <span style={{ color: 'rgba(99,179,237,0.7)', fontSize: 28, margin: '0 8px' }}>▶</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(99,179,237,0.25)', display: 'flex' }} />
          </div>
          <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 11, letterSpacing: '0.12em', fontWeight: 700 }}>INSTANT ANALYSIS</span>
        </div>

        {/* ── RIGHT: headline + metrics ── */}
        <div style={{ display: 'flex', flexDirection: 'column', width: 400, flexShrink: 0 }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 52, fontWeight: 900, color: '#ffffff', lineHeight: 1.1 }}>
              Backtest
            </div>
            <div style={{ fontSize: 52, fontWeight: 900, lineHeight: 1.1, color: '#63b3ed' }}>
              in seconds.
            </div>
            <div style={{ marginTop: 12, fontSize: 16, color: 'rgba(255,255,255,0.38)', fontWeight: 500 }}>
              Upload any portfolio screenshot
            </div>
          </div>

          {metrics.map(m => (
            <div key={m.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12, padding: '14px 20px',
              marginBottom: 10,
            }}>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 600, letterSpacing: '0.05em' }}>{m.label}</span>
              <span style={{ color: m.color, fontSize: 22, fontWeight: 800 }}>{m.value}</span>
            </div>
          ))}
        </div>

        {/* domain */}
        <div style={{
          position: 'absolute', bottom: 36, right: 72,
          fontSize: 16, color: 'rgba(255,255,255,0.18)', fontWeight: 600,
        }}>
          easybacktest.app
        </div>
      </div>
    ),
    { ...size },
  );
}
