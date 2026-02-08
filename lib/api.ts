import axios from 'axios';
import { OHLCVData } from '@/types/financial';

const BASE_URL = 'https://api.coingecko.com/api/v3';

// Default to Bitcoin and 1 day interval for now
export const fetchOHLCV = async (coinId: string = 'BTC', days: string = '30', market: 'crypto' | 'stocks' = 'crypto', interval: string = '1d'): Promise<OHLCVData[]> => {
    try {
        const response = await axios.get('/api/ohlcv', {
            params: {
                symbol: coinId,
                days: days, // legacy or for ranges
                market: market,
                interval: interval
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching OHLCV data:', error);
        return [];
    }
};
