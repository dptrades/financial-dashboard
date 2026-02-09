'use client';

interface LivePriceDisplayProps {
    symbol: string;
    fallbackPrice?: number;
    enabled?: boolean;
}

export default function LivePriceDisplay({ symbol, fallbackPrice, enabled = true }: LivePriceDisplayProps) {
    // WebSocket streaming disabled due to Alpaca free tier connection limits
    // Using REST API fallback price instead
    const displayPrice = fallbackPrice;

    if (!displayPrice) {
        return <span className="text-gray-500">--</span>;
    }

    return (
        <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">
                ${displayPrice.toFixed(2)}
            </span>
            <span className="text-xs text-gray-500">Last Close</span>
        </div>
    );
}

