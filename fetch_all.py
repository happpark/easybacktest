"""
Fetches names + launch years for a comprehensive list of US securities
(S&P 500 stocks + popular ETFs + notable stocks outside the index)
and writes them to src/lib/etf-data.json.

Run: python3 fetch_all.py
"""

import json
import time
import warnings
from concurrent.futures import ThreadPoolExecutor, as_completed

import pandas as pd
import yfinance as yf

warnings.filterwarnings("ignore")

# ── 1. S&P 500 list from Wikipedia ───────────────────────────────────────────
def get_sp500_tickers():
    try:
        df = pd.read_html(
            "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
        )[0]
        # Wikipedia uses '.' for BRK.B etc.; yfinance needs '-'
        return df["Symbol"].str.replace(".", "-", regex=False).tolist()
    except Exception as e:
        print(f"[WARN] Could not fetch S&P 500 list: {e}")
        return []

# ── 2. Curated tickers that should be in the DB regardless ───────────────────
EXTRA_TICKERS = [
    # ── Leveraged / Inverse ETFs ──────────────────────────────────────────────
    "TQQQ", "SQQQ", "UPRO", "SPXU", "UDOW", "SDOW", "TNA", "TZA",
    "QLD",  "QID",  "SSO",  "SDS",  "DDM",  "DXD",  "SOXL", "SOXS",
    "FNGU", "FNGD", "LABU", "LABD", "NUGT", "DUST", "JNUG", "JDST",
    "TECL", "TECS", "NAIL", "DRN",  "DRV",  "ERX",  "ERY",  "FAS",
    "FAZ",  "SPXL", "SPXS", "DFEN", "WANT", "HIBL", "HIBS", "CURE",
    "PILL", "WEBL", "WEBS", "RETL", "NRGU",

    # ── Broad market ETFs ─────────────────────────────────────────────────────
    "SPY",  "IVV",  "VOO",  "VTI",  "QQQ",  "DIA",  "IWM",  "IWB",
    "IWF",  "IWD",  "IWN",  "IWO",  "IWS",  "IWP",  "IWR",
    "VUG",  "VTV",  "VBK",  "VBR",  "SCHX", "SCHB", "SCHA", "SCHM",
    "ITOT", "IJH",  "IJR",  "ESGU", "SUSA", "DSI",
    "RSP",  "QQEW", "QQMG", "QQQM", "ONEQ",

    # ── Factor / Smart Beta ───────────────────────────────────────────────────
    "MTUM", "VLUE", "SIZE", "USMV", "QUAL", "DVAL",
    "NUSI", "DGRW", "FDVV", "OUSA", "JOET",

    # ── Dividend ETFs ─────────────────────────────────────────────────────────
    "VIG",  "VYM",  "SCHD", "DGRO", "NOBL", "SDY",  "DVY",  "HDV",
    "RDIV", "SPYD", "SPHD", "PEY",  "FVD",  "DLN",  "DTD",
    "JEPI", "JEPQ", "DIVO", "QYLD", "RYLD", "XYLD", "NUSI", "KNG",
    "O",    "STAG", "MAIN",

    # ── Sector ETFs ───────────────────────────────────────────────────────────
    "XLF",  "XLK",  "XLV",  "XLE",  "XLI",  "XLY",  "XLP",  "XLB",
    "XLU",  "XLC",  "XLRE", "GDX",  "GDXJ", "KRE",  "KBE",  "KIE",
    "XBI",  "IBB",  "ARKG", "ARKK", "ARKW", "ARKF", "PRNT", "IZRL",
    "SMH",  "SOXX", "IGV",  "HACK", "CIBR", "BUG",  "WCLD", "SKYY",
    "CLOU", "ESPO", "HERO", "NERD", "ROBO", "BOTZ", "AIQ",  "DTCR",
    "FINX", "IPAY", "BLOK", "BITQ",
    "XOP",  "OIH",  "IEZ",  "AMLP", "MLPA", "MLPX",
    "ITB",  "XHB",  "REZ",  "RWR",  "ICF",  "MORT", "REM",

    # ── International ETFs ────────────────────────────────────────────────────
    "EFA",  "EEM",  "VEA",  "VWO",  "IEFA", "IEMG", "ACWI", "ACWX",
    "VT",   "IOO",  "URTH", "VXUS", "BKF",  "MCHI", "FXI",  "KWEB",
    "EWJ",  "EWG",  "EWU",  "EWQ",  "EWI",  "EWP",  "EWD",  "EWL",
    "EWC",  "EWA",  "EWZ",  "EWW",  "EWY",  "EWT",  "EWH",  "EWS",
    "INDA", "INDY", "EPI",  "PIN",  "VNM",  "THD",  "EPHE", "IDX",
    "GXC",  "ASHR", "CNYA", "KBA",  "FLCH",
    "EZU",  "HEDJ", "DXJ",  "DXJH", "HEWG", "HEWJ",
    "RSX",  "ERUS", "ENOR", "EDEN", "EWN",

    # ── Fixed Income ETFs ─────────────────────────────────────────────────────
    "AGG",  "BND",  "BNDX", "TLT",  "IEF",  "SHY",  "GOVT", "VGLT",
    "VGIT", "VGSH", "SCHO", "SCHR", "SCHQ", "SPTS", "SPTI", "SPTL",
    "VBTLX","FBND", "FLTB", "FLRN", "VCSH", "VCIT", "VCLT",
    "LQD",  "HYG",  "JNK",  "USHY", "ANGL", "FALN", "HYEM", "HYXU",
    "EMB",  "VWOB", "PCY",  "EMLC", "EBND",
    "MUB",  "SUB",  "HYD",  "PZA",  "VTEB", "TFI",
    "BWX",  "IGOV", "BNDW", "IAGG",
    "STIP", "TIP",  "VTIP", "SCHP", "DPST",
    "BKLN", "SRLN", "FLOT", "SJNK", "SPSB",
    "LTPZ", "ZROZ", "EDV",  "VUSTX","TBT",  "TTT",  "TMF",  "TMV",
    "PST",  "TBF",

    # ── Commodity ETFs ────────────────────────────────────────────────────────
    "GLD",  "IAU",  "SGOL", "BAR",  "AAAU",
    "SLV",  "SIVR", "PSLV",
    "GDX",  "GDXJ", "RING",
    "USO",  "BNO",  "UCO",  "SCO",  "DBO",
    "UNG",  "BOIL", "KOLD",
    "PDBC", "DJP",  "GSG",  "USCI", "DBC",  "COM",
    "CPER", "JJC",  "CORN", "SOYB", "WEAT", "JO",  "NIB",  "CANE",
    "URA",  "URNM",

    # ── Real Assets / REIT ────────────────────────────────────────────────────
    "VNQ",  "IYR",  "SCHH", "USRT", "BBRE", "KBWY",
    "AMT",  "CCI",  "EQIX", "PLD",  "DLR",  "PSA",  "EXR",  "AVB",
    "EQR",  "MAA",  "UDR",  "CPT",  "ESS",  "NNN",  "WPC",

    # ── Currency / Volatility ─────────────────────────────────────────────────
    "UUP",  "UDN",  "FXE",  "FXB",  "FXY",  "FXC",  "FXA",  "FXF",
    "VXX",  "VIXY", "SVXY", "UVXY", "VIXM", "ZIVZF",

    # ── Thematic ETFs ─────────────────────────────────────────────────────────
    "ICLN", "QCLN", "TAN",  "FAN",  "ACES", "SMOG", "CNRG", "DRIV",
    "KARS", "LIT",  "BATT", "REMX", "COPX", "PICK", "SILJ",
    "GNOM", "IDNA", "AADR", "EDUT", "EAOA", "WRLD",
    "MSOS", "MJ",   "YOLO", "THCX",
    "BUZZ", "SPRX", "BFIT", "AWAY", "HTEC",
    "CATH", "BIBL", "BLES", "DMXF",

    # ── Notable individual stocks outside S&P 500 / often searched ───────────
    "BRK-A","BRK-B","GOOG", "GOOGL","META", "AMZN", "TSLA", "NVDA",
    "MSFT", "AAPL", "NFLX", "PYPL", "SQ",   "SHOP", "MELI", "SE",
    "BABA", "JD",   "NIO",  "XPEV", "LI",   "RIVN", "LCID",
    "PLTR", "SNOW", "COIN", "HOOD", "SOFI", "AFRM", "UPST",
    "RBLX", "U",    "DKNG", "PENN", "PTON",
    "ZM",   "DOCU", "TWLO", "CRWD", "NET",  "DDOG", "FSLY",
    "ROKU", "TTD",  "TRADE","PUBM",
    "BYND", "OATLY","TTCF",
    "GME",  "AMC",  "BB",   "NOK",  "BBBY",
    "SPCE", "RKT",  "OPEN", "UWMC",
    "ET",   "MMP",  "EPD",  "ENB",  "KMI",
    "F",    "GM",   "STLA",
    "CCL",  "RCL",  "NCLH", "DAL",  "UAL",  "AAL",  "LUV",
    "MGM",  "WYNN", "LVS",  "CZR",
    "SPG",  "BXP",  "KIM",
    "INTC", "AMD",  "QCOM", "MU",   "MRVL", "AMAT", "LRCX", "KLAC",
    "TXN",  "ADI",  "MCHP", "SWKS", "QRVO",
    "BA",   "LMT",  "RTX",  "NOC",  "GD",   "HII",  "L3H",
    "JPM",  "BAC",  "WFC",  "C",    "GS",   "MS",   "BLK",  "SCHW",
    "COF",  "DFS",  "SYF",  "AXP",  "V",    "MA",
    "JNJ",  "PFE",  "MRK",  "ABBV", "BMY",  "LLY",  "AMGN", "GILD",
    "MRNA", "BNTX", "REGN", "VRTX", "ILMN", "IQV",
    "XOM",  "CVX",  "COP",  "EOG",  "SLB",  "HAL",  "MPC",  "VLO",
    "WMT",  "TGT",  "COST", "KR",   "DG",   "DLTR",
    "AMZN", "HD",   "LOW",  "BBY",
    "MCD",  "SBUX", "YUM",  "QSR",  "DPZ",  "CMG",
    "DIS",  "CMCSA","NFLX", "PARA", "WBD",  "FOX",
    "T",    "VZ",   "TMUS",
    "UNH",  "CVS",  "CI",   "HUM",  "MOH",  "CNC",
    "PG",   "KO",   "PEP",  "MDLZ", "GIS",  "K",    "CPB",  "HSY",
    "PM",   "MO",   "BTI",
    "CAT",  "DE",   "EMR",  "ETN",  "HON",  "MMM",  "GE",   "ITW",
    "UPS",  "FDX",  "XPO",  "CHRW",
    "TSLA", "TM",   "HMC",  "VWAGY","BMWYY",
    "MSCI", "ICE",  "CME",  "NDAQ", "CBOE", "IEX",  "TW",
    "SQ",   "PYPL", "ADYEY","FISV", "FIS",  "GPN",  "WEX",
    "CRM",  "NOW",  "WDAY", "HUBS", "ZS",   "OKTA", "PANW",
    "ADBE", "ORCL", "SAP",  "IBM",
    "AMGN", "BIIB", "REGN", "SGEN", "ALXN",
    "NKE",  "UAA",  "LULU", "TPR",  "RL",   "PVH",  "HBI",
    "ABNB", "UBER", "LYFT", "DASH",
    "EXPE", "BKNG", "TRIP", "AIRB",
    "COIN", "MARA", "RIOT", "HUT",  "BTBT",
]

