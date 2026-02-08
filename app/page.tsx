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

export default function Dashboard() {
  const searchParams = useSearchParams();
  const urlSymbol = searchParams.get('symbol');
  const urlMarket = searchParams.get('market') as 'crypto' | 'stocks' | null;

  const [data, setData] = useState<IndicatorData[]>([]);
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
        const rawData = await fetchOHLCV(targetSymbol, '1825', market, interval);

        if (ignore) return;

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
      <main className="flex-1 p-6 flex flex-col overflow-y-auto">
        <header className="flex justify-between items-end mb-6">
          <div className="flex items-end gap-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                {market === 'crypto' ? `${symbol} / USD` : debouncedStock}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                {loading ? 'Fetching live data...' : `Last Close: $${stats?.currentPrice?.toFixed(2) || '0.00'}`}
              </p>
            </div>

            {/* Header Sentiment Widget */}
            <div className="mb-1 flex gap-3">
              <HeaderSentiment score={sentimentScore} />
              {data.length > 0 && <HeaderSignals latestData={data[data.length - 1]} />}
              {data.length > 0 && <HeaderPattern latestData={data[data.length - 1]} />}
              {data.length > 0 && <HeaderAnalyst symbol={market === 'crypto' ? symbol : debouncedStock} analystNews={analystData} />}
            </div>
          </div>

          {renderViewControls()}
        </header>

        {/* AI Insight Card */}
        <AISummaryCard symbol={market === 'crypto' ? symbol : debouncedStock} summary={aiSummary} loading={loading} />

        <div className="flex-none h-[500px] bg-gray-800 rounded-xl p-1 relative shadow-xl overflow-hidden border border-gray-700 mt-4">
          {loading && (
            <div className="absolute inset-0 z-20 bg-gray-900 bg-opacity-70 backdrop-blur-sm flex items-center justify-center">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                <span className="text-blue-400 font-medium">Crunching Numbers...</span>
              </div>
            </div>
          )}

          {error && !loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-red-400 bg-gray-900 bg-opacity-90 z-10">
              <div className="text-center p-6 bg-gray-800 rounded-lg border border-red-900 shadow-2xl">
                <p className="font-bold mb-2 text-red-500">Unable to Fetch Data</p>
                <p className="text-sm text-gray-300">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-red-900 hover:bg-red-800 rounded text-sm transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            !loading && <PriceChart data={chartData} />
          )}
        </div>

        {/* News Feed */}
        <NewsFeed news={news} loading={loading} />

        <div className="h-6"></div> {/* Bottom Spacer */}
      </main>
    </div>
  );
}
