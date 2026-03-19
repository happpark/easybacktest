'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

type Lang = 'ko' | 'en';

const translations = {
  ko: {
    // Nav
    nav_compose: '구성',
    nav_analysis: '분석',
    nav_mine: '내 기록',
    nav_community: '커뮤니티',
    nav_backtest_first: '먼저 백테스트를 실행하세요',
    nav_light_mode: '라이트 모드',
    nav_dark_mode: '다크 모드',
    nav_light: '라이트',
    nav_dark: '다크',
    // App
    app_subtitle: '포트폴리오 백테스트',
  },
  en: {
    nav_compose: 'Build',
    nav_analysis: 'Analysis',
    nav_mine: 'My Portfolios',
    nav_community: 'Community',
    nav_backtest_first: 'Run a backtest first',
    nav_light_mode: 'Light Mode',
    nav_dark_mode: 'Dark Mode',
    nav_light: 'Light',
    nav_dark: 'Dark',
    app_subtitle: 'Portfolio Backtester',
  },
} as const;

type TranslationKey = keyof typeof translations.ko;

interface LangContextType {
  lang: Lang;
  t: (key: TranslationKey) => string;
  toggleLang: () => void;
}

const LangContext = createContext<LangContextType>({
  lang: 'ko',
  t: (key) => translations.ko[key],
  toggleLang: () => {},
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('ko');
  useEffect(() => {
    const saved = localStorage.getItem('lang') as Lang | null;
    if (saved === 'ko' || saved === 'en') setLang(saved);
  }, []);
  const toggleLang = () => {
    const next: Lang = lang === 'ko' ? 'en' : 'ko';
    setLang(next);
    localStorage.setItem('lang', next);
  };
  const t = (key: TranslationKey) => translations[lang][key];
  return <LangContext.Provider value={{ lang, t, toggleLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
