import type { Metadata, Viewport } from 'next';
import './globals.css';
import { LangProvider } from '@/lib/i18n';
import { GoogleAnalytics } from '@next/third-parties/google';

export const viewport: Viewport = {
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'Easybacktest — 포트폴리오 백테스트',
  description: '보유 종목을 입력하면 CAGR·MDD·Sharpe를 즉시 분석. 스크린샷 하나로 내 포트폴리오 과거 성과를 확인하세요.',
  metadataBase: new URL('https://easybacktest.app'),
  openGraph: {
    title: 'Easybacktest — 포트폴리오 백테스트',
    description: '보유 종목을 입력하면 CAGR·MDD·Sharpe를 즉시 분석. 스크린샷 하나로 내 포트폴리오 과거 성과를 확인하세요.',
    url: 'https://easybacktest.app',
    siteName: 'Easybacktest',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Easybacktest — 포트폴리오 백테스트',
    description: '보유 종목을 입력하면 CAGR·MDD·Sharpe를 즉시 분석.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0b0f1a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Easybacktest" />
      </head>
      <body className="font-body antialiased bg-background text-foreground">
        <LangProvider>{children}</LangProvider>
        <GoogleAnalytics gaId="G-Q1DRZ7VFVS" />
      </body>
    </html>
  );
}
