import YahooFinance from 'yahoo-finance2';
import fs from 'fs';

const yahooFinance = new YahooFinance();

async function main() {
    // Read input from command line
    let input = { "GLD": 0.3, "SPY": 0.5, "IEF": 0.2 };
    if (process.argv[2]) {
        try {
            const parsed = JSON.parse(process.argv[2]);
            // Convert back to weights 0.0-1.0
            input = {};
            for (const [k, v] of Object.entries(parsed)) {
                input[k] = v;
            }
        } catch (e) {}
    }

    const tickers = Object.keys(input);
    const weights = Object.values(input);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const normalizedWeights = weights.map(w => w / totalWeight);
    
    const startPeriod = '1970-01-01';
    const endPeriod = new Date().toISOString().split('T')[0];
    
    let allData = {};
    for (const ticker of tickers) {
        try {
            const result = await yahooFinance.historical(ticker, {
                period1: startPeriod,
                period2: endPeriod,
                interval: '1d'
            });
            allData[ticker] = result;
        } catch (e) {
            console.error(`Failed to fetch ${ticker}:`, e.message);
        }
    }
    
    // get dividend yield
    let divYieldPortfolio = 0;
    for (let i = 0; i < tickers.length; i++) {
        const ticker = tickers[i];
        const weight = normalizedWeights[i];
        try {
            const quote = await yahooFinance.quote(ticker);
            const dy = quote.trailingAnnualDividendYield || quote.dividendYield || 0;
            divYieldPortfolio += dy * weight;
        } catch (e) { }
    }
    
    // align dates
    let commonDates = [];
    if (tickers.length > 0 && allData[tickers[0]]) {
        let datesSet = new Set(allData[tickers[0]].map(d => d.date.toISOString().split('T')[0]));
        for (let i=1; i < tickers.length; i++) {
            const ticker = tickers[i];
            if (!allData[ticker]) continue;
            const newSet = new Set();
            for (const d of allData[ticker]) {
                const ds = d.date.toISOString().split('T')[0];
                if (datesSet.has(ds)) newSet.add(ds);
            }
            datesSet = newSet;
        }
        commonDates = Array.from(datesSet).sort();
    }
    
    if (commonDates.length === 0) {
        console.log(JSON.stringify({ error: "No common dates or no data found" }));
        return;
    }
    
    let portValues = [];
    let prevPrices = {};
    let filteredDates = [];
    
    for (const ds of commonDates) {
        let prices = {};
        let valid = true;
        for (const ticker of tickers) {
            const point = allData[ticker].find(d => d.date.toISOString().split('T')[0] === ds);
            if (!point || point.adjClose === undefined) { valid = false; break; }
            prices[ticker] = point.adjClose;
        }
        if (!valid) continue;
        
        filteredDates.push(ds);
        
        if (portValues.length === 0) {
            portValues.push(1.0); 
        } else {
            let dailyReturn = 0;
            for (let j=0; j < tickers.length; j++) {
                const ticker = tickers[j];
                const ret = (prices[ticker] - prevPrices[ticker]) / prevPrices[ticker];
                dailyReturn += ret * normalizedWeights[j];
            }
            portValues.push(portValues[portValues.length - 1] * (1 + dailyReturn));
        }
        prevPrices = prices;
    }
    
    const actualStart = filteredDates[0];
    const actualEnd = filteredDates[filteredDates.length - 1];
    const years = (new Date(actualEnd) - new Date(actualStart)) / (1000 * 60 * 60 * 24 * 365.25);
    
    const finalValue = portValues[portValues.length - 1];
    const cagr = Math.pow(finalValue, 1 / years) - 1;
    
    let dailyReturns = [];
    for (let i=1; i < portValues.length; i++) {
        dailyReturns.push((portValues[i] - portValues[i-1]) / portValues[i-1]);
    }
    
    const mean = dailyReturns.reduce((a,b)=>a+b, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((a,b)=>a + Math.pow(b - mean, 2), 0) / (dailyReturns.length - 1);
    const stdDev = Math.sqrt(variance);
    const volatility = stdDev * Math.sqrt(252);
    
    const riskFreeRate = 0.02;
    const sharpeRatio = (cagr - riskFreeRate) / volatility;
    
    let runningMax = portValues[0];
    let mdd = 0;
    for (let i=1; i < portValues.length; i++) {
        if (portValues[i] > runningMax) runningMax = portValues[i];
        const dd = (portValues[i] - runningMax) / runningMax;
        if (dd < mdd) mdd = dd;
    }

    // History data (12-20 points)
    const historyValues = portValues.map(v => v * 1000);
    const step = Math.max(1, Math.floor(historyValues.length / 12));
    let history = [];
    for (let i = 0; i < historyValues.length; i += step) {
        history.push({
            date: filteredDates[i],
            value: Number(historyValues[i].toFixed(2))
        });
    }
    if (history[history.length-1].date !== filteredDates[filteredDates.length-1]) {
        history.push({
            date: filteredDates[filteredDates.length-1],
            value: Number(historyValues[historyValues.length-1].toFixed(2))
        });
    }

    const radar = [
        { subject: "Attack", A: Math.min(100, Math.max(0, Math.round(cagr * 400))), fullMark: 100 },
        { subject: "Defense", A: Math.min(100, Math.max(0, Math.round((1 + mdd) * 100))), fullMark: 100 },
        { subject: "Volatility", A: Math.min(100, Math.max(0, Math.round(100 - volatility * 200))), fullMark: 100 },
        { subject: "Sharpe", A: Math.min(100, Math.max(0, Math.round(sharpeRatio * 40))), fullMark: 100 },
        { subject: "Dividend", A: Math.min(100, Math.max(0, Math.round(divYieldPortfolio * 1000))), fullMark: 100 },
    ];
    
    const result = {
        metrics: {
            cagr: Number((cagr * 100).toFixed(2)),
            mdd: Number((mdd * 100).toFixed(2)),
            sharpe: Number(sharpeRatio.toFixed(2)),
            period: `${actualStart} ~ ${actualEnd}`
        },
        radar: radar,
        history: history
    };
    
    console.log(JSON.stringify(result, null, 2));
}

main().catch(err => {
    console.log(JSON.stringify({ error: err.message }));
});
