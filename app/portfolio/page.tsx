'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Activity,
    Play,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Clock
} from 'lucide-react';

interface Position {
    symbol: string;
    qty: number;
    avgPrice: number;
    currentPrice: number;
    marketValue: number;
    unrealizedPL: number;
    unrealizedPLPercent: number;
}

interface Order {
    id: string;
    symbol: string;
    side: 'buy' | 'sell';
    qty: number;
    status: string;
    filledPrice: number | null;
    createdAt: string;
}

interface PortfolioData {
    account: {
        equity: number;
        buyingPower: number;
        cash: number;
        portfolioValue: number;
    };
    positions: Position[];
    recentOrders: Order[];
}

interface TradeResult {
    symbol: string;
    status: string;
    orderId?: string;
    qty?: number;
    estimatedCost?: number;
    reason?: string;
}

import LoginOverlay from '../../components/LoginOverlay';

export default function PortfolioPage() {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
    const [loading, setLoading] = useState(true);
    const [executing, setExecuting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tradeResults, setTradeResults] = useState<TradeResult[] | null>(null);

    useEffect(() => {
        const checkSession = async () => {
            try {
                const res = await fetch('/api/auth/session');
                setIsAuthenticated(res.ok);
            } catch (e) {
                setIsAuthenticated(false);
            }
        };
        checkSession();
    }, []);

    const fetchPortfolio = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/auto-trade');
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to fetch portfolio');
            }
            const data = await response.json();
            setPortfolio(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to fetch portfolio');
        } finally {
            setLoading(false);
        }
    }, []);

    const executeTrades = async () => {
        setExecuting(true);
        setTradeResults(null);
        setError(null);
        try {
            const response = await fetch('/api/auto-trade', {
                method: 'POST'
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to execute trades');
            }

            if (data.trades) {
                setTradeResults(data.trades);
            }

            // Refresh portfolio after trades
            await fetchPortfolio();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to execute trades');
        } finally {
            setExecuting(false);
        }
    };

    useEffect(() => {
        fetchPortfolio();
    }, [fetchPortfolio]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(value);
    };

    const formatPercent = (value: number) => {
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value.toFixed(2)}%`;
    };

    const handleReset = async () => {
        if (!confirm('Are you sure? This will close all positions and cancel all orders.')) return;

        setLoading(true);
        try {
            const response = await fetch('/api/admin/reset-portfolio', { method: 'POST' });
            if (!response.ok) throw new Error('Reset failed');

            // Refresh after reset
            await fetchPortfolio();
        } catch (e) {
            setError('Failed to reset portfolio');
        } finally {
            setLoading(false);
        }
    };

    const handleTestEmail = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/test-email', { method: 'POST' });
            const data = await response.json();

            if (data.success) {
                alert('Test email sent! Check your inbox.');
            } else {
                setError(data.error || 'Failed to send test email');
            }
        } catch (e) {
            setError('Failed to trigger test email');
        } finally {
            setLoading(false);
        }
    };

    if (isAuthenticated === null) return null;

    if (!isAuthenticated) {
        return <LoginOverlay onLoginSuccess={() => setIsAuthenticated(true)} />;
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Header */}
            <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-gray-200 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold">Paper Trading Portfolio</h1>
                            <p className="text-sm text-gray-200">Automated trades via Alpaca</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleTestEmail}
                            disabled={loading || executing}
                            className="px-3 py-2 text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                        >
                            Test Email
                        </button>
                        <button
                            onClick={handleReset}
                            disabled={loading || executing}
                            className="px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                            Reset Portfolio
                        </button>
                        <button
                            onClick={fetchPortfolio}
                            disabled={loading}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        <button
                            onClick={executeTrades}
                            disabled={executing || loading}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-semibold transition-colors disabled:opacity-50"
                        >
                            <Play className="w-4 h-4" />
                            {executing ? 'Executing...' : 'Execute Trades'}
                        </button>
                    </div>
                </div>
            </header>

            <main className="p-6">
                {/* ... (Error and Trade Results sections same as before) ... */}
                {/* Error Banner */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <span className="text-red-400">{error}</span>
                    </div>
                )}

                {/* Trade Results */}
                {tradeResults && (
                    <div className="mb-6 p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            Trade Execution Results
                        </h3>
                        <div className="space-y-2">
                            {tradeResults.map((result, i) => (
                                <div key={i} className="flex items-center gap-3 text-sm">
                                    {result.status === 'submitted' ? (
                                        <CheckCircle className="w-4 h-4 text-green-400" />
                                    ) : result.status === 'skipped' ? (
                                        <Clock className="w-4 h-4 text-yellow-400" />
                                    ) : (
                                        <XCircle className="w-4 h-4 text-red-400" />
                                    )}
                                    <span className="font-medium">{result.symbol}</span>
                                    <span className="text-gray-200">
                                        {result.status === 'submitted'
                                            ? `${result.qty} shares @ ~${formatCurrency(result.estimatedCost! / result.qty!)}`
                                            : result.reason}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {loading && !portfolio ? (
                    <div className="flex items-center justify-center h-64">
                        <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
                    </div>
                ) : portfolio ? (
                    <>
                        {/* Account Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                                <div className="flex items-center gap-2 text-gray-200 mb-1">
                                    <DollarSign className="w-4 h-4" />
                                    <span className="text-sm">Portfolio Value</span>
                                </div>
                                <div className="text-2xl font-bold">
                                    {formatCurrency(portfolio.account.portfolioValue)}
                                </div>
                            </div>
                            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                                <div className="flex items-center gap-2 text-gray-200 mb-1">
                                    <Activity className="w-4 h-4" />
                                    <span className="text-sm">Equity</span>
                                </div>
                                <div className="text-2xl font-bold">
                                    {formatCurrency(portfolio.account.equity)}
                                </div>
                            </div>
                            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                                <div className="flex items-center gap-2 text-gray-200 mb-1">
                                    <TrendingUp className="w-4 h-4" />
                                    <span className="text-sm">Buying Power</span>
                                </div>
                                <div className="text-2xl font-bold text-green-400">
                                    {formatCurrency(portfolio.account.buyingPower)}
                                </div>
                            </div>
                            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                                <div className="flex items-center gap-2 text-gray-200 mb-1">
                                    <DollarSign className="w-4 h-4" />
                                    <span className="text-sm">Cash</span>
                                </div>
                                <div className="text-2xl font-bold">
                                    {formatCurrency(portfolio.account.cash)}
                                </div>
                            </div>
                        </div>

                        {/* Positions */}
                        <div className="bg-gray-800 rounded-lg border border-gray-700 mb-6">
                            <div className="p-4 border-b border-gray-700">
                                <h2 className="text-lg font-semibold">Open Positions ({portfolio.positions.length})</h2>
                            </div>
                            {portfolio.positions.length === 0 ? (
                                <div className="p-8 text-center text-gray-200">
                                    No open positions. Click "Execute Trades" to start.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-700/50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-200 uppercase">Symbol</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-200 uppercase">Qty</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-200 uppercase">Avg Price</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-200 uppercase">Current</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-200 uppercase">Market Value</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-200 uppercase">P&L</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-200 uppercase">P&L %</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700">
                                            {portfolio.positions.map((pos) => (
                                                <tr key={pos.symbol} className="hover:bg-gray-700/30">
                                                    <td className="px-4 py-3 font-semibold">{pos.symbol}</td>
                                                    <td className="px-4 py-3 text-right">{pos.qty}</td>
                                                    <td className="px-4 py-3 text-right">{formatCurrency(pos.avgPrice)}</td>
                                                    <td className="px-4 py-3 text-right">{formatCurrency(pos.currentPrice)}</td>
                                                    <td className="px-4 py-3 text-right">{formatCurrency(pos.marketValue)}</td>
                                                    <td className={`px-4 py-3 text-right font-medium ${pos.unrealizedPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {formatCurrency(pos.unrealizedPL)}
                                                    </td>
                                                    <td className={`px-4 py-3 text-right font-medium ${pos.unrealizedPLPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {formatPercent(pos.unrealizedPLPercent)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Recent Orders */}
                        <div className="bg-gray-800 rounded-lg border border-gray-700">
                            <div className="p-4 border-b border-gray-700">
                                <h2 className="text-lg font-semibold">Recent Orders</h2>
                            </div>
                            {portfolio.recentOrders.length === 0 ? (
                                <div className="p-8 text-center text-gray-200">
                                    No orders yet.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-700/50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-200 uppercase">Symbol</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-200 uppercase">Side</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-200 uppercase">Qty</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-200 uppercase">Status</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-200 uppercase">Filled Price</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-200 uppercase">Time</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700">
                                            {portfolio.recentOrders.map((order) => (
                                                <tr key={order.id} className="hover:bg-gray-700/30">
                                                    <td className="px-4 py-3 font-semibold">{order.symbol}</td>
                                                    <td className={`px-4 py-3 ${order.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                                                        {order.side.toUpperCase()}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">{order.qty}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${order.status === 'filled' ? 'bg-green-500/20 text-green-400' :
                                                            order.status === 'canceled' ? 'bg-red-500/20 text-red-400' :
                                                                order.status === 'new' ? 'bg-blue-500/20 text-blue-400' :
                                                                    'bg-gray-500/20 text-gray-200'
                                                            }`}>
                                                            {order.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {order.filledPrice ? formatCurrency(order.filledPrice) : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-200">
                                                        {new Date(order.createdAt).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Trade Settings Info */}
                        <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                            <h3 className="font-semibold mb-2">Trade Settings</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-200">Position Size:</span>
                                    <span className="ml-2 font-medium">$250</span>
                                </div>
                                <div>
                                    <span className="text-gray-200">Stop Loss:</span>
                                    <span className="ml-2 font-medium text-red-400">-10%</span>
                                </div>
                                <div>
                                    <span className="text-gray-200">Take Profit:</span>
                                    <span className="ml-2 font-medium text-green-400">+25%</span>
                                </div>
                                <div>
                                    <span className="text-gray-200">Max Positions:</span>
                                    <span className="ml-2 font-medium">4</span>
                                </div>
                            </div>
                        </div>
                    </>
                ) : null}
            </main>
        </div>
    );
}
