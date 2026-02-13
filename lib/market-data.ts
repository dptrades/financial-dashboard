import { fetchAlpacaBars, fetchAlpacaPrice } from './alpaca';
import YahooFinance from 'yahoo-finance2';
import { calculateIndicators } from './indicators';
import { ConvictionStock } from '../types/stock';
import { publicClient } from './public-api';

const yahooFinance = new YahooFinance();

export interface TimeframeData {
    timeframe: '10m' | '1h' | '4h' | '1d' | '1w';
    open: number;
    close: number;
    ema9: number | null;
    ema21: number | null;
    ema50: number | null;
    ema200: number | null;
    rsi: number | null;
    adx: number | null;
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    macd: {
        macd: number;
        signal: number;
        histogram: number;
    } | null;
    bollinger: {
        upper: number;
        lower: number;
        middle: number;
        pb: number; // %B
    } | null;
    vwap: number | null;
    priceRelToEma: {
        ema9: number; // % distance
        ema21: number;
        ema50: number;
        ema200: number;
        isNear: boolean; // if within 1% of any major EMA
    };
}

export interface MultiTimeframeAnalysis {
    symbol: string;
    currentPrice: number;
    headerPrice: number; // The price to show in the global header (last close during off hours)
    timeframes: TimeframeData[];
    metrics: {
        atr: number;
        avgVolume1y: number;
        volumeDiff: number;
        volatility: number; // ATR as % of price
        dayHigh: number;
        dayLow: number;
    };
    dataSource: string;
    marketSession: 'PRE' | 'REG' | 'POST' | 'OFF';
}

// Helper to map timeframe to Alpaca/Yahoo format
function mapTimeframe(tf: string): { alpaca: string, yahoo: string, bars: number } {
    switch (tf) {
        case '10m': return { alpaca: '10Min', yahoo: '5m', bars: 1000 };
        case '1h': return { alpaca: '1Hour', yahoo: '60m', bars: 1000 };
        case '4h': return { alpaca: '4Hour', yahoo: '1d', bars: 1000 };
        case '1d': return { alpaca: '1Day', yahoo: '1d', bars: 1000 };
        case '1w': return { alpaca: '1Week', yahoo: '1wk', bars: 1000 };
        default: return { alpaca: '1Day', yahoo: '1d', bars: 1000 };
    }
}

export async function fetchMultiTimeframeAnalysis(symbol: string): Promise<MultiTimeframeAnalysis | null> {
    const timeframes: ('10m' | '1h' | '4h' | '1d' | '1w')[] = ['10m', '1h', '1d', '1w']; // 4h skipped for now as complex on free
    const results: TimeframeData[] = [];
    let dailyAtr = 0;
    let avgVolume = 0;
    let currentPrice = 0;

    // We need 180d volume, which comes from Daily chart
    // We process Daily first to get global metrics
    const dailyConfig = mapTimeframe('1d');

    // 1. Fetch Daily Data First (Primary)
    // Run concurrently with live price fetch
    // 1. Fetch Daily Data First (Primary)
    // Run concurrently with live price fetch and source checks
    let dataSource = 'Public.com';
    const marketSession = publicClient.getMarketSession();
    let livePrice = 0;
    let dailyData: any[] = [];

    // ROUTING LOGIC:
    // 1. Regular Hours: Use Alpaca (High frequency, specialized for price)
    // 2. Extended Hours: Use Public (Brokerage data with Pre/Post support)
    if (marketSession === 'REG') {
        const result = await Promise.all([
            fetchMarketData(symbol, dailyConfig.alpaca, dailyConfig.yahoo, dailyConfig.bars),
            fetchAlpacaPrice(symbol)
        ]);
        dailyData = result[0];
        livePrice = result[1] || 0;
        dataSource = 'Alpaca (Real-time)';
    } else {
        const result = await Promise.all([
            fetchMarketData(symbol, dailyConfig.alpaca, dailyConfig.yahoo, dailyConfig.bars),
            publicClient.getQuote(symbol)
        ]);
        dailyData = result[0];
        livePrice = result[1]?.price || 0;
        dataSource = publicClient.isConfigured() ? 'Public.com' : 'Public.com (Estimated)';
    }

    if (!dailyData || dailyData.length < 50) {
        console.error(`Insufficient daily data for ${symbol}`);
        return null;
    }

    // Process Daily
    const dailyIndicators = calculateIndicators(dailyData);
    const latestDaily = dailyIndicators[dailyIndicators.length - 1];

    // Use live price if available and market is open/recent, otherwise last close
    currentPrice = livePrice || latestDaily.close;

    dailyAtr = latestDaily.atr14 || 0;

    // Calculate 1y Volume Avg (~252 trading days)
    const volSlice = dailyData.slice(-252);
    avgVolume = volSlice.reduce((acc, curr) => acc + curr.volume, 0) / volSlice.length;

    // Calculate Volume Diff
    const lastVol = dailyData[dailyData.length - 1].volume;
    const volDiff = avgVolume > 0 ? ((lastVol - avgVolume) / avgVolume) * 100 : 0;

    // Analyze all timeframes
    await Promise.all(timeframes.map(async (tf) => {
        let data = dailyData; // Default to daily if match

        if (tf !== '1d') {
            const config = mapTimeframe(tf);
            data = await fetchMarketData(symbol, config.alpaca, config.yahoo, config.bars);
        }

        if (data && data.length > 0) {
            // INJECT LIVE PRICE FOR INTRADAY
            if (livePrice && (tf === '10m' || tf === '1h')) {
                const lastBar = data[data.length - 1];
                // Update the last bar with the live price for real-time calc
                data = [...data];
                data[data.length - 1] = {
                    ...lastBar,
                    close: livePrice
                };
            }

            const indicators = calculateIndicators(data);
            const last = indicators[indicators.length - 1];

            // Calculate % distance from EMAs
            const getDiff = (price: number, ema: number | undefined) => ema ? ((price - ema) / ema) * 100 : 0;
            const ema9Diff = getDiff(last.close, last.ema9);
            const ema21Diff = getDiff(last.close, last.ema21);
            const ema50Diff = getDiff(last.close, last.ema50);
            const ema200Diff = getDiff(last.close, last.ema200);

            // Check if "Near" (within 0.5%)
            const isNear = [Math.abs(ema9Diff), Math.abs(ema21Diff), Math.abs(ema50Diff), Math.abs(ema200Diff)].some(d => d < 0.5);

            // Determine Trend (Simple EMA alignment)
            let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
            if (last.close > (last.ema50 || 0)) trend = 'BULLISH';
            else if (last.close < (last.ema50 || 0)) trend = 'BEARISH';

            // Map MACD
            const macdData = last.macd ? {
                macd: last.macd.MACD || 0,
                signal: last.macd.signal || 0,
                histogram: last.macd.histogram || 0
            } : null;

            // Map Bollinger
            const bbData = last.bollinger ? {
                upper: last.bollinger.upper || 0,
                lower: last.bollinger.lower || 0,
                middle: last.bollinger.middle || 0,
                pb: last.bollinger.pb || 0
            } : null;

            results.push({
                timeframe: tf,
                open: last.open,
                close: last.close,
                ema9: last.ema9 || null,
                ema21: last.ema21 || null,
                ema50: last.ema50 || null,
                ema200: last.ema200 || null,
                rsi: last.rsi14 || null,
                adx: last.adx14 || null,
                trend,
                macd: macdData,
                bollinger: bbData,
                vwap: last.vwap || null,
                priceRelToEma: {
                    ema9: ema9Diff,
                    ema21: ema21Diff,
                    ema50: ema50Diff,
                    ema200: ema200Diff,
                    isNear
                }
            });
        }
    }));

    // Sort results by timeframe duration for consistent display
    const order = { '10m': 1, '1h': 2, '4h': 3, '1d': 4, '1w': 5 };
    results.sort((a, b) => order[a.timeframe] - order[b.timeframe]);

    // For Header Price: If REG, use current. If extended, use latest close (last daily bar).
    const headerPrice = marketSession === 'REG' ? currentPrice : latestDaily.close;

    return {
        symbol,
        currentPrice,
        headerPrice,
        timeframes: results,
        metrics: {
            atr: dailyAtr,
            avgVolume1y: Math.round(avgVolume),
            volumeDiff: volDiff,
            volatility: (dailyAtr / currentPrice) * 100,
            dayHigh: dailyData[dailyData.length - 1].high,
            dayLow: dailyData[dailyData.length - 1].low
        },
        dataSource,
        marketSession
    };
}

