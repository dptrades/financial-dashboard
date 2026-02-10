/**
 * Options Types
 * Types for options trading recommendations and signals
 */

export interface OptionRecommendation {
    type: 'CALL' | 'PUT' | 'WAIT';
    strike: number;
    expiry: string;
    confidence: number;
    reason: string;
    // Trade plan
    entryPrice?: number;       // Stock price to enter at
    entryCondition?: string;   // When to enter (e.g., "on pullback to $X")
    stopLoss?: number;         // Stock price stop-loss
    takeProfit1?: number;      // Conservative target
    takeProfit2?: number;      // Aggressive target
    riskReward?: string;       // Risk:Reward ratio
    maxLoss?: string;          // Estimated max loss description
    strategy?: string;         // Strategy name
}

export interface OptionsChain {
    symbol: string;
    expirationDate: string;
    calls: OptionContract[];
    puts: OptionContract[];
}

export interface OptionContract {
    strike: number;
    lastPrice: number;
    bid: number;
    ask: number;
    volume: number;
    openInterest: number;
    impliedVolatility: number;
    inTheMoney: boolean;
}
