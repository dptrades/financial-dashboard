import { fetchAlpacaBars, fetchAlpacaPrice } from './alpaca';
import YahooFinance from 'yahoo-finance2';
import { calculateIndicators } from './indicators';
import { ConvictionStock } from '../types/stock';
import { publicClient } from './public-api';
import { schwabClient } from './schwab';

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

// Helper to map timeframe to Alpaca/Yahoo/Schwab format
function mapTimeframe(tf: string): {
    alpaca: string,
    yahoo: string,
    schwab: { periodType: string, period: number, frequencyType: string, frequency: number },
    bars: number
} {
    switch (tf) {
        case '10m': return {
            alpaca: '10Min',
            yahoo: '5m',
            schwab: { periodType: 'day', period: 1, frequencyType: 'minute', frequency: 10 },
            bars: 1000
        };
        case '1h': return {
            alpaca: '1Hour',
            yahoo: '60m',
            schwab: { periodType: 'day', period: 2, frequencyType: 'minute', frequency: 30 },
            bars: 1000
        };
        case '1d': return {
            alpaca: '1Day',
            yahoo: '1d',
            schwab: { periodType: 'year', period: 1, frequencyType: 'daily', frequency: 1 },
            bars: 1000
        };
        case '1w': return {
            alpaca: '1Week',
            yahoo: '1wk',
            schwab: { periodType: 'year', period: 2, frequencyType: 'weekly', frequency: 1 },
            bars: 1000
        };
        default: return {
            alpaca: '1Day',
            yahoo: '1d',
            schwab: { periodType: 'year', period: 1, frequencyType: 'daily', frequency: 1 },
            bars: 1000
        };
    }
}

export async function fetchMultiTimeframeAnalysis(symbol: string, forceRefresh: boolean = false): Promise<MultiTimeframeAnalysis | null> {
    const timeframes: ('10m' | '1h' | '4h' | '1d' | '1w')[] = ['10m', '1h', '1d', '1w'];
    const results: TimeframeData[] = [];
    let dailyAtr = 0;
    let avgVolume = 0;
    let currentPrice = 0;

    const dailyConfig = mapTimeframe('1d');

    // 1. Fetch Daily Data First (Primary)
    const marketSession = publicClient.getMarketSession();
    let livePrice = 0;
    let dailyData: any[] = [];

    // Run concurrently for performance
    const [dailyBars, publicQuote] = await Promise.all([
        fetchMarketData(symbol, dailyConfig.alpaca, dailyConfig.yahoo, dailyConfig.bars, dailyConfig.schwab),
        publicClient.getQuote(symbol, forceRefresh)
    ]);

    dailyData = dailyBars;
    livePrice = publicQuote?.price || 0;

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
        let data = dailyData;

        if (tf !== '1d') {
            const config = mapTimeframe(tf);
            data = await fetchMarketData(symbol, config.alpaca, config.yahoo, config.bars, config.schwab);
        }

        if (data && data.length > 0) {
            // INJECT LIVE PRICE FOR INTRADAY
            if (livePrice && (tf === '10m' || tf === '1h')) {
                const lastBar = data[data.length - 1];
                data = [...data];
                data[data.length - 1] = {
                    ...lastBar,
                    close: livePrice
                };
            }

            const vwapAnchor: any = (tf === '1w') ? 'yearly' : (tf === '1d') ? 'weekly' : 'daily';
            const indicators = calculateIndicators(data, vwapAnchor);
            const last = indicators[indicators.length - 1];

            // Calculate % distance from EMAs
            const getDiff = (price: number, ema: number | undefined) => ema ? ((price - ema) / ema) * 100 : 0;
            const ema9Diff = getDiff(last.close, last.ema9);
            const ema21Diff = getDiff(last.close, last.ema21);
            const ema50Diff = getDiff(last.close, last.ema50);
            const ema200Diff = getDiff(last.close, last.ema200);

            // Check if "Near" (within 0.5%)
            const isNear = [Math.abs(ema9Diff), Math.abs(ema21Diff), Math.abs(ema50Diff), Math.abs(ema200Diff)].some(d => d < 0.5);

            // Determine Trend
            let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
            if (last.close > (last.ema50 || 0)) trend = 'BULLISH';
            else if (last.close < (last.ema50 || 0)) trend = 'BEARISH';

            const macdData = last.macd ? {
                macd: last.macd.MACD || 0,
                signal: last.macd.signal || 0,
                histogram: last.macd.histogram || 0
            } : null;

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

    const order = { '10m': 1, '1h': 2, '4h': 3, '1d': 4, '1w': 5 };
    results.sort((a, b) => order[a.timeframe] - order[b.timeframe]);

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
        dataSource: schwabClient.isConfigured() ? 'Schwab Professional Feed' : 'Hybrid (Alpaca + Public)',
        marketSession
    };
}

async function fetchMarketData(symbol: string, alpacaTf: string, yahooTf: string, limit: number, schwabConfig?: any) {
    if (schwabClient.isConfigured() && schwabConfig) {
        try {
            const bars = await schwabClient.getPriceHistory(
                symbol,
                schwabConfig.periodType,
                schwabConfig.period,
                schwabConfig.frequencyType,
                schwabConfig.frequency
            );
            if (bars && bars.length > 0) {
                return bars.map(b => ({
                    time: b.time,
                    open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume
                }));
            }
        } catch (e) {
            console.error(`[V3] Schwab fetch failed for ${symbol}, falling back...`);
        }
    }

    try {
        const bars = await fetchAlpacaBars(symbol, alpacaTf as any, limit);
        if (bars && bars.length > 0) {
            const lastBar = bars[bars.length - 1];
            const lastTime = new Date(lastBar.t).getTime();
            const now = Date.now();
            const isIntraday = alpacaTf.includes('Min') || alpacaTf.includes('Hour');

            if (isIntraday && (now - lastTime > 24 * 60 * 60 * 1000)) {
                console.warn(`[Alpaca] Stale data for ${symbol} ${alpacaTf} (Last: ${lastBar.t}). Falling back to Yahoo.`);
                throw new Error("Stale data");
            }

            return bars.map((b: any) => ({
                time: new Date(b.t).getTime(),
                open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v
            }));
        }
    } catch (e) { }

    try {
        const now = new Date();
        let daysBack = 30;
        if (yahooTf === '1d') daysBack = 365 * 2;
        else if (yahooTf === '1wk') daysBack = 365 * 5;
        else if (yahooTf === '60m') daysBack = 60;
        else if (yahooTf === '5m') daysBack = 5;

        const period1 = new Date(now.setDate(now.getDate() - daysBack));
        const result = await yahooFinance.chart(symbol, {
            period1: period1,
            interval: yahooTf as any
        });
        if (result && result.quotes) {
            return result.quotes.map((q: any) => ({
                time: new Date(q.date).getTime(),
                open: q.open, high: q.high, low: q.low, close: q.close, volume: q.volume
            })).filter(q => q.close !== null);
        }
    } catch (e) {
        console.error(`Yahoo fetch failed for ${symbol} ${yahooTf}`, e);
    }
    return [];
}