def fetch_one(ticker: str):
    """Fetch name + launch_year for a single ticker via yfinance."""
    try:
        t = yf.Ticker(ticker)
        # fast_info is much faster than .info in yfinance 1.x
        fi = t.fast_info
        name = getattr(fi, 'longName', None) or getattr(fi, 'shortName', None)

        if not name:
            # Fallback to .info (slower)
            info = t.info
            name = info.get('longName') or info.get('shortName') or ticker

        # Get launch year from history
        hist = t.history(period='max', auto_adjust=True)
        if not hist.empty:
            launch_year = str(hist.index[0].year)
        else:
            launch_year = 'Unknown'

        return {"ticker": ticker, "name": name, "launch_year": launch_year}
    except Exception as e:
        print(f"  [SKIP] {ticker}: {e}")
        return None


def main():
    print("Fetching S&P 500 list from Wikipedia...")
    sp500 = get_sp500_tickers()
    print(f"  → {len(sp500)} tickers from S&P 500")

    # Merge and deduplicate
    all_tickers = list(dict.fromkeys(sp500 + EXTRA_TICKERS))
    print(f"Total unique tickers to fetch: {len(all_tickers)}\n")

    results = []
    failed  = []

    # Use 10 threads – respectful to Yahoo Finance API
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(fetch_one, t): t for t in all_tickers}
        done = 0
        for future in as_completed(futures):
            ticker = futures[future]
            done  += 1
            result = future.result()
            if result:
                results.append(result)
                print(f"  [{done}/{len(all_tickers)}] ✓ {ticker}: {result['name'][:50]} ({result['launch_year']})")
            else:
                failed.append(ticker)
                print(f"  [{done}/{len(all_tickers)}] ✗ {ticker}")

    # Sort alphabetically by ticker
    results.sort(key=lambda x: x['ticker'])

    out_path = 'src/lib/etf-data.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*60}")
    print(f"Saved {len(results)} securities to {out_path}")
    if failed:
        print(f"Failed ({len(failed)}): {', '.join(failed)}")


if __name__ == '__main__':
    main()
