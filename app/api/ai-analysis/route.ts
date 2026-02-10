import { NextResponse } from 'next/server';
import { generateMarketAnalysis, isGeminiEnabled } from '@/lib/gemini';
import { getNewsData } from '@/lib/news-service';
import { scanUnusualOptions } from '@/lib/options-flow';
import YahooFinance from 'yahoo-finance2'; // For quick OHLCV/Technicals
import { calculateIndicators } from '@/lib/indicators';

const yahooFinance = new YahooFinance();

// Force dynamic because data is live
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    if (!isGeminiEnabled()) {
        return NextResponse.json({
            error: 'Gemini API not configured',
            isConfigured: false
        }, { status: 503 });
    }

    try {
        const ticker = symbol.toUpperCase();

        // 1. Fetch Data Concurrently
        // We use period1 instead of range to avoid type issues with some library versions
        const [news, options, priceData] = await Promise.all([
            getNewsData(ticker),
            scanUnusualOptions(ticker),
            yahooFinance.chart(ticker, { interval: '1d', period1: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000) })
        ]);

        // 2. Process Technicals
        let rsi = 50;
        let trend = 'NEUTRAL';
        let volumeTrend = 'NORMAL';
        let close = 0;

        // Cast to any to safely access properties
        const chartData: any = priceData;

        if (chartData && chartData.quotes && chartData.quotes.length > 20) {
            const quotes = chartData.quotes;
            const latest = quotes[quotes.length - 1];
            close = latest.close;

            // Simple RSI Calculation (14-period)
            // Let's map Yahoo quotes to our Indicator input format
            const mappedQuotes = quotes.map((q: any) => ({
                open: q.open, high: q.high, low: q.low, close: q.close, volume: q.volume,
                time: new Date(q.date).getTime()
            }));

            const output = calculateIndicators(mappedQuotes);
            const indicators = output[output.length - 1];
            rsi = indicators.rsi14 || 50;

            // Trend
            const sma50 = indicators.ema50 || 0; // closer proxy
            if (close > sma50) trend = 'BULLISH';
            else if (close < sma50) trend = 'BEARISH';

            // Volume
            const avgVol = mappedQuotes.slice(-20).reduce((a: number, b: any) => a + (b.volume || 0), 0) / 20;
            if (latest.volume > avgVol * 1.5) volumeTrend = 'HIGH_VOLUME';
        }

        // 3. Construct Prompt
        const newsSummary = news.slice(0, 3).map(n => `- ${n.title} (${n.sentiment})`).join('\n');
        const optionsSummary = options.length > 0
            ? options.slice(0, 5).map(o => `- ${o.type} ${o.strike} Exp:${o.expiry} Vol:${o.volume} (Vol/OI: ${o.volToOiRatio})`).join('\n')
            : "No significant unusual activity detected.";

        const prompt = `
        Act as a senior hedge fund analyst specializing in Dark Pool logic and Institutional Order Flow.
        Analyze ${ticker} based on this real-time data:

        ## Technical Context
        Price: $${close.toFixed(2)}
        Trend: ${trend}
        RSI: ${rsi.toFixed(1)}
        Recent Volume Pattern: ${volumeTrend}

        ## Unusual Options Activity (Smart Money Flow)
        (High Volume relative to Open Interest indicates institutional positioning)
        ${optionsSummary}

        ## Recent Headlines
        ${newsSummary}

        ## Task
        Provide a strategic insight JSON.
        - Infer "Dark Pool / Institutional Sentiment" based on how price is reacting to volume and news. (Example: If bad news but price holds = Accumulation).
        - Analyze the Options Flow: Is it hedging or directional betting?
        - Give a verdict.

        Return ONLY raw JSON (no markdown blocks):
        {
            "sentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
            "score": number (0-10),
            "summary": "Concise 2-sentence summary of the setup...",
            "institutional_insight": "Inferred dark pool/whale activity note...",
            "option_analysis": "Key takeaway from options flow..."
        }
        `;

        // 4. Call Gemini
        const jsonResponse = await generateMarketAnalysis(prompt);

        if (!jsonResponse) {
            throw new Error("Failed to generate analysis");
        }

        // Clean JSON (remove markdown ticks if present)
        const cleaned = jsonResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const analysis = JSON.parse(cleaned);

        return NextResponse.json({
            ...analysis,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('AI Analysis Error:', error);
        return NextResponse.json({ error: 'Failed to analyze market data' }, { status: 500 });
    }
}
