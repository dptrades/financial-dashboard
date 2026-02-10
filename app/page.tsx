"use client";

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchOHLCV } from '../lib/api';
import { fetchStockNews, fetchSocialSentiment, fetchAnalystRatings, NewsItem } from '../lib/news';
import { OHLCVData, IndicatorData } from '../types/financial';
import { calculateIndicators } from '../lib/indicators';
import { calculatePriceStats, PriceStats } from '../lib/stats';

import { detectPatterns } from '../lib/patterns';
// import PriceChart from '../components/PriceChart'; // Removed
import Sidebar from '../components/Sidebar';
import HighlightStats from '../components/HighlightStats';
import WhaleWatch from '../components/WhaleWatch';
import OptionsSignal from '../components/OptionsSignal';
import DeepDiveContent from '../components/DeepDiveContent';
import { generateOptionSignal } from '../lib/options';
import HeaderSentiment from '../components/HeaderSentiment';
import HeaderSignals from '../components/HeaderSignals';
import HeaderPattern from '../components/HeaderPattern';
import HeaderAnalyst from '../components/HeaderAnalyst';

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

          // Fetch News & Analyst Concurrent
          const [newsItems, analystItems] = await Promise.all([
            fetchStockNews(targetSymbol, trend),
            fetchAnalystRatings(targetSymbol)
          ]);

          if (!ignore) {
            setNews(newsItems);
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

    return () => {
      ignore = true;
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

  // Calculate Options Signal for Dashboard Widget
  let optionsSignal = null;
  if (latest && stats && latest.atr14) {
    optionsSignal = generateOptionSignal(latest.close, latest.atr14, currentTrend, latest.rsi14 || 50, latest.ema50, latest);
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
      <main className="flex-1 p-4 md:p-6 flex flex-col overflow-y-auto w-full pt-16 md:pt-6">
        <header className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* LEFT: Ticker, Price, Sentiment */}
            <div className="flex flex-wrap items-center gap-4 md:gap-8 w-full md:w-auto">
              {/* 1. Ticker Selector */}
              <div className="flex items-center gap-2">
                {market === 'crypto' ? (
                  <select
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="text-3xl md:text-4xl font-black bg-transparent border-none focus:outline-none text-white tracking-tighter"
                    disabled={loading}
                  >
                    <option value="BTC" className="bg-gray-900">BTC</option>
                    <option value="ETH" className="bg-gray-900">ETH</option>
                    <option value="SOL" className="bg-gray-900">SOL</option>
                  </select>
                ) : (
                  <div className="relative group">
                    <input
                      type="text"
                      value={stockInput}
                      onChange={(e) => setStockInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && stockInput.trim()) {
                          setDebouncedStock(stockInput.trim());
                        }
                      }}
                      className="text-3xl md:text-4xl font-black bg-transparent border-none focus:outline-none text-white tracking-tighter uppercase w-32 md:w-48 placeholder-gray-700"
                      placeholder="TICKER"
                      disabled={loading}
                    />
                    <div className="absolute bottom-0 left-0 w-0 h-1 bg-blue-500 transition-all group-hover:w-full"></div>
                  </div>
                )}
              </div>
              {companyName && market === 'stocks' && (
                <span className="text-sm text-gray-400 font-medium hidden md:inline truncate max-w-[180px]">{companyName}</span>
              )}

              {/* 2. Price & Change Info */}
              <div className="flex flex-col">
                {market === 'stocks' ? (
                  <LivePriceDisplay
                    symbol={debouncedStock}
                    fallbackPrice={stats?.currentPrice}
                    enabled={!loading}
                    showChange={true}
                  />
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                      ${stats?.currentPrice?.toLocaleString() || '---'}
                    </span>
                  </div>
                )}
              </div>

              {/* 3. Conviction / Sentiment Score - Redesigned to match Picks */}


              {/* 4. Mini Signals (HeaderSignals - Trend Only) & Analyst */}
              <div className="flex flex-row items-center gap-2">
                {data.length > 0 && <HeaderSignals latestData={data[data.length - 1]} showRSI={false} />}
                <HeaderAnalyst symbol={market === 'crypto' ? symbol : debouncedStock} analystNews={analystData} />
              </div>
            </div>

            {/* RIGHT: Controls & Market Toggle */}
            <div className="flex items-center gap-4">
              {/* Market Toggle */}
              <div className="flex bg-gray-800/80 rounded-lg p-1 border border-gray-700/50">
                <button
                  onClick={() => setMarket('stocks')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${market === 'stocks' ? 'bg-blue-600 shadow-lg shadow-blue-900/20 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  STOCKS
                </button>
                <button
                  onClick={() => setMarket('crypto')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${market === 'crypto' ? 'bg-blue-600 shadow-lg shadow-blue-900/20 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  CRYPTO
                </button>
              </div>
            </div>
          </div>
        </header>

        {loading ? (
          <Loading message="Fetching dashboard data..." />
        ) : (
          <div className="space-y-6">

            {/* ROW 1: Deep Dive (Left, 2/3) & AI Option Play + Price Stats (Right, 1/3) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Deep Dive - Takes 2/3 - FIRST in DOM = LEFT */}
              <div className="md:col-span-2">
                <DeepDiveContent
                  symbol={market === 'crypto' ? symbol : debouncedStock}
                  showOptionsFlow={false}
                />
              </div>

              {/* Right Column - AI Option Play + Price Stats stacked vertically */}
              <div className="md:col-span-1 space-y-6">
                <div className="bg-gray-800/10 rounded-xl">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <span>🤖</span> AI Option Play
                  </h3>
                  <OptionsSignal data={optionsSignal} loading={loading} />
                </div>

                {/* Price Statistics - Below AI Option Play */}
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Price Statistics</h3>
                  <HighlightStats stats={stats} />
                </div>
              </div>
            </div>

            {/* ROW 3: Whale Watch - BELOW Stats */}
            {market === 'stocks' && (
              <div className="w-full">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 px-1 flex items-center gap-2">
                  <span>🐋</span> Whale Watch
                </h3>
                <WhaleWatch symbol={debouncedStock || stockInput} layout="horizontal" />
              </div>
            )}



            {/* ROW 5: Live News - BELOW AI Insight */}
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 px-1">Live Intelligence</h3>
              <NewsFeed news={news} loading={loading} />
            </div>
          </div>
        )}

        <div className="h-6"></div> {/* Bottom Spacer */}
      </main>
    </div>
  );
}
