import React from 'react';
import { ScannedStock } from '@/lib/scanner';
import { TrendingUp, TrendingDown, Activity, DollarSign, BarChart3 } from 'lucide-react';

interface MarketInternalsProps {
    data: ScannedStock[];
}

export default function MarketInternals({ data }: MarketInternalsProps) {
    // 1. Extract Internals
    const vix = data.find(s => s.symbol === '^VIX');
    const dxy = data.find(s => s.symbol === 'DX-Y.NYB');

    // 2. Calculate Breadth (Excluding Internals)
    const marketStocks = data.filter(s => s.sector !== 'Internals' && s.sector !== 'Forex' && s.sector !== 'Bonds');

    if (marketStocks.length === 0) return null;

    const advancers = marketStocks.filter(s => s.change24h > 0).length;
    const decliners = marketStocks.filter(s => s.change24h < 0).length;
    const advDecRatio = decliners === 0 ? advancers : advancers / decliners;

    const bullishTrend = marketStocks.filter(s => s.price > (s.price * 0.95 /* approximating EMA200 check if not avail, but we have trend field */)).length;
    // Actually ScannedStock has 'trend' field: 'BULLISH' | 'BEARISH'
    const bullCount = marketStocks.filter(s => s.trend === 'BULLISH').length;
    const bullPercent = data.length > 0 ? (bullCount / marketStocks.length) * 100 : 0;

    const strongMomentum = marketStocks.filter(s => s.rsi > 55).length;
    const momentumPercent = data.length > 0 ? (strongMomentum / marketStocks.length) * 100 : 0;

    // Helper for cards
    const Card = ({ title, value, subValue, icon: Icon, color }: any) => (
        <div className={`bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center justify-between shadow-lg ${color ? 'border-l-4 ' + color : ''}`}>
            <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider font-bold">{title}</p>
                <h4 className="text-2xl font-bold text-white mt-1">{value}</h4>
                <p className="text-sm text-gray-500 mt-1">{subValue}</p>
            </div>
            <div className="p-3 bg-gray-700 rounded-full opacity-80">
                <Icon className="w-6 h-6 text-gray-300" />
            </div>
        </div>
    );

    return (
        <div className="mt-8 border-t border-gray-800 pt-8">
            <h3 className="text-xl font-bold text-purple-400 mb-6 flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Market Internals
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* VIX */}
                <Card
                    title="Volatility (VIX)"
                    value={vix ? vix.price.toFixed(2) : 'N/A'}
                    subValue={vix ? `${vix.change24h > 0 ? '+' : ''}${vix.change24h.toFixed(2)}%` : '-'}
                    icon={Activity}
                    color={vix && vix.price > 20 ? 'border-red-500' : 'border-green-500'}
                />

                {/* DXY */}
                <Card
                    title="Dollar Index (DXY)"
                    value={dxy ? dxy.price.toFixed(2) : 'N/A'}
                    subValue={dxy ? `${dxy.change24h > 0 ? '+' : ''}${dxy.change24h.toFixed(2)}%` : '-'}
                    icon={DollarSign}
                    color="border-blue-500"
                />

                {/* Breadth A/D */}
                <Card
                    title="Advance / Decline"
                    value={`${advancers} / ${decliners}`}
                    subValue={`Ratio: ${advDecRatio.toFixed(2)}`}
                    icon={BarChart3}
                    color={advancers > decliners ? 'border-green-500' : 'border-red-500'}
                />

                {/* Sentiment */}
                <Card
                    title="Bullish Sentiment"
                    value={`${bullPercent.toFixed(0)}%`}
                    subValue={`${bullCount} of ${marketStocks.length} Assets in Uptrend`}
                    icon={bullPercent > 50 ? TrendingUp : TrendingDown}
                    color={bullPercent > 50 ? 'border-green-500' : 'border-red-500'}
                />

            </div>
        </div>
    );
}
