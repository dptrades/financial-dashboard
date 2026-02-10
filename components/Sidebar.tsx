import React, { useState, useEffect } from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

import Link from 'next/link';
import SidebarInternals from './SidebarInternals';
import { Search, Activity, Clock, Zap, BarChart2, Hash, Newspaper, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { IndicatorData } from '../types/financial';
import { PriceStats } from '../lib/stats';
import OptionsSignal from './OptionsSignal';
import { generateOptionSignal, OptionRecommendation } from '../lib/options';
import WhaleWatch from './WhaleWatch';


interface SidebarProps {
    market: 'crypto' | 'stocks';
    setMarket: (m: 'crypto' | 'stocks') => void;
    symbol: string;
    setSymbol: (s: string) => void;
    stockInput: string;
    setStockInput: (s: string) => void;

    debouncedStock?: string; // Add this
    setDebouncedStock: (s: string) => void;
    interval: string;
    setInterval: (i: string) => void;
    data: IndicatorData[];
    loading: boolean;
    currentPage: 'dashboard' | 'picks' | 'sectors' | 'conviction' | 'portfolio';
    stats: PriceStats | null;
    sentimentScore: number;
}

const StatsCarousel = ({ stats }: { stats: PriceStats | null }) => {
    const [index, setIndex] = useState(0);

    // Manual navigation only
    const next = () => setIndex((prev) => (prev + 1) % 6);
    const prev = () => setIndex((prev) => (prev - 1 + 6) % 6);

    if (!stats) return <div className="h-20 bg-gray-800/50 rounded-lg animate-pulse my-4"></div>;

    const items = [
        { label: 'Prev Day', high: stats.previousDay.high, low: stats.previousDay.low },
        { label: 'Current Week', high: stats.currentWeek.high, low: stats.currentWeek.low },
        { label: 'Prev Week', high: stats.previousWeek.high, low: stats.previousWeek.low },
        { label: 'Current Month', high: stats.currentMonth.high, low: stats.currentMonth.low },
        { label: 'Current Year', high: stats.currentYear.high, low: stats.currentYear.low },
        { label: 'All Time', high: stats.allTime.high, low: stats.allTime.low },
    ];

    const current = items[index];

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 my-4 relative overflow-hidden group">
            <div className="flex justify-between items-center mb-1">
                <button
                    onClick={prev}
                    className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-white"
                >
                    <ChevronLeft className="w-3 h-3" />
                </button>

                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold select-none">{current.label}</span>

                <button
                    onClick={next}
                    className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-white"
                >
                    <ChevronRight className="w-3 h-3" />
                </button>
            </div>

            <div className="flex justify-between items-end mt-2 px-1">
                <div>
                    <span className="text-[10px] text-gray-500 block">High</span>
                    <span className="text-sm font-mono text-green-400">${current.high.toFixed(2)}</span>
                </div>
                <div className="text-right">
                    <span className="text-[10px] text-gray-500 block">Low</span>
                    <span className="text-sm font-mono text-red-400">${current.low.toFixed(2)}</span>
                </div>
            </div>

            {/* Dots */}
            <div className="flex justify-center space-x-1 mt-2">
                {[0, 1, 2, 3, 4, 5].map(i => (
                    <button
                        key={i}
                        onClick={() => setIndex(i)}
                        className={`h-1 rounded-full transition-all ${i === index ? 'w-3 bg-blue-400' : 'w-1 bg-gray-600 hover:bg-gray-500'}`}
                    />
                ))}
            </div>
        </div>
    );
};

export default function Sidebar({
    market,
    setMarket,
    symbol,
    setSymbol,
    stockInput,
    setStockInput,

    debouncedStock,
    setDebouncedStock,
    interval,
    setInterval,
    data,
    loading,
    currentPage,
    stats,
    sentimentScore
}: SidebarProps) {

    // Calculate Options Signal
    const latest = data[data.length - 1];
    let optionsSignal: OptionRecommendation | null = null;

    if (latest && stats && latest.atr14) {
        // Determine Trend (Simplified for Options)
        let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
        if (latest.close > (latest.ema50 || 0)) trend = 'bullish';
        else if (latest.close < (latest.ema50 || 0)) trend = 'bearish';

        optionsSignal = generateOptionSignal(latest.close, latest.atr14, trend, latest.rsi14 || 50, latest.ema50);
    }

    return (
        <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col h-full overflow-y-auto custom-scrollbar">
            <div className="p-4 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-blue-400 tracking-tight">DP TradeDesk</h1>
                    <p className="text-xs text-gray-500 mt-1">Scientific Price Analysis</p>
                </div>
                <div className="flex items-center">
                    <SignedIn>
                        <UserButton />
                    </SignedIn>
                    <SignedOut>
                        <SignInButton mode="modal">
                            <button className="text-xs bg-blue-600 px-2 py-1 rounded text-white">Sign In</button>
                        </SignInButton>
                    </SignedOut>
                </div>
            </div>

            {/* Navigation */}
            <nav className="space-y-1 px-2">
                <Link href="/" className={`block px-3 py-2 rounded-md text-sm font-medium ${currentPage === 'dashboard' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>
                    Live Dashboard
                </Link>
                <Link href="/picks" className={`block px-3 py-2 rounded-md text-sm font-medium ${currentPage === 'picks' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>
                    Top Picks (Weekly)
                </Link>
                <Link href="/sectors" className={`block px-3 py-2 rounded-md text-sm font-medium ${currentPage === 'sectors' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>
                    Sector Heatmap
                </Link>
                <Link href="/conviction" className={`block px-3 py-2 rounded-md text-sm font-medium ${currentPage === 'conviction' ? 'bg-gray-800 text-white' : 'text-emerald-400 hover:text-white hover:bg-gray-800 bg-emerald-500/10 border border-emerald-500/20'}`}>
                    ✨ Alpha Hunter
                </Link>
                <Link href="/portfolio" className={`block px-3 py-2 rounded-md text-sm font-medium ${currentPage === 'portfolio' ? 'bg-gray-800 text-white' : 'text-yellow-400 hover:text-white hover:bg-gray-800 bg-yellow-500/10 border border-yellow-500/20'}`}>
                    💰 Paper Trading
                </Link>
            </nav>

            {/* Market Internals (Market Pulse) - Below Navigation */}
            <SidebarInternals />

            {/* Space Filler */}
            <div className="flex-1"></div>
        </aside>
    );
}
