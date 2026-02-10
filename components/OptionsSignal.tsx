import React from 'react';
import { OptionRecommendation } from '../lib/options';
import { MousePointerClick, TrendingUp, TrendingDown, AlertCircle, Target, Shield, Crosshair } from 'lucide-react';

interface OptionsSignalProps {
    data: OptionRecommendation | null;
    loading: boolean;
}

export default function OptionsSignal({ data, loading }: OptionsSignalProps) {
    if (loading) {
        return <div className="animate-pulse h-24 bg-gray-800 rounded-xl mb-4"></div>;
    }

    if (!data || data.type === 'WAIT') {
        return (
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-4 opacity-75">
                <div className="flex items-center gap-2 mb-2 text-gray-400">
                    <MousePointerClick className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Options AI</span>
                </div>
                <div className="text-center py-2">
                    <span className="text-gray-500 font-medium text-sm">No High-Prob Setup</span>
                    {data && data.reason && (
                        <span className="block text-[10px] text-gray-600 mt-1">{data.reason}</span>
                    )}
                </div>
            </div>
        );
    }

    const isCall = data.type === 'CALL';
    const color = isCall ? 'text-green-400' : 'text-red-400';
    const bg = isCall ? 'bg-green-500' : 'bg-red-500';
    const border = isCall ? 'border-green-500/30' : 'border-red-500/30';

    return (
        <div className={`bg-gray-800 rounded-xl p-4 border ${border} mb-4 relative overflow-hidden`}>
            {/* Glow Effect */}
            <div className={`absolute top-0 right-0 w-20 h-20 ${bg} opacity-5 blur-2xl -mr-10 -mt-10`}></div>

            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <MousePointerClick className={`w-4 h-4 ${color}`} />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Options AI</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full bg-gray-700 ${color} font-bold`}>
                    {data.confidence}% Confidence
                </span>
            </div>

            {/* Signal Type & Strike */}
            <div className="flex justify-between items-end mb-3">
                <div>
                    <div className={`text-2xl font-bold ${color} leading-none mb-1`}>
                        {data.type}
                    </div>
                    <div className="text-white font-mono text-lg">
                        ${data.strike} <span className="text-gray-500 text-sm">Strike</span>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xs text-gray-400 mb-1">Expiry</div>
                    <div className="text-white font-medium">{data.expiry}</div>
                </div>
            </div>

            {/* Strategy Badge */}
            {data.strategy && (
                <div className="mb-3">
                    <span className={`text-[10px] px-2 py-1 rounded-md ${isCall ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'} font-semibold uppercase tracking-wider`}>
                        {data.strategy}
                    </span>
                </div>
            )}

            {/* Confidence Bar */}
            <div className="w-full bg-gray-700 h-1.5 rounded-full mb-4 overflow-hidden">
                <div
                    className={`h-full ${bg} transition-all duration-1000 ease-out`}
                    style={{ width: `${data.confidence}%` }}
                />
            </div>

            {/* === TRADE PLAN === */}
            {data.entryPrice && (
                <div className="space-y-2 pt-3 border-t border-gray-700/50">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Trade Plan</div>

                    {/* Entry */}
                    <div className="flex items-center gap-2 bg-gray-900/50 rounded-lg p-2">
                        <Crosshair className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                        <div className="flex-1">
                            <div className="text-[9px] text-gray-500 uppercase">Entry</div>
                            <div className="text-sm font-mono text-white font-bold">${data.entryPrice.toFixed(2)}</div>
                        </div>
                        {data.entryCondition && (
                            <span className="text-[9px] text-gray-500 text-right max-w-[120px] leading-tight">{data.entryCondition}</span>
                        )}
                    </div>

                    {/* Stop Loss & Risk:Reward */}
                    <div className="flex gap-2">
                        <div className="flex-1 flex items-center gap-2 bg-red-950/30 rounded-lg p-2 border border-red-900/30">
                            <Shield className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                            <div>
                                <div className="text-[9px] text-red-400/70 uppercase">Stop Loss</div>
                                <div className="text-sm font-mono text-red-400 font-bold">${data.stopLoss?.toFixed(2)}</div>
                            </div>
                        </div>
                        {data.riskReward && (
                            <div className="flex items-center justify-center bg-gray-900/50 rounded-lg px-3 border border-gray-700/50">
                                <div className="text-center">
                                    <div className="text-[9px] text-gray-500 uppercase">R:R</div>
                                    <div className="text-sm font-mono text-yellow-400 font-bold">{data.riskReward}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Take Profit Targets */}
                    <div className="flex gap-2">
                        <div className="flex-1 flex items-center gap-2 bg-green-950/30 rounded-lg p-2 border border-green-900/30">
                            <Target className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                            <div>
                                <div className="text-[9px] text-green-400/70 uppercase">TP1 (1x ATR)</div>
                                <div className="text-sm font-mono text-green-400 font-bold">${data.takeProfit1?.toFixed(2)}</div>
                            </div>
                        </div>
                        <div className="flex-1 flex items-center gap-2 bg-emerald-950/30 rounded-lg p-2 border border-emerald-900/30">
                            <Target className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />
                            <div>
                                <div className="text-[9px] text-emerald-300/70 uppercase">TP2 (2x ATR)</div>
                                <div className="text-sm font-mono text-emerald-300 font-bold">${data.takeProfit2?.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Max Loss Note */}
                    {data.maxLoss && (
                        <div className="flex items-start gap-1.5 pt-1">
                            <AlertCircle className="w-3 h-3 text-gray-600 mt-0.5 flex-shrink-0" />
                            <p className="text-[9px] text-gray-600 leading-tight">
                                Max loss: {data.maxLoss}. {data.reason}.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
