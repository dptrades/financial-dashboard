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
