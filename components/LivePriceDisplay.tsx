'use client';

import { useState, useEffect, useCallback } from 'react';

interface LivePriceDisplayProps {
    symbol: string;
    fallbackPrice?: number;
    enabled?: boolean;
}

export default function LivePriceDisplay({ symbol, fallbackPrice, enabled = true }: LivePriceDisplayProps) {
    const [livePrice, setLivePrice] = useState<number | null>(null);
    const [isLive, setIsLive] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [priceChange, setPriceChange] = useState<'up' | 'down' | null>(null);

    const fetchLivePrice = useCallback(async () => {
        if (!enabled || !symbol) return;

        try {
            const res = await fetch(`/api/live-price?symbol=${symbol}`);
            if (res.ok) {
                const data = await res.json();
                if (data.price !== null && data.price !== undefined) {
                    // Detect price direction change
                    if (livePrice !== null) {
                        if (data.price > livePrice) setPriceChange('up');
                        else if (data.price < livePrice) setPriceChange('down');
                        else setPriceChange(null);
                    }

                    setLivePrice(data.price);
                    setIsLive(true);
                    setLastUpdate(new Date());

                    // Clear price change indicator after animation
                    setTimeout(() => setPriceChange(null), 1000);
                } else {
                    // Market closed or no data - use fallback
                    setIsLive(false);
                }
            }
        } catch (e) {
            console.error('Error fetching live price:', e);
            setIsLive(false);
        }
    }, [symbol, enabled, livePrice]);

    useEffect(() => {
        // Initial fetch
        fetchLivePrice();

        // Poll every 5 seconds during market hours (rough check)
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();

        // Only poll aggressively during likely market hours (Mon-Fri 9-16 ET approx)
        // This is a rough check, user may be in different timezone
        const isLikelyMarketHours = day >= 1 && day <= 5 && hour >= 9 && hour <= 16;
        const pollInterval = isLikelyMarketHours ? 5000 : 30000; // 5s during market, 30s off-hours

        const interval = setInterval(fetchLivePrice, pollInterval);

        return () => clearInterval(interval);
    }, [fetchLivePrice]);

    // Reset when symbol changes
    useEffect(() => {
        setLivePrice(null);
        setIsLive(false);
        setLastUpdate(null);
        setPriceChange(null);
    }, [symbol]);

    const displayPrice = livePrice ?? fallbackPrice;

    if (!displayPrice) {
        return <span className="text-gray-500">--</span>;
    }

    return (
        <div className="flex items-center gap-2">
            <span
                className={`text-xl font-bold transition-colors duration-300 ${priceChange === 'up' ? 'text-green-400' :
                        priceChange === 'down' ? 'text-red-400' :
                            'text-white'
                    }`}
            >
                ${displayPrice.toFixed(2)}
            </span>

            {isLive ? (
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-[10px] text-green-400 uppercase font-bold tracking-wider">Live</span>
                </div>
            ) : (
                <span className="text-xs text-gray-500">Last Close</span>
            )}
        </div>
    );
}
