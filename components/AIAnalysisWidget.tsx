
import { Activity, TrendingUp, TrendingDown, AlertTriangle, BookOpen, Target } from "lucide-react";
import { MultiTimeframeAnalysis } from "@/lib/market-data";
import { UnusualOption } from "@/lib/options-flow";

export interface Fundamentals {
    marketCap?: number;
    peRatio?: number;
    forwardPE?: number;
    beta?: number;
    dividendYield?: number;
    targetMeanPrice?: number;
    recommendationKey?: string;
    obs?: number; // numberOfAnalystOpinions
}

interface AIAnalysisWidgetProps {
    symbol: string;
    analysis: MultiTimeframeAnalysis;
    optionsFlow: UnusualOption[];
    fundamentals: Fundamentals;
}

export default function AIAnalysisWidget({ symbol, analysis, optionsFlow, fundamentals }: AIAnalysisWidgetProps) {
    const { signal, score, reasons, summary } = generateSignal(symbol, analysis, optionsFlow, fundamentals);

    const scoreColor = score >= 7 ? "text-green-400" : score <= 3 ? "text-red-400" : "text-yellow-400";
    const bgGradient = score >= 7 ? "from-green-500/10 to-transparent" : score <= 3 ? "from-red-500/10 to-transparent" : "from-yellow-500/10 to-transparent";
    const borderColor = score >= 7 ? "border-green-500/30" : score <= 3 ? "border-red-500/30" : "border-yellow-500/30";

    return (
        <div className={`p-4 rounded-xl border ${borderColor} bg-gradient-to-r ${bgGradient} relative overflow-hidden`}>
            <div className="flex flex-row gap-4 items-center">

                {/* LEFT: SIGNAL & SCORE (compact) */}
                <div className="flex-shrink-0 flex flex-col items-center gap-2">
                    <div className="text-center">
                        <div className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-1">AI Signal</div>
                        <div className={`text-xl font-bold ${scoreColor} leading-tight mb-0.5`}>{signal}</div>
                        <div className="text-3xl font-black text-white leading-none">
                            {score}<span className="text-sm text-gray-400">/10</span>
                        </div>
                    </div>
                    {fundamentals.targetMeanPrice && (
                        <div className="text-xs text-gray-200 bg-gray-800/80 px-3 py-1.5 rounded-lg border border-gray-700/50 flex flex-col items-center gap-0.5 mt-1 shadow-md">
                            <div className="flex items-center gap-1 font-bold uppercase text-[9px] text-gray-400 tracking-wider">
                                <Target className="w-2.5 h-2.5 text-blue-400" /> Target Price
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-white text-base font-bold">${fundamentals.targetMeanPrice.toFixed(0)}</span>
                                <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${analysis.currentPrice < fundamentals.targetMeanPrice ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                                    {((fundamentals.targetMeanPrice - analysis.currentPrice) / analysis.currentPrice * 100).toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* DIVIDER */}
                <div className="w-px h-16 bg-gray-700/50 flex-shrink-0 hidden md:block" />

                {/* RIGHT: SUMMARY + DRIVERS (compact) */}
                <div className="flex-grow min-w-0">
                    <p className="text-gray-200 text-sm md:text-base leading-relaxed mb-3 font-medium">
                        {summary}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {reasons.slice(0, 4).map((reason, i) => (
                            <span key={i} className="flex items-center gap-1.5 text-[11px] text-gray-200 bg-gray-800/60 px-2.5 py-1.5 rounded-lg border border-gray-700/50 shadow-sm">
                                {reason.sentiment === 'positive' ? (
                                    <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                                ) : reason.sentiment === 'negative' ? (
                                    <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                                ) : (
                                    <Activity className="w-3.5 h-3.5 text-yellow-400" />
                                )}
                                <span className="font-semibold">{reason.text}</span>
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function generateSignal(symbol: string, analysis: MultiTimeframeAnalysis, options: UnusualOption[], fundamentals: Fundamentals) {
    let score = 5.0; // Neutral Start
    const reasons: { text: string, sentiment: 'positive' | 'negative' | 'neutral' }[] = [];

    // 1. TECHNICALS (Weight: 50%)

    // Trend Alignment (Daily)
    const daily = analysis.timeframes.find(t => t.timeframe === '1d');
    const hourly = analysis.timeframes.find(t => t.timeframe === '1h');

    if (daily) {
        if (daily.trend === 'BULLISH') {
            score += 1.5;
            reasons.push({ text: "Daily Trend is Bullish (Price > 50 EMA)", sentiment: 'positive' });
        } else if (daily.trend === 'BEARISH') {
            score -= 1.5;
            reasons.push({ text: "Daily Trend is Bearish", sentiment: 'negative' });
        }

        // EMA 200 (Long Term)
        if (daily.ema200 && daily.close > daily.ema200) {
            score += 1.0;
            reasons.push({ text: "Price above 200-Day Moving Average", sentiment: 'positive' });
        } else if (daily.ema200 && daily.close < daily.ema200) {
            score -= 1.0;
            reasons.push({ text: "Price below 200-Day Moving Average", sentiment: 'negative' });
        }

        // RSI
        if (daily.rsi) {
            if (daily.rsi < 30) {
                score += 1.5; // Contrarian Buy
                reasons.push({ text: "Daily RSI Oversold (<30) - Potential Bounce", sentiment: 'positive' });
            } else if (daily.rsi > 70) {
                score -= 0.5; // Caution
                reasons.push({ text: "Daily RSI Overbought (>70) - Evaluation Risk", sentiment: 'neutral' });
            }
        }
    }

    // 2. FUNDAMENTALS (Weight: 30%)
    if (fundamentals.recommendationKey) {
        if (fundamentals.recommendationKey === 'strong_buy' || fundamentals.recommendationKey === 'buy') {
            score += 1.0;
            reasons.push({ text: `Analyst Consensus: ${fundamentals.recommendationKey.toUpperCase()}`, sentiment: 'positive' });
        } else if (fundamentals.recommendationKey === 'sell' || fundamentals.recommendationKey === 'underperform') {
            score -= 1.0;
            reasons.push({ text: `Analyst Consensus: ${fundamentals.recommendationKey.toUpperCase()}`, sentiment: 'negative' });
        }
    }

    if (fundamentals.targetMeanPrice) {
        const upside = ((fundamentals.targetMeanPrice - analysis.currentPrice) / analysis.currentPrice) * 100;
        if (upside > 15) {
            score += 1.0;
            reasons.push({ text: `Analyst Target suggests ${upside.toFixed(0)}% upside`, sentiment: 'positive' });
        }
    }

    // 3. OPTIONS / MOMENTUM (Weight: 20%)
    const callVol = options.filter(o => o.type === 'CALL').length;
    const putVol = options.filter(o => o.type === 'PUT').length;

    if (callVol > putVol * 1.5) {
        score += 0.5;
        reasons.push({ text: "Bullish Options Flow detected", sentiment: 'positive' });
    } else if (putVol > callVol * 1.5) {
        score -= 0.5;
        reasons.push({ text: "Bearish Options Flow detected", sentiment: 'negative' });
    }

    // Volume
    if (analysis.metrics.volumeDiff > 25 && daily?.close && daily?.open && daily.close > daily.open) {
        score += 0.5;
        reasons.push({ text: "High Volume Buying detected today", sentiment: 'positive' });
    }

    // Clamp Score
    score = Math.min(10, Math.max(0, score));
    score = Number(score.toFixed(1));

    // Determine Signal
    let signal = "NEUTRAL";
    if (score >= 8) signal = "STRONG BUY";
    else if (score >= 6.5) signal = "BUY";
    else if (score <= 2) signal = "STRONG SELL";
    else if (score <= 4) signal = "SELL";

    // Natural Language Summary
    let summary = "";
    const isBullish = score > 5;

    summary = `The AI model detects a ${signal} signal for ${symbol} with a conviction score of ${score}/10. `;

    if (isBullish) {
        summary += `Technical indicators are predominantly positive, with the price trading above key moving averages. `;
        if (fundamentals.recommendationKey === 'buy') summary += `Fundamental analysts also support this view. `;
        summary += `Traders should watch for continued momentum above $${daily?.ema200?.toFixed(0) || 'support'}.`;
    } else {
        summary += `Technical indicators show weakness or overextension. `;
        if (daily?.ema200 && daily.close < daily.ema200) summary += `The stock is in a downtrend below the 200-day average. `;
        summary += `Caution is advised until a clear reversal pattern emerges.`;
    }

    if (Math.abs(analysis.metrics.volumeDiff) > 50) {
        summary += ` Significant volume activity (${analysis.metrics.volumeDiff > 0 ? '+' : ''}${analysis.metrics.volumeDiff.toFixed(0)}% vs avg) suggests increased institutional interest.`;
    }

    return { signal, score, reasons, summary };
}
