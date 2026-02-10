'use client';

import { useState, useEffect } from 'react';
import { Brain, Lock, Unlock, TrendingUp, TrendingDown, Activity, EyeOff } from 'lucide-react';
import { Loading } from './ui/Loading';

interface AIInsight {
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    score: number;
    summary: string;
    institutional_insight: string;
    option_analysis: string;
    timestamp: string;
}

export default function AIStrategicInsight({ symbol }: { symbol: string }) {
    const [insight, setInsight] = useState<AIInsight | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [needsKey, setNeedsKey] = useState(false);

    useEffect(() => {
        if (!symbol) return;

        const fetchAnalysis = async () => {
            setLoading(true);
            setError('');
            setNeedsKey(false);

            try {
                const res = await fetch(`/api/ai-analysis?symbol=${symbol}`);

                if (res.status === 503) {
                    const data = await res.json();
                    if (data.isConfigured === false) {
                        setNeedsKey(true);
                        setLoading(false);
                        return;
                    }
                }

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.error || 'Failed to analyze market data');
                }

                const data = await res.json();
                setInsight(data);
            } catch (e: any) {
                console.error(e);
                setError(e.message || 'Failed to generate insight');
            } finally {
                setLoading(false);
            }
        };

        fetchAnalysis();
    }, [symbol]);

    if (needsKey) {
        return (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
                <Brain className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-300 mb-2">Enable AI Strategic Insight</h3>
                <p className="text-gray-400 mb-4 text-sm">
                    Unlock institutional-grade analysis powered by Google Gemini (Flash 2.0).
                    <br />
                    Detects Dark Pool accumulation patterns and Unusual Options activity.
                </p>
                <div className="bg-gray-800 p-3 rounded-lg text-xs font-mono text-gray-300 break-all mb-4">
                    GEMINI_API_KEY=AIza...
                </div>
                <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium text-sm"
                >
                    Get Free API Key <Unlock className="w-4 h-4" />
                </a>
                <p className="text-xs text-gray-500 mt-3">Add to .env.local and restart</p>
            </div>
        );
    }


    if (loading) {
        return (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col items-center justify-center min-h-[200px] animate-pulse">
                <Brain className="w-8 h-8 text-purple-500/50 mb-3" />
                <p className="text-purple-400 text-xs font-mono">INITIALIZING GEMINI 2.0 FLASH...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-gray-900 border border-red-900/30 rounded-xl p-4 flex items-center gap-3">
                <Activity className="w-5 h-5 text-red-500" />
                <div>
                    <h3 className="text-red-400 text-sm font-bold">AI Analysis Unavailable</h3>
                    <p className="text-red-500/60 text-xs">{error}</p>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="ml-auto text-xs bg-red-900/20 text-red-400 px-3 py-1 rounded hover:bg-red-900/40 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!insight) return null;
    const isBullish = insight.sentiment === 'BULLISH';
    const isBearish = insight.sentiment === 'BEARISH';
    const scoreColor = isBullish ? 'text-green-400' : isBearish ? 'text-red-400' : 'text-gray-400';
    const borderColor = isBullish ? 'border-green-500/30' : isBearish ? 'border-red-500/30' : 'border-gray-700';

    return (
        <div className={`bg-gray-900/50 backdrop-blur border ${borderColor} rounded-xl p-6 relative overflow-hidden transition-all duration-500`}>
            {/* Background Glow */}
            <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${isBullish ? 'from-green-500/10' : isBearish ? 'from-red-500/10' : 'from-blue-500/10'} to-transparent blur-3xl rounded-full -translate-y-1/2 translate-x-1/2`}></div>

            <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isBullish ? 'bg-green-500/20' : isBearish ? 'bg-red-500/20' : 'bg-gray-800'}`}>
                        <Brain className={`w-6 h-6 ${scoreColor}`} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            Gemini Strategic Insight
                            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">AI FLASH 2.0</span>
                        </h2>
                        <div className="text-xs text-gray-400 flex items-center gap-1">
                            Analyzed Options, News & Technicals • {new Date(insight.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </div>

                <div className="text-right">
                    <div className={`text-3xl font-bold ${scoreColor}`}>{insight.score}/10</div>
                    <div className="text-xs text-gray-400 uppercase tracking-widest font-medium">{insight.sentiment}</div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 relative z-10">
                {/* Main Summary */}
                <div className="col-span-2 bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                    <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-400" /> Executive Summary
                    </h4>
                    <p className="text-gray-300 text-sm leading-relaxed">{insight.summary}</p>
                </div>

                {/* Dark Pool / Institutional */}
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800 group hover:border-purple-500/30 transition-colors">
                    <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                        <EyeOff className="w-4 h-4 text-purple-400" /> Institutional & Dark Pool Inference
                    </h4>
                    <p className="text-gray-400 text-xs leading-relaxed">
                        {insight.institutional_insight}
                    </p>
                </div>

                {/* Options Flow */}
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800 group hover:border-orange-500/30 transition-colors">
                    <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-orange-400" /> Options Flow Analysis
                    </h4>
                    <p className="text-gray-400 text-xs leading-relaxed">
                        {insight.option_analysis}
                    </p>
                </div>
            </div>
        </div>
    );
}
