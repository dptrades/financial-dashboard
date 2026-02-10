import { OHLCVData, IndicatorData } from '../types/financial';
import { EMA, RSI, VWAP, MACD, BollingerBands, ADX } from 'technicalindicators';

export const calculateIndicators = (data: OHLCVData[]): IndicatorData[] => {
    // Extract arrays for technicalindicators
    const closes = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const volumes = data.map(d => d.volume);

    // -------------------------------------------------------------------------
    // 1. STANDARD INDICATORS
    // -------------------------------------------------------------------------
    const ema9 = EMA.calculate({ period: 9, values: closes });
    const ema21 = EMA.calculate({ period: 21, values: closes });
    const ema50 = EMA.calculate({ period: 50, values: closes });
    const ema200 = EMA.calculate({ period: 200, values: closes });

    // RSI (Filter)
    const rsi14 = RSI.calculate({ period: 14, values: closes });

    // VWAP
    const vwapInput = {
        high: highs,
        low: lows,
        close: closes,
        volume: volumes
    };
    const vwap = VWAP.calculate(vwapInput);

    // MACD (12, 26, 9)
    const macdInput = {
        values: closes,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false
    };
    const macd = MACD.calculate(macdInput);

    // Bollinger Bands (20, 2)
    const bbInput = {
        period: 20,
        values: closes,
        stdDev: 2
    };
    const bb = BollingerBands.calculate(bbInput);

    // Initial Mapping
    const results: IndicatorData[] = data.map((d, i) => {
        const getVal = (arr: any[], idx: number, offset: number) => {
            const arrIndex = idx - offset;
            if (arrIndex < 0 || arrIndex >= arr.length) return undefined;
            return arr[arrIndex];
        };

        return {
            ...d,
            ema9: getVal(ema9, i, 8),
            ema21: getVal(ema21, i, 20),
            ema50: getVal(ema50, i, 49),
            ema200: getVal(ema200, i, 199),
            rsi14: getVal(rsi14, i, 14),
            vwap: getVal(vwap, i, 0),
            macd: getVal(macd, i, 25), // MACD starts after slowPeriod-1? library specific, usually slow-1
            bollinger: getVal(bb, i, 19) // BB starts after period-1
        };
    });

    // -------------------------------------------------------------------------
    // 2. ATR CALCULATION (Current Timeframe)
    // -------------------------------------------------------------------------
    // Calculate True Range
    const trs = results.map((d, i) => {
        if (i === 0) return d.high - d.low;
        const prevClose = results[i - 1].close;
        return Math.max(d.high - d.low, Math.abs(d.high - prevClose), Math.abs(d.low - prevClose));
    });

    // Calculate ATR 14
    const atrs: number[] = [];
    for (let i = 0; i < trs.length; i++) {
        if (i < 13) {
            atrs.push(0);
            continue;
        }
        const sum = trs.slice(i - 13, i + 1).reduce((a, b) => a + b, 0);
        atrs.push(sum / 14);
    }

    // -------------------------------------------------------------------------
    // 3. ADX CALCULATION
    // -------------------------------------------------------------------------
    const adxInput = {
        high: highs,
        low: lows,
        close: closes,
        period: 14
    };
    const adx = ADX.calculate(adxInput);

    results.forEach((d, i) => {
        d.atr14 = atrs[i];
        // ADX result is an object { adx: number, pdi: number, mdi: number }
        // We need to handle the offset (usually period * 2 or similar depending on library)
        // For technicalindicators, result array length is usually len - period + 1
        // Let's safe map it
        const adxVal = i >= (14) ? adx[i - 14] : undefined;
        d.adx14 = adxVal?.adx;
    });

    return results;
};