async function fetchMarketData(symbol: string, alpacaTf: string, yahooTf: string, limit: number) {
    // Try Alpaca First
    try {
        // Special case: Alpaca 10Min isn't a standard 'timeframe' enum usually, but custom string
        // If fetchAlpacaBars supports raw strings, great. If not, fallback to Yahoo.
        // Assuming fetchAlpacaBars handles it or we wrap it.
        const bars = await fetchAlpacaBars(symbol, alpacaTf as any, limit);
        if (bars && bars.length > 0) {
            // Check for staleness on intraday data
            const lastBar = bars[bars.length - 1];
            const lastTime = new Date(lastBar.t).getTime();
            const now = Date.now();
            const isIntraday = alpacaTf.includes('Min') || alpacaTf.includes('Hour');

            // If data is older than 24 hours for intraday, consider it stale/broken feed
            if (isIntraday && (now - lastTime > 24 * 60 * 60 * 1000)) {
                console.warn(`[Alpaca] Stale data for ${symbol} ${alpacaTf} (Last: ${lastBar.t}). Falling back to Yahoo.`);
                throw new Error("Stale data");
            }

            return bars.map((b: any) => ({
                time: new Date(b.t).getTime(),
                open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v
            }));
        }
    } catch (e) {
        // Alpaca failed or not configured or stale
    }

    // Fallback Yahoo
    try {
        // Calculate period1 based on timeframe
        const now = new Date();
        let daysBack = 30; // Default

        if (yahooTf === '1d') daysBack = 365 * 2; // 2 years
        else if (yahooTf === '1wk') daysBack = 365 * 5; // 5 years
        else if (yahooTf === '60m') daysBack = 60; // 2 months (max for intraday usually)
        else if (yahooTf === '5m') daysBack = 5; // 5 days

        const period1 = new Date(now.setDate(now.getDate() - daysBack));

        const result = await yahooFinance.chart(symbol, {
            period1: period1,
            interval: yahooTf as any
        });
        if (result && result.quotes) {
            return result.quotes.map((q: any) => ({
                time: new Date(q.date).getTime(),
                open: q.open, high: q.high, low: q.low, close: q.close, volume: q.volume
            })).filter(q => q.close !== null); // Yahoo sometimes returns nulls
        }
    } catch (e) {
        console.error(`Yahoo fetch failed for ${symbol} ${yahooTf}`, e);
    }
    return [];
}
