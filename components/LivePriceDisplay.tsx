'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface LivePriceDisplayProps {
    symbol: string;
    fallbackPrice?: number;
    enabled?: boolean;
}

interface PriceData {
    price: number;
    change: number;
    changePercent: number;
}

export default function LivePriceDisplay({ symbol, fallbackPrice, enabled = true }: LivePriceDisplayProps) {
    const [priceData, setPriceData] = useState<PriceData | null>(null);
    const [isLive, setIsLive] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);

    const fetchLivePrice = useCallback(async () => {
        if (!enabled || !symbol) return;

        try {
            const res = await fetch(`/api/live-price?symbol=${symbol}`);
            if (res.ok) {
                const data = await res.json();
                if (data.price !== null && data.price !== undefined) {
                    // Detect price direction change for flash animation
                    if (priceData?.price) {
                        if (data.price > priceData.price) setPriceFlash('up');
                        else if (data.price < priceData.price) setPriceFlash('down');
                        else setPriceFlash(null);
                    }

                    setPriceData({
                        price: data.price,
                        change: data.change || 0,
                        changePercent: data.changePercent || 0
                    });
                    setIsLive(true);
                    setLastUpdate(new Date());

                    // Clear flash after animation
                    setTimeout(() => setPriceFlash(null), 1000);
                } else {
                    setIsLive(false);
                }
            }
        } catch (e) {
            console.error('Error fetching live price:', e);
            setIsLive(false);
        }
    }, [symbol, enabled, priceData?.price]);

    useEffect(() => {
        fetchLivePrice();

        // Poll based on likely market hours
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();
        const isLikelyMarketHours = day >= 1 && day <= 5 && hour >= 9 && hour <= 16;
        const pollInterval = isLikelyMarketHours ? 5000 : 30000;

        const interval = setInterval(fetchLivePrice, pollInterval);
        return () => clearInterval(interval);
    }, [fetchLivePrice]);

    // Reset when symbol changes
    useEffect(() => {
        setPriceData(null);
        setIsLive(false);
        setLastUpdate(null);
        setPriceFlash(null);
    }, [symbol]);

    const displayPrice = priceData?.price ?? fallbackPrice;
    const change = priceData?.change ?? 0;
    const changePercent = priceData?.changePercent ?? 0;
    const isPositive = change >= 0;

    if (!displayPrice) {
        return <span className="text-gray-500">--</span>;
    }

    return (
        <div className="flex items-center gap-3">
            {/* Price */}
            <span
                className={`text-2xl font-bold transition-colors duration-300 ${priceFlash === 'up' ? 'text-green-400' :
                        priceFlash === 'down' ? 'text-red-400' :
                            'text-white'
                    }`}
            >
                ${displayPrice.toFixed(2)}
            </span>

            {/* Change */}
            {isLive && (
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md ${isPositive ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}>
                    {isPositive ? (
                        <TrendingUp className="w-3 h-3 text-green-400" />
                    ) : (
                        <TrendingDown className="w-3 h-3 text-red-400" />
                    )}
                    <span className={`text-sm font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {isPositive ? '+' : ''}{change.toFixed(2)}
                    </span>
                    <span className={`text-sm font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
                    </span>
                </div>
            )}

            {/* Live indicator */}
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
