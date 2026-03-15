"""
Re-fetches name + launch_year for entries where name == ticker or launch_year == 'Unknown'.
Uses sequential fetching with delays to avoid Yahoo Finance rate limiting.
"""

import json
import time
import warnings

import yfinance as yf

warnings.filterwarnings("ignore")


def fetch_one(ticker: str):
    try:
        t = yf.Ticker(ticker)
        info = t.info
        name = info.get('longName') or info.get('shortName')

        if not name:
            fi = t.fast_info
            name = getattr(fi, 'longName', None) or getattr(fi, 'shortName', None)

        if not name:
            name = ticker

        hist = t.history(period='max', auto_adjust=True)
        launch_year = str(hist.index[0].year) if not hist.empty else 'Unknown'

        return {"ticker": ticker, "name": name, "launch_year": launch_year}
    except Exception as e:
        print(f"  [SKIP] {ticker}: {e}")
        return None


def main():
    out_path = 'src/lib/etf-data.json'
    with open(out_path, encoding='utf-8') as f:
        data = json.load(f)

    # Build a dict for easy updating
    db = {d['ticker']: d for d in data}

    missing = [d['ticker'] for d in data
               if d['launch_year'] == 'Unknown' or d['name'] == d['ticker']]
    print(f"Entries to fix: {len(missing)}")

    fixed = 0
    for i, ticker in enumerate(missing, 1):
        print(f"  [{i}/{len(missing)}] Fetching {ticker}...", end=' ', flush=True)
        result = fetch_one(ticker)
        if result and (result['name'] != ticker or result['launch_year'] != 'Unknown'):
            db[ticker] = result
            print(f"✓ {result['name'][:50]} ({result['launch_year']})")
            fixed += 1
        else:
            print("✗ still missing")
        # Polite delay to avoid rate limiting
        time.sleep(0.3)

    results = sorted(db.values(), key=lambda x: x['ticker'])
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\nFixed {fixed}/{len(missing)} entries. Total: {len(results)} in {out_path}")


if __name__ == '__main__':
    main()
