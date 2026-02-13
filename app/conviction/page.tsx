"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import ConvictionCard from '../../components/ConvictionCard';
import type { ConvictionStock } from '../../types/stock';
import { Loader2, RefreshCw } from 'lucide-react';
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

    const [stocks, setStocks] = useState<ConvictionStock[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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
                // No-op props for sidebar internal logic
                debouncedStock={stockInput} setDebouncedStock={() => { }}
                interval="1d" setInterval={() => { }}
                data={[]} loading={false} stats={null} sentimentScore={50}
                onSectorClick={() => { }}
            />

            <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                <header className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                            Alpha Hunter
                        </h1>
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
            </main>
        </div>
    );
}
