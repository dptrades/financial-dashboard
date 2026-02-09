"use client";

import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import ConvictionCard from '../../components/ConvictionCard';
import { ConvictionStock } from '../../lib/conviction';
import { useSearchParams } from 'next/navigation';
import { Loader2, RefreshCw } from 'lucide-react';

export default function ConvictionPage() {
    // Sidebar Props (Standardized)
    const [market, setMarket] = useState<'stocks' | 'crypto'>('stocks');
    const [symbol, setSymbol] = useState('BTC');
    const [stockInput, setStockInput] = useState('NVDA');
    const [stats, setStats] = useState(null);

    const [stocks, setStocks] = useState<ConvictionStock[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchConviction = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/conviction');
            if (!res.ok) throw new Error('Failed to fetch data');

            const data = await res.json();
            if (Array.isArray(data)) {
                setStocks(data);
                if (data.length === 0) setError('No results found. API might be rate-limited or returning empty data.');
            } else {
                setError('Invalid data format received from API.');
            }
        } catch (e) {
            console.error("Failed to fetch conviction", e);
            setError('Failed to scan market. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConviction();
    }, []);

    return (
        <div className="flex h-screen bg-gray-900 text-white font-sans overflow-hidden">
            <Sidebar
                currentPage="conviction"
                market={market} setMarket={setMarket}
                symbol={symbol} setSymbol={setSymbol}
                stockInput={stockInput} setStockInput={setStockInput}
                // No-op props for sidebar internal logic
                debouncedStock={stockInput} setDebouncedStock={() => { }}
                interval="1d" setInterval={() => { }}
                data={[]} loading={false} stats={null} sentimentScore={50}
            />

            <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                <header className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                            Alpha Hunter
                        </h1>
                        <p className="text-gray-400 mt-2 max-w-2xl">
                            Multi-factor scoring engine identifying high-probability setups.
                            Combines <span className="text-blue-400">Technicals</span>, <span className="text-green-400">Fundamentals</span>, <span className="text-yellow-400">Analyst Ratings</span>, and <span className="text-purple-400">Social Sentiment</span>.
                        </p>
                    </div>

                    <button
                        onClick={fetchConviction}
                        disabled={loading}
                        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg border border-gray-700 transition-all text-sm font-medium disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Scan Market
                    </button>
                </header>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6 flex items-center gap-2">
                        <span className="font-bold">Error:</span> {error}
                    </div>
                )}

                {stocks.length > 0 && stocks[0].isMock && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-3 rounded-lg mb-6 flex items-center gap-2 text-sm">
                        ⚠️ <span className="font-bold">Demo Mode:</span> Live API limit reached. Showing historical example data.
                    </div>
                )}

                {loading && stocks.length === 0 ? (
                    <div className="h-96 flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                        <p className="text-gray-500 animate-pulse">Crunching billions of data points...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                        {stocks.map((stock) => (
                            <ConvictionCard key={stock.symbol} stock={stock} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
