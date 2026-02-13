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
    ndx?: MarketData;
    dow?: MarketData;
    russell?: MarketData;
}

interface SectorGroup {
    name: string;
    avgChange: number;
    stocks: any[];
}

interface Props {
    onSectorClick: (sector: SectorGroup) => void;
}

const GICS_SECTORS = [
    'Communication Services',
    'Consumer Discretionary',
    'Consumer Staples',
    'Energy',
    'Financials',
    'Health Care',
    'Industrials',
    'Information Technology',
    'Materials',
    'Real Estate',
    'Utilities'
];

const normalizeSector = (sector: string): string => {
    const s = sector.toLowerCase().trim();
    if (s.includes('information technology') || s === 'technology') return 'Information Technology';
    if (s.includes('communication') || s.includes('services')) return 'Communication Services';
    if (s.includes('discretionary') || s.includes('cyclical')) return 'Consumer Discretionary';
    if (s.includes('staples') || s.includes('defensive')) return 'Consumer Staples';
    if (s.includes('health')) return 'Health Care';
    if (s.includes('financial') || s === 'finance') return 'Financials';
    if (s.includes('industrial')) return 'Industrials';
    if (s.includes('energy')) return 'Energy';
    if (s.includes('material')) return 'Materials';
    if (s.includes('real estate')) return 'Real Estate';
    if (s.includes('utilities')) return 'Utilities';
    return sector;
};

export default function SidebarInternals({ onSectorClick }: Props) {
    const [internals, setInternals] = useState<InternalsData | null>(null);
    const [sectors, setSectors] = useState<SectorGroup[]>([]);
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
                    // Update stocks with normalized sector
                    const normalizedData = data.map((s: any) => ({
                        ...s,
                        sector: normalizeSector(s.sector || 'Other')
                    }));

                    // 1. Breadth Logic
                    const marketStocks = normalizedData.filter((s: any) =>
                        GICS_SECTORS.includes(s.sector)
                    );

                    const advancers = marketStocks.filter((s: any) => s.change24h > 0).length;
                    const decliners = marketStocks.filter((s: any) => s.change24h < 0).length;

                    // Bullish Trend %
                    const bullCount = marketStocks.filter((s: any) => s.metrics?.trend === 'BULLISH').length;
                    const bullishPercent = marketStocks.length > 0 ? (bullCount / marketStocks.length) * 100 : 0;

                    setConvictionStats({ advancers, decliners, bullishPercent });

                    // 2. Sector Logic
                    const groups: Record<string, any[]> = {};
                    normalizedData.forEach(stock => {
                        const sector = stock.sector;
                        if (!GICS_SECTORS.includes(sector)) return;
                        if (!groups[sector]) groups[sector] = [];
                        groups[sector].push(stock);
                    });

                    const sectorList = GICS_SECTORS.map(name => {
                        const stocks = groups[name] || [];
                        const avgChange = stocks.length > 0
                            ? stocks.reduce((acc, s) => acc + s.change24h, 0) / stocks.length
                            : 0;
                        return { name, avgChange, stocks };
                    });

                    setSectors(sectorList);
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
        <div className="px-4 py-4 text-xs text-gray-300 animate-pulse text-center">
            Loading Pulse...
        </div>
    );

    const { vix, sp500, nasdaq, ndx, dow, russell } = internals;
    const stats = convictionStats || { advancers: 0, decliners: 0, bullishPercent: 50 };

    return (
        <div className="mt-auto border-t border-gray-800 p-4 space-y-4">
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-widest flex items-center mb-2 justify-between">
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
                    <span className="text-[10px] text-gray-200 block">VIX</span>
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
                    <span className="text-[10px] text-gray-200 block">Bullish %</span>
                    <span className={`text-sm font-bold ${stats.bullishPercent > 50 ? 'text-green-400' : 'text-red-400'}`}>
                        {stats.bullishPercent.toFixed(0)}%
                    </span>
                </div>
            </div>

            {/* Major Indices */}
            <div className="space-y-1">
                {[
                    { label: 'S&P 500', data: sp500 },
                    { label: 'Nasdaq 100', data: ndx },
                    { label: 'Nasdaq Comp', data: nasdaq },
                    { label: 'Dow Jones', data: dow },
                    { label: 'Russell 2000', data: russell },
                ].map((item) => item.data && (
                    <div key={item.label} className="flex justify-between items-center text-[11px] bg-gray-800/50 p-1.5 rounded">
                        <span className="text-gray-200">{item.label}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-white font-mono">{item.data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <span className={`${item.data.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {item.data.change >= 0 ? '+' : ''}{item.data.changePercent.toFixed(2)}%
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Breadth Bar */}
            <div className="bg-gray-800 p-2 rounded border border-gray-700">
                <div className="flex justify-between text-[10px] text-gray-200 mb-1">
                    <span className="text-green-400">▲ {stats.advancers}</span>
                    <span className="text-gray-300">Breadth</span>
                    <span className="text-red-400">▼ {stats.decliners}</span>
                </div>
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden flex">
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

            {/* Sector Performance (Stacked like Indexes) */}
            <div className="pt-2 border-t border-gray-800 space-y-1">
                <h4 className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-2">Sector Performance</h4>
                {sectors.length > 0 ? (
                    sectors.map((sector) => (
                        <button
                            key={sector.name}
                            onClick={() => onSectorClick(sector)}
                            className="w-full flex justify-between items-center text-[10px] bg-gray-900/40 hover:bg-gray-700/50 p-1.5 rounded border border-transparent hover:border-gray-700 transition-all text-left group"
                        >
                            <span className="text-gray-200 group-hover:text-gray-200">{sector.name}</span>
                            <span className={`font-mono font-bold ${sector.avgChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {sector.avgChange > 0 ? '+' : ''}{sector.avgChange.toFixed(2)}%
                            </span>
                        </button>
                    ))
                ) : (
                    <div className="text-[10px] text-gray-200 animate-pulse text-center py-2">Loading Sectors...</div>
                )}
            </div>

        </div>
    );
}
