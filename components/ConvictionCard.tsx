import React from 'react';
import { ConvictionStock } from '../lib/conviction';
import { TrendingUp, Users, BarChart3, PieChart, Info } from 'lucide-react';

interface Props {
    stock: ConvictionStock;
}

export default function ConvictionCard({ stock }: Props) {
    // Color coding for score
    const getScoreColor = (s: number) => {
        if (s >= 80) return 'text-green-400';
        if (s >= 60) return 'text-blue-400';
        if (s >= 40) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getBarColor = (s: number) => {
        if (s >= 80) return 'bg-green-500';
        if (s >= 60) return 'bg-blue-500';
        if (s >= 40) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-gray-500 transition-all shadow-lg">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-bold text-white tracking-tight">{stock.symbol}</h3>
                        <span className="text-xs text-gray-400 bg-gray-900 px-2 py-0.5 rounded-full">{stock.name}</span>
                    </div>
                    <div className="text-3xl font-mono text-white mt-1">
                        ${stock.price.toFixed(2)}
                    </div>
                </div>

                <div className="text-center bg-gray-900 p-2 rounded-lg border border-gray-800">
                    <div className={`text-3xl font-bold ${getScoreColor(stock.score)}`}>{stock.score}</div>
                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Alpha Score</div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <ScoreBar label="Technicals" score={stock.technicalScore} icon={<TrendingUp className="w-3 h-3" />} />
                <ScoreBar label="Fundamentals" score={stock.fundamentalScore} icon={<PieChart className="w-3 h-3" />} />
                <ScoreBar label="Analyst Ratings" score={stock.analystScore} icon={<BarChart3 className="w-3 h-3" />} />
                <ScoreBar label="Social Sentiment" score={stock.sentimentScore} icon={<Users className="w-3 h-3" />} />
            </div>

            {/* Deep Dive Details */}
            <div className="bg-gray-900/50 rounded-lg p-3 text-xs space-y-2 mb-4 border border-gray-800/50">
                <div className="flex justify-between">
                    <span className="text-gray-500">Trend Structure</span>
                    <span className={`font-mono font-bold ${stock.metrics.trend === 'BULLISH' ? 'text-green-400' : 'text-gray-300'}`}>
                        {stock.metrics.trend}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">P/E Ratio</span>
                    <span className="text-gray-300 font-mono">{stock.metrics.pe?.toFixed(1) || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">Rev Growth (YoY)</span>
                    <span className="text-green-400 font-mono">
                        {stock.metrics.revenueGrowth ? `+${(stock.metrics.revenueGrowth * 100).toFixed(1)}%` : 'N/A'}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">Analyst View</span>
                    <span className="text-blue-300 font-bold">{stock.metrics.analystRating}</span>
                </div>
            </div>

            {/* Reasons / Badges */}
            <div className="flex flex-wrap gap-2">
                {stock.reasons.map((r, i) => (
                    <span key={i} className="text-[10px] bg-blue-500/10 text-blue-300 px-2 py-1 rounded border border-blue-500/20">
                        {r}
                    </span>
                ))}
            </div>

        </div>
    );
}

function ScoreBar({ label, score, icon }: { label: string, score: number, icon: any }) {
    const getColor = (s: number) => {
        if (s >= 75) return 'bg-green-500';
        if (s >= 50) return 'bg-blue-500';
        if (s >= 30) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-1 text-xs">
                <span className="text-gray-400 flex items-center gap-1">{icon} {label}</span>
                <span className="text-gray-300 font-mono">{score}</span>
            </div>
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={`h-full ${getColor(score)} rounded-full transition-all duration-500`}
                    style={{ width: `${score}%` }}
                ></div>
            </div>
        </div>
    );
}
