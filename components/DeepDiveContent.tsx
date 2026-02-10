import { useEffect, useState } from "react";
import { Loader2, TrendingUp, TrendingDown, Activity, BarChart2, AlertCircle } from "lucide-react";
import { MultiTimeframeAnalysis } from "@/lib/market-data";
import { UnusualOption } from "@/lib/options-flow";
import AIAnalysisWidget, { Fundamentals } from "./AIAnalysisWidget";

interface DeepDiveContentProps {
    symbol: string | null;
    showOptionsFlow?: boolean;
}

interface DetailData {
    symbol: string;
    analysis: MultiTimeframeAnalysis;
    optionsFlow: UnusualOption[];
    fundamentals: Fundamentals;
}

export default function DeepDiveContent({ symbol, showOptionsFlow = true }: DeepDiveContentProps) {
    const [data, setData] = useState<DetailData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (symbol) {
            fetchDetails(symbol);
        } else {
            setData(null);
        }
    }, [symbol]);

    const fetchDetails = async (sym: string) => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`/api/conviction/${sym.toLowerCase()}`);
            if (!res.ok) throw new Error("Failed to fetch detailed analysis");
            const json = await res.json();
            setData(json);
        } catch (e) {
            console.error(e);
            setError("Failed to load deep dive analysis");
        } finally {
            setLoading(false);
        }
    };

    if (!symbol) return null;

    if (loading) {
        return (
            <div className="h-64 flex flex-col items-center justify-center text-gray-400 bg-gray-900/50 rounded-xl border border-gray-800">
                <Loader2 className="w-8 h-8 animate-spin mb-2 text-blue-500" />
                <p>Scanning Multi-Timeframe Data & Options Chain...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg">
                {error}
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="space-y-6 bg-gray-900/50 p-6 rounded-xl border border-gray-800">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        {symbol} <span className="text-blue-400">Deep Dive</span>
                    </h2>
                    <p className="text-gray-400 text-sm">
                        Multi-timeframe Technicals & Institutional Flow
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold">${data.analysis.currentPrice.toFixed(2)}</div>
                    <div className="text-sm text-gray-400">Current Price</div>
                </div>
            </div>

            {/* 1. KEY METRICS GRID */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                    label="Today's Range"
                    value={`$${data.analysis.metrics.dayHigh.toFixed(2)}`}
                    subValue={`Low: $${data.analysis.metrics.dayLow.toFixed(2)}`}
                    icon={<TrendingUp className="w-4 h-4 text-green-400" />}
                />
                <MetricCard
                    label="Daily ATR"
                    value={`$${data.analysis.metrics.atr.toFixed(2)}`}
                    subValue={`${data.analysis.metrics.volatility.toFixed(1)}% Volatility`}
                    icon={<Activity className="w-4 h-4 text-purple-400" />}
                />
                <MetricCard
                    label="Vol vs 1y Avg"
                    value={(data.analysis.metrics.volumeDiff > 0 ? '+' : '') + Math.round(data.analysis.metrics.volumeDiff) + '%'}
                    subValue={(data.analysis.metrics.avgVolume1y / 1_000_000).toFixed(1) + 'M Avg'}
                    icon={<BarChart2 className={`w-4 h-4 ${data.analysis.metrics.volumeDiff > 0 ? 'text-green-400' : 'text-red-400'}`} />}
                    className={
                        Math.abs(data.analysis.metrics.volumeDiff) > 25
                            ? data.analysis.metrics.volumeDiff > 0 ? 'bg-green-500/20 border-green-500/50' : 'bg-red-500/20 border-red-500/50'
                            : undefined
                    }
                />
                <MetricCard
                    label="Daily RSI"
                    value={data.analysis.timeframes.find(t => t.timeframe === '1d')?.rsi?.toFixed(0) || 'N/A'}
                    subValue={getRsiStatus(data.analysis.timeframes.find(t => t.timeframe === '1d')?.rsi || 50)}
                    icon={<Activity className="w-4 h-4 text-cyan-400" />}
                    className={
                        (data.analysis.timeframes.find(t => t.timeframe === '1d')?.rsi || 50) > 70 ? 'bg-red-500/20 border-red-500/50' :
                            (data.analysis.timeframes.find(t => t.timeframe === '1d')?.rsi || 50) < 30 ? 'bg-green-500/20 border-green-500/50' :
                                undefined
                    }
                />
            </div>

            {/* 2. MULTI-TIMEFRAME EMA MATRIX */}
            <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-400" />
                    EMA & RSI Matrix
                </h3>
                <div className="overflow-x-auto rounded-lg border border-gray-800">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-800/50 text-gray-400">
                            <tr>
                                <th className="p-3">Timeframe</th>
                                <th className="p-3">Trend</th>
                                <th className="p-3">EMA 9</th>
                                <th className="p-3">EMA 21</th>
                                <th className="p-3">EMA 50</th>
                                <th className="p-3">EMA 200</th>
                                <th className="p-3">RSI</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {data.analysis.timeframes.map((tf) => (
                                <tr key={tf.timeframe} className="hover:bg-gray-800/30">
                                    <td className="p-3 font-medium uppercase text-gray-300">{tf.timeframe}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${tf.trend === 'BULLISH' ? 'bg-green-500/20 text-green-400' :
                                            tf.trend === 'BEARISH' ? 'bg-red-500/20 text-red-400' :
                                                'bg-gray-500/20 text-gray-400'
                                            }`}>
                                            {tf.trend}
                                        </span>
                                    </td>
                                    <EmaCell price={tf.close} ema={tf.ema9} label="9" />
                                    <EmaCell price={tf.close} ema={tf.ema21} label="21" />
                                    <EmaCell price={tf.close} ema={tf.ema50} label="50" />
                                    <EmaCell price={tf.close} ema={tf.ema200} label="200" />
                                    <td className={`p-3 font-mono font-bold ${(tf.rsi || 50) > 70 ? 'bg-red-500/20 text-red-200' : (tf.rsi || 50) < 30 ? 'bg-green-500/20 text-green-200' : ''}`}>
                                        <span>
                                            {tf.rsi?.toFixed(0) || '-'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    * Highlights indicate price is within 0.5% of the EMA (Support/Resistance Watch)
                </p>
            </div>

            {/* 2.5 AI ANALYSIS WIDGET */}
            <AIAnalysisWidget
                symbol={symbol}
                analysis={data.analysis}
                optionsFlow={data.optionsFlow}
                fundamentals={data.fundamentals}
            />

            {/* 3. UNUSUAL OPTIONS FLOW */}
            {showOptionsFlow && (
                <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-400" />
                        Unusual Options Flow (Next 90 Days)
                    </h3>
                    {data.optionsFlow.length === 0 ? (
                        <div className="p-6 text-center border border-gray-800 rounded-lg text-gray-500">
                            No unusual activity detected (Vol {'>'} OI) for upcoming expiries.
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-gray-800 bg-gray-900/50">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-800/50 text-gray-400">
                                    <tr>
                                        <th className="p-3">Expiry</th>
                                        <th className="p-3">Strike</th>
                                        <th className="p-3">Type</th>
                                        <th className="p-3 text-right">Vol</th>
                                        <th className="p-3 text-right">OI</th>
                                        <th className="p-3 text-right">Vol/OI</th>
                                        <th className="p-3 text-right">IV</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {data.optionsFlow.slice(0, 10).map((opt, i) => (
                                        <tr key={i} className="hover:bg-gray-800/30">
                                            <td className="p-3 font-mono text-gray-300">{opt.expiry}</td>
                                            <td className="p-3 font-bold">${opt.strike}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${opt.type === 'CALL' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                    {opt.type}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right font-mono text-gray-300">{opt.volume}</td>
                                            <td className="p-3 text-right font-mono text-gray-400">{opt.openInterest}</td>
                                            <td className="p-3 text-right">
                                                <span className={`font-bold ${opt.volToOiRatio > 3 ? 'text-yellow-400' : 'text-gray-300'}`}>
                                                    {opt.volToOiRatio.toFixed(1)}x
                                                </span>
                                            </td>
                                            <td className="p-3 text-right font-mono text-gray-400">{opt.impliedVolatility}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function MetricCard({ label, value, subValue, icon, className }: { label: string, value: string | number, subValue: string, icon: any, className?: string }) {
    return (
        <div className={`p-3 rounded-lg border ${className || 'bg-gray-800/40 border-gray-700/50'}`}>
            <div className="flex items-center gap-2 mb-1 text-gray-400 text-xs uppercase tracking-wider">
                {icon} {label}
            </div>
            <div className="text-xl font-bold text-white">{value}</div>
            <div className="text-xs text-gray-500">{subValue}</div>
        </div>
    );
}

function EmaCell({ price, ema, label }: { price: number, ema: number | null, label: string }) {
    if (!ema) return <td className="p-3 text-gray-600">-</td>;

    const diff = Math.abs((price - ema) / ema) * 100;
    const isNear = diff < 0.5; // Highlight if within 0.5%
    const isAbove = price > ema;

    return (
        <td className={`p-3 font-mono text-xs ${isNear ? 'bg-yellow-500/20 text-yellow-200 font-bold' : isAbove ? 'text-green-400/70' : 'text-red-400/70'}`}>
            <div className="flex flex-col">
                <span>{ema.toFixed(2)}</span>
                {isNear && <span className="text-[10px] opacity-70">NEAR</span>}
            </div>
        </td>
    );
}

function getRsiStatus(rsi: number) {
    if (rsi > 70) return "Overbought";
    if (rsi < 30) return "Oversold";
    if (rsi > 50) return "Bullish Zone";
    return "Bearish Zone";
}
