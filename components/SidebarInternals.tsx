"use client";

import React, { useEffect, useState } from 'react';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';

interface MarketData {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
}

interface InternalsData {
    vix?: MarketData;
    sp500?: MarketData;
    nasdaq?: MarketData;
    dow?: MarketData;
}

export default function SidebarInternals() {
    const [internals, setInternals] = useState<InternalsData | null>(null);
    const [convictionStats, setConvictionStats] = useState<{
        advancers: number;
        decliners: number;
        bullishPercent: number;
    } | null>(null);

    useEffect(() => {
        const fetchInternals = async () => {
            try {
                // Fetch market internals (VIX, indices)
                const internalsRes = await fetch('/api/market-internals');
                if (internalsRes.ok) {
                    const data = await internalsRes.json();
                    setInternals(data);
                }
            } catch (e) {
                console.error("Failed to fetch internals", e);
            }
        };

        const fetchConvictionStats = async () => {
            try {
                // Fetch conviction data for breadth calculation
                const res = await fetch('/api/conviction');
                if (!res.ok) return;
                const data = await res.json();

                if (Array.isArray(data)) {
                    // Breadth Logic (Filter out indices/internals)
                    const marketStocks = data.filter((s: any) =>
                        !['Internals', 'Indices', 'Forex', 'Bonds'].includes(s.sector || '')
                    );

                    const advancers = marketStocks.filter((s: any) => s.change24h > 0).length;
                    const decliners = marketStocks.filter((s: any) => s.change24h < 0).length;

                    // Bullish Trend %
                    const bullCount = marketStocks.filter((s: any) => s.metrics?.trend === 'BULLISH').length;
                    const bullishPercent = marketStocks.length > 0 ? (bullCount / marketStocks.length) * 100 : 0;

                    setConvictionStats({ advancers, decliners, bullishPercent });
                }
            } catch (e) {
                console.error("Failed to fetch conviction stats", e);
            }
        };

        fetchInternals();
        fetchConvictionStats();

        const interval = setInterval(() => {
            fetchInternals();
            fetchConvictionStats();
        }, 60000); // 60s refresh

        return () => clearInterval(interval);
    }, []);

    if (!internals) return (
        <div className="px-4 py-4 text-xs text-gray-500 animate-pulse text-center">
            Loading Pulse...
        </div>
    );

    const { vix, sp500, nasdaq } = internals;
    const stats = convictionStats || { advancers: 0, decliners: 0, bullishPercent: 50 };

    return (
        <div className="mt-auto border-t border-gray-800 p-4 space-y-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center mb-2 justify-between">
                <span className="flex items-center">
                    <Activity className="w-3 h-3 mr-1" /> Market Pulse
                </span>
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
            </h4>

            {/* VIX & Bullish % */}
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-800 p-2 rounded border border-gray-700">
                    <span className="text-[10px] text-gray-400 block">VIX</span>
                    <div className="flex items-center gap-1">
                        <span className={`text-sm font-bold ${vix && vix.change < 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {vix ? vix.price.toFixed(2) : 'N/A'}
                        </span>
                        {vix && (
                            <span className={`text-[10px] ${vix.change < 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {vix.change > 0 ? '+' : ''}{vix.changePercent.toFixed(1)}%
                            </span>
                        )}
                    </div>
                </div>
                <div className="bg-gray-800 p-2 rounded border border-gray-700">
                    <span className="text-[10px] text-gray-400 block">Bullish %</span>
                    <span className={`text-sm font-bold ${stats.bullishPercent > 50 ? 'text-green-400' : 'text-red-400'}`}>
                        {stats.bullishPercent.toFixed(0)}%
                    </span>
                </div>
            </div>

            {/* Major Indices */}
            <div className="space-y-1">
                {sp500 && (
                    <div className="flex justify-between items-center text-xs bg-gray-800/50 p-1.5 rounded">
                        <span className="text-gray-400">S&P 500</span>
                        <div className="flex items-center gap-2">
                            <span className="text-white font-mono">{sp500.price.toFixed(2)}</span>
                            <span className={`${sp500.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {sp500.change >= 0 ? '+' : ''}{sp500.changePercent.toFixed(2)}%
                            </span>
                        </div>
                    </div>
                )}
                {nasdaq && (
                    <div className="flex justify-between items-center text-xs bg-gray-800/50 p-1.5 rounded">
                        <span className="text-gray-400">Nasdaq</span>
                        <div className="flex items-center gap-2">
                            <span className="text-white font-mono">{nasdaq.price.toFixed(2)}</span>
                            <span className={`${nasdaq.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {nasdaq.change >= 0 ? '+' : ''}{nasdaq.changePercent.toFixed(2)}%
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Breadth Bar */}
            <div className="bg-gray-800 p-2 rounded border border-gray-700">
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                    <span className="text-green-400">▲ {stats.advancers}</span>
                    <span className="text-gray-500">Breadth</span>
                    <span className="text-red-400">▼ {stats.decliners}</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden flex">
                    <div
                        className="h-full bg-green-500"
                        style={{ width: `${(stats.advancers / (stats.advancers + stats.decliners || 1)) * 100}%` }}
                    />
                    <div
                        className="h-full bg-red-500"
                        style={{ width: `${(stats.decliners / (stats.advancers + stats.decliners || 1)) * 100}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
