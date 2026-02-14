import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();
import { calculateIndicators } from './indicators';
import { calculateSentimentScore } from './news';
import { getNewsData } from './news-service';
import { fetchAlpacaBars } from './alpaca';
import { publicClient } from './public-api';
import { runSmartScan, DiscoveredStock } from './smart-scanner';
import { SECTOR_MAP, SCANNER_WATCHLIST } from './constants';
import { generateOptionSignal } from './options';

// Import and re-export types for backwards compatibility
import type { ConvictionStock } from '../types/stock';
import type { OptionRecommendation } from '../types/options';
export type { ConvictionStock } from '../types/stock';

// Disable dynamic discovery - focus only on mega-cap curated list
const ENABLE_SMART_DISCOVERY = false;

// High Mega Cap Stocks - S&P 500 & Nasdaq 100 Only (Market Cap > $200B)
// These are the largest, most liquid companies in both indices
const CONVICTION_WATCHLIST = [
    // Magnificent 7 + Top Tech (All in both SPX & NDX)
    'AAPL',   // Apple - $2.8T
    'MSFT',   // Microsoft - $3.1T
    'GOOGL',  // Alphabet - $2.0T
    'AMZN',   // Amazon - $2.0T
    'NVDA',   // NVIDIA - $2.5T
    'META',   // Meta Platforms - $1.4T
    'TSLA',   // Tesla - $800B

    // Top Tech / Semiconductors
    'AVGO',   // Broadcom - $700B
    'ORCL',   // Oracle - $400B
    'ADBE',   // Adobe - $230B
    'CRM',    // Salesforce - $280B
    'AMD',    // AMD - $250B
    'QCOM',   // Qualcomm - $200B
    'INTC',   // Intel - $200B
    'CSCO',   // Cisco - $230B
    'INTU',   // Intuit - $200B

    // Finance / Payments (S&P 500 Mega Caps in NDX-adjacent sectors)
    'V',      // Visa - $550B
    'MA',     // Mastercard - $450B
    'JPM',    // JPMorgan - $600B
    'BRK-B',  // Berkshire - $900B

    // Healthcare Giants
    'LLY',    // Eli Lilly - $750B
    'UNH',    // UnitedHealth - $500B
    'JNJ',    // Johnson & Johnson - $400B
    'MRK',    // Merck - $300B
    'ABBV',   // AbbVie - $350B
    'PFE',    // Pfizer - $200B
    'TMO',    // Thermo Fisher - $220B

    // Consumer / Retail Mega Caps
    'COST',   // Costco - $400B
    'WMT',    // Walmart - $500B
    'PG',     // P&G - $400B
    'KO',     // Coca-Cola - $270B
    'PEP',    // PepsiCo - $240B
    'HD',     // Home Depot - $380B
    'MCD',    // McDonald's - $210B
    'NKE',    // Nike - $200B

    // Communication / Media
    'NFLX',   // Netflix - $300B
    'DIS',    // Disney - $200B

    // Energy
    'XOM',    // Exxon Mobil - $500B
    'CVX',    // Chevron - $290B

    // Industrial
    'CAT',    // Caterpillar - $200B
    'GE',     // GE Aerospace - $200B
    'HON',    // Honeywell - $200B

    // Indices & Metals (Market Context)
    'SPY', 'QQQ', 'DIA', 'IWM',
    'GLD', 'SLV', 'GDX', 'GDXJ',

    // Sector ETFs (Key for Heatmap)
    'XLK', 'XLF', 'XLE', 'XLY', 'XLP', 'XLV', 'XLI', 'XLB', 'XLU', 'XLRE', 'XLC'
];


// Alpha Hunter Watchlist - Broader Market Coverage (including growth, momentum, and speculative plays)
const ALPHA_HUNTER_WATCHLIST = Array.from(new Set([
    ...SCANNER_WATCHLIST,
    // Core holdings + Specific growth names not in scanner
    'NVDA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'TSLA', 'AAPL', 'AMD',
    'MU', 'CIEN', 'LUV', 'STX', 'CDE', 'AA', 'AU', 'CRWD', 'HWM', 'NGD',
    'JPM', 'V', 'LLY', 'UNH', 'XOM', 'CAT', 'PLTR',
    'HOOD', 'SOFI', 'RIVN', 'LCID', 'GME'
]));


