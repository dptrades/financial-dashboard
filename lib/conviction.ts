import yahooFinance from 'yahoo-finance2';
import { calculateIndicators } from './indicators';
import { fetchSocialSentiment, calculateSentimentScore } from './news';

export interface ConvictionStock {
    symbol: string;
    name: string;
    price: number;
    score: number; // 0-100
    isMock?: boolean;

    // Categories
    technicalScore: number;
    fundamentalScore: number;
    analystScore: number;
    sentimentScore: number;

    // Details
    metrics: {
        pe?: number;
        marketCap?: number;
        revenueGrowth?: number; // YoY
        rsi: number;
        trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
        analystRating?: string; // "Strong Buy", etc.
        analystTarget?: number;
        socialSentiment: string; // "Bullish"
    };

    reasons: string[];
}

const CONVICTION_WATCHLIST = [
    'NVDA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'TSLA', 'AAPL', 'AMD', // Tech
    'JPM', 'V', // Finance
    'LLY', 'UNH', // Healthcare
    'XOM', // Energy
    'CAT', // Industrial
    'COIN', 'MSTR' // Crypto Proxies
];

// Mock Data for Fallback (when API fails)
const MOCK_CONVICTION_DATA: ConvictionStock[] = [
    {
        symbol: 'NVDA', name: 'NVIDIA Corp', price: 145.50, score: 92, isMock: true,
        technicalScore: 95, fundamentalScore: 90, analystScore: 95, sentimentScore: 88,
        metrics: { pe: 65.5, marketCap: 3500000000000, revenueGrowth: 1.25, rsi: 68, trend: 'BULLISH', analystRating: 'Strong Buy', analystTarget: 160, socialSentiment: 'Very Bullish' },
        reasons: ['AI Supercycle Leader', 'Record Revenue Growth', 'Analyst Top Pick']
    },
    {
        symbol: 'PLTR', name: 'Palantir Technologies', price: 62.40, score: 88, isMock: true,
        technicalScore: 98, fundamentalScore: 75, analystScore: 80, sentimentScore: 95,
        metrics: { pe: 110, marketCap: 140000000000, revenueGrowth: 0.35, rsi: 78, trend: 'BULLISH', analystRating: 'Buy', analystTarget: 70, socialSentiment: 'Very Bullish' },
        reasons: ['S&P 500 Inclusion Momentum', 'Government Contract Wins', 'Retail Favorite']
    },
    {
        symbol: 'MSTR', name: 'MicroStrategy', price: 380.20, score: 85, isMock: true,
        technicalScore: 92, fundamentalScore: 60, analystScore: 70, sentimentScore: 98,
        metrics: { pe: 0, marketCap: 85000000000, revenueGrowth: 0.10, rsi: 72, trend: 'BULLISH', analystRating: 'Buy', analystTarget: 450, socialSentiment: 'Very Bullish' },
        reasons: ['Bitcoin Proxy Play', 'Aggressive Accumulation', 'High Beta']
    },
    {
        symbol: 'LLY', name: 'Eli Lilly', price: 850.10, score: 82, isMock: true,
        technicalScore: 80, fundamentalScore: 95, analystScore: 85, sentimentScore: 70,
        metrics: { pe: 105, marketCap: 800000000000, revenueGrowth: 0.28, rsi: 58, trend: 'BULLISH', analystRating: 'Strong Buy', analystTarget: 950, socialSentiment: 'Bullish' },
        reasons: ['Pharma Leader (Weight Loss)', 'Strong Moat', 'Defensive Growth']
    },
    {
        symbol: 'TSLA', name: 'Tesla Inc', price: 350.50, score: 78, isMock: true,
        technicalScore: 85, fundamentalScore: 65, analystScore: 60, sentimentScore: 90,
        metrics: { pe: 85, marketCap: 1100000000000, revenueGrowth: 0.08, rsi: 62, trend: 'BULLISH', analystRating: 'Hold', analystTarget: 320, socialSentiment: 'Very Bullish' },
        reasons: ['Robotaxi Hype', 'Technical Breakout']
    },
];

export async function scanConviction(): Promise<ConvictionStock[]> {
    const results: ConvictionStock[] = [];

    // score weightings
    const W_TECH = 0.35;
    const W_FUND = 0.25;
    const W_ANALYST = 0.20;
    const W_SOCIAL = 0.20;

    console.log("🚀 Starting Conviction Scan...");

    // Sequential Loop to prevent Rate Limiting
    for (const symbol of CONVICTION_WATCHLIST) {
        try {
            await new Promise(r => setTimeout(r, 200)); // 200ms delay between requests

            // 1. Fetch Data (Parallel for single symbol is fine)
            // Relaxed validation: Allow failing modules if we at least get price/chart
            const [quote, ohlcv, socialNews] = await Promise.all([
                (yahooFinance.quoteSummary(symbol, { modules: ['financialData', 'defaultKeyStatistics', 'recommendationTrend', 'price'] }) as Promise<any>).catch(e => null),
                (yahooFinance.chart(symbol, { period1: '3mo', interval: '1d' }) as Promise<any>).catch(e => null),
                (fetchSocialSentiment(symbol) as Promise<any>).catch(e => [])
            ]);

            // Essential Data Check (Need Chart at minimum for Score)
            if (!ohlcv || !ohlcv.quotes || ohlcv.quotes.length < 30) {
                console.warn(`⚠️ Skipping ${symbol}: Missing Chart Data`);
                continue;
            }

            // 2. Process Technicals
            const cleanData = ohlcv.quotes.map((q: any) => ({
                time: new Date(q.date).getTime(),
                open: q.open, high: q.high, low: q.low, close: q.close, volume: q.volume
            }));
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
            let fundScore = 50;
            const pe = financialData.trailingPE || 0;
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
            const currentPrice = financialData.currentPrice?.raw || latest.close;


            // 5. Process Social
            const { score: socialScore, label: socialLabel } = calculateSentimentScore(socialNews);


            // 6. TOTAL SCORE
            const finalScore = (
                (techScore * W_TECH) + (fundScore * W_FUND) + (analystScore * W_ANALYST) + (socialScore * W_SOCIAL)
            );

            // Reasons
            const reasons: string[] = [];
            if (trend === 'BULLISH') reasons.push("Strong Technical Uptrend");
            if (techScore > 70) reasons.push("Bullish Momentum (RSI)");
            if (fundScore > 70) reasons.push("Solid Fundamentals");
            if (analystScore > 80) reasons.push(`Analyst Consensus: ${ratingText}`);
            if (socialScore > 75) reasons.push("High Social Interest");

            results.push({
                symbol,
                name: (quote?.price as any)?.longName || symbol,
                price: currentPrice,
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
                reasons
            } as ConvictionStock);

        } catch (e) {
            console.error(`❌ Global Conviction Error for ${symbol}:`, e);
        }
    }

    // Sort by score desc
    const sorted = results.sort((a, b) => b.score - a.score);

    if (sorted.length === 0) {
        console.warn("⚠️ No live data found. Returning Mock Data Fallback.");
        return MOCK_CONVICTION_DATA;
    }

    return sorted;
}
