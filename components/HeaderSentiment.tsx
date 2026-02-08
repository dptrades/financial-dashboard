import React from 'react';
import { Newspaper } from 'lucide-react';

interface HeaderSentimentProps {
    score: number;
}

export default function HeaderSentiment({ score }: HeaderSentimentProps) {
    const getLabel = (s: number) => {
        if (s >= 75) return 'Very Bullish';
        if (s >= 60) return 'Bullish';
        if (s <= 25) return 'Very Bearish';
        if (s <= 40) return 'Bearish';
        return 'Neutral';
    };

    const color = score >= 60 ? 'text-green-400' : score <= 40 ? 'text-red-400' : 'text-gray-400';
    const barColor = score >= 50 ? 'bg-green-500' : 'bg-red-500';

    return (
        <div className="flex items-center gap-4 bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-700 mx-4">
            <div className="flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Crowd Sentiment</span>
            </div>

            <div className="flex items-center gap-3">
                <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-1000 ${barColor}`}
                        style={{ width: `${score}%` }}
                    ></div>
                </div>
                <div className="flex items-baseline gap-1">
                    <span className={`text-sm font-bold ${color}`}>{getLabel(score)}</span>
                    <span className="text-xs text-gray-500">({score}%)</span>
                </div>
            </div>
        </div>
    );
}
