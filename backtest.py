import json
import sys
import numpy as np
import pandas as pd
import yfinance as yf
from datetime import datetime

RISK_FREE_RATE = 0.02   # 2% annual risk-free rate (approximation)
TRADING_DAYS   = 252


CASH_TICKER = "CASH"  # synthetic flat-return asset

def run_backtest(tickers_weights: dict) -> dict:
    tickers = list(tickers_weights.keys())
    weights = np.array([tickers_weights[t] for t in tickers], dtype=float)
    weights = weights / np.sum(weights)          # normalise (safety)
    weights_series = pd.Series(weights, index=tickers)

    end_date   = datetime.now().strftime('%Y-%m-%d')
    start_date = "1970-01-01"

    # ── 1. Download price + dividend data ────────────────────────────────────
    # Exclude CASH from network fetch — we synthesise it later
    real_tickers  = [t for t in tickers if t != CASH_TICKER]
    fetch_tickers = list(set(real_tickers + ["SPY"]))
    try:
        # auto_adjust=True (default in yfinance 1.x):
        #   • 'Adj Close' is removed; adjusted prices live in 'Close'
        #   • 'Dividends' contains raw cash dividends per share
        data = yf.download(
            fetch_tickers,
            start=start_date,
            end=end_date,
            auto_adjust=True,       # explicit – adjusted prices in 'Close'
            actions=True,           # include dividends
            group_by='column',      # MultiIndex: (price_type, ticker)
            progress=False,
            threads=True,
        )
    except Exception as e:
        return {"error": f"Data fetch failed: {str(e)}"}

    if data.empty:
        return {"error": "No data found for the provided tickers."}

    # ── 2. Extract Close and Dividends safely ─────────────────────────────────
    col_level0 = (
        data.columns.get_level_values(0).unique().tolist()
        if isinstance(data.columns, pd.MultiIndex)
        else data.columns.tolist()
    )

    is_multi = isinstance(data.columns, pd.MultiIndex)

    def get_price_df(d: pd.DataFrame) -> pd.DataFrame:
        """Return a (dates × tickers) DataFrame of adjusted closing prices."""
        if is_multi:
            if 'Close' in col_level0:
                return d['Close']
            if 'Adj Close' in col_level0:        # older yfinance fallback
                return d['Adj Close']
        else:
            col = 'Close' if 'Close' in d.columns else 'Adj Close'
            df = d[[col]].copy()
            df.columns = fetch_tickers
            return df
        raise KeyError("Cannot find 'Close' or 'Adj Close' in downloaded data.")

    def get_div_df(d: pd.DataFrame, price_df: pd.DataFrame) -> pd.DataFrame:
        """Return a (dates × tickers) DataFrame of dividends (0 if unavailable)."""
        try:
            if is_multi and 'Dividends' in col_level0:
                return d['Dividends'].reindex(price_df.index).fillna(0)
        except Exception:
            pass
        return pd.DataFrame(0.0, index=price_df.index, columns=price_df.columns)

    try:
        adj_close = get_price_df(data)
        dividends = get_div_df(data, adj_close)
    except Exception as e:
        return {"error": f"Column extraction failed: {str(e)}"}

    # ── 2b. Inject synthetic CASH column (price always 1.0, no dividends) ────
    if CASH_TICKER in tickers:
        adj_close[CASH_TICKER] = 1.0
        dividends[CASH_TICKER] = 0.0

    # ── 3. Align to portfolio inception ──────────────────────────────────────
    # Drop any day where a portfolio ticker is missing
    port_adj_close = adj_close[tickers].dropna()
    if port_adj_close.empty:
        return {"error": "No overlapping price history for the portfolio tickers."}

    common_index   = port_adj_close.index
    adj_clean      = adj_close.loc[common_index].ffill().dropna()
    div_clean      = dividends.reindex(adj_clean.index).fillna(0)

    actual_start = adj_clean.index.min()
    actual_end   = adj_clean.index.max()
    years        = (actual_end - actual_start).days / 365.25

    if years < 0.5:
        return {"error": "Insufficient historical data (< 6 months)."}

    # ── 4. Daily returns & cumulative returns ─────────────────────────────────
    port_daily   = adj_clean[tickers].pct_change().dropna()
    w_aligned    = weights_series.reindex(port_daily.columns).values
    port_returns = port_daily.dot(w_aligned)
    port_cum     = (1 + port_returns).cumprod()

    spy_daily    = adj_clean['SPY'].pct_change().dropna()
    spy_cum      = (1 + spy_daily).cumprod()

    # ── 5. Metric calculation helper ─────────────────────────────────────────
    def get_metrics(
        cum_returns: pd.Series,
        daily_returns: pd.Series,
        div_df,             # DataFrame or Series
        price_df,           # DataFrame or Series
        asset_weights=None, # pd.Series if portfolio, None if single asset
    ) -> dict:
        final_val = cum_returns.iloc[-1]
        cagr      = (final_val ** (1.0 / years)) - 1

        # ── Volatility (annualised sample std) ────────────────────────────────
        vol = daily_returns.std(ddof=1) * np.sqrt(TRADING_DAYS)

        # ── Sharpe: use annualised ARITHMETIC mean, not CAGR ─────────────────
        # CAGR < arithmetic mean for volatile assets (Jensen's inequality).
        # The Sharpe ratio standard uses arithmetic mean return.
        ann_mean_return = daily_returns.mean() * TRADING_DAYS
        sharpe = (ann_mean_return - RISK_FREE_RATE) / vol if vol > 0 else 0.0

        # ── MDD ───────────────────────────────────────────────────────────────
        running_max  = cum_returns.cummax()
        drawdown     = (cum_returns - running_max) / running_max
        mdd          = drawdown.min()
        mdd_year     = drawdown.idxmin().strftime('%Y')

        # ── Best calendar year ────────────────────────────────────────────────
        annual       = (1 + daily_returns).resample('YE').prod() - 1
        best_year_v  = float(annual.max())
        best_year_d  = annual.idxmax().strftime('%Y')

        # ── Dividend yield (trailing 12-month) ────────────────────────────────
        one_year_ago = actual_end - pd.Timedelta(days=365)
        dy = 0.0
        try:
            if asset_weights is not None:
                # Portfolio: weighted sum of each asset's yield
                for t in tickers:
                    recent = div_df[t][div_df.index >= one_year_ago].sum()
                    price  = price_df[t].iloc[-1]
                    w      = asset_weights[t]
                    if price > 0:
                        dy += (recent / price) * w
            else:
                # Single asset (SPY benchmark)
                recent = div_df[div_df.index >= one_year_ago].sum()
                price  = price_df.iloc[-1]
                if price > 0:
                    dy = recent / price
        except Exception:
            dy = 0.0

        return {
            "cagr":       round(float(cagr  * 100), 2),
            "mdd":        round(float(mdd   * 100), 2),
            "mdd_year":   mdd_year,
            "sharpe":     round(float(sharpe),       2),
            "volatility": round(float(vol    * 100), 2),
            "dividend":   round(float(dy     * 100), 2),
            "best_year":  {"year": best_year_d, "value": round(best_year_v * 100, 2)},
        }

    port_m  = get_metrics(port_cum, port_returns,
                          div_clean[tickers], adj_clean[tickers],
                          asset_weights=weights_series)
    bench_m = get_metrics(spy_cum,  spy_daily,
                          div_clean['SPY'],    adj_clean['SPY'])

    # ── 6. Radar chart normalisation ─────────────────────────────────────────
    # Each axis: 0-100 score.  Thresholds are calibrated for realistic ETF ranges.
    def normalize(val: float, subject: str) -> int:
        if subject == "Attack":
            # CAGR: 15% → 100 pts  (5%=33, 7.5%=50, 10%=67, 12.5%=83, 15%=100)
            return min(100, max(0, int((val / 15) * 100)))
        if subject == "Defense":
            # MDD: 1500 / |MDD|  → MDD 15%=100, MDD 30%=50, MDD 50%=30
            mdd_abs = abs(val)
            return 100 if mdd_abs == 0 else min(100, max(0, int(1500 / mdd_abs)))
        if subject == "Volatility":
            # Lower vol = higher score: 100 - (vol * 2.5)  → 0%=100, 20%=50, 40%=0
            return min(100, max(0, int(100 - val * 2.5)))
        if subject == "Sharpe":
            # Sharpe 1.0 → 100 pts  (0.3=30, 0.5=50, 0.8=80, 1.0=100)
            # Realistic ETF portfolio range: 0.3 ~ 1.0
            return min(100, max(0, int((val / 1.0) * 100)))
        if subject == "Dividend":
            # Yield 5% → 100 pts  (1%=20, 2%=40, 3%=60, 4%=80, 5%=100)
            # Realistic range: 0% (growth) ~ 5% (high-yield)
            return min(100, max(0, int((val / 5) * 100)))
        return 0

    radar = []
    for s in ["Attack", "Defense", "Volatility", "Sharpe", "Dividend"]:
        key_map = {
            "Attack":     "cagr",
            "Defense":    "mdd",
            "Volatility": "volatility",
            "Sharpe":     "sharpe",
            "Dividend":   "dividend",
        }
        k = key_map[s]
        radar.append({
            "subject":  s,
            "A":        normalize(port_m[k],  s),   # portfolio
            "B":        normalize(bench_m[k], s),   # benchmark
            "fullMark": 100,
        })

    # ── 7. History chart (up to 100 sampled points) ──────────────────────────
    history_values = port_cum * 1000.0
    n_samples = min(len(history_values), 100)
    indices   = np.linspace(0, len(history_values) - 1, n_samples).astype(int)
    sampled   = history_values.iloc[indices]

    # Prepend true start point ($1000 on inception date)
    history_data = [{"date": actual_start.strftime('%Y-%m-%d'), "value": 1000.0}]
    for date, val in sampled.items():
        history_data.append({
            "date":  date.strftime('%Y-%m-%d'),
            "value": round(float(val), 2),
        })

    return {
        "metrics":           port_m,
        "benchmark_metrics": bench_m,
        "period":            f"{actual_start.strftime('%Y.%m')} ~ {actual_end.strftime('%Y.%m')}",
        "radar":             radar,
        "history":           history_data,
    }


if __name__ == "__main__":
    try:
        raw = sys.argv[1] if len(sys.argv) > 1 else '{"SPY": 0.6, "TLT": 0.4}'
        print(json.dumps(run_backtest(json.loads(raw))))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
