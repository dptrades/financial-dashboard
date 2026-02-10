import type { OptionRecommendation } from '../types/options';
import type { IndicatorData } from '../types/financial';
export type { OptionRecommendation } from '../types/options';

export function getNextMonthlyExpiry(): string {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    while (d.getDay() !== 5) d.setDate(d.getDate() + 1);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function roundToStrike(price: number): number {
    if (price < 50) return Math.round(price);
    if (price < 200) return Math.round(price / 5) * 5;
    return Math.round(price / 10) * 10;
}

/**
 * Enhanced Options Signal Generator
 * Uses ALL available technical indicators for maximum confluence scoring.
 * Enforces minimum 1:2 Risk:Reward ratio.
 * 
 * Indicators used:
 * - EMA 9/21/50/200 (trend structure + crosses)
 * - RSI 14 (momentum + divergence zones)
 * - MACD (signal line cross + histogram momentum)
 * - Bollinger Bands (volatility squeeze + mean reversion)
 * - VWAP (institutional fair value)
 * - ATR 14 (volatility-based stops/targets)
 * - ADX 14 (trend strength filter)
 * - Candlestick Patterns (reversal confirmation)
 */
export function generateOptionSignal(
    currentPrice: number,
    atr: number,
    trend: 'bullish' | 'bearish' | 'neutral',
    rsi: number,
    ema50?: number,
    // Optional: pass full indicator data for maximum quality
    indicators?: IndicatorData
): OptionRecommendation {
    const expiry = getNextMonthlyExpiry();

    // ========================================
    // PHASE 1: MULTI-INDICATOR CONFLUENCE SCORE
    // ========================================
    let bullScore = 0;  // Points favoring CALL
    let bearScore = 0;  // Points favoring PUT
    const signals: string[] = [];

    // --- EMA STACK (Weight: 25 points max) ---
    const ema9 = indicators?.ema9;
    const ema21 = indicators?.ema21;
    const ema200 = indicators?.ema200;

    // Price above/below key EMAs
    if (ema50) {
        if (currentPrice > ema50) { bullScore += 5; } else { bearScore += 5; }
    }
    if (ema200) {
        if (currentPrice > ema200) { bullScore += 5; } else { bearScore += 5; }
    }

    // EMA alignment (golden/death cross patterns)
    if (ema9 && ema21 && ema50) {
        if (ema9 > ema21 && ema21 > ema50) {
            bullScore += 10; signals.push('EMA Stack Bullish');
        } else if (ema9 < ema21 && ema21 < ema50) {
            bearScore += 10; signals.push('EMA Stack Bearish');
        }
    }

    // EMA bounce/rejection zones (high value entry)
    if (ema50) {
        const distFromEma50 = ((currentPrice - ema50) / ema50) * 100;
        if (distFromEma50 > 0 && distFromEma50 < 2) {
            bullScore += 5; signals.push('EMA50 Bounce Zone');
        } else if (distFromEma50 < 0 && distFromEma50 > -2) {
            bearScore += 5; signals.push('EMA50 Rejection Zone');
        }
    }

    // --- RSI (Weight: 20 points max) ---
    if (rsi >= 40 && rsi <= 60) {
        // Neutral zone — slight edge based on direction
        if (trend === 'bullish') bullScore += 5;
        else if (trend === 'bearish') bearScore += 5;
    } else if (rsi > 60 && rsi <= 70) {
        bullScore += 10; signals.push('RSI Strong Momentum');
    } else if (rsi >= 30 && rsi < 40) {
        bearScore += 10; signals.push('RSI Weak Momentum');
    } else if (rsi > 70) {
        bearScore += 10; signals.push('RSI Overbought ⚠️');  // Contrarian
    } else if (rsi < 30) {
        bullScore += 10; signals.push('RSI Oversold ⚠️');     // Contrarian
    }

    // RSI sweet-spot bonus (ideal momentum zone)
    if (rsi >= 45 && rsi <= 65 && trend === 'bullish') {
        bullScore += 10; signals.push('RSI Sweet Spot (45-65)');
    } else if (rsi >= 35 && rsi <= 55 && trend === 'bearish') {
        bearScore += 10; signals.push('RSI Sweet Spot (35-55)');
    }

    // --- MACD (Weight: 20 points max) ---
    const macd = indicators?.macd;
    if (macd) {
        // MACD above signal = bullish, below = bearish
        if (macd.MACD !== undefined && macd.signal !== undefined) {
            if (macd.MACD > macd.signal) {
                bullScore += 10; signals.push('MACD Bullish Cross');
            } else {
                bearScore += 10; signals.push('MACD Bearish Cross');
            }
        }
        // Histogram momentum (accelerating = +10)
        if (macd.histogram !== undefined) {
            if (macd.histogram > 0) { bullScore += 5; }
            else { bearScore += 5; }
            // Strong histogram = extra conviction
            if (Math.abs(macd.histogram) > atr * 0.1) {
                if (macd.histogram > 0) { bullScore += 5; signals.push('MACD Histogram Accelerating ↑'); }
                else { bearScore += 5; signals.push('MACD Histogram Accelerating ↓'); }
            }
        }
    }

    // --- BOLLINGER BANDS (Weight: 15 points max) ---
    const bb = indicators?.bollinger;
    if (bb && bb.upper && bb.lower && bb.middle) {
        const bbWidth = ((bb.upper - bb.lower) / bb.middle) * 100;

        // Squeeze detection (low volatility → breakout imminent)
        if (bbWidth < 5) {
            signals.push('BB Squeeze (Breakout Imminent)');
            // Score goes to dominant trend
            if (trend === 'bullish') bullScore += 5;
            else if (trend === 'bearish') bearScore += 5;
        }

        // Price near lower band = potential bounce (bullish)
        if (bb.pb !== undefined) {
            if (bb.pb < 0.2) {
                bullScore += 10; signals.push('Price at Lower BB (Bounce)');
            } else if (bb.pb > 0.8) {
                bearScore += 10; signals.push('Price at Upper BB (Rejection)');
            }
        } else {
            // Fallback: direct price comparison
            if (currentPrice <= bb.lower * 1.01) {
                bullScore += 10; signals.push('Price at Lower BB');
            } else if (currentPrice >= bb.upper * 0.99) {
                bearScore += 10; signals.push('Price at Upper BB');
            }
        }
    }

    // --- VWAP (Weight: 10 points max) ---
    const vwap = indicators?.vwap;
    if (vwap) {
        if (currentPrice > vwap) {
            bullScore += 5; signals.push('Above VWAP (Institutional Bid)');
        } else {
            bearScore += 5; signals.push('Below VWAP (Institutional Offer)');
        }
        // Close to VWAP = strong level
        const vwapDist = Math.abs((currentPrice - vwap) / vwap) * 100;
        if (vwapDist < 1) {
            if (trend === 'bullish') bullScore += 5;
            else if (trend === 'bearish') bearScore += 5;
            signals.push('Near VWAP (Key Level)');
        }
    }

    // --- ADX (Weight: 10 points max) ---
    const adx = indicators?.adx14;
    if (adx !== undefined) {
        if (adx > 25) {
            // Strong trend — favor trend direction
            if (trend === 'bullish') { bullScore += 10; signals.push(`ADX ${adx.toFixed(0)} (Strong Trend)`); }
            else if (trend === 'bearish') { bearScore += 10; signals.push(`ADX ${adx.toFixed(0)} (Strong Trend)`); }
        } else if (adx < 20) {
            // Weak trend — reduce confidence
            bullScore -= 5;
            bearScore -= 5;
            signals.push(`ADX ${adx.toFixed(0)} (Weak/Choppy)`);
        }
    }

    // --- CANDLESTICK PATTERN (Weight: 10 points max) ---
    const pattern = indicators?.pattern;
    if (pattern && pattern.name !== 'None') {
        if (pattern.signal === 'bullish') {
            bullScore += 10; signals.push(`${pattern.name} (Bullish Pattern)`);
        } else if (pattern.signal === 'bearish') {
            bearScore += 10; signals.push(`${pattern.name} (Bearish Pattern)`);
        }
    }

    // ========================================
    // PHASE 2: DETERMINE DIRECTION & CONFIDENCE
    // ========================================
    const totalScore = bullScore + bearScore;
    const maxPossible = 110; // Theoretical maximum one-side score

    let direction: 'CALL' | 'PUT' | 'WAIT';
    let confidence: number;
    let dominantSignals: string[];

    if (bullScore > bearScore && bullScore >= 20) {
        direction = 'CALL';
        confidence = Math.min(95, Math.max(30, Math.round((bullScore / maxPossible) * 100) + 30));
        dominantSignals = signals;
    } else if (bearScore > bullScore && bearScore >= 20) {
        direction = 'PUT';
        confidence = Math.min(95, Math.max(30, Math.round((bearScore / maxPossible) * 100) + 30));
        dominantSignals = signals;
    } else {
        return {
            type: 'WAIT',
            strike: 0,
            expiry: '',
            confidence: Math.max(20, 50 - Math.abs(bullScore - bearScore)),
            reason: `No clear edge (Bull: ${bullScore} vs Bear: ${bearScore}). ${signals.slice(0, 2).join(', ')}`
        };
    }

    // ========================================
    // PHASE 3: GENERATE TRADE PLAN (Min 1:2 R:R)
    // ========================================
    const isCall = direction === 'CALL';

    // Strike: slightly OTM for leveraged exposure
    const strikeOffset = atr * 0.5;
    const strike = roundToStrike(isCall ? currentPrice + strikeOffset : currentPrice - strikeOffset);

    // Entry
    const entryPrice = currentPrice;

    // Stop-Loss: Based on ATR and nearest support/resistance
    let stopLoss: number;
    if (isCall) {
        // SL below nearest support
        const emaSupport = ema50 ? Math.min(ema50, ema200 || Infinity) : currentPrice - atr;
        const atrStop = currentPrice - atr * 1.0;
        stopLoss = Math.max(atrStop, emaSupport * 0.995); // Slightly below support
        // Ensure stop isn't too tight (minimum 0.5 ATR)
        if (currentPrice - stopLoss < atr * 0.5) {
            stopLoss = currentPrice - atr * 0.5;
        }
    } else {
        // SL above nearest resistance
        const emaResistance = ema50 ? Math.max(ema50, ema200 || 0) : currentPrice + atr;
        const atrStop = currentPrice + atr * 1.0;
        stopLoss = Math.min(atrStop, emaResistance * 1.005);
        if (stopLoss - currentPrice < atr * 0.5) {
            stopLoss = currentPrice + atr * 0.5;
        }
    }

    // Risk (always positive)
    const risk = Math.abs(currentPrice - stopLoss);

    // Take Profit: Enforce MINIMUM 1:2 Risk:Reward
    let takeProfit1: number, takeProfit2: number;
    if (isCall) {
        takeProfit1 = currentPrice + Math.max(risk * 2.0, atr * 1.5);   // Min 1:2 R:R
        takeProfit2 = currentPrice + Math.max(risk * 3.0, atr * 2.5);   // Stretch target 1:3
    } else {
        takeProfit1 = currentPrice - Math.max(risk * 2.0, atr * 1.5);
        takeProfit2 = currentPrice - Math.max(risk * 3.0, atr * 2.5);
    }

    const reward = Math.abs(takeProfit1 - currentPrice);
    const riskReward = risk > 0 ? `1:${(reward / risk).toFixed(1)}` : '1:2';

    // Entry condition
    let entryCondition: string;
    if (isCall) {
        if (ema50 && currentPrice > ema50 * 1.02) {
            const pullbackLevel = Math.max(ema50, currentPrice - atr * 0.3);
            entryCondition = `Ideal: pullback to $${pullbackLevel.toFixed(2)}. OK at market.`;
        } else if (bb && bb.lower && currentPrice < bb.middle!) {
            entryCondition = `Ideal: bounce from BB lower ($${bb.lower.toFixed(2)})`;
        } else {
            entryCondition = `Enter at market (~$${currentPrice.toFixed(2)})`;
        }
    } else {
        if (ema50 && currentPrice < ema50 * 0.98) {
            const bounceLevel = Math.min(ema50, currentPrice + atr * 0.3);
            entryCondition = `Ideal: bounce to $${bounceLevel.toFixed(2)}. OK at market.`;
        } else if (bb && bb.upper && currentPrice > bb.middle!) {
            entryCondition = `Ideal: rejection from BB upper ($${bb.upper.toFixed(2)})`;
        } else {
            entryCondition = `Enter at market (~$${currentPrice.toFixed(2)})`;
        }
    }

    // Build strategy name from strongest signals
    const topSignals = signals.filter(s => !s.includes('⚠️')).slice(0, 2);
    const strategyName = topSignals.length > 0 ? topSignals.join(' + ') : (isCall ? 'Bullish Setup' : 'Bearish Setup');

    // Build detailed reason
    const confluenceCount = signals.length;
    const reason = `${confluenceCount} indicator confluence. ${signals.slice(0, 3).join(', ')}`;

    return {
        type: direction,
        strike,
        expiry,
        confidence,
        reason,
        entryPrice: parseFloat(entryPrice.toFixed(2)),
        entryCondition,
        stopLoss: parseFloat(stopLoss.toFixed(2)),
        takeProfit1: parseFloat(takeProfit1.toFixed(2)),
        takeProfit2: parseFloat(takeProfit2.toFixed(2)),
        riskReward,
        maxLoss: `Premium paid (debit limited)`,
        strategy: strategyName
    };
}
