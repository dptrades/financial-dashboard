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

    // MACD Signal
    let macdStatus = "ALT";
    let macdColor = "text-gray-500";
    if (latestData.macd?.MACD !== undefined && latestData.macd?.signal !== undefined) {
        if (latestData.macd.MACD > latestData.macd.signal) {
            macdStatus = "BULL";
            macdColor = "text-green-400";
        } else {
            macdStatus = "BEAR";
            macdColor = "text-red-400";
        }
    }

    // BB Status
    let bbStatus = "MID";
    let bbColor = "text-gray-500";
    if (latestData.bollinger?.upper && latestData.bollinger?.lower) {
        if (close > latestData.bollinger.upper) {
            bbStatus = "OB";
            bbColor = "text-red-400";
        } else if (close < latestData.bollinger.lower) {
            bbStatus = "OS";
            bbColor = "text-green-400";
        }
    }

    // VWAP Status
    let vwapStatus = "NEU";
    let vwapColor = "text-gray-500";
    if (latestData.vwap) {
        if (close > latestData.vwap) {
            vwapStatus = "ABV";
            vwapColor = "text-green-400";
        } else {
            vwapStatus = "BEL";
            vwapColor = "text-red-400";
        }
    }

    // ADX Trend Strength
    let adxStatus = "WEAK";
    let adxColor = "text-gray-500";
    if (latestData.adx14) {
        if (latestData.adx14 > 25) {
            adxStatus = "STR";
            adxColor = "text-blue-400";
        }
        if (latestData.adx14 > 40) {
            adxStatus = "EXT";
            adxColor = "text-purple-400";
        }
    }

    // Determine RSI
    let rsiStatus = "NEU";
    let rsiColor = "text-gray-400";
    if (latestData?.rsi14) {
        if (latestData.rsi14 > 70) {
            rsiStatus = "OB";
            rsiColor = "text-red-400";
        } else if (latestData.rsi14 < 30) {
            rsiStatus = "OS";
            rsiColor = "text-green-400";
        }
    }

    return (
        <div className="flex items-center gap-6 bg-gray-900/80 px-4 py-2 rounded-xl border border-gray-800 shadow-xl">
            {/* 1. Trends Section */}
            <div className="flex items-center gap-3 border-r border-gray-800 pr-6">
                <TrendingUp className={`w-4 h-4 ${isGoldenCross ? 'text-yellow-400' : 'text-blue-400'}`} />
                <div className="flex gap-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest leading-none">ST Trend</span>
                        <span className={`text-[10px] font-bold ${stColor} leading-none`}>{stTrend}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest leading-none">LT Trend</span>
                        <span className={`text-[10px] font-bold ${ltColor} leading-none`}>{ltTrend}</span>
                    </div>
                </div>
            </div>

            {/* 2. Technical Matrix */}
            <div className="flex items-center gap-5 uppercase font-bold text-[10px]">
                <div className="flex flex-col gap-1">
                    <span className="text-[8px] text-gray-500 tracking-widest leading-none">RSI</span>
                    <span className={`${rsiColor} leading-none`}>{rsiStatus} <span className="text-[8px] opacity-40">({latestData.rsi14?.toFixed(0)})</span></span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-[8px] text-gray-500 tracking-widest leading-none">MACD</span>
                    <span className={`${macdColor} leading-none`}>{macdStatus}</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-[8px] text-gray-500 tracking-widest leading-none">BB</span>
                    <span className={`${bbColor} leading-none`}>{bbStatus}</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-[8px] text-gray-500 tracking-widest leading-none">VWAP</span>
                    <span className={`${vwapColor} leading-none`}>{vwapStatus}</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-[8px] text-gray-500 tracking-widest leading-none">ADX</span>
                    <span className={`${adxColor} leading-none`}>{adxStatus}</span>
                </div>
            </div>
        </div>
    );
}
