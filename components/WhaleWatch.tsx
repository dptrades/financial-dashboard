import React, { useState, useEffect } from 'react';
import { Anchor, Activity, TrendingUp, TrendingDown } from 'lucide-react';

interface WhaleAlert {
    type: 'CALL' | 'PUT';
    strike: number;
    expiry: string;
    volume: number;
    oi: number;
    ratio: number;
    notional: number;
    sentiment: 'BULLISH' | 'BEARISH';
    reason: string;
}

interface WhaleWatchProps {
    symbol: string;
}

export default function WhaleWatch({ symbol }: WhaleWatchProps) {
    const [alerts, setAlerts] = useState<WhaleAlert[]>([]);
    const [spotPrice, setSpotPrice] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchAlerts = async () => {
            if (!symbol) return;
            setLoading(true);
            try {
                const res = await fetch(`/api/options-flow?symbol=${symbol}`);
                const data = await res.json();
                if (data.alerts) {
                    setAlerts(data.alerts);
                    setSpotPrice(data.price);
                }
            } catch (e) {
                console.error("Failed to load whale alerts", e);
            } finally {
                setLoading(false);
            }
        };

        fetchAlerts();
        const interval = setInterval(fetchAlerts, 60000);
        return () => clearInterval(interval);
    }, [symbol]);

    return (
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <Anchor className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Whale Watch</span>
                    </div>
                    {spotPrice && (
                        <span className="text-[10px] text-gray-500 mt-0.5">
                            Spot: <span className="text-white font-mono">${spotPrice.toFixed(2)}</span>
                        </span>
                    )}
                </div>
                {loading && <Activity className="w-3 h-3 text-gray-500 animate-spin" />}
            </div>

            <div className="space-y-2">
                {alerts.length === 0 && !loading ? (
                    <div className="text-center py-4">
                        <span className="text-[10px] text-gray-500">No unusual activity.</span>
                    </div>
                ) : (
                    alerts.map((alert, i) => (
                        <div key={i} className="flex flex-col bg-gray-900/50 p-2 rounded border border-gray-800">
                            {/* Top Row: Strike & Type */}
                            <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold px-1.5 rounded ${alert.type === 'CALL' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                                        {alert.type}
                                    </span>
                                    <span className="text-sm font-mono font-bold text-white">
                                        ${alert.strike}
                                    </span>
                                </div>
                                <span className="text-[10px] text-gray-400">
                                    Exp: <span className="text-gray-300">{new Date(alert.expiry).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })}</span>
                                </span>
                            </div>

                            {/* Middle Row: Reason */}
                            <div className="flex items-center gap-1 mb-2">
                                <span className="text-[9px] uppercase tracking-wide text-gray-500 font-semibold">
                                    {alert.reason}
                                </span>
                            </div>

                            {/* Bottom Row: Stats */}
                            <div className="grid grid-cols-3 gap-1 pt-2 border-t border-gray-800">
                                <div className="flex flex-col">
                                    <span className="text-[9px] text-gray-500">Vol</span>
                                    <span className="text-[10px] font-mono text-gray-300">{alert.volume.toLocaleString()}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] text-gray-500">OI</span>
                                    <span className="text-[10px] font-mono text-gray-300">{alert.oi.toLocaleString()}</span>
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="text-[9px] text-gray-500">Prem</span>
                                    <span className="text-[10px] font-mono text-purple-300">${(alert.notional / 1000).toFixed(0)}k</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
