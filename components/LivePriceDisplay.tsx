'use client';

import { useLivePrice } from '@/hooks/useLivePrice';

interface LivePriceDisplayProps {
    symbol: string;
    fallbackPrice?: number;
    enabled?: boolean;
}

export default function LivePriceDisplay({ symbol, fallbackPrice, enabled = true }: LivePriceDisplayProps) {
    const { liveQuote, isConnected, error } = useLivePrice({ symbol, enabled });

    const displayPrice = liveQuote?.midPrice || fallbackPrice;
    const isLive = isConnected && liveQuote !== null;

    if (!displayPrice) {
        return <span className="text-gray-500">--</span>;
    }

    return (
        <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">
                ${displayPrice.toFixed(2)}
            </span>
            {isLive ? (
                <span className="flex items-center gap-1 text-xs text-green-400">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    LIVE
                </span>
            ) : (
                <span className="text-xs text-gray-500">
                    {error ? '⚠️ Offline' : 'Delayed'}
                </span>
            )}
        </div>
    );
}
