import React from 'react';
import { IndicatorData } from '../types/financial';
import { TrendingUp, Activity } from 'lucide-react';

interface HeaderSignalsProps {
    latestData: IndicatorData | null;
    showRSI?: boolean;
}

export default function HeaderSignals({ latestData, showRSI = true }: HeaderSignalsProps) {
    if (!latestData) return null;

    // Determine Trend
    let trend = "NEUTRAL";
    let trendColor = "text-gray-400";

    const { close, ema50, ema200 } = latestData;

    if (ema50 && ema200) {
        if (close > ema50 && ema50 > ema200) {
            trend = "BULLISH";
            trendColor = "text-green-400";
        } else if (close < ema50 && ema50 < ema200) {
            trend = "BEARISH";
            trendColor = "text-red-400";
        } else if (close > ema200) {
            trend = "BULLISH (WEAK)";
            trendColor = "text-green-300";
        } else if (close < ema200) {
            trend = "BEARISH (WEAK)";
            trendColor = "text-red-300";
        }
    }

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
            <div className={`flex items-center gap-2 ${showRSI ? 'border-r border-gray-700 pr-4' : ''}`}>
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <div className="flex flex-col leading-none">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Trend</span>
                    <span className={`text-sm font-bold ${trendColor}`}>{trend}</span>
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
