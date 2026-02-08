import React from 'react';
import { OptionRecommendation } from '../lib/options';
import { MousePointerClick, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

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
        <div className={`bg-gray-800 rounded-xl p-4 border ${border} mb-4 relative overflow-hidden group`}>
            {/* Glow Effect */}
            <div className={`absolute top-0 right-0 w-20 h-20 ${bg} opacity-5 blur-2xl -mr-10 -mt-10`}></div>

            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <MousePointerClick className={`w-4 h-4 ${color}`} />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Options AI</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full bg-gray-700 ${color} font-bold`}>
                    {data.confidence}% Win Prob
                </span>
            </div>

            <div className="flex justify-between items-end mb-2">
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

            {/* Probability Bar */}
            <div className="w-full bg-gray-700 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                    className={`h-full ${bg} transition-all duration-1000 ease-out`}
                    style={{ width: `${data.confidence}%` }}
                />
            </div>

            <div className="mt-2 flex items-start gap-1.5">
                <AlertCircle className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] text-gray-500 leading-tight">
                    {data.reason}. Target: 1.0x ATR (High Prob).
                </p>
            </div>
        </div>
    );
}
