import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Easybacktest — 포트폴리오 백테스트';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0a0f 0%, #0f1729 50%, #0a0a0f 100%)',
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Grid lines decoration */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 80px)',
        }} />

        {/* Badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'rgba(99,179,237,0.15)', border: '1px solid rgba(99,179,237,0.3)',
          borderRadius: '100px', padding: '8px 20px', marginBottom: '32px',
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#63b3ed' }} />
          <span style={{ color: '#63b3ed', fontSize: '16px', fontWeight: 700, letterSpacing: '0.1em' }}>
            PORTFOLIO BACKTEST
          </span>
        </div>

        {/* Title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '24px' }}>
          <span style={{ fontSize: '72px', fontWeight: 900, color: '#ffffff', lineHeight: 1.1 }}>
            내 포트폴리오,
          </span>
          <span style={{ fontSize: '72px', fontWeight: 900, lineHeight: 1.1,
            background: 'linear-gradient(90deg, #63b3ed, #7ae9ab)',
            color: 'transparent',
          }}>
            과거엔 어떤 성과였을까?
          </span>
        </div>

        {/* Subtitle */}
        <div style={{ fontSize: '24px', color: 'rgba(255,255,255,0.5)', marginBottom: '60px' }}>
          보유 종목을 입력하면 CAGR · MDD · Sharpe를 즉시 분석해드려요
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '40px' }}>
          {[
            { label: 'CAGR', value: '+12.4%', color: '#7ae9ab' },
            { label: 'MDD', value: '-18.3%', color: '#f25b5b' },
            { label: 'Sharpe', value: '0.87', color: '#63b3ed' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', fontWeight: 700 }}>
                {s.label}
              </span>
              <span style={{ fontSize: '32px', fontWeight: 900, color: s.color, fontVariantNumeric: 'tabular-nums' }}>
                {s.value}
              </span>
            </div>
          ))}
        </div>

        {/* Domain */}
        <div style={{
          position: 'absolute', bottom: '48px', right: '80px',
          fontSize: '20px', color: 'rgba(255,255,255,0.25)', fontWeight: 600,
        }}>
          easybacktest.app
        </div>
      </div>
    ),
    { ...size },
  );
}
