"use client";

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchOHLCV } from '../lib/api';
import { fetchStockNews, fetchSocialSentiment, fetchAnalystRatings, NewsItem } from '../lib/news';
import { OHLCVData, IndicatorData } from '../types/financial';
import { calculateIndicators } from '../lib/indicators';
import { calculatePriceStats, PriceStats } from '../lib/stats';
import { generateTechnicalSummary } from '../lib/ai-summary';
import { detectPatterns } from '../lib/patterns';
import PriceChart from '../components/PriceChart';
import Sidebar from '../components/Sidebar';
import HeaderSentiment from '../components/HeaderSentiment';
import HeaderSignals from '../components/HeaderSignals';
import HeaderPattern from '../components/HeaderPattern';
import HeaderAnalyst from '../components/HeaderAnalyst';
import AISummaryCard from '../components/AISummaryCard';
import NewsFeed from '../components/NewsFeed';
import LivePriceDisplay from '../components/LivePriceDisplay';
import { Loading } from '@/components/ui/Loading';
import { ErrorMessage } from '@/components/ui/ErrorMessage';

export default function Dashboard() {
  const searchParams = useSearchParams();
  const urlSymbol = searchParams.get('symbol');
  const urlMarket = searchParams.get('market') as 'crypto' | 'stocks' | null;

  const [data, setData] = useState<IndicatorData[]>([]);
  const [companyName, setCompanyName] = useState<string>('');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [analystData, setAnalystData] = useState<NewsItem[]>([]);
  const [stats, setStats] = useState<PriceStats | null>(null);
  const [market, setMarket] = useState<'crypto' | 'stocks'>('stocks');
  const [symbol, setSymbol] = useState('SPY');
  const [stockInput, setStockInput] = useState('AAPL');
  const [debouncedStock, setDebouncedStock] = useState('AAPL');

  const [interval, setIntervalState] = useState('1d'); // 15m, 1h, 4h, 1d
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Viewport (number of bars)
  const [viewScope, setViewScope] = useState(365);

  // Derived Summary & Sentiment
  const aiSummary = useMemo(() => {
    if (data.length === 0) return '';
    return generateTechnicalSummary(data, market === 'crypto' ? symbol : debouncedStock);
  }, [data, symbol, debouncedStock, market]);

  const sentimentScore = useMemo(() => {
    if (!news.length) return 50;
    let score = 50;
    news.forEach(n => {
      if (n.sentiment === 'positive') score += 10;
      if (n.sentiment === 'negative') score -= 10;
    });
    return Math.max(0, Math.min(100, score));
  }, [news]);

  // Effect to handle URL params
  useEffect(() => {
    if (urlSymbol) {
      setSymbol(urlSymbol);
      if (urlMarket) setMarket(urlMarket);
      // Also update the stockInput to match so it doesn't look weird
      setStockInput(urlSymbol);
      setDebouncedStock(urlSymbol);
      // Force loading state reset to ensure UI feedback
      setLoading(true);
    }
  }, [urlSymbol, urlMarket]);

  // Debounce stock input (only if user is typing, not if URL changed)
  useEffect(() => {
    const handler = setTimeout(() => {
      if (stockInput.trim() && stockInput !== symbol) {
        setDebouncedStock(stockInput.trim());
      }
    }, 800);

    return () => {
      clearTimeout(handler);
    };
  }, [stockInput, symbol]);

  // Load Data
  useEffect(() => {
    let ignore = false;

    const loadData = async () => {
      setLoading(true);
      setError('');

      const targetSymbol = market === 'crypto' ? symbol : debouncedStock;

      if (!targetSymbol) {
        setLoading(false);
        return;
      }

      try {
        // Fetch OHLCV
        const response = await fetchOHLCV(targetSymbol, '1825', market, interval);
        const rawData = response.data;

        if (ignore) return;

        // Set company name
        setCompanyName(response.companyName || targetSymbol);

        if (!rawData || rawData.length === 0) {
          setError('Failed to load data. Invalid symbol or API error.');
          setData([]);
          setStats(null);
        } else {
          const withIndicators = calculateIndicators(rawData);
          const withPatterns = detectPatterns(withIndicators); // Detect patterns
          const computedStats = calculatePriceStats(rawData);

          setData(withPatterns); // Set data with patterns
          setStats(computedStats);

          // Determine simplistic trend for news generation
          const latest = withPatterns[withPatterns.length - 1]; // Use withPatterns
          let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';

          if (latest.ema50 && latest.close > latest.ema50) {
            trend = 'bullish';
          } else if (latest.ema50 && latest.close < latest.ema50) {
            trend = 'bearish';
          }

          // Neutralize if RSI is extreme (reversal warning)
          if (latest.rsi14) {
            if (latest.rsi14 > 70 && trend === 'bullish') trend = 'neutral'; // Overbought
            if (latest.rsi14 < 30 && trend === 'bearish') trend = 'neutral'; // Oversold
          }

          // Fetch News & Social & Analyst Concurrent
          const [newsItems, socialItems, analystItems] = await Promise.all([
            fetchStockNews(targetSymbol, trend),
            fetchSocialSentiment(targetSymbol),
            fetchAnalystRatings(targetSymbol)
          ]);

          if (!ignore) {
            setNews([...newsItems, ...socialItems].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()));
            setAnalystData(analystItems);
          }
        }
      } catch (err) {
        if (!ignore) {
          setError('An unexpected error occurred.');
          setData([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadData();

    // 60s Auto-Refresh
    const timer = setInterval(() => {
      // Only refresh if tab is visible (optional optimization, but good practice)
      if (!document.hidden && !ignore) {
        console.log('Auto-refreshing chart data...');
        loadData();
      }
    }, 60000);

    return () => {
      ignore = true;
      clearInterval(timer);
    };
  }, [symbol, debouncedStock, market, interval]);

  const chartData = data.slice(-viewScope);

  // Dynamic View Scope Buttons
  const renderViewControls = () => {
    if (interval === '1d') {
      return (
        <div className="flex space-x-2">
          <button onClick={() => setViewScope(90)} className={`px-3 py-1 text-xs rounded-full border ${viewScope === 90 ? 'bg-gray-700 text-white border-gray-500' : 'text-gray-400 border-gray-700 hover:border-gray-500'}`}>3M</button>
          <button onClick={() => setViewScope(365)} className={`px-3 py-1 text-xs rounded-full border ${viewScope === 365 ? 'bg-gray-700 text-white border-gray-500' : 'text-gray-400 border-gray-700 hover:border-gray-500'}`}>1Y</button>
          <button onClick={() => setViewScope(1825)} className={`px-3 py-1 text-xs rounded-full border ${viewScope === 1825 ? 'bg-gray-700 text-white border-gray-500' : 'text-gray-400 border-gray-700 hover:border-gray-500'}`}>5Y</button>
        </div>
      );
    }
    const setBars = (label: string, bars: number) => (
      <button key={label} onClick={() => setViewScope(bars)} className={`px-3 py-1 text-xs rounded-full border ${viewScope === bars ? 'bg-gray-700 text-white border-gray-500' : 'text-gray-400 border-gray-700 hover:border-gray-500'}`}>{label}</button>
    );

    if (interval === '15m') return <div className="flex space-x-2">{[setBars('1D', 96), setBars('3D', 288), setBars('1W', 672)]}</div>;
    if (interval === '1h') return <div className="flex space-x-2">{[setBars('3D', 72), setBars('1W', 168), setBars('1M', 720)]}</div>;
    return <div className="flex space-x-2">{[setBars('Short', 100), setBars('Med', 300), setBars('Long', 600)]}</div>;
  };

  // Determine Trend for Analyst Widget Display
  const latest = data[data.length - 1];
  let currentTrend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (latest && latest.ema50) {
    if (latest.close > latest.ema50) currentTrend = 'bullish';
    else if (latest.close < latest.ema50) currentTrend = 'bearish';
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans">
      <Sidebar
        market={market}
        setMarket={setMarket}
        symbol={symbol}
        setSymbol={setSymbol}
        stockInput={stockInput}
        setStockInput={setStockInput}
        debouncedStock={debouncedStock}
        setDebouncedStock={setDebouncedStock}
        interval={interval}
        setInterval={(i) => { setIntervalState(i); setViewScope(i === '1d' ? 365 : 100); }}
        data={data}
        loading={loading}
        currentPage="dashboard"
        stats={stats}
        sentimentScore={sentimentScore}
      />

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 flex flex-col overflow-y-auto w-full pt-16 md:pt-6"> {/* Added pt-16 for mobile toggle space */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-2 md:gap-6 w-full">
            <div>
              {/* Editable Ticker Input */}
              <div className="flex items-center gap-2">
                {market === 'crypto' ? (
                  <select
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="text-2xl md:text-3xl font-bold bg-transparent border-b-2 border-blue-500 focus:outline-none focus:border-blue-400 text-white py-1 tracking-tight"
                    disabled={loading}
                  >
                    <option value="BTC" className="bg-gray-900">BTC / USD</option>
                    <option value="ETH" className="bg-gray-900">ETH / USD</option>
                    <option value="SOL" className="bg-gray-900">SOL / USD</option>
                  </select>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={stockInput}
                      onChange={(e) => setStockInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && stockInput.trim()) {
                          setDebouncedStock(stockInput.trim());
                        }
                      }}
                      className="text-2xl md:text-3xl font-bold bg-transparent border-b-2 border-blue-500 focus:outline-none focus:border-blue-400 text-white py-1 tracking-tight uppercase w-32 md:w-40"
                      placeholder="TICKER"
                      disabled={loading}
                    />
                    <button
                      onClick={() => stockInput.trim() && setDebouncedStock(stockInput.trim())}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-300 transition-colors"
                      disabled={loading}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                  </div>
                )}
                {/* Market Toggle Pills */}
                <div className="flex bg-gray-800 rounded-full p-0.5 border border-gray-700">
                  <button
                    onClick={() => setMarket('stocks')}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${market === 'stocks' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    Stocks
                  </button>
                  <button
                    onClick={() => setMarket('crypto')}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${market === 'crypto' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    Crypto
                  </button>
                </div>
              </div>
              {/* Company Name */}
              {companyName && companyName !== debouncedStock && market === 'stocks' && (
                <p className="text-sm text-gray-400 mt-0.5 truncate max-w-[250px]">{companyName}</p>
              )}
              {/* Live Price Display */}
              <div className="mt-1">
                {market === 'stocks' ? (
                  <LivePriceDisplay
                    symbol={debouncedStock}
                    fallbackPrice={stats?.currentPrice}
                    enabled={!loading}
                  />
                ) : (
                  <p className="text-sm text-gray-400">
                    {loading ? 'Fetching live data...' : `Last Price: $${stats?.currentPrice?.toFixed(2) || '0.00'}`}
                  </p>
                )}
              </div>
            </div>

            {/* Header Sentiment Widget */}
            <div className="mb-1 flex flex-wrap gap-2 md:gap-3">
              <HeaderSentiment score={sentimentScore} />
              {data.length > 0 && <HeaderSignals latestData={data[data.length - 1]} />}
              {data.length > 0 && <HeaderPattern latestData={data[data.length - 1]} />}
              {data.length > 0 && <HeaderAnalyst symbol={market === 'crypto' ? symbol : debouncedStock} analystNews={analystData} />}
            </div>
          </div>

          <div className="w-full md:w-auto">
            {renderViewControls()}
          </div>
        </header>

        {/* AI Insight Card */}
        <AISummaryCard symbol={market === 'crypto' ? symbol : debouncedStock} summary={aiSummary} loading={loading} />

        <div className="flex-none h-[350px] md:h-[500px] bg-gray-800 rounded-xl p-1 relative shadow-xl overflow-hidden border border-gray-700 mt-4">
          {loading && (
            <div className="absolute inset-0 z-20 bg-gray-900 bg-opacity-70 backdrop-blur-sm flex items-center justify-center">
              <Loading message="Crunching numbers..." />
            </div>
          )}

          {error && !loading ? (
            <div className="absolute inset-0 flex items-center justify-center z-10 p-4">
              <ErrorMessage
                title="Unable to Fetch Data"
                message={error}
                onRetry={() => window.location.reload()}
              />
            </div>
          ) : (
            !loading && data.length > 0 && <PriceChart data={chartData} />
          )}
        </div>

        {/* News Feed */}
        <NewsFeed news={news} loading={loading} />

        <div className="h-6"></div> {/* Bottom Spacer */}
      </main>
    </div>
  );
}