// Separate caches for each scan mode
// Separate caches for each scan mode
const CACHE_TTL = 7 * 60 * 1000; // 7 minutes (Ensures site-wide < 10 min freshness)

declare global {
    var _megaCapCache: { data: ConvictionStock[], timestamp: number } | null;
    var _alphaHunterCache: { data: ConvictionStock[], timestamp: number } | null;
}

// Initialize global cache if not exists
if (!global._megaCapCache) global._megaCapCache = null;
if (!global._alphaHunterCache) global._alphaHunterCache = null;

let isScanning = false;

export async function scanConviction(forceRefresh = false): Promise<ConvictionStock[]> {
    // Return cached data if valid
    if (!forceRefresh && global._megaCapCache && (Date.now() - global._megaCapCache.timestamp < CACHE_TTL)) {
        console.log("⚡ Returning cached mega-cap conviction data");
        return global._megaCapCache.data;
    }

    // Prevent concurrent scans if one is already running (simple lock)
    if (isScanning && !forceRefresh && global._megaCapCache) {
        console.log("⚠️ Scan in progress, returning stale mega-cap cache");
        return global._megaCapCache.data;
    }

    isScanning = true;
    const results: ConvictionStock[] = [];

    // Updated score weightings (now includes discovery bonus)
    const W_TECH = 0.25;
    const W_FUND = 0.20;
    const W_ANALYST = 0.15;
    const W_SOCIAL = 0.15;
    const W_DISCOVERY = 0.25; // Bonus for smart discovery signals

    console.log("🚀 Starting Mega-Cap Conviction Scan (Top Picks)...");
    console.log("🔑 Public.com API Status:", publicClient.isConfigured() ? "Configured (Live) ✅" : "Missing (Estimated) ⚠️");

    // Build symbol list - combine static watchlist with dynamic discoveries
    let symbolsToScan: string[] = [...CONVICTION_WATCHLIST];
    let discoveryMap = new Map<string, DiscoveredStock>();

    if (ENABLE_SMART_DISCOVERY) {
        console.log("🔍 Running Smart Discovery scan...");
        try {
            const discoveries = await runSmartScan();
            for (const d of discoveries) {
                discoveryMap.set(d.symbol, d);
                if (!symbolsToScan.includes(d.symbol)) {
                    symbolsToScan.push(d.symbol);
                }
            }
            console.log(`✨ Smart Discovery added ${discoveries.length} new candidates`);
        } catch (e) {
            console.error("Smart Discovery failed:", e);
        }
    }

    // Limit total symbols to prevent timeout (Raised limit for Sectors + Picks coverage)
    symbolsToScan = symbolsToScan.slice(0, 120);
    console.log(`📊 Total symbols to scan: ${symbolsToScan.length}`);

    // 4. Batch Processing Helper
    const processBatch = async (batch: string[]) => {
        // Fetch ALL Public.com quotes for this batch at once
        const publicQuotes = await publicClient.getQuotes(batch, forceRefresh);
        const publicQuoteMap = new Map(publicQuotes.map(q => [q.symbol, q]));

        const promises = batch.map(async (symbol) => {
            try {
                // 1. Fetch Data (Hybrid: Alpaca for Live Price/Chart, Yahoo for Fundamentals)
                console.log(`[Conviction] Fetching data for ${symbol}...`);
                const [quote, yahooChart, alpacaBars, socialNews] = await Promise.all([
                    (yahooFinance.quoteSummary(symbol, { modules: ['financialData', 'defaultKeyStatistics', 'recommendationTrend', 'price', 'assetProfile'] }) as Promise<any>).catch(e => { console.error(`[Yahoo] Quote Error ${symbol}:`, e.message); return null; }),
                    (yahooFinance.chart(symbol, { period1: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), interval: '1d' }) as Promise<any>).catch(e => { console.error(`[Yahoo] Chart Error ${symbol}:`, e.message); return null; }),
                    (fetchAlpacaBars(symbol, '1Day', 253).then(b => { return b; })),
                    (getNewsData(symbol, 'social') as Promise<any>).catch(e => [])
                ]);

                const publicQuote = publicQuoteMap.get(symbol);

                // DECISION: Use Public.com for live price, Alpaca for Chart, Yahoo as fallback
                let cleanData: any[] = [];
                let currentPrice = publicQuote?.price || 0;
                let usingAlpaca = false;

                if (alpacaBars && alpacaBars.length > 50) {
                    usingAlpaca = true;
                    cleanData = alpacaBars.map((b: any) => ({
                        time: new Date(b.t).getTime(),
                        open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v
                    }));
                    currentPrice = alpacaBars[alpacaBars.length - 1].c;
                } else if (yahooChart && yahooChart.quotes && yahooChart.quotes.length > 50) {
                    cleanData = yahooChart.quotes.map((q: any) => ({
                        time: new Date(q.date).getTime(),
                        open: q.open, high: q.high, low: q.low, close: q.close, volume: q.volume
                    }));
                    // currentPrice will be set from quote later, or last close
                    currentPrice = cleanData[cleanData.length - 1].close;
                } else {
                    console.warn(`⚠️ Skipping ${symbol}: Missing Chart Data (Alpaca & Yahoo failed)`);
                    return null;
                }


                const indicators = calculateIndicators(cleanData);
                const latest = indicators[indicators.length - 1];

                let techScore = 50;
                let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
                const rsi = latest.rsi14 || 50;

                if (latest.close > (latest.ema50 || 0) && (latest.ema50 || 0) > (latest.ema200 || 0)) {
                    techScore += 15; trend = 'BULLISH';
                } else if (latest.close < (latest.ema50 || 0)) {
                    techScore -= 15; trend = 'BEARISH';
                }
                if (rsi > 50 && rsi < 70) techScore += 5;
                if (rsi < 30) techScore += 10;
                if (rsi > 80) techScore -= 10;

                // MACD Logic
                let macdSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
                if (latest.macd && latest.macd.MACD !== undefined && latest.macd.signal !== undefined) {
                    if (latest.macd.MACD > latest.macd.signal) {
                        techScore += 10;
                        macdSignal = 'BULLISH';
                    } else {
                        techScore -= 5;
                        macdSignal = 'BEARISH';
                    }
                }

                // Bollinger Logic
                let bollingerState = 'Neutral';
                if (latest.bollinger && latest.bollinger.upper && latest.bollinger.lower && latest.bollinger.middle) {
                    const bandwidth = (latest.bollinger.upper - latest.bollinger.lower) / latest.bollinger.middle;
                    // Expansion check: if price is near upper band
                    if (latest.close > latest.bollinger.middle && latest.close < latest.bollinger.upper) {
                        techScore += 5;
                        bollingerState = 'Uptrend';
                    }
                    // Breakout
                    if (latest.close > latest.bollinger.upper) {
                        techScore += 10; // Momentum breakout
                        bollingerState = 'Breakout';
                    }
                }

                techScore = Math.max(0, Math.min(100, techScore));


                // 3. Process Fundamentals (Graceful Fallback)
                const financialData = quote?.financialData || {};
                const stats = quote?.defaultKeyStatistics || {};
                let fundScore = 50;
                const pe = financialData.trailingPE || stats.forwardPE || 0;
                const revGrowth = financialData.revenueGrowth || 0;

                if (revGrowth > 0.10) fundScore += 15;
                if (pe > 0 && pe < 40) fundScore += 10;
                if (pe > 100) fundScore -= 10;
                const margins = financialData.profitMargins || 0;
                if (margins > 0.20) fundScore += 10;
                fundScore = Math.max(0, Math.min(100, fundScore));


                // 4. Process Analysts (Graceful Fallback)
                let analystScore = 50;
                const rating = financialData.recommendationMean;
                let ratingText = "Neutral";
                if (rating) {
                    if (rating <= 2.0) { analystScore = 90; ratingText = "Strong Buy"; }
                    else if (rating <= 3.0) { analystScore = 70; ratingText = "Buy"; }
                    else if (rating > 4.0) { analystScore = 20; ratingText = "Sell"; }
                    else { analystScore = 50; ratingText = "Hold"; }
                }
                const targetPrice = financialData.targetMeanPrice || 0;
                // Use Alpaca price if we have it, else valid Yahoo price, else latest close
                const finalPrice = usingAlpaca ? currentPrice : (financialData.currentPrice?.raw || currentPrice);

                // Upside potential
                if (targetPrice > finalPrice) {
                    const upside = ((targetPrice - finalPrice) / finalPrice) * 100;
                    if (upside > 10) analystScore += 10;
                }


                // 5. Process Social
                const { score: socialScore, label: socialLabel } = calculateSentimentScore(socialNews);

                // 6. Discovery Bonus (if stock was found by smart scanner)
                const discovery = discoveryMap.get(symbol);
                const discoveryScore = discovery ? discovery.strength : 0;
                const discoverySource = discovery ? discovery.source : null;

                // 7. TOTAL SCORE (with discovery bonus)
                const finalScore = (
                    (techScore * W_TECH) +
                    (fundScore * W_FUND) +
                    (analystScore * W_ANALYST) +
                    (socialScore * W_SOCIAL) +
                    (discoveryScore * W_DISCOVERY)
                );

                // Calculate 24h Change and Volume Analysis
                let change24h = 0;
                let volume = 0;
                let volumeAvg1y = 0;
                let volumeDiff = 0;

                // Helper to calc avg volume
                const calcVolStats = (data: any[]) => {
                    if (data.length < 10) return { avg: 0, diff: 0 };
                    // Use up to last 252 bars (approx 1 year)
                    const lookback = data.slice(-252);
                    const sum = lookback.reduce((acc, val) => acc + (val.volume || 0), 0);
                    const avg = sum / lookback.length;
                    const lastVol = data[data.length - 1].volume || 0;
                    const diff = avg > 0 ? ((lastVol - avg) / avg) * 100 : 0;
                    return { avg, diff };
                };

                if (usingAlpaca && cleanData.length > 1) {
                    const last = cleanData[cleanData.length - 1];
                    const prev = cleanData[cleanData.length - 2];
                    change24h = ((last.close - prev.close) / prev.close) * 100;
                    volume = last.volume;
                    const stats = calcVolStats(cleanData);
                    volumeAvg1y = stats.avg;
                    volumeDiff = stats.diff;
                } else if (quote?.price) {
                    change24h = (quote.price.regularMarketChangePercent || 0) * 100;
                    volume = quote.price.regularMarketVolume || 0;
                    if (cleanData.length > 1) {
                        const stats = calcVolStats(cleanData);
                        volumeAvg1y = stats.avg;
                        volumeDiff = stats.diff;
                    }
                } else if (cleanData.length > 1) {
                    const last = cleanData[cleanData.length - 1];
                    const prev = cleanData[cleanData.length - 2];
                    change24h = ((last.close - prev.close) / prev.close) * 100;
                    volume = last.volume;
                    const stats = calcVolStats(cleanData);
                    volumeAvg1y = stats.avg;
                    volumeDiff = stats.diff;
                }

                // Reasons
                const reasons: string[] = [];
                if (discovery) reasons.push(`🔍 ${discovery.signal}`);
                if (trend === 'BULLISH') reasons.push("Strong Technical Uptrend");
                if (techScore > 70) reasons.push("Bullish Momentum (RSI)");
                if (fundScore > 70) reasons.push("Solid Fundamentals");
                if (analystScore > 80) reasons.push(`Analyst Consensus: ${ratingText}`);
                if (socialScore > 75) reasons.push("High Social Interest");
                if (volumeDiff > 50) reasons.push(`High Volume (+${Math.round(volumeDiff)}%)`);

                // Generate Option Signal
                // Use ATR if available, else 2% proxy
                const atr = latest.atr14 || (latest.close * 0.02);
                const trendLower = trend.toLowerCase() as 'bullish' | 'bearish' | 'neutral';
                const optionSignal = await generateOptionSignal(latest.close, atr, trendLower, rsi, latest.ema50, latest, symbol);


                // Add option reason if high confidence
                if (optionSignal.type !== 'WAIT') {
                    reasons.push(`🎯 Option Setup: ${optionSignal.type} @ $${optionSignal.strike}`);
                }

                return {
                    symbol,
                    name: (quote?.price as any)?.longName || symbol,
                    price: finalPrice,
                    score: Math.round(finalScore),
                    technicalScore: Math.round(techScore),
                    fundamentalScore: Math.round(fundScore),
                    analystScore: Math.round(analystScore),
                    sentimentScore: Math.round(socialScore),
                    metrics: {
                        pe: pe,
                        marketCap: (quote?.price as any)?.marketCap || 0,
                        revenueGrowth: revGrowth,
                        rsi: Math.round(rsi),
                        trend,
                        analystRating: ratingText,
                        analystTarget: targetPrice,
                        socialSentiment: socialLabel
                    },
                    reasons,
                    discoverySource,
                    change24h,
                    volume,
                    volumeAvg1y,
                    volumeDiff,
                    sector: SECTOR_MAP[symbol] || quote?.assetProfile?.sector || 'Other',

                    suggestedOption: optionSignal
                } as ConvictionStock;

            } catch (e) {
                console.error(`❌ Global Conviction Error for ${symbol}:`, e);
                return null;
            }
        });

        return Promise.all(promises);
    }

    // Process in chunks of 5
    const CHUNK_SIZE = 20;
    for (let i = 0; i < symbolsToScan.length; i += CHUNK_SIZE) {
        const batch = symbolsToScan.slice(i, i + CHUNK_SIZE);
        console.log(`📦 Processing batch ${i / CHUNK_SIZE + 1}/${Math.ceil(symbolsToScan.length / CHUNK_SIZE)}: ${batch.join(', ')}`);

        const batchResults = await processBatch(batch);

        // Filter out nulls and add to results
        batchResults.forEach(r => {
            if (r) results.push(r);
        });

        // Small delay between batches to be nice to APIs
        if (i + CHUNK_SIZE < symbolsToScan.length) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    // Sort by score desc
    const sorted = results.sort((a, b) => b.score - a.score);

    // Update Cache
    global._megaCapCache = {
        data: sorted,
        timestamp: Date.now()
    };
    isScanning = false;

    return sorted;
}

