import yfinance as yf
import json
import pandas as pd
import time

# 주요 ETF 티커 리스트 (예시 - 실제로는 더 많은 리스트를 사용할 수 있음)
# 시가총액 상위 및 주요 섹터 ETF들
popular_tickers = [
    "SPY", "QQQ", "DIA", "IWM", "VOO", "VTI", "VEA", "VWO", "AGG", "BND", 
    "LQD", "HYG", "GLD", "IAU", "SLV", "VNQ", "IYR", "XLF", "XLK", "XLV", 
    "XLE", "XLI", "XLY", "XLP", "XLB", "XLU", "XLC", "IEF", "TLT", "SHY",
    "MUB", "EMB", "BWX", "EFA", "EEM", "IVV", "IJH", "IJR", "VUG", "VTV",
    "VIG", "VYM", "NOBL", "SDY", "DVY", "SCHD", "JEPI", "QYLD", "ARKK", "TQQQ", "SQQQ"
]

def fetch_etf_info(tickers):
    etf_data = []
    for ticker in tickers:
        try:
            print(f"Fetching info for {ticker}...")
            t = yf.Ticker(ticker)
            info = t.info
            
            # 출시년도 (start date)는 보통 history의 첫 날짜로 유추하거나 
            # info의 'fundInceptionDate'에서 가져올 수 있음
            inception_date = info.get('fundInceptionDate')
            if inception_date:
                # inception_date는 timestamp일 수 있음
                launch_year = time.strftime('%Y', time.gmtime(inception_date))
            else:
                # 대안으로 history의 첫 년도 확인
                hist = t.history(period="max")
                if not hist.empty:
                    launch_year = str(hist.index[0].year)
                else:
                    launch_year = "N/A"

            etf_data.append({
                "ticker": ticker,
                "name": info.get('longName') or info.get('shortName') or ticker,
                "launch_year": launch_year
            })
            # API 제한 방지를 위해 약간의 지연
            time.sleep(0.1)
        except Exception as e:
            print(f"Error fetching {ticker}: {e}")
    
    return etf_data

if __name__ == "__main__":
    # 여기서는 예시로 popular_tickers만 사용하지만, 
    # 실제로는 더 많은 리스트를 넣거나 CSV에서 읽어올 수 있습니다.
    data = fetch_etf_info(popular_tickers)
    
    with open('src/lib/etf-data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"Saved {len(data)} ETFs to src/lib/etf-data.json")
