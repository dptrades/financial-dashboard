// Import type for local use in functions
import type { OptionRecommendation } from '../types/options';
// Re-export for backwards compatibility
export type { OptionRecommendation } from '../types/options';

export function getNextMonthlyExpiry(): string {
    const d = new Date();
    d.setDate(d.getDate() + 30); // Look ~30 days out
    // Simple heuristic: just format as "MMM DD"
    // In a real app, we'd find the nearest Friday.
    // Let's find the nearest Friday after 30 days.
    while (d.getDay() !== 5) {
        d.setDate(d.getDate() + 1);
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function roundToStrike(price: number): number {
    if (price < 50) return Math.round(price); // Nearest $1
    if (price < 200) return Math.round(price / 5) * 5; // Nearest $5
    return Math.round(price / 10) * 10; // Nearest $10
}

export function generateOptionSignal(
    currentPrice: number,
    atr: number,
    trend: 'bullish' | 'bearish' | 'neutral',
    rsi: number,
    ema50?: number
): OptionRecommendation {
    const expiry = getNextMonthlyExpiry();
    let confidence = 50;
    let strategy = "";

    // 1. Determine Direction & Base Confidence
    if (trend === 'bullish') {
        // CALL SETUP
        // A+ Setup: Price > EMA50 AND RSI is rising but not overbought (40-65)

        // Target: Price + 1.0x ATR (High Probability Target)
        const targetPrice = currentPrice + (atr * 1.0);
        const strike = roundToStrike(targetPrice);

        confidence = 60; // Base

        // CONFLUENCE CHECKS
        if (rsi >= 40 && rsi <= 65) {
            confidence += 20; // Sweet spot for momentum
            strategy = "Momentum Swing";
        } else if (rsi > 70) {
            confidence -= 30; // Overbought - Danger zone
            strategy = "Chasing Top (Risky)";
        } else if (rsi < 40) {
            confidence -= 10; // Weak momentum
            strategy = "Weak Trend";
        }

        // Pullback Bonus
        if (ema50 && (currentPrice > ema50) && (currentPrice < ema50 * 1.02)) {
            confidence += 15; // Bouncing off support - Great entry
            strategy = "EMA Bounce (A+ Setup)";
        }

        const finalConfidence = Math.min(95, Math.max(10, confidence));

        if (confidence < 60) {
            return {
                type: 'WAIT',
                strike: 0,
                expiry: '',
                confidence: finalConfidence,
                reason: strategy ? `Wait: ${strategy}` : 'Low confidence setup'
            };
        }

        return {
            type: 'CALL',
            strike,
            expiry,
            confidence: finalConfidence,
            reason: strategy ? `${strategy} (RSI ${rsi.toFixed(0)})` : `Bullish Flow (RSI ${rsi.toFixed(0)})`
        };

    } else if (trend === 'bearish') {
        // PUT SETUP
        // A+ Setup: Price < EMA50 AND RSI is falling but not oversold (35-60)

        // Target: Price - 1.0x ATR
        const targetPrice = currentPrice - (atr * 1.0);
        const strike = roundToStrike(targetPrice);

        confidence = 60; // Base

        // CONFLUENCE CHECKS
        if (rsi <= 60 && rsi >= 35) {
            confidence += 20; // Sweet spot for sell-off
            strategy = "Trend Breakdown";
        } else if (rsi < 30) {
            confidence -= 30; // Oversold - Danger of bounce
            strategy = "Chasing Bottom (Risky)";
        } else if (rsi > 60) {
            confidence -= 10; // Not weak enough yet?
            strategy = "Weak Bear";
        }

        // Reject Bonus
        if (ema50 && (currentPrice < ema50) && (currentPrice > ema50 * 0.98)) {
            confidence += 15; // Rejecting resistance - Great entry
            strategy = "EMA Rejection (A+ Setup)";
        }

        const finalConfidence = Math.min(95, Math.max(10, confidence));

        if (confidence < 60) {
            return {
                type: 'WAIT',
                strike: 0,
                expiry: '',
                confidence: finalConfidence,
                reason: strategy ? `Wait: ${strategy}` : 'Low confidence setup'
            };
        }

        return {
            type: 'PUT',
            strike,
            expiry,
            confidence: finalConfidence,
            reason: strategy ? `${strategy} (RSI ${rsi.toFixed(0)})` : `Bearish Flow (RSI ${rsi.toFixed(0)})`
        };

    } else {
        // NEUTRAL
        return {
            type: 'WAIT',
            strike: 0,
            expiry: '',
            confidence: 50,
            reason: 'Market lacks clear direction (Chop)'
        };
    }
}
