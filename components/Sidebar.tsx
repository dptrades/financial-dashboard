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
    currentPage: 'dashboard' | 'picks' | 'sectors';
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
                    <h1 className="text-2xl font-bold text-blue-400 tracking-tight">Momentum Dash</h1>
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
                <Link href="/sectors" className={`block px-3 py-2 rounded-md text-sm font-medium ${currentPage === 'sectors' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>
                    Sector Heatmap
                </Link>
            </nav>

            {/* Controls - Only show on Dashboard page */}
            {currentPage === 'dashboard' && setMarket && (
                <div className="space-y-4 pt-4 border-t border-gray-700 px-4">
                    <div>
                        <label className="block text-xs font-semibold mb-2 text-gray-400 uppercase tracking-wider">Market</label>
                        <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-700">
                            <button
                                onClick={() => setMarket('crypto')}
                                className={`flex-1 py-1.5 text-xs font-medium rounded ${market === 'crypto' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                Crypto
                            </button>
                            <button
                                onClick={() => setMarket('stocks')}
                                className={`flex-1 py-1.5 text-xs font-medium rounded ${market === 'stocks' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                Stocks
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold mb-2 text-gray-400 uppercase tracking-wider">Asset</label>
                        {market === 'crypto' ? (
                            <select
                                value={symbol}
                                onChange={(e) => setSymbol && setSymbol(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                disabled={loading}
                            >
                                <option value="BTC">Bitcoin (BTC)</option>
                                <option value="ETH">Ethereum (ETH)</option>
                                <option value="SOL">Solana (SOL)</option>
                            </select>
                        ) : (
                            <div className="relative">
                                <input
                                    type="text"
                                    value={stockInput}
                                    onChange={(e) => setStockInput && setStockInput(e.target.value.toUpperCase())}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase placeholder-gray-500"
                                    placeholder="Symbol (e.g. NVDA)"
                                    disabled={loading}
                                />
                                <button
                                    className="absolute right-3 top-2.5 text-gray-400 hover:text-white transition-colors"
                                    onClick={() => setDebouncedStock && stockInput && setDebouncedStock(stockInput)}
                                    disabled={loading}
                                >
                                    <Search className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Options AI Signal */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">AI Options Pick</label>
                            <span className="text-[10px] text-gray-600 bg-gray-800 px-1.5 rounded border border-gray-700">BETA</span>
                        </div>
                        <OptionsSignal data={optionsSignal} loading={loading} />
                    </div>

                    {/* Stats Carousel (High/Low) */}
                    <div className="mb-4">
                        <label className="block text-xs font-semibold mb-2 text-gray-400 uppercase tracking-wider">Price Stats</label>
                        <StatsCarousel stats={stats} />
                    </div>

                    {/* Whale Watch (Stocks Only) */}
                    {market === 'stocks' && (
                        <div className="mb-6">
                            <WhaleWatch symbol={debouncedStock || stockInput} />
                        </div>
                    )}



                    {/* Interval Selector */}
                    {setInterval && (
                        <div>
                            <label className="block text-xs font-semibold mb-2 text-gray-400 uppercase tracking-wider">Timeframe</label>
                            <div className="grid grid-cols-4 gap-1 p-1 bg-gray-900 rounded-lg border border-gray-700">
                                {['15m', '1h', '4h', '1d'].map(tf => (
                                    <button
                                        key={tf}
                                        onClick={() => setInterval(tf)}
                                        className={`text-[10px] font-bold py-1.5 rounded ${interval === tf ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        {tf.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Space Filler */}
            <div className="flex-1"></div>

            {/* Market Internals (Sidebar Widget) */}
            <SidebarInternals />
        </aside>
    );
}
