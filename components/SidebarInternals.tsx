"use client";

import React, { useEffect, useState } from 'react';
import { Activity, TrendingUp, TrendingDown, DollarSign, BarChart3, GripHorizontal } from 'lucide-react';
import { scanMarket, ScannedStock } from '@/lib/scanner';

export default function SidebarInternals() {
    const [stats, setStats] = useState<{
        vix: ScannedStock | undefined;
        tick: ScannedStock | undefined;
        add: ScannedStock | undefined;
        advancers: number;
        decliners: number;
        bullishPercent: number;
    } | null>(null);

    useEffect(() => {
        const fetchInternals = async () => {
            const data = await scanMarket();

            // Internals
            const vix = data.find(s => s.symbol === '^VIX');
            const tick = data.find(s => s.symbol === '^TICK');
            const add = data.find(s => s.symbol === '^ADD');

            // Breadth Logic (Filter out indices/internals)
            const marketStocks = data.filter(s =>
                !['Internals', 'Indices', 'Forex', 'Bonds'].includes(s.sector)
            );

            const advancers = marketStocks.filter(s => s.change24h > 0).length;
            const decliners = marketStocks.filter(s => s.change24h < 0).length;

            // Bullish Trend % (Price > EMA200 approx via 'trend' field or raw check if avail)
            // Using 'trend' field from scanner which checks EMA50/200
            const bullCount = marketStocks.filter(s => s.trend === 'BULLISH').length;
            const bullishPercent = marketStocks.length > 0 ? (bullCount / marketStocks.length) * 100 : 0;

            setStats({ vix, tick, add, advancers, decliners, bullishPercent });
        };

        fetchInternals();
        const interval = setInterval(fetchInternals, 60000); // 60s refresh

        return () => clearInterval(interval);
    }, []);

    if (!stats) return (
        <div className="px-4 py-4 text-xs text-gray-500 animate-pulse text-center">
            Loading Pulse...
        </div>
    );

    const { vix, tick, add, advancers, decliners, bullishPercent } = stats;
    const breadthColor = advancers > decliners ? 'text-green-400' : 'text-red-400';

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

            {/* VIX & Sentiment */}
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-800 p-2 rounded border border-gray-700">
                    <span className="text-[10px] text-gray-400 block">VIX</span>
                    <span className={`text-sm font-bold ${vix && vix.change24h > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {vix ? vix.price.toFixed(2) : 'N/A'}
                    </span>
                </div>
                <div className="bg-gray-800 p-2 rounded border border-gray-700">
                    <span className="text-[10px] text-gray-400 block">Bullish %</span>
                    <span className={`text-sm font-bold ${bullishPercent > 50 ? 'text-green-400' : 'text-red-400'}`}>
                        {bullishPercent.toFixed(0)}%
                    </span>
                </div>
            </div>

            {/* Breadth Bar */}
            <div className="bg-gray-800 p-2 rounded border border-gray-700">
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                    <span>Adv: {advancers}</span>
                    <span>Dec: {decliners}</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden flex">
                    <div
                        className="h-full bg-green-500"
                        style={{ width: `${(advancers / (advancers + decliners || 1)) * 100}%` }}
                    />
                    <div
                        className="h-full bg-red-500"
                        style={{ width: `${(decliners / (advancers + decliners || 1)) * 100}%` }}
                    />
                </div>
            </div>

            {/* TICK / ADD (if available) - Or just general status */}
            {tick && (
                <div className="flex justify-between items-center text-xs border-t border-gray-800 pt-2">
                    <span className="text-gray-500">$TICK</span>
                    <span className={tick.price > 0 ? 'text-green-400' : 'text-red-400'}>
                        {tick.price.toFixed(0)}
                    </span>
                </div>
            )}
            {add && (
                <div className="flex justify-between items-center text-xs border-t border-gray-800 pt-2">
                    <span className="text-gray-500">$ADD</span>
                    <span className={add.price > 0 ? 'text-green-400' : 'text-red-400'}>
                        {add.price.toFixed(0)}
                    </span>
                </div>
            )}
        </div>
    );
}
