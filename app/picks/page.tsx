"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, DollarSign, Calendar, ArrowRight } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { scanMarket, ScannedStock } from '@/lib/scanner';

export default function TopPicksPage() {
    const [picks, setPicks] = useState<ScannedStock[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedStock, setExpandedStock] = useState<string | null>(null);

    useEffect(() => {
        const runScan = async () => {
            setLoading(true);
            const results = await scanMarket();
            setPicks(results);
            setLoading(false);
        };

        runScan();
    }, []);

    return (
        <div className="flex h-screen bg-gray-900 text-white font-sans">
            {/* Sidebar with "picks" active */}
            <Sidebar
                currentPage="picks"
                market="stocks"
                setMarket={() => { }}
                symbol="PICK"
                setSymbol={() => { }}
                stockInput=""
                setStockInput={() => { }}
                setDebouncedStock={() => { }}
                interval="1d"
                setInterval={() => { }}
                data={[]}
                loading={false}
                stats={null}
                sentimentScore={50}
            />

            <main className="flex-1 p-6 flex flex-col overflow-hidden">
                <header className="mb-8">
                    <h2 className="text-3xl font-bold tracking-tight text-blue-400">Weekly Top Picks</h2>
                    <p className="text-sm text-gray-400 mt-1">
                        AI-Scanned opportunities based on Momentum, Trends, and Volume Anomalies.
                    </p>
                </header>

                <div className="flex-1 overflow-y-auto pr-2">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64">
                            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <span className="text-lg text-gray-300 animate-pulse">Scanning the Market...</span>
                            <span className="text-xs text-gray-500 mt-2">Checking 20+ High-Vol Assets</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
                            {picks.map((pick, index) => {
                                const isExpanded = expandedStock === pick.symbol;

                                return (
                                    <div key={pick.symbol} className="bg-gray-800 rounded-xl border border-gray-700 hover:border-blue-500 transition-colors shadow-lg relative overflow-hidden group">
                                        {/* Rank Badge */}
                                        <div className="absolute top-0 right-0 bg-gray-700 text-gray-300 text-xs font-bold px-3 py-1 rounded-bl-xl border-b border-l border-gray-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            #{index + 1}
                                        </div>

                                        <div className="p-5">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <Link href={`/?symbol=${pick.symbol}&market=stocks`} className="hover:underline cursor-pointer">
                                                        <h3 className="text-2xl font-bold text-white tracking-tight">{pick.symbol}</h3>
                                                    </Link>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${pick.trend === 'BULLISH' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
                                                        {pick.trend}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-2xl font-mono font-bold text-blue-400">{pick.score}</div>
                                                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">Win Prob</div>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center mb-4 text-sm font-mono text-gray-300 bg-gray-900 p-2 rounded">
                                                <span>${pick.price.toFixed(2)}</span>
                                                <span className={pick.change24h >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                    {pick.change24h > 0 ? '+' : ''}{pick.change24h.toFixed(2)}%
                                                </span>
                                            </div>

                                            <div className="space-y-2 mb-4">
                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Key Signals</p>
                                                {pick.reasons.map((reason, i) => (
                                                    <div key={i} className="flex items-center text-xs text-gray-300">
                                                        <svg className="w-3 h-3 text-blue-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                        {reason}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Option Strategy Badge */}
                                            {pick.suggestedOption && (
                                                <div className="mb-4 bg-gray-900 bg-opacity-50 rounded-lg p-3 border border-gray-700">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center">
                                                            <svg className="w-3 h-3 mr-1 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                            </svg>
                                                            Suggested Play
                                                        </span>
                                                        <span className="text-[10px] text-gray-500">Swing (30-45d)</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <div className="text-sm font-mono font-bold text-white">
                                                            <span className="text-gray-400 mr-1">{pick.suggestedOption.expiry}</span>
                                                            ${pick.suggestedOption.strike}
                                                        </div>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${pick.suggestedOption.type === 'CALL' ? 'bg-blue-900 text-blue-300' : 'bg-orange-900 text-orange-300'}`}>
                                                            {pick.suggestedOption.type}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="pt-4 border-t border-gray-700 grid grid-cols-2 gap-4 text-xs">
                                                <div>
                                                    <span className="text-gray-500 block mb-1">RSI (14)</span>
                                                    <span className={`font-mono px-2 py-0.5 rounded ${pick.rsi > 70 ? 'bg-red-900 text-red-200' : pick.rsi < 30 ? 'bg-green-900 text-green-200' : 'bg-gray-700 text-white'}`}>
                                                        {pick.rsi.toFixed(1)}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-gray-500 block mb-1">Volume</span>
                                                    <span className="font-mono text-white">
                                                        {(pick.volume / 1000000).toFixed(1)}M
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
