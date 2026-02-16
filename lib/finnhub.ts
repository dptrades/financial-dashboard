
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const API_KEY = process.env.FINNHUB_API_KEY;

export interface FinnhubNews {
    category: string;
    datetime: number;
    headline: string;
    id: number;
    image: string;
    related: string;
    source: string;
    summary: string;
    url: string;
}

export interface FinnhubSentiment {
    buzz: {
        articlesInLastWeek: number;
        buzz: number;
        weeklyAverage: number;
    };
    companyNewsScore: number;
    sectorAverageBuzz: number;
    sectorAverageNewsScore: number;
    sentiment: {
        bearishPercent: number;
        bullishPercent: number;
    };
    symbol: string;
}

export interface FinnhubSocialSentiment {
    reddit: Array<{ atTime: string; mention: number; positiveMention: number; negativeMention: number; score: number }>;
    twitter: Array<{ atTime: string; mention: number; positiveMention: number; negativeMention: number; score: number }>;
    symbol: string;
}

export interface FinnhubBasicFinancials {
    metric: {
        '10DayAverageTradingVolume': number;
        '52WeekHigh': number;
        '52WeekLow': number;
        '52WeekLowDate': string;
        '52WeekPriceReturnDaily': number;
        beta: number;
        marketCapitalization: number;
        roeTTM: number;
        epsGrowthTTMYoy: number;
        pegTTM?: number;
        pegRatio?: number;
        'totalDebt/totalEquityTTM'?: number;
        'totalDebt/totalEquityQuarterly'?: number;
        'totalDebt/totalEquityAnnual'?: number;
        debtToEquity?: number;
        freeCashFlowTTM?: number;
        freeCashFlowAnnual?: number;
        pfcfShareTTM?: number;
        enterpriseValue?: number;
        'currentEv/freeCashFlowTTM'?: number;
    };
    series: {
        annual: any;
        quarterly: any;
    };
    symbol: string;
}

class FinnhubClient {
    private financialsCache: Map<string, { data: FinnhubBasicFinancials; expiry: number }> = new Map();
    private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 Hours

    private async fetch(endpoint: string, params: Record<string, string> = {}) {
        if (!API_KEY) {
            console.warn('Finnhub API Key is missing');
            return null;
        }

        const url = new URL(`${FINNHUB_BASE_URL}${endpoint}`);
        url.searchParams.append('token', API_KEY);
        Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

        try {
            const response = await fetch(url.toString());
            if (!response.ok) throw new Error(`Finnhub API error: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error(`Error fetching from Finnhub: ${endpoint}`, error);
            return null;
        }
    }

    async getNews(symbol: string): Promise<FinnhubNews[]> {
        const to = new Date().toISOString().split('T')[0];
        const from = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        return await this.fetch('/company-news', { symbol, from, to }) || [];
    }

    async getNewsSentiment(symbol: string): Promise<FinnhubSentiment | null> {
        return await this.fetch('/news-sentiment', { symbol });
    }

    async getSocialSentiment(symbol: string): Promise<FinnhubSocialSentiment | null> {
        return await this.fetch('/stock/social-sentiment', { symbol });
    }

    async getBasicFinancials(symbol: string): Promise<FinnhubBasicFinancials | null> {
        // Check cache first
        const cached = this.financialsCache.get(symbol);
        if (cached && Date.now() < cached.expiry) {
            return cached.data;
        }

        const data = await this.fetch('/stock/metric', { symbol, metric: 'all' });
        if (data) {
            this.financialsCache.set(symbol, {
                data,
                expiry: Date.now() + this.CACHE_TTL
            });
        }
        return data;
    }
}

export const finnhubClient = new FinnhubClient();
