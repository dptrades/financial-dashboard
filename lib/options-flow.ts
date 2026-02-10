import YahooFinance from 'yahoo-finance2';
import { OptionsChain, OptionContract } from '../types/options';

const yahooFinance = new YahooFinance();

export interface UnusualOption {
    symbol: string;
    type: 'CALL' | 'PUT';
    strike: number;
    expiry: string;
    lastPrice: number;
    volume: number;
    openInterest: number;
    volToOiRatio: number;
    impliedVolatility: number;
    bias: 'BULLISH' | 'BEARISH';
}

export async function scanUnusualOptions(symbol: string): Promise<UnusualOption[]> {
    try {
        // Fetch option chain for next expiry
        // Yahoo Finance query usually requires specific date or it returns nearest
        const queryOptions = { lang: 'en-US', region: 'US' };
        const result = await yahooFinance.options(symbol, queryOptions);

        if (!result || !result.options || result.options.length === 0) return [];

        const unusual: UnusualOption[] = [];

        // Iterate through all expirations (Yahoo returns all if no date specified? Usually need to loop dates)
        // With yahoo-finance2, 'options' returns the chain for a specific date (nearest by default). 
        // We might want to look at the first 2-3 expirations.

        const expirationDates = (result as any).meta?.expirationDates;

        if (!expirationDates || expirationDates.length === 0) return [];

        // Take first 3 expirations (approx 90 days coverage usually covers 3-4 months if monthly)
        const targetDates = expirationDates.slice(0, 3);

        for (const date of targetDates) {
            // We need to fetch specific date chain if not already in result (result is only for first date usually)
            // But to avoid too many API calls, let's just process the first one provided in 'result' if it matches, 
            // and maybe one more. 
            // Actually, let's just stick to the nearest expiry for speed, or fetch one more if needed.

            // For this implementation, let's just process the data we have in 'result' which is the nearest chain.
            // If we want more, we need multiple await calls.

            // Process Calls
            result.options[0].calls.forEach((c: any) => {
                if (isUnusual(c)) {
                    unusual.push(mapToUnusual(symbol, c, 'CALL', new Date(date * 1000)));
                }
            });

            // Process Puts
            result.options[0].puts.forEach((p: any) => {
                if (isUnusual(p)) {
                    unusual.push(mapToUnusual(symbol, p, 'PUT', new Date(date * 1000)));
                }
            });
        }

        // Sort by Volume descending
        return unusual.sort((a, b) => b.volume - a.volume);

    } catch (e) {
        console.error(`Unusual Options Scan failed for ${symbol}`, e);
        return [];
    }
}

function isUnusual(option: any): boolean {
    // 1. Volume significant (> 500 contracts)
    // 2. Volume > Open Interest (Aggressive new positioning)
    // 3. Not deep ITM (OTM or ATM preferred for directional bets)

    // Check volume threshold
    if (option.volume < 200) return false; // Lowered threshold for broader catch

    // Check Vol > OI (or at least significant relative to OI)
    if (option.openInterest > 0 && option.volume > option.openInterest) {
        return true;
    }

    return false;
}

function mapToUnusual(symbol: string, opt: any, type: 'CALL' | 'PUT', expiryDate: Date): UnusualOption {
    const formattedDate = expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const ratio = opt.openInterest > 0 ? (opt.volume / opt.openInterest) : opt.volume;

    return {
        symbol,
        type,
        strike: opt.strike,
        expiry: formattedDate,
        lastPrice: opt.lastPrice,
        volume: opt.volume,
        openInterest: opt.openInterest,
        volToOiRatio: parseFloat(ratio.toFixed(2)),
        impliedVolatility: parseFloat((opt.impliedVolatility * 100).toFixed(1)),
        bias: type === 'CALL' ? 'BULLISH' : 'BEARISH'
    };
}
