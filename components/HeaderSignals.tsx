import React from 'react';
import { IndicatorData } from '../types/financial';
import { TrendingUp, Activity } from 'lucide-react';

interface HeaderSignalsProps {
    latestData: IndicatorData | null;
    showRSI?: boolean;
}

export default function HeaderSignals({ latestData, showRSI = true }: HeaderSignalsProps) {
    if (!latestData) return null;

    // Determine Trends
    const { close, ema50, ema200 } = latestData;

    // Short Term: Price vs 20 EMA / 50 EMA
    let stTrend = "NEUTRAL";
    let stColor = "text-gray-400";
    if (ema50) {
        if (close > ema50) {
            stTrend = "BULLISH";
            stColor = "text-green-400";
        } else {
            stTrend = "BEARISH";
            stColor = "text-red-400";
        }
    }

    // Long Term: Price vs 200 EMA
    let ltTrend = "NEUTRAL";
    let ltColor = "text-gray-400";
    if (ema200) {
        if (close > ema200) {
            ltTrend = "BULLISH";
            ltColor = "text-green-400";
        } else {
            ltTrend = "BEARISH";
            ltColor = "text-red-400";
        }
    }

    // Golden/Death Cross status for extra signal
    const isGoldenCross = ema50 && ema200 && ema50 > ema200;


    // Determine RSI
    let rsiStatus = "NEUTRAL";
    let rsiColor = "text-gray-400";
    if (latestData?.rsi14) {
        if (latestData.rsi14 > 70) {
            rsiStatus = "OVERBOUGHT";
            rsiColor = "text-red-400";
        } else if (latestData.rsi14 < 30) {
            rsiStatus = "OVERSOLD";
            rsiColor = "text-green-400";
        }
    }

    return (
        <div className="flex items-center gap-4 bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-700">
            {/* Trend Widget */}
            <div className={`flex items-center gap-3 ${showRSI ? 'border-r border-gray-700 pr-4' : ''}`}>
                <TrendingUp className={`w-4 h-4 ${isGoldenCross ? 'text-yellow-400' : 'text-blue-400'}`} />
                <div className="flex gap-4">
                    <div className="flex flex-col leading-none">
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1">Short Term</span>
                        <span className={`text-xs font-bold ${stColor}`}>{stTrend}</span>
                    </div>
                    <div className="flex flex-col leading-none">
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1">Long Term</span>
                        <span className={`text-xs font-bold ${ltColor}`}>{ltTrend}</span>
                    </div>
                </div>
            </div>

            {/* RSI Widget */}
            {showRSI && (
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <div className="flex flex-col leading-none">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">RSI Momentum</span>
                        <div className="flex items-center gap-1">
                            <span className={`text-sm font-bold ${rsiColor}`}>{rsiStatus}</span>
                            <span className="text-xs text-gray-500">({latestData.rsi14?.toFixed(0)})</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
