import json
import sys
import numpy as np
import pandas as pd
import yfinance as yf
from datetime import datetime

def run_backtest(tickers_weights):
    tickers = list(tickers_weights.keys())
    weights = np.array([tickers_weights[t] for t in tickers], dtype=float)
    weights = weights / np.sum(weights)

    # Date range
    start_date = "1970-01-01"
    end_date = datetime.now().strftime('%Y-%m-%d')

    try:
        # Fetch tickers + SPY for benchmark
        fetch_tickers = list(set(tickers + ["SPY"]))
        data = yf.download(fetch_tickers, start=start_date, end=end_date, progress=False, group_by='column', actions=True)
        
        if data.empty:
            return {"error": "No data found for tickers"}
        
        # Extract Adj Close and Dividends
        if len(fetch_tickers) > 1:
            adj_close = data['Adj Close'] if 'Adj Close' in data.columns.levels[0] else data['Close']
            dividends = data['Dividends'] if 'Dividends' in data.columns.levels[0] else pd.DataFrame(0, index=adj_close.index, columns=adj_close.columns)
        else:
            # Only happens if user input only SPY
            adj_close = (data['Adj Close'] if 'Adj Close' in data.columns else data['Close']).to_frame()
            adj_close.columns = fetch_tickers
            dividends = (data['Dividends'] if 'Dividends' in data.columns else pd.DataFrame(0, index=adj_close.index, columns=fetch_tickers)).to_frame()
            dividends.columns = fetch_tickers
            
    except Exception as e:
        return {"error": f"Data fetch failed: {str(e)}"}

    # Align Portfolio: Drop rows where any portfolio ticker is NaN
    # But keep SPY separate for a moment to ensure we have overlapping data
    port_adj_close = adj_close[tickers].dropna()
    if port_adj_close.empty:
        return {"error": "No overlapping data for portfolio tickers."}

    # Now align everything (Portfolio + SPY) to the portfolio's inception
    common_index = port_adj_close.index
    adj_close_clean = adj_close.loc[common_index].ffill().dropna() # ffill SPY if needed, though usually it exists
    dividends_clean = dividends.loc[adj_close_clean.index].fillna(0)

    actual_start = adj_close_clean.index.min()
    actual_end = adj_close_clean.index.max()
    
    days = (actual_end - actual_start).days
    years = days / 365.25
    if years < 0.01:
        return {"error": "Insufficient historical data."}

    # 1. Portfolio Performance
    port_daily_returns = adj_close_clean[tickers].pct_change().dropna()
    weights_series = pd.Series(weights, index=tickers)
    weights_aligned = weights_series.reindex(port_daily_returns.columns).values
    port_returns = port_daily_returns.dot(weights_aligned)
    port_cum_returns = (1 + port_returns).cumprod()

    # 2. Benchmark (SPY) Performance
    bench_daily_returns = adj_close_clean['SPY'].pct_change().dropna()
    bench_cum_returns = (1 + bench_daily_returns).cumprod()

    # Metrics Helper
    def get_metrics(cum_returns, daily_returns, div_series, price_series, weights_val=None):
        final_val = cum_returns.iloc[-1]
        cagr = (final_val ** (1 / years)) - 1
        vol = daily_returns.std() * np.sqrt(252)
        sharpe = (cagr - 0.02) / vol if vol > 0 else 0
        mdd_series = (cum_returns - cum_returns.cummax()) / cum_returns.cummax()
        mdd = mdd_series.min()
        mdd_date = mdd_series.idxmin().strftime('%Y')

        # Best Year
        annual_returns = (1 + daily_returns).resample('YE').prod() - 1
        best_year_val = annual_returns.max()
        best_year_date = annual_returns.idxmax().strftime('%Y')
        
        # Dividend Yield (last 1Y)
        one_year_ago = actual_end - pd.Timedelta(days=365)
        recent_divs = div_series[div_series.index >= one_year_ago]
        
        if weights_val is not None:
            # Portfolio Div Yield
            dy_port = 0
            for t in tickers:
                w = weights_val[t]
                p = price_series[t].iloc[-1]
                d = recent_divs[t].sum() if t in recent_divs.columns else 0
                dy_port += (d / p * w) if p > 0 else 0
            dy = dy_port
        else:
            # Single asset (SPY) Div Yield
            p = price_series.iloc[-1]
            d = recent_divs.sum()
            dy = (d / p) if p > 0 else 0

        return {
            "cagr": round(float(cagr * 100), 2),
            "mdd": round(float(mdd * 100), 2),
            "mdd_year": mdd_date,
            "sharpe": round(float(sharpe), 2),
            "volatility": round(float(vol * 100), 2),
            "dividend": round(float(dy * 100), 2),
            "best_year": {"year": best_year_date, "value": round(float(best_year_val * 100), 2)}
        }

    port_m = get_metrics(port_cum_returns, port_returns, dividends_clean[tickers], adj_close_clean[tickers], weights_series)
    bench_m = get_metrics(bench_cum_returns, bench_daily_returns, dividends_clean['SPY'], adj_close_clean['SPY'])

    # Radar data (Portfolio vs Benchmark)
    subjects = ["Attack", "Defense", "Volatility", "Sharpe", "Dividend"]
    radar = []
    
    # New Normalization factors based on user request
    def normalize(val, subject):
        if subject == "Attack": 
            # Max 30%, steps of 7.5% (7.5=25, 15=50, 22.5=75, 30=100)
            return min(100, max(0, (val / 30) * 100))
        if subject == "Dividend": 
            # Max 10%, steps of 2.5% (2.5=25, 5=50, 7.5=75, 10=100)
            return min(100, max(0, (val / 10) * 100))
        if subject == "Defense": 
            # Metric: 1500 / |MDD|. MDD 30% = 50 pts, MDD 15% = 100 pts.
            mdd_abs = abs(val)
            if mdd_abs == 0: return 100
            return min(100, max(0, 1500 / mdd_abs))
        if subject == "Sharpe": 
            # Max 1.5, steps for 0.5, 0.75, 1.0, 1.25, 1.5
            # We'll map 1.5 to 100.
            return min(100, max(0, (val / 1.5) * 100))
        if subject == "Volatility": 
            # Proposal: 100 - (Vol * 2.5). 0% Vol = 100, 20% Vol = 50, 40% Vol = 0.
            return min(100, max(0, 100 - (val * 2.5)))
        return 0

    for s in subjects:
        p_val = port_m['cagr'] if s == "Attack" else port_m['mdd'] if s == "Defense" else port_m['volatility'] if s == "Volatility" else port_m['sharpe'] if s == "Sharpe" else port_m['dividend']
        b_val = bench_m['cagr'] if s == "Attack" else bench_m['mdd'] if s == "Defense" else bench_m['volatility'] if s == "Volatility" else bench_m['sharpe'] if s == "Sharpe" else bench_m['dividend']
        
        radar.append({
            "subject": s,
            "A": int(normalize(p_val, s)), # Portfolio
            "B": int(normalize(b_val, s)), # Benchmark
            "fullMark": 100
        })

    # History chart (Portfolio only for simplicity, or we can add benchmark)
    history_values = (port_cum_returns * 1000)
    if len(history_values) > 20:
        indices = np.linspace(0, len(history_values) - 1, 20).astype(int)
        sampled_history = history_values.iloc[indices]
    else:
        sampled_history = history_values

    history_data = [{"date": actual_start.strftime('%Y-%m-%d'), "value": 1000.0}]
    for date, val in sampled_history.items():
        history_data.append({"date": date.strftime('%Y-%m-%d'), "value": round(float(val), 2)})

    return {
        "metrics": port_m,
        "benchmark_metrics": bench_m,
        "period": f"{actual_start.strftime('%Y.%m')} ~ {actual_end.strftime('%Y.%m')}",
        "radar": radar,
        "history": history_data
    }

if __name__ == "__main__":
    try:
        input_json = sys.argv[1] if len(sys.argv) > 1 else '{"SPY": 0.6, "TLT": 0.4}'
        print(json.dumps(run_backtest(json.loads(input_json))))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
