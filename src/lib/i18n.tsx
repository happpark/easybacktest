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

    // AuthButton
    auth_signing_in: '로그인 중...',
    auth_sign_in_google: 'Google로 로그인',
    auth_user_fallback: '사용자',
    auth_sign_out: '로그아웃',

    // AssetInputScreen — landing
    landing_headline: '내 포트폴리오,\n과거엔 어떤 성과였을까?',
    landing_subtext: '보유 종목을 입력하면 역대 수익률·리스크를 분석해드려요.',
    landing_screenshot_title: '스크린샷으로 바로 분석',
    landing_screenshot_desc: '증권사 앱·엑셀 화면을 캡처해서 올리면 AI가 자동으로 포트폴리오를 읽어요',
    landing_upload_button: '이미지 파일 선택',
    landing_paste_hint: '클립보드 이미지 바로 붙여넣기',
    landing_manual_title: '직접 구성하기',
    landing_manual_desc: '원하는 자산을 선택하거나 티커를 직접 입력해서 포트폴리오를 만들어요',
    landing_start_button: '시작하기 →',

    // OCR overlay
    ocr_analyzing: 'AI 분석 중...',
    ocr_mapping: '자산별 비중 계산 중 ...',
    ocr_analyzing_desc: '포트폴리오 이미지를 분석하고 있어요.',
    ocr_mapping_desc: 'ETF 티커로 매핑하고 있어요.',
    ocr_busy_prefix: '현재',
    ocr_busy_suffix: '명 동시 분석 중',
    ocr_busy_note: '접속자가 많으면 오래 걸릴 수 있어요.',

    // Parse confirm dialog
    parse_dialog_title: '이미지 분석 결과 확인',
    parse_dialog_desc: '아래 매핑이 맞는지 확인 후 적용해주세요.',
    parse_unknown_ticker: '미지원',
    parse_unknown_warning: '미지원 티커는 적용 후 직접 수정해주세요.',
    parse_cancel: '취소',
    parse_login_required: '이미지 분석은 로그인 후 이용할 수 있어요.',
    parse_apply: '이 비중으로 적용',

    // Short history warning dialog
    short_history_title: '데이터 부족 경고',
    short_history_desc: '선택한 자산 중 상장 10년 미만인 항목이 있어 백테스트 결과가 제한될 수 있습니다.',
    short_history_listed: '상장',
    short_history_year: '년',
    short_history_cancel: '취소',
    short_history_proceed: '그래도 분석하기',

    // Input controls
    input_weight_label: '비중',
    input_amount_label: '금액',
    input_custom_label: '커스텀',
    input_weight_done: '✓ 완료',
    input_weight_over: '% 초과',
    input_weight_left: '% 남음',
    input_amount_done: '✓ 입력됨',
    input_amount_placeholder: '금액 입력하세요',

    // Rebalancing picker
    rb_label: '리밸런싱 주기',
    rb_monthly: '매월',
    rb_quarterly: '매분기',
    rb_yearly: '매년',
    rb_custom: '직접입력',
    rb_months_unit: '개월',

    // Expert mode — portfolio composition
    expert_portfolio_label: '포트폴리오 구성',
    expert_distribute: '균등 배분',
    expert_ticker_placeholder: '티커 입력...',
    expert_add_asset: '자산 추가',
    expert_ticker_add_new: '새 종목 추가',
    expert_ticker_input_placeholder: '티커 입력 (예: SPY)',
    expert_custom_add_label: '커스텀 추가',
    expert_not_in_db: '데이터베이스에 없는 종목입니다.',
    expert_add_btn: '추가',
    expert_copy_portfolio: '이 포트폴리오 복사',
    expert_slot_distribute: '균등',
    expert_slot_left: '남음',

    // Backtest run button
    run_backtest: '분석 시작하기',
    run_backtest_multi: '개 포트폴리오 비교 분석',

    // Beginner mode categories
    cat_stocks: '주식',
    cat_bonds: '채권',
    cat_commodities: '원자재',
    cat_realestate: '부동산',
    cat_cash: '현금',
    cat_crypto: '암호화폐',

    // Beginner ETF labels
    etf_us_total: '미국 전체시장',
    etf_tech_nasdaq: '기술주 / 나스닥',
    etf_dividend: '배당주',
    etf_sp500_desc: '미국 대형 우량주 500',
    etf_developed: '선진국 (미국 외)',
    etf_developed_desc: '유럽·일본 등',
    etf_emerging: '신흥국',
    etf_emerging_desc: '중국·한국·인도 등',
    etf_longbond: '미국 장기채',
    etf_longbond_desc: '20년+ 국채',
    etf_midbond: '미국 중기채',
    etf_midbond_desc: '7-10년 국채',
    etf_shortbond: '단기 국채',
    etf_shortbond_desc: '1-3년 국채',
    etf_tips: '물가연동채',
    etf_tips_desc: '인플레이션 헤지',
    etf_gold: '금',
    etf_oil: '원유',
    etf_oil_desc: 'WTI 원유',
    etf_commodities_broad: '원자재 전반',
    etf_commodities_broad_desc: '에너지·금속·농산물',
    etf_reit: '미국 리츠',
    etf_cash: '현금',
    etf_cash_desc: '수익 0%, 변동성 0%',
    etf_bitcoin: '비트코인',
    etf_ethereum: '이더리움',

    // Preset portfolios
    preset_allweather: '올웨더',
    preset_allweather_desc: '전통 균형',
    preset_6040_desc: '전통 균형',
    preset_golden_butterfly: '황금 나비',
    preset_permanent: '영구 포트폴리오',
    preset_section_label: '유명 포트폴리오 바로 테스트',

    // ResultScreen
    result_loading_title: '퀀트 엔진 가동 중',
    result_loading_step0: '과거 데이터 다운로드 중',
    result_loading_step1: '수익률 계산 중',
    result_loading_step2: 'AI 인사이트 생성 중',
    result_loading_note: '데이터 양에 따라 30초 이상 소요될 수 있습니다.',
    result_error_title: '백테스트 실패',
    result_error_unknown: '알 수 없는 오류가 발생했습니다.',
    result_retry: '다시 시도',
    result_edit_portfolio: '포트폴리오 수정',
    result_fetch_fail: '결과를 불러오는 데 실패했습니다.',
    result_title: '백테스트 결과',
    result_copy_title: '결과 복사',
    result_cagr_label: '연평균 수익률',
    result_best_year: '최고 실적',
    result_return: '수익률',
    result_mdd_label: '최대 낙폭',
    result_max_drop: '최대 하락',
    result_growth_chart_title: '포트폴리오 성장 추이',
    result_initial_investment: '$1,000 초기 투자 기준',
    result_initial_label: '초기 투자금',
    result_final_label: '최종 평가액',
    result_radar_title: '포트폴리오 오각형',
    result_radar_benchmark: 'S&P 500(SPY) 벤치마크 비교',
    result_table_metric: '지표',
    result_volatility: '변동성',
    result_dividend: '배당률',
    tooltip_cagr: '매년 평균 얼마나 벌었는지예요.\n높을수록 좋아요.',
    tooltip_mdd: '최악의 경우 얼마나 하락했는지예요.\n낮을수록(덜 손실) 좋아요.',
    tooltip_volatility: '수익률이 얼마나 출렁이는지예요.\n낮을수록 안정적이에요.',
    tooltip_sharpe: '위험 대비 수익이 얼마나 효율적인지예요.',
    tooltip_dividend: '보유 종목의 연간 배당 수익률이에요.',
    result_login_toast: '로그인 후 저장됩니다',
    // DCA
    dca_section_title: '매월 추가 투자했다면?',
    dca_section_desc: '일시 투자 대신 매달 일정 금액을 꾸준히 넣었을 때의 결과예요',
    dca_custom_placeholder: '직접 입력 ($)',
    dca_calculate: '계산하기',
    dca_calculating: '계산 중...',
    dca_total_invested: '총 투자금',
    dca_final_value: '최종 자산',
    dca_profit: '수익금',
    dca_return: '수익률',
    dca_chart_portfolio: '자산가치',
    dca_chart_cost: '투자원금',
    dca_chart_spy: 'S&P 500',
    dca_monthly_label: '월',
    dca_period: '투자기간',
    dca_cagr: '연평균 수익률',
    dca_mdd: '최대 낙폭',
    dca_reset: '초기화',
    dca_amount_label: '월 적립',

    result_login_nudge_title: '이 결과를 저장하고 싶으신가요?',
    result_login_nudge_desc: '로그인하면 포트폴리오 저장 · 비교 분석을 무제한으로 이용할 수 있어요',
    result_login_nudge_cta: 'Google로 로그인',
    result_share: '공유',
    result_copied: '복사됨!',
    result_save_to_portfolio: '내 포트폴리오에 저장',
    result_saved: '저장 완료!',
    result_portfolio_name_label: '포트폴리오 이름',
    result_portfolio_name_placeholder: '예: 안정형 포트폴리오',
    result_cancel: '취소',
    result_save_confirm: '저장하기',
    result_default_portfolio_name: '포트폴리오',
    result_share_text_title: '📊 AlphaFlow 포트폴리오 백테스트 결과',
    result_share_composition: '구성',
    result_share_period: '기간',

    // Multi result
    multi_title: '포트폴리오 비교 분석',
    multi_radar_title: '포트폴리오 오각형 비교',
    multi_growth_title: '포트폴리오 성장 비교',
    multi_initial: '$1,000 초기 투자 기준',
    multi_table_title: '전략별 수치 비교',
    multi_metric_col: '지표',
    multi_volatility: '변동성',
    multi_dividend: '배당',
    multi_saved: '저장됨',
    multi_save: '저장',
    multi_portfolio_name_label: '포트폴리오 이름',
    multi_portfolio_name_placeholder: '예: 안정형 포트폴리오',
    multi_cancel: '취소',
    multi_save_confirm: '저장하기',

    // Radar descriptions
    radar_attack: '수익력: 연평균 수익률을 기반으로 자산의 성장성을 나타냅니다.',
    radar_defense: '방어력: 최대 낙폭을 기반으로 위기 시 손실 최소화 능력을 나타냅니다.',
    radar_volatility: '변동성 관리: 표준편차를 기반으로 주가 변동 폭이 얼마나 안정적인지 나타냅니다.',
    radar_sharpe: '효율성: 위험 한 단위당 얼마나 효율적으로 수익을 냈는지 나타냅니다.',
    radar_dividend: '배당 수익: 최근 1년 배당 수익률을 기반으로 현금 흐름 창출 능력을 나타냅니다.',

    // Rebalancing labels (result screen)
    rb_result_monthly: '매월 리밸런싱',
    rb_result_quarterly: '매분기 리밸런싱',
    rb_result_yearly: '매년 리밸런싱',
    rb_result_custom_suffix: '개월 리밸런싱',

    // CommunityScreen
    community_title: '커뮤니티',
    community_subtitle: '인기 포트폴리오를 가져와 직접 백테스트하세요.',
    community_load_button: '이 포트폴리오 가져오기',

    // Community portfolio titles
    cp_growth_allweather: '성장형 올웨더',
    cp_nasdaq_aggressive: '나스닥 공격형',
    cp_dividend_stable: '배당 안정성',
    cp_crypto_maxi: '크립토 맥시',

    // MyPortfoliosScreen
    my_title: '내 포트폴리오',
    my_count_suffix: '개 저장됨',
    my_compare: '비교',
    my_cancel: '취소',
    my_empty_title: '저장된 포트폴리오가 없어요',
    my_empty_desc: '백테스트 결과 화면 하단의\n저장하기 버튼을 눌러 포트폴리오를 보관하세요.',
    my_empty_save_hint: '저장하기',
    my_select_hint: '비교할 포트폴리오를 선택하세요 (최대 3개)',
    my_selected_count: '개 선택됨',
    my_compare_button: '비교하기',
    my_collapse: '접기',
    my_expand: '상세보기',
    my_reanalyze: '이 포트폴리오로 다시 분석',

    // MyPortfolios detail metrics
    my_metric_cagr: '수익률',
    my_metric_mdd: '최대 낙폭',
    my_metric_volatility: '변동성',
    my_metric_sharpe: '효율성',
    my_metric_dividend: '배당 수익률',
    my_metric_best_year: '최고 연도',

    // CompareView
    compare_title: '포트폴리오 비교',
    compare_radar_label: '레이더 비교',
    compare_metric_col: '지표',

    // Share to community
    share_button: '커뮤니티 공유',
    share_modal_title: '커뮤니티에 공유',
    share_modal_desc: '공유하면 다른 사람들이 볼 수 있어요.',
    share_nickname_label: '닉네임',
    share_nickname_placeholder: '예: 투자고수',
    share_confirm: '공유하기',
    share_cancel: '취소',
    share_loading: '공유 중...',
    share_done: '공유됨 ✓',
    share_unshare: '공유 취소',

    // Community save to mine
    community_save_mine: '내 포트폴리오에 저장',
    community_saved: '저장됨 ✓',
    community_shared_by: '공유자',
    community_user_section: '커뮤니티 공유',
    community_preset_section: '추천 포트폴리오',
  },
  en: {
    // Nav
    nav_compose: 'Build',
    nav_analysis: 'Analysis',
    nav_mine: 'My Portfolios',
    nav_community: 'Community',
    nav_backtest_first: 'Run a backtest first',
    nav_light_mode: 'Light Mode',
    nav_dark_mode: 'Dark Mode',
    nav_light: 'Light',
    nav_dark: 'Dark',
    // App
    app_subtitle: 'Portfolio Backtester',

    // AuthButton
    auth_signing_in: 'Signing in...',
    auth_sign_in_google: 'Sign in with Google',
    auth_user_fallback: 'User',
    auth_sign_out: 'Sign Out',

    // AssetInputScreen — landing
    landing_headline: 'My Portfolio,\nHow did it perform historically?',
    landing_subtext: 'Enter your holdings and we\'ll analyze historical returns and risk.',
    landing_screenshot_title: 'Analyze from Screenshot',
    landing_screenshot_desc: 'Upload a screenshot from your brokerage app or spreadsheet and AI will read your portfolio automatically',
    landing_upload_button: 'Select Image File',
    landing_paste_hint: 'Paste clipboard image directly',
    landing_manual_title: 'Build Manually',
    landing_manual_desc: 'Choose assets or type tickers directly to build your portfolio',
    landing_start_button: 'Get Started →',

    // OCR overlay
    ocr_analyzing: 'AI Analyzing...',
    ocr_mapping: 'Calculating asset weights...',
    ocr_analyzing_desc: 'Analyzing your portfolio image.',
    ocr_mapping_desc: 'Mapping to ETF tickers.',
    ocr_busy_prefix: 'Currently',
    ocr_busy_suffix: 'users analyzing simultaneously',
    ocr_busy_note: 'High traffic may slow things down.',

    // Parse confirm dialog
    parse_dialog_title: 'Review Image Analysis Results',
    parse_dialog_desc: 'Please verify the mapping below before applying.',
    parse_unknown_ticker: 'Unsupported',
    parse_unknown_warning: 'Unsupported tickers can be edited after applying.',
    parse_cancel: 'Cancel',
    parse_login_required: 'Image analysis requires login.',
    parse_apply: 'Apply These Weights',

    // Short history warning dialog
    short_history_title: 'Limited Data Warning',
    short_history_desc: 'Some selected assets have been listed for less than 10 years, which may limit backtest results.',
    short_history_listed: 'Listed',
    short_history_year: '',
    short_history_cancel: 'Cancel',
    short_history_proceed: 'Run Anyway',

    // Input controls
    input_weight_label: 'Weight',
    input_amount_label: 'Amount',
    input_custom_label: 'Custom',
    input_weight_done: '✓ Done',
    input_weight_over: '% over',
    input_weight_left: '% left',
    input_amount_done: '✓ Set',
    input_amount_placeholder: 'Enter amount',

    // Rebalancing picker
    rb_label: 'Rebalancing Period',
    rb_monthly: 'Monthly',
    rb_quarterly: 'Quarterly',
    rb_yearly: 'Annually',
    rb_custom: 'Custom',
    rb_months_unit: 'months',

    // Expert mode — portfolio composition
    expert_portfolio_label: 'Portfolio Composition',
    expert_distribute: 'Equal Weight',
    expert_ticker_placeholder: 'Enter ticker...',
    expert_add_asset: 'Add Asset',
    expert_ticker_add_new: 'Add new asset',
    expert_ticker_input_placeholder: 'Enter ticker (e.g. SPY)',
    expert_custom_add_label: 'Add Custom',
    expert_not_in_db: 'Not found in database.',
    expert_add_btn: 'Add',
    expert_copy_portfolio: 'Copy Portfolio',
    expert_slot_distribute: 'Equal',
    expert_slot_left: 'left',

    // Backtest run button
    run_backtest: 'Run Backtest',
    run_backtest_multi: ' Portfolio Comparison',

    // Beginner mode categories
    cat_stocks: 'Stocks',
    cat_bonds: 'Bonds',
    cat_commodities: 'Commodities',
    cat_realestate: 'Real Estate',
    cat_cash: 'Cash',
    cat_crypto: 'Crypto',

    // Beginner ETF labels
    etf_us_total: 'US Total Market',
    etf_tech_nasdaq: 'Tech / Nasdaq',
    etf_dividend: 'Dividend',
    etf_sp500_desc: 'US Large-Cap 500',
    etf_developed: 'Developed (ex-US)',
    etf_developed_desc: 'Europe, Japan, etc.',
    etf_emerging: 'Emerging Markets',
    etf_emerging_desc: 'China, Korea, India, etc.',
    etf_longbond: 'US Long-Term Bonds',
    etf_longbond_desc: '20yr+ Treasuries',
    etf_midbond: 'US Mid-Term Bonds',
    etf_midbond_desc: '7-10yr Treasuries',
    etf_shortbond: 'Short-Term Bonds',
    etf_shortbond_desc: '1-3yr Treasuries',
    etf_tips: 'Inflation-Protected',
    etf_tips_desc: 'Inflation Hedge',
    etf_gold: 'Gold',
    etf_oil: 'Crude Oil',
    etf_oil_desc: 'WTI Crude Oil',
    etf_commodities_broad: 'Broad Commodities',
    etf_commodities_broad_desc: 'Energy, Metals, Agriculture',
    etf_reit: 'US REITs',
    etf_cash: 'Cash',
    etf_cash_desc: '0% return, 0% volatility',
    etf_bitcoin: 'Bitcoin',
    etf_ethereum: 'Ethereum',

    // Preset portfolios
    preset_allweather: 'All Weather',
    preset_allweather_desc: 'Traditional Balance',
    preset_6040_desc: 'Traditional Balance',
    preset_golden_butterfly: 'Golden Butterfly',
    preset_permanent: 'Permanent Portfolio',
    preset_section_label: 'Try Famous Portfolios',

    // ResultScreen
    result_loading_title: 'Quant Engine Running',
    result_loading_step0: 'Downloading historical data',
    result_loading_step1: 'Calculating returns',
    result_loading_step2: 'Generating AI insights',
    result_loading_note: 'May take 30+ seconds depending on data size.',
    result_error_title: 'Backtest Failed',
    result_error_unknown: 'An unknown error occurred.',
    result_retry: 'Try Again',
    result_edit_portfolio: 'Edit Portfolio',
    result_fetch_fail: 'Failed to load results.',
    result_title: 'Backtest Results',
    result_copy_title: 'Copy Results',
    result_cagr_label: 'Annualized Return',
    result_best_year: 'Best Year',
    result_return: 'Return',
    result_mdd_label: 'Max Drawdown',
    result_max_drop: 'Worst Year',
    result_growth_chart_title: 'Portfolio Growth',
    result_initial_investment: 'Based on $1,000 initial investment',
    result_initial_label: 'Initial Investment',
    result_final_label: 'Final Value',
    result_radar_title: 'Portfolio Radar',
    result_radar_benchmark: 'vs. S&P 500 (SPY) Benchmark',
    result_table_metric: 'Metric',
    result_volatility: 'Volatility',
    result_dividend: 'Dividend',
    tooltip_cagr: 'Average annual return over the investment period.\nHigher is better.',
    tooltip_mdd: 'The largest peak-to-trough decline.\nLower (less negative) is better.',
    tooltip_volatility: 'How much returns fluctuate over time.\nLower means a more stable portfolio.',
    tooltip_sharpe: 'How efficiently returns are earned per unit of risk.',
    tooltip_dividend: 'Estimated annual dividend yield from holdings.',
    result_login_toast: 'Sign in to save your portfolio',
    // DCA
    dca_section_title: 'What if you invested monthly?',
    dca_section_desc: 'See how dollar-cost averaging would have performed vs a lump sum',
    dca_custom_placeholder: 'Custom ($)',
    dca_calculate: 'Calculate',
    dca_calculating: 'Calculating...',
    dca_total_invested: 'Total Invested',
    dca_final_value: 'Final Value',
    dca_profit: 'Profit',
    dca_return: 'Return',
    dca_chart_portfolio: 'Portfolio Value',
    dca_chart_cost: 'Cost Basis',
    dca_chart_spy: 'S&P 500',
    dca_monthly_label: '/mo',
    dca_period: 'Period',
    dca_cagr: 'Ann. Return',
    dca_mdd: 'Max Drawdown',
    dca_reset: 'Reset',
    dca_amount_label: 'Monthly',

    result_login_nudge_title: 'Want to save these results?',
    result_login_nudge_desc: 'Sign in to save portfolios and compare them anytime',
    result_login_nudge_cta: 'Sign in with Google',
    result_share: 'Share',
    result_copied: 'Copied!',
    result_save_to_portfolio: 'Save to My Portfolios',
    result_saved: 'Saved!',
    result_portfolio_name_label: 'Portfolio Name',
    result_portfolio_name_placeholder: 'e.g. Conservative Portfolio',
    result_cancel: 'Cancel',
    result_save_confirm: 'Save',
    result_default_portfolio_name: 'Portfolio',
    result_share_text_title: '📊 AlphaFlow Portfolio Backtest Results',
    result_share_composition: 'Composition',
    result_share_period: 'Period',

    // Multi result
    multi_title: 'Portfolio Comparison',
    multi_radar_title: 'Portfolio Radar Comparison',
    multi_growth_title: 'Portfolio Growth Comparison',
    multi_initial: 'Based on $1,000 initial investment',
    multi_table_title: 'Strategy Metrics Comparison',
    multi_metric_col: 'Metric',
    multi_volatility: 'Volatility',
    multi_dividend: 'Dividend',
    multi_saved: 'Saved',
    multi_save: 'Save',
    multi_portfolio_name_label: 'Portfolio Name',
    multi_portfolio_name_placeholder: 'e.g. Conservative Portfolio',
    multi_cancel: 'Cancel',
    multi_save_confirm: 'Save',

    // Radar descriptions
    radar_attack: 'Offense: Based on annualized return, measures the portfolio\'s growth potential.',
    radar_defense: 'Defense: Based on max drawdown, measures the ability to minimize losses in downturns.',
    radar_volatility: 'Volatility Management: Based on standard deviation, measures how stable price movements are.',
    radar_sharpe: 'Efficiency: Measures how efficiently returns are earned per unit of risk taken.',
    radar_dividend: 'Dividend Income: Based on trailing 1-year dividend yield, measures cash flow generation.',

    // Rebalancing labels (result screen)
    rb_result_monthly: 'Monthly Rebalancing',
    rb_result_quarterly: 'Quarterly Rebalancing',
    rb_result_yearly: 'Annual Rebalancing',
    rb_result_custom_suffix: '-Month Rebalancing',

    // CommunityScreen
    community_title: 'Community',
    community_subtitle: 'Import popular portfolios and backtest them yourself.',
    community_load_button: 'Import This Portfolio',

    // Community portfolio titles
    cp_growth_allweather: 'Growth All-Weather',
    cp_nasdaq_aggressive: 'Nasdaq Aggressive',
    cp_dividend_stable: 'Dividend Stability',
    cp_crypto_maxi: 'Crypto Maxi',

    // MyPortfoliosScreen
    my_title: 'My Portfolios',
    my_count_suffix: ' saved',
    my_compare: 'Compare',
    my_cancel: 'Cancel',
    my_empty_title: 'No saved portfolios yet',
    my_empty_desc: 'Tap the Save button at the bottom\nof the backtest results screen.',
    my_empty_save_hint: 'Save',
    my_select_hint: 'Select portfolios to compare (up to 3)',
    my_selected_count: ' selected',
    my_compare_button: 'Compare',
    my_collapse: 'Collapse',
    my_expand: 'Details',
    my_reanalyze: 'Re-analyze with This Portfolio',

    // MyPortfolios detail metrics
    my_metric_cagr: 'Annualized Return',
    my_metric_mdd: 'Max Drawdown',
    my_metric_volatility: 'Volatility',
    my_metric_sharpe: 'Efficiency',
    my_metric_dividend: 'Dividend Yield',
    my_metric_best_year: 'Best Year',

    // CompareView
    compare_title: 'Portfolio Comparison',
    compare_radar_label: 'Radar Comparison',
    compare_metric_col: 'Metric',

    // Share to community
    share_button: 'Share to Community',
    share_modal_title: 'Share to Community',
    share_modal_desc: 'Others will be able to see and import this portfolio.',
    share_nickname_label: 'Nickname',
    share_nickname_placeholder: 'e.g. InvestorPro',
    share_confirm: 'Share',
    share_cancel: 'Cancel',
    share_loading: 'Sharing...',
    share_done: 'Shared ✓',
    share_unshare: 'Unshare',

    // Community save to mine
    community_save_mine: 'Save to My Portfolios',
    community_saved: 'Saved ✓',
    community_shared_by: 'by',
    community_user_section: 'Community Shared',
    community_preset_section: 'Featured Portfolios',
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
