import YahooFinance from 'yahoo-finance2';
import fs from 'fs';

const yahooFinance = new YahooFinance();

const popularTickers = [
    "SPY", "QQQ", "DIA", "IWM", "VOO", "VTI", "VEA", "VWO", "AGG", "BND", 
    "LQD", "HYG", "GLD", "IAU", "SLV", "VNQ", "IYR", "XLF", "XLK", "XLV", 
    "XLE", "XLI", "XLY", "XLP", "XLB", "XLU", "XLC", "IEF", "TLT", "SHY",
    "MUB", "EMB", "BWX", "EFA", "EEM", "IVV", "IJH", "IJR", "VUG", "VTV",
    "VIG", "VYM", "NOBL", "SDY", "DVY", "SCHD", "JEPI", "QYLD", "ARKK", "TQQQ", "SQQQ",
    "VT", "VXUS", "BNDX", "BSV", "VCSH", "VCIT", "VGK", "VPL", "VGIT", "VGLT", 
    "VTIP", "TIP", "BIL", "VGSH", "VMBS", "BIV", "BLV", "MBB", "STIP", "SCHP",
    "SPSB", "SPIB", "SPLB", "SPAB", "GOVT", "SHV", "IEI", "TLH", "EDV", "ZROZ"
];

async function fetchEtfData() {
    const etfData = [];
    console.log(`Starting to fetch data for ${popularTickers.length} ETFs...`);

    for (const ticker of popularTickers) {
        try {
            console.log(`Fetching info for ${ticker}...`);
            const quote = await yahooFinance.quote(ticker);
            
            let launchYear = "N/A";
            try {
                // Using quoteSummary for fundInceptionDate
                const summary = await yahooFinance.quoteSummary(ticker, { modules: ['defaultKeyStatistics'] });
                const inceptionDate = summary.defaultKeyStatistics?.fundInceptionDate;
                if (inceptionDate) {
                    launchYear = new Date(inceptionDate).getFullYear().toString();
                } else if (quote.firstTradeDateMilliseconds) {
                    launchYear = new Date(quote.firstTradeDateMilliseconds).getFullYear().toString();
                }
            } catch (e) {
                if (quote.firstTradeDateMilliseconds) {
                    launchYear = new Date(quote.firstTradeDateMilliseconds).getFullYear().toString();
                }
            }

            etfData.push({
                ticker: ticker,
                name: quote.longName || quote.shortName || ticker,
                launch_year: launchYear
            });
        } catch (error) {
            console.error(`Error fetching data for ${ticker}:`, error.message);
        }
    }

    fs.writeFileSync('src/lib/etf-data.json', JSON.stringify(etfData, null, 2));
    console.log(`Successfully saved ${etfData.length} ETFs to src/lib/etf-data.json`);
}

fetchEtfData().catch(console.error);
