import { fetchOHLCV } from './api';
import { calculateIndicators } from './indicators';
import { IndicatorData } from '@/types/financial';
import { generateOptionSignal, getNextMonthlyExpiry } from './options';

export interface ScannedStock {
    symbol: string;
    score: number;
    price: number;
    change24h: number;
    volume: number;
    avgVolume: number;
    rsi: number;
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    sector: string;
    reasons: string[];
    suggestedOption?: {
        expiry: string;
        strike: number;
        type: 'CALL' | 'PUT';
        description: string;
    };
}

const SECTOR_MAP: Record<string, string> = {
    // Technology
    NVDA: 'Technology', AMD: 'Technology', AAPL: 'Technology', MSFT: 'Technology',
    META: 'Technology', GOOGL: 'Technology', INTC: 'Technology',
    PLTR: 'Technology', TSM: 'Technology', AVGO: 'Technology', ORCL: 'Technology',

    // Consumer Cyclical (EV / Retail)
    TSLA: 'Consumer', AMZN: 'Consumer', HD: 'Consumer', MCD: 'Consumer',
    NKE: 'Consumer', RIVN: 'Consumer', LCID: 'Consumer', GME: 'Consumer',

    // Finance / Fintech
    JPM: 'Finance', BAC: 'Finance', WFC: 'Finance', C: 'Finance',
    GS: 'Finance', MS: 'Finance', V: 'Finance', MA: 'Finance',
    COIN: 'Finance', HOOD: 'Finance', SOFI: 'Finance', PYPL: 'Finance',

    // Communications
    NFLX: 'Communication', DIS: 'Communication', T: 'Communication', VZ: 'Communication',

    // Healthcare
    LLY: 'Healthcare', JNJ: 'Healthcare', ABBV: 'Healthcare', MRK: 'Healthcare', PFE: 'Healthcare', UNH: 'Healthcare',

    // Energy
    XOM: 'Energy', CVX: 'Energy', OXY: 'Energy', COP: 'Energy', SLB: 'Energy',

    // Industrial
    CAT: 'Industrial', BA: 'Industrial', GE: 'Industrial', UNP: 'Industrial',

    // ETF / Crypto Proxies
    MSTR: 'Technology', MARA: 'Technology', DKNG: 'Consumer', SPY: 'Indices', QQQ: 'Indices', IWM: 'Indices',

    // Commodities
    'CL=F': 'Energy', 'NG=F': 'Energy',       // Oil, Gas
    'GC=F': 'Metals', 'SI=F': 'Metals',       // Gold, Silver
    'HG=F': 'Metals', 'ALI=F': 'Metals',      // Copper, Aluminum

    // Market Internals
    '^VIX': 'Internals',
    '^GSPC': 'Indices', '^IXIC': 'Indices', // S&P 500, Nasdaq 100

    // Top 40 SPY/QQQ (Weighted Breadth Proxy)
    // Mega Caps & Others (Already included above: NVDA, AAPL, MSFT, AMZN, META, GOOGL, TSLA, AVGO, NFLX, XOM, CVX, CAT, BA, GE, UNP)

    // Extended Tech
    ADBE: 'Technology', CRM: 'Technology', CSCO: 'Technology',
    QCOM: 'Technology', TXN: 'Technology', AMAT: 'Technology', INTU: 'Technology',
    // Financials
    'BRK-B': 'Finance', BLK: 'Finance',
    // Healthcare
    TMO: 'Healthcare',
    // Consumer / Retail
    WMT: 'Consumer', PG: 'Consumer', COST: 'Consumer', PEP: 'Consumer', KO: 'Consumer',
    // Industrial
    HON: 'Industrial',
    // Bonds & Forex (Existing)
    '^TNX': 'Bonds', '^TYX': 'Bonds', '^FVX': 'Bonds',

    // Forex
    'EURUSD=X': 'Forex', 'JPY=X': 'Forex', 'GBPUSD=X': 'Forex', 'CAD=X': 'Forex',

    // Market Internals (Hidden from main grid, used for Dashboard)
    'DX-Y.NYB': 'Internals'
};

const WATCHLIST = Object.keys(SECTOR_MAP);

