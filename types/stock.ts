/**
 * Stock Types
 * Core types for stock scanning, conviction analysis, and discovery
 */

import type { OptionRecommendation } from './options';

/**
 * Stock discovered by the smart scanner
 */
export interface DiscoveredStock {
    symbol: string;
    name?: string;
    source: 'volume' | 'social' | 'news' | 'technical' | 'options';
    signal: string;
    strength: number; // 1-100
    timestamp: Date;
}

/**
 * Full conviction analysis result for a stock
 */
export interface ConvictionStock {
    symbol: string;
    name: string;
    price: number;
    score: number; // 0-100
    isMock?: boolean;

    // Category Scores
    technicalScore: number;
    fundamentalScore: number;
    analystScore: number;
    sentimentScore: number;

    // Detailed Metrics
    metrics: {
        pe?: number;
        marketCap?: number;
        revenueGrowth?: number; // YoY
        rsi: number;
        trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
        analystRating?: string; // "Strong Buy", etc.
        analystTarget?: number;
        socialSentiment: string; // "Bullish"
    };

    reasons: string[];

    // Discovery source (if found by smart scanner)
    discoverySource?: 'volume' | 'social' | 'news' | 'technical' | 'options' | null;

    // Market Data
    change24h: number; // Percentage
    volume: number;
    sector?: string;
    suggestedOption?: OptionRecommendation;
}

/**
 * Scanned stock result (legacy, aliased to ConvictionStock for compatibility)
 */
export type ScannedStock = ConvictionStock;
