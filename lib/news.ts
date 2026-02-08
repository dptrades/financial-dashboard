export interface NewsItem {
    id: string;
    title: string;
    source: string;
    time: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    url: string;
}

export const fetchStockNews = async (symbol: string, trend: 'bullish' | 'bearish' | 'neutral' = 'neutral'): Promise<NewsItem[]> => {
    try {
        const response = await fetch(`/api/news?symbol=${encodeURIComponent(symbol)}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Failed to fetch news:", error);
        return []; // Fallback empty array
    }
};

export const fetchSocialSentiment = async (symbol: string): Promise<NewsItem[]> => {
    try {
        const response = await fetch(`/api/news?symbol=${encodeURIComponent(symbol)}&type=social`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Failed to fetch social sentiment:", error);
        return [];
    }
};

export const fetchAnalystRatings = async (symbol: string): Promise<NewsItem[]> => {
    try {
        const response = await fetch(`/api/news?symbol=${encodeURIComponent(symbol)}&type=analyst`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Failed to fetch analyst ratings:", error);
        return [];
    }
};