// Alpha Hunter - Broader Market Scan with Smart Discovery
export async function scanAlphaHunter(forceRefresh = false): Promise<ConvictionStock[]> {
    // Return cached data if valid
    if (!forceRefresh && global._alphaHunterCache && (Date.now() - global._alphaHunterCache.timestamp < CACHE_TTL)) {
        console.log("⚡ Returning cached Alpha Hunter data");
        return global._alphaHunterCache.data;
    }

    // Prevent concurrent scans if one is already running (simple lock)
    if (isScanning && !forceRefresh && global._alphaHunterCache) {
        console.log("⚠️ Scan in progress, returning stale Alpha Hunter cache");
        return global._alphaHunterCache.data;
    }

    isScanning = true;
    const results: ConvictionStock[] = [];

    // Updated score weightings (now includes discovery bonus)
    const W_TECH = 0.25;
    const W_FUND = 0.20;
    const W_ANALYST = 0.15;
    const W_SOCIAL = 0.15;
    const W_DISCOVERY = 0.25; // Bonus for smart discovery signals

    console.log("🚀 Starting Alpha Hunter Scan (Full Market)...");
    console.log("🔑 Public.com API Status:", publicClient.isConfigured() ? "Configured (Live) ✅" : "Missing (Estimated) ⚠️");

    // Build symbol list - combine broader watchlist with dynamic discoveries
    let symbolsToScan: string[] = [...ALPHA_HUNTER_WATCHLIST];
    let discoveryMap = new Map<string, DiscoveredStock>();

    // Enable Smart Discovery for Alpha Hunter
    console.log("🔍 Running Smart Discovery scan...");
    try {
        const discoveries = await runSmartScan();
        for (const d of discoveries) {
            discoveryMap.set(d.symbol, d);
            if (!symbolsToScan.includes(d.symbol)) {
                symbolsToScan.push(d.symbol);
            }
        }
        console.log(`✨ Smart Discovery added ${discoveries.length} new candidates`);
    } catch (e) {
        console.error("Smart Discovery failed:", e);
    }

    // Limit total symbols to prevent timeout
    symbolsToScan = symbolsToScan.slice(0, 120);
    console.log(`📊 Total symbols to scan: ${symbolsToScan.length}`);

    // 4. Batch Processing Helper
    const processBatch = async (batch: string[]) => {
        // Fetch ALL Public.com quotes for this batch at once
        const publicQuotes = await publicClient.getQuotes(batch, forceRefresh);
        const publicQuoteMap = new Map(publicQuotes.map(q => [q.symbol, q]));

        const promises = batch.map(async (symbol) => {
            try {
                // 1. Fetch Data (Hybrid: Alpaca for Live Price/Chart, Yahoo for Fundamentals)
                console.log(`[Alpha Hunter] Fetching data for ${symbol}...`);
                const [quote, yahooChart, alpacaBars, socialNews] = await Promise.all([
                    (yahooFinance.quoteSummary(symbol, { modules: ['financialData', 'defaultKeyStatistics', 'recommendationTrend', 'price', 'assetProfile'] }) as Promise<any>).catch(e => { console.error(`[Yahoo] Quote Error ${symbol}:`, e.message); return null; }),
                    (yahooFinance.chart(symbol, { period1: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), interval: '1d' }) as Promise<any>).catch(e => { console.error(`[Yahoo] Chart Error ${symbol}:`, e.message); return null; }),
                    (fetchAlpacaBars(symbol, '1Day', 253).then(b => { return b; })),
                    (getNewsData(symbol, 'social') as Promise<any>).catch(e => [])
                ]);

                const publicQuote = publicQuoteMap.get(symbol);

                // DECISION: Use Public.com for live price, Alpaca for Chart, Yahoo as fallback
                let cleanData: any[] = [];
                let currentPrice = publicQuote?.price || 0;
                let usingAlpaca = false;

                if (alpacaBars && alpacaBars.length > 50) {
                    usingAlpaca = true;
                    cleanData = alpacaBars.map((b: any) => ({
                        time: new Date(b.t).getTime(),
                        open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v
                    }));
                    if (!currentPrice) currentPrice = alpacaBars[alpacaBars.length - 1].c;
                }
                else if (yahooChart && yahooChart.quotes && yahooChart.quotes.length > 50) {
                    cleanData = yahooChart.quotes.map((q: any) => ({
                        time: new Date(q.date).getTime(),
                        open: q.open, high: q.high, low: q.low, close: q.close, volume: q.volume
                    }));
                    // currentPrice will be set from quote later, or last close
                    currentPrice = cleanData[cleanData.length - 1].close;
                } else {
                    console.warn(`⚠️ Skipping ${symbol}: Missing Chart Data (Alpaca & Yahoo failed)`);
                    return null;
                }


                const indicators = calculateIndicators(cleanData);
                const latest = indicators[indicators.length - 1];

                let techScore = 50;
                let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
                const rsi = latest.rsi14 || 50;

                if (latest.close > (latest.ema50 || 0) && (latest.ema50 || 0) > (latest.ema200 || 0)) {
                    techScore += 20; trend = 'BULLISH';
                } else if (latest.close < (latest.ema50 || 0)) {
                    techScore -= 20; trend = 'BEARISH';
                }
                if (rsi > 50 && rsi < 70) techScore += 10;
                if (rsi < 30) techScore += 15;
                if (rsi > 80) techScore -= 10;
                techScore = Math.max(0, Math.min(100, techScore));


                // 3. Process Fundamentals (Graceful Fallback)
                const financialData = quote?.financialData || {};
                const stats = quote?.defaultKeyStatistics || {};
                let fundScore = 50;
                const pe = financialData.trailingPE || stats.forwardPE || 0;
                const revGrowth = financialData.revenueGrowth || 0;

                if (revGrowth > 0.10) fundScore += 15;
                if (pe > 0 && pe < 40) fundScore += 10;
                if (pe > 100) fundScore -= 10;
                const margins = financialData.profitMargins || 0;
                if (margins > 0.20) fundScore += 10;
                fundScore = Math.max(0, Math.min(100, fundScore));


                // 4. Process Analysts (Graceful Fallback)
                let analystScore = 50;
                const rating = financialData.recommendationMean;
                let ratingText = "Neutral";
                if (rating) {
                    if (rating <= 2.0) { analystScore = 90; ratingText = "Strong Buy"; }
                    else if (rating <= 3.0) { analystScore = 70; ratingText = "Buy"; }
                    else if (rating > 4.0) { analystScore = 20; ratingText = "Sell"; }
                    else { analystScore = 50; ratingText = "Hold"; }
                }
                const targetPrice = financialData.targetMeanPrice || 0;
                // Use Alpaca price if we have it, else valid Yahoo price, else latest close
                const finalPrice = usingAlpaca ? currentPrice : (financialData.currentPrice?.raw || currentPrice);

                // Upside potential
                if (targetPrice > finalPrice) {
                    const upside = ((targetPrice - finalPrice) / finalPrice) * 100;
                    if (upside > 10) analystScore += 10;
                }


                // 5. Process Social
                const { score: socialScore, label: socialLabel } = calculateSentimentScore(socialNews);

                // 6. Discovery Bonus (if stock was found by smart scanner)
                const discovery = discoveryMap.get(symbol);
                const discoveryScore = discovery ? discovery.strength : 0;
                const discoverySource = discovery ? discovery.source : null;

                // 7. TOTAL SCORE (with discovery bonus)
                const finalScore = (
                    (techScore * W_TECH) +
                    (fundScore * W_FUND) +
                    (analystScore * W_ANALYST) +
                    (socialScore * W_SOCIAL) +
                    (discoveryScore * W_DISCOVERY)
                );

                // Calculate 24h Change and Volume Analysis
                let change24h = 0;
                let volume = 0;
                let volumeAvg1y = 0;
                let volumeDiff = 0;

                // Helper to calc avg volume
                const calcVolStats = (data: any[]) => {
                    if (data.length < 10) return { avg: 0, diff: 0 };
                    // Use up to last 252 bars (approx 1 year)
                    const lookback = data.slice(-252);
                    const sum = lookback.reduce((acc, val) => acc + (val.volume || 0), 0);
                    const avg = sum / lookback.length;
                    const lastVol = data[data.length - 1].volume || 0;
                    const diff = avg > 0 ? ((lastVol - avg) / avg) * 100 : 0;
                    return { avg, diff };
                };

                if (usingAlpaca && cleanData.length > 1) {
                    const last = cleanData[cleanData.length - 1];
                    const prev = cleanData[cleanData.length - 2];
                    change24h = ((last.close - prev.close) / prev.close) * 100;
                    volume = last.volume;
                    const stats = calcVolStats(cleanData);
                    volumeAvg1y = stats.avg;
                    volumeDiff = stats.diff;
                } else if (quote?.price) {
                    change24h = (quote.price.regularMarketChangePercent || 0) * 100;
                    volume = quote.price.regularMarketVolume || 0;
                    // If we have chart data from Yahoo, use it for stats
                    if (cleanData.length > 1) {
                        const stats = calcVolStats(cleanData);
                        volumeAvg1y = stats.avg;
                        volumeDiff = stats.diff;
                    }
                } else if (cleanData.length > 1) {
                    const last = cleanData[cleanData.length - 1];
                    const prev = cleanData[cleanData.length - 2];
                    change24h = ((last.close - prev.close) / prev.close) * 100;
                    volume = last.volume;
                    const stats = calcVolStats(cleanData);
                    volumeAvg1y = stats.avg;
                    volumeDiff = stats.diff;
                }

                // Reasons
                const reasons: string[] = [];
                if (discovery) reasons.push(`🔍 ${discovery.signal}`);
                if (trend === 'BULLISH') reasons.push("Strong Technical Uptrend");
                if (techScore > 70) reasons.push("Bullish Momentum (RSI)");
                if (fundScore > 70) reasons.push("Solid Fundamentals");
                if (analystScore > 80) reasons.push(`Analyst Consensus: ${ratingText}`);
                if (socialScore > 75) reasons.push("High Social Interest");
                if (volumeDiff > 50) reasons.push(`High Volume (+${Math.round(volumeDiff)}%)`);

                // Generate Option Signal
                // Use ATR if available, else 2% proxy
                const atr = latest.atr14 || (latest.close * 0.02);
                const trendLower = trend.toLowerCase() as 'bullish' | 'bearish' | 'neutral';
                const optionSignal = await generateOptionSignal(latest.close, atr, trendLower, rsi, latest.ema50, latest, symbol);


                // Add option reason if high confidence
                if (optionSignal.type !== 'WAIT') {
                    reasons.push(`🎯 Option Setup: ${optionSignal.type} @ $${optionSignal.strike}`);
                }

                return {
                    symbol,
                    name: (quote?.price as any)?.longName || symbol,
                    price: finalPrice,
                    score: Math.round(finalScore),
                    technicalScore: Math.round(techScore),
                    fundamentalScore: Math.round(fundScore),
                    analystScore: Math.round(analystScore),
                    sentimentScore: Math.round(socialScore),
                    metrics: {
                        pe: pe,
                        marketCap: (quote?.price as any)?.marketCap || 0,
                        revenueGrowth: revGrowth,
                        rsi: Math.round(rsi),
                        trend,
                        analystRating: ratingText,
                        analystTarget: targetPrice,
                        socialSentiment: socialLabel
                    },
                    reasons,
                    discoverySource,
                    change24h,
                    volume,
                    volumeAvg1y,
                    volumeDiff,
                    sector: SECTOR_MAP[symbol] || quote?.assetProfile?.sector || 'Other',

                    suggestedOption: optionSignal
                } as ConvictionStock;

            } catch (e) {
                console.error(`❌ Global Alpha Hunter Error for ${symbol}:`, e);
                return null;
            }
        });

        return Promise.all(promises);
    }

    // Process in chunks of 5
    const CHUNK_SIZE = 20;
    for (let i = 0; i < symbolsToScan.length; i += CHUNK_SIZE) {
        const batch = symbolsToScan.slice(i, i + CHUNK_SIZE);
        console.log(`📦 Processing batch ${i / CHUNK_SIZE + 1}/${Math.ceil(symbolsToScan.length / CHUNK_SIZE)}: ${batch.join(', ')}`);

        const batchResults = await processBatch(batch);

        // Filter out nulls and add to results
        batchResults.forEach(r => {
            if (r) results.push(r);
        });

        // Small delay between batches to be nice to APIs
        if (i + CHUNK_SIZE < symbolsToScan.length) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    // Sort by score desc
    const sorted = results.sort((a, b) => b.score - a.score);

    // Update Cache
    global._alphaHunterCache = {
        data: sorted,
        timestamp: Date.now()
    };
    isScanning = false;

    if (sorted.length === 0) {
        return [];
    }

    return sorted;
}
