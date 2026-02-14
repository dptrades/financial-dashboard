import axios from 'axios';
import { env } from './env';
import { OHLCVData } from '../types/financial';

const BASE_URL = 'https://api.schwabapi.com/marketdata/v1';
const AUTH_URL = 'https://api.schwabapi.com/v1/oauth/token';

export class SchwabClient {
    private clientId: string;
    private clientSecret: string;
    private refreshToken: string | null = null;
    private accessToken: string | null = null;
    private tokenExpiry: number = 0;

    constructor() {
        this.clientId = env.SCHWAB_CLIENT_ID || '';
        this.clientSecret = env.SCHWAB_CLIENT_SECRET || '';
        this.refreshToken = env.SCHWAB_REFRESH_TOKEN || '';
    }

    isConfigured(): boolean {
        return !!(this.clientId && this.clientSecret && this.refreshToken);
    }

    private async refreshAccessToken(): Promise<string> {
        if (this.accessToken && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        if (!this.isConfigured()) return '';

        try {
            const authHeader = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
            const response = await axios.post(AUTH_URL,
                new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: this.refreshToken!
                }),
                {
                    headers: {
                        'Authorization': `Basic ${authHeader}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            if (response.data.access_token) {
                this.accessToken = response.data.access_token;
                // Tokens typically last 30 mins
                this.tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
                return this.accessToken!;
            }
        } catch (error: any) {
            console.error('[SchwabAPI] Failed to refresh token:', error.response?.data || error.message);
        }
        return '';
    }

    async getPriceHistory(symbol: string, periodType: string, period: number, frequencyType: string, frequency: number): Promise<OHLCVData[]> {
        const token = await this.refreshAccessToken();
        if (!token) return [];

        try {
            const response = await axios.get(`${BASE_URL}/pricehistory`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: {
                    symbol,
                    periodType,
                    period,
                    frequencyType,
                    frequency,
                    needExtendedHoursData: true
                }
            });

            if (response.data && response.data.candles) {
                return response.data.candles.map((c: any) => ({
                    time: c.datetime,
                    open: c.open,
                    high: c.high,
                    low: c.low,
                    close: c.close,
                    volume: c.volume
                }));
            }
        } catch (error: any) {
            console.error(`[SchwabAPI] Failed to fetch price history for ${symbol}:`, error.message);
        }
        return [];
    }

    async getOptionChain(symbol: string): Promise<any> {
        const token = await this.refreshAccessToken();
        if (!token) return null;

        try {
            const response = await axios.get(`${BASE_URL}/chains`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { symbol }
            });
            return response.data;
        } catch (error: any) {
            console.error(`[SchwabAPI] Failed to fetch option chain for ${symbol}:`, error.message);
            return null;
        }
    }

    async getGreeks(symbol: string): Promise<any> {
        // Schwab's /chains endpoint usually includes Greeks, but we can also fetch a single quote
        const token = await this.refreshAccessToken();
        if (!token) return null;

        try {
            const response = await axios.get(`${BASE_URL}/${symbol}/quotes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.data && response.data[symbol]) {
                const quote = response.data[symbol];
                return {
                    delta: quote.delta,
                    gamma: quote.gamma,
                    theta: quote.theta,
                    vega: quote.vega,
                    rho: quote.rho,
                    impliedVolatility: quote.volatility
                };
            }
        } catch (error: any) {
            console.error(`[SchwabAPI] Failed to fetch Greeks for ${symbol}:`, error.message);
        }
        return null;
    }
}

export const schwabClient = new SchwabClient();
