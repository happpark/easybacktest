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
  title: 'EasyBacktest — Backtest Any Portfolio in Seconds',
  description: 'Enter your holdings or upload a screenshot — instantly see CAGR, Max Drawdown, Sharpe Ratio and more. Free portfolio backtester.',
  metadataBase: new URL('https://easybacktest.app'),
  openGraph: {
    title: 'EasyBacktest — Backtest Any Portfolio in Seconds',
    description: 'Enter your holdings or upload a screenshot — instantly see CAGR, Max Drawdown, Sharpe Ratio and more. Free portfolio backtester.',
    url: 'https://easybacktest.app',
    siteName: 'EasyBacktest',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EasyBacktest — Backtest Any Portfolio in Seconds',
    description: 'Enter your holdings or upload a screenshot — instantly see CAGR, Max Drawdown & Sharpe. Free.',
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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","w09btehhz5");`,
          }}
        />
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
