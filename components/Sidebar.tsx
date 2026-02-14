"use client";

import React, { useState, useEffect } from 'react';

import Link from 'next/link';
import SidebarInternals from './SidebarInternals';
import { Search, Activity, Clock, Zap, BarChart2, Hash, Newspaper, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { IndicatorData } from '../types/financial';
import { PriceStats } from '../lib/stats';
import OptionsSignal from './OptionsSignal';
import { generateOptionSignal, OptionRecommendation } from '../lib/options';


interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    symbol: string;
    setSymbol: (s: string) => void;
    stockInput: string;
    setStockInput: (s: string) => void;
    interval: string;
    setInterval: (i: string) => void;
    data: IndicatorData[];
    loading: boolean;
    currentPage: 'dashboard' | 'picks' | 'sectors' | 'conviction' | 'portfolio';
    stats: PriceStats | null;
    sentimentScore: number;
    onSectorClick: (sector: any) => void;
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
                    className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-200 hover:text-white"
                >
                    <ChevronLeft className="w-3 h-3" />
                </button>

                <span className="text-[10px] text-gray-200 uppercase tracking-wider font-bold select-none">{current.label}</span>

                <button
                    onClick={next}
                    className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-200 hover:text-white"
                >
                    <ChevronRight className="w-3 h-3" />
                </button>
            </div>

            <div className="flex justify-between items-end mt-2 px-1">
                <div>
                    <span className="text-[10px] text-gray-300 block">High</span>
                    <span className="text-sm font-mono text-green-400">${current.high.toFixed(2)}</span>
                </div>
                <div className="text-right">
                    <span className="text-[10px] text-gray-300 block">Low</span>
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
    isOpen,
    setIsOpen,
    symbol,
    setSymbol,
    stockInput,
    setStockInput,
    interval,
    setInterval,
    data,
    loading,
    currentPage,
    stats,
    sentimentScore,
    onSectorClick
}: SidebarProps) {

    // Calculate Options Signal
    const latest = data[data.length - 1];
    const [optionsSignal, setOptionsSignal] = useState<OptionRecommendation | null>(null);

    useEffect(() => {
        const fetchSignal = async () => {
            if (latest && stats && latest.atr14) {
                // Determine Trend (Simplified for Options)
                let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
                if (latest.close > (latest.ema50 || 0)) trend = 'bullish';
                else if (latest.close < (latest.ema50 || 0)) trend = 'bearish';

                const sig = await generateOptionSignal(latest.close, latest.atr14, trend, latest.rsi14 || 50, latest.ema50, undefined, symbol);
                setOptionsSignal(sig);
            }
        };
        fetchSignal();
    }, [latest, stats, symbol]);

    return (
        <aside className="w-full bg-gray-800 border-r border-gray-700 flex flex-col h-full overflow-y-auto custom-scrollbar shadow-2xl">
            <div className="p-4 flex justify-between items-center bg-gray-900/60 border-b border-gray-700/50 backdrop-blur-md sticky top-0 z-20">
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-blue-400 tracking-tight flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        DP TradeDesk
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-blue-400 border border-gray-700 transition-all active:scale-95 shadow-lg flex items-center gap-1 group"
                        title="Close Menu"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        <span className="text-[10px] font-bold uppercase md:hidden">Close</span>
                    </button>
                </div>
            </div>

            {/* Navigation */}
            <nav className="space-y-1 p-2">
                <Link
                    href="/"
                    className={`block px-3 py-2 rounded-md text-sm font-medium transition-all ${currentPage === 'dashboard'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'text-blue-400/70 hover:text-blue-400 hover:bg-blue-500/10'
                        }`}
                >
                    Live Dashboard
                </Link>
                <Link
                    href="/picks"
                    className={`block px-3 py-2 rounded-md text-sm font-medium transition-all ${currentPage === 'picks'
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'text-purple-400/70 hover:text-purple-400 hover:bg-blue-500/10'
                        }`}
                >
                    Top Picks
                </Link>
                <Link
                    href="/conviction"
                    className={`block px-3 py-2 rounded-md text-sm font-medium transition-all ${currentPage === 'conviction'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'text-emerald-400/70 hover:text-emerald-400 hover:bg-blue-500/10'
                        }`}
                >
                    ✨ Alpha Hunter
                </Link>
            </nav>

            <div className="flex-1 overflow-y-auto">
                {/* Market Internals (Market Pulse) - Below Navigation */}
                <SidebarInternals onSectorClick={onSectorClick} isOpen={isOpen} />
            </div>
        </aside>
    );
}
