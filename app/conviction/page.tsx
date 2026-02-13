"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import ConvictionCard from '../../components/ConvictionCard';
import type { ConvictionStock } from '../../types/stock';
import { Loader2, RefreshCw, X } from 'lucide-react';
import { Loading } from '../../components/ui/Loading';
import { ErrorMessage } from '../../components/ui/ErrorMessage';

const CACHE_KEY = 'alpha_hunter_results';
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

export default function ConvictionPage() {
    const router = useRouter();
    // Sidebar Props (Standardized)
    const [symbol, setSymbol] = useState('AAPL');
    const [stockInput, setStockInput] = useState('NVDA');
    const [stats, setStats] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const [stocks, setStocks] = useState<ConvictionStock[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showLogic, setShowLogic] = useState(false);

    const fetchConviction = async (forceRefresh = false) => {
        // 1. Check Cache first unless forceRefresh is true
        if (!forceRefresh) {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                try {
                    const { data, timestamp } = JSON.parse(cached);
                    const age = Date.now() - timestamp;
                    if (age < CACHE_DURATION) {
                        console.log(`🚀 Using cached Alpha Hunter results (${Math.round(age / 1000)}s old)`);
                        setStocks(data);
                        setLoading(false);
                        return;
                    }
                } catch (e) {
                    console.error("Failed to parse cached Alpha Hunter data", e);
                }
            }
        }

        if (forceRefresh) {
            setStocks([]); // Clear current results to show loading state
        }

        setLoading(true);
        setError('');
        try {
            const url = forceRefresh ? '/api/alpha-hunter?refresh=true' : '/api/alpha-hunter';
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch data');

            const data = await res.json();
            if (Array.isArray(data)) {
                setStocks(data);

                // 2. Save to Cache
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    data,
                    timestamp: Date.now()
                }));

                if (data.length === 0) setError('No results found. API might be rate-limited or returning empty data.');
            } else {
                setError('Invalid data format received from API.');
            }
        } catch (e) {
            console.error("Failed to fetch alpha hunter", e);
            setError('Failed to scan market. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConviction();
    }, []);

    const handleSelect = (symbol: string) => {
        // Navigate to dashboard with this symbol
        router.push(`/?symbol=${symbol}`);
    };

    return (
        <div className="flex h-screen bg-gray-900 text-white font-sans overflow-hidden">
            <Sidebar
                currentPage="conviction"
                symbol={symbol} setSymbol={setSymbol}
                stockInput={stockInput} setStockInput={setStockInput}
                isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen}
                // No-op props for sidebar internal logic
                interval="1d" setInterval={() => { }}
                data={[]} loading={false} stats={null} sentimentScore={50}
                onSectorClick={() => { }}
            />

            <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                <header className="flex justify-between items-end mb-8">
                    <div>
                        <div className="flex items-center gap-4">
                            <h1 className="text-4xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                                Alpha Hunter
                            </h1>
                            <button
                                onClick={() => setShowLogic(true)}
                                className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium underline underline-offset-4 mt-2"
                            >
                                (How did I do that?)
                            </button>
                        </div>
                        <p className="text-gray-200 mt-2 max-w-2xl">
                            Scans the entire market for high-probability setups with Smart Discovery.
                            Combines <span className="text-blue-400">Technicals</span>, <span className="text-green-400">Fundamentals</span>, <span className="text-yellow-400">Analyst Ratings</span>, and <span className="text-purple-400">Social Sentiment</span>.
                        </p>
                    </div>

                    <button
                        onClick={() => fetchConviction(true)}
                        disabled={loading}
                        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg border border-gray-700 transition-all text-sm font-medium disabled:opacity-50 hover:border-blue-500/50"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Scan Market
                    </button>
                </header>

                {error && (
                    <div className="mb-6">
                        <ErrorMessage
                            title="Scan Failed"
                            message={error}
                            onRetry={() => fetchConviction(true)}
                        />
                    </div>
                )}

                {stocks.length > 0 && stocks[0].isMock && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-3 rounded-lg mb-6 flex items-center gap-2 text-sm">
                        ⚠️ <span className="font-bold">Demo Mode:</span> Live API limit reached. Showing historical example data.
                    </div>
                )}

                {loading && stocks.length === 0 ? (
                    <div className="h-96">
                        <Loading message="Crunching billions of data points..." />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                        {stocks.map((stock) => (
                            <ConvictionCard
                                key={stock.symbol}
                                stock={stock}
                                onSelect={(s) => handleSelect(s)}
                            />
                        ))}
                    </div>
                )}

                {/* Alpha Hunter Logic Modal */}
                {showLogic && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowLogic(false)} />
                        <div className="relative z-50 bg-gray-900 border border-gray-700/50 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-1 bg-gradient-to-r from-blue-500 to-emerald-500" />
                            <div className="p-6 md:p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white mb-1">Alpha Hunter Scoring Logic</h2>
                                        <p className="text-gray-400 text-sm">How we calculate the high-conviction scores</p>
                                    </div>
                                    <button
                                        onClick={() => setShowLogic(false)}
                                        className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                                                <span className="font-bold text-blue-400 text-sm">Technical Analysis (25%)</span>
                                            </div>
                                            <p className="text-sm text-gray-200 leading-relaxed">
                                                Evaluates Trend alignment (Price vs 50/200 EMA), RSI momentum, MACD crosses, and Bollinger Band breakouts to find stocks with the strongest upward velocity.
                                            </p>
                                        </div>

                                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                                                <span className="font-bold text-emerald-400 text-sm">Fundamentals & Growth (20%)</span>
                                            </div>
                                            <p className="text-sm text-gray-200 leading-relaxed">
                                                Checklists for Revenue Growth (&gt;10% YoY), Profit Margins (&gt;15%), and healthy P/E ratios. We look for high-quality companies trading at reasonable valuations.
                                            </p>
                                        </div>

                                        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
                                                <span className="font-bold text-yellow-400 text-sm">Analyst Rating (15%)</span>
                                            </div>
                                            <p className="text-sm text-gray-200 leading-relaxed">
                                                Aggregates consensus data from Wall Street analysts. Higher weights given to Strong Buy ratings and significant upside relative to average Price Targets.
                                            </p>
                                        </div>

                                        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]" />
                                                <span className="font-bold text-purple-400 text-sm">Social & Sentiment (15%)</span>
                                            </div>
                                            <p className="text-sm text-gray-200 leading-relaxed">
                                                Uses Natural Language Processing to scan news headlines and social buzz, detecting positive shifts in retail and institutional sentiment before they hit the tape.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                                            <span className="font-bold text-white text-sm uppercase tracking-wider">Smart Discovery Multiplier (25%)</span>
                                        </div>
                                        <p className="text-sm text-gray-100 leading-relaxed">
                                            The "secret sauce". Alpha Hunter proactively hunts for **Unusual Options Flow** (Aggressive Call buying), **Volume Breakouts** (3x avg volume), and **Breaking News** volatility. Stocks found via discovery receive a scoring bonus.
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-8 flex justify-end">
                                    <button
                                        onClick={() => setShowLogic(false)}
                                        className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-xl border border-gray-700 transition-all font-bold text-sm"
                                    >
                                        I Understand
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
