import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Easybacktest — Screenshot your portfolio. Find out if it\'s actually working.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const tableRows = [
  { ticker: 'SPY', total: '$15,407' },
  { ticker: 'QQQ', total: '$6,523' },
  { ticker: 'IEF', total: '$6,223' },
  { ticker: 'IEI', total: '$3,087' },
];

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center',
          background: 'linear-gradient(120deg, #0b0f1a 0%, #0d1525 55%, #080d18 100%)',
          padding: '0 72px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* ── LEFT: table card ── */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          width: 210, flexShrink: 0,
          borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
          border: '1px solid rgba(255,255,255,0.13)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', background: '#2d3748', padding: '11px 16px' }}>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>My Portfolio</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', background: '#e2e8f0', padding: '8px 16px' }}>
            <span style={{ color: '#2d3748', fontSize: 12, fontWeight: 700 }}>Ticker</span>
            <span style={{ color: '#2d3748', fontSize: 12, fontWeight: 700 }}>Total</span>
          </div>
          {tableRows.map((r, i) => (
            <div key={r.ticker} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: i % 2 === 0 ? '#f7fafc' : '#edf2f7',
              padding: '11px 16px',
            }}>
              <span style={{ color: '#1a202c', fontSize: 14, fontWeight: 700 }}>{r.ticker}</span>
              <span style={{ color: '#4a5568', fontSize: 13 }}>{r.total}</span>
            </div>
          ))}
        </div>

        {/* arrow */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 18px', flexShrink: 0 }}>
          <span style={{ color: 'rgba(99,179,237,0.65)', fontSize: 26, fontWeight: 900 }}>→</span>
        </div>

        {/* ── MIDDLE: metric cards ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 185, flexShrink: 0 }}>
          {[
            { label: 'CAGR',         value: '+12.4%', color: '#48bb78' },
            { label: 'MAX DRAWDOWN', value: '−18.3%', color: '#fc8181' },
            { label: 'SHARPE RATIO', value: '0.87',   color: '#63b3ed' },
          ].map(m => (
            <div key={m.label} style={{
              display: 'flex', flexDirection: 'column',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 12, padding: '14px 18px',
            }}>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6 }}>{m.label}</span>
              <span style={{ color: m.color, fontSize: 30, fontWeight: 900 }}>{m.value}</span>
            </div>
          ))}
        </div>

        {/* ── RIGHT: headline ── */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingLeft: 52 }}>
          {/* badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(72,187,120,0.12)',
            border: '1px solid rgba(72,187,120,0.3)',
            borderRadius: 100, padding: '6px 16px',
            marginBottom: 20, alignSelf: 'flex-start',
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#48bb78' }} />
            <span style={{ color: '#48bb78', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em' }}>PORTFOLIO BACKTEST</span>
          </div>

          {/* main headline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <span style={{ fontSize: 80, fontWeight: 900, color: '#ffffff', lineHeight: 1.05 }}>Screenshot.</span>
            <span style={{ fontSize: 80, fontWeight: 900, color: '#48bb78', lineHeight: 1.05 }}>Backtest.</span>
            <span style={{ fontSize: 80, fontWeight: 900, color: '#ffffff', lineHeight: 1.05 }}>Done.</span>
          </div>

          {/* subtitle */}
          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.38)', fontWeight: 400 }}>Screenshot your portfolio.</span>
            <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.38)', fontWeight: 400 }}>Find out if it's actually working.</span>
          </div>
        </div>

        {/* domain */}
        <div style={{
          position: 'absolute', bottom: 36, right: 72,
          fontSize: 15, color: 'rgba(255,255,255,0.2)', fontWeight: 600,
        }}>
          easybacktest.app
        </div>
      </div>
    ),
    { ...size },
  );
}