export const scanMarket = async (): Promise<ScannedStock[]> => {
    const results: ScannedStock[] = [];

    // Parallel fetch for speed
    const promises = WATCHLIST.map(async (symbol): Promise<ScannedStock | null> => {
        try {
            // Fetch 3 months of daily data for trend analysis
            const rawData = await fetchOHLCV(symbol, '90', 'stocks', '1d');
            if (!rawData || rawData.length < 50) return null;

            const data = calculateIndicators(rawData);
            const latest = data[data.length - 1];
            const prev = data[data.length - 2];

            if (!latest || !latest.ema50 || !latest.ema200 || !latest.rsi14) return null;

            let score = 0;
            const reasons: string[] = [];

            // 1. Technical Score (Max 60)
            // Trend (30 pts)
            if (latest.close > latest.ema50 && latest.ema50 > latest.ema200) {
                score += 30;
                reasons.push('Strong Uptrend (Price > EMA50 > EMA200)');
            } else if (latest.close > latest.ema200) {
                score += 15;
                reasons.push('Above Long-Term Trend (EMA200)');
            }

            // Momentum (20 pts)
            if (latest.rsi14 >= 50 && latest.rsi14 <= 70) {
                score += 20;
                reasons.push('Healthy Momentum (RSI 50-70)');
            } else if (latest.rsi14 > 40 && latest.rsi14 < 50) {
                score += 10;
                reasons.push('Heating Up (RSI > 40)');
            }

            // Breakout (10 pts) - crossed above 20 day high?
            // Simplified: Price > Prev Close by 3%
            const change = ((latest.close - prev.close) / prev.close) * 100;
            if (change > 3) {
                score += 10;
                reasons.push('Strong Daily Move (>3%)');
            }

            // 2. Volume Anomaly (Max 20)
            // Calculate Avg Vol (20 days) from data if not available? 
            // We usually have volume in OHLCV
            const avgVol = data.slice(-20).reduce((acc, d) => acc + d.volume, 0) / 20;
            if (latest.volume > avgVol * 1.5) {
                score += 20;
                reasons.push(`High Volume (${(latest.volume / avgVol).toFixed(1)}x Avg)`);
            } else if (latest.volume > avgVol * 1.2) {
                score += 10;
                reasons.push('Above Average Volume');
            }

            // 3. Fundamentals / Market Cap (Max 20)
            // Mocking "Blue Chip" safety for big tech
            if (['NVDA', 'AAPL', 'MSFT', 'GOOGL', 'META', 'AMZN'].includes(symbol)) {
                score += 20;
                reasons.push('Blue Chip Safety');
            } else {
                // High Beta / Growth
                score += 10;
                reasons.push('High Growth Potential');
            }

            // 4. Option Strategy (Unified Logic)
            const trend = latest.close > latest.ema200 ? 'BULLISH' : 'BEARISH';
            const trendLower = trend.toLowerCase() as 'bullish' | 'bearish' | 'neutral';
            // Use ATR if available, else fallback to 2% of price as rough proxy
            const atr = latest.atr14 || (latest.close * 0.02);

            const signal = generateOptionSignal(latest.close, atr, trendLower, latest.rsi14);

            let suggestedOption;
            if (signal.type !== 'WAIT') {
                suggestedOption = {
                    expiry: signal.expiry,
                    strike: signal.strike,
                    type: signal.type as 'CALL' | 'PUT',
                    description: `${signal.expiry} $${signal.strike} ${signal.type}`
                };
            }

            // Fallback if WAIT (Scanner forces a pick if score > X, so we might force a direction)
            // But usually if score is high, trend is strong, so signal won't be WAIT.
            if (!suggestedOption && trend !== 'NEUTRAL') {
                // Fallback to old logic if signal says WAIT but Score says BUY
                suggestedOption = {
                    expiry: getNextMonthlyExpiry(),
                    strike: Math.round(latest.close * (trend === 'BULLISH' ? 1.05 : 0.95)),
                    type: trend === 'BULLISH' ? 'CALL' : 'PUT',
                    description: 'Speculative Play'
                };
            }

            return {
                symbol,
                score,
                price: latest.close,
                change24h: change,
                volume: latest.volume,
                avgVolume: avgVol,
                rsi: latest.rsi14,
                trend,
                sector: SECTOR_MAP[symbol] || 'Unknown',
                reasons,
                suggestedOption
            };

        } catch (e) {
            console.error(`Failed to scan ${symbol}`, e);
            return null;
        }
    });

    const scanned = await Promise.all(promises);
    return scanned
        .filter((s): s is ScannedStock => s !== null)
        .sort((a, b) => b.score - a.score);
};
