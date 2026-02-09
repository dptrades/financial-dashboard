'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface LiveQuote {
    symbol: string;
    bidPrice: number;
    askPrice: number;
    bidSize: number;
    askSize: number;
    timestamp: string;
    midPrice: number;
}

interface UseLivePriceOptions {
    symbol: string;
    enabled?: boolean;
}

const ALPACA_WS_URL = 'wss://stream.data.alpaca.markets/v2/iex';

export function useLivePrice({ symbol, enabled = true }: UseLivePriceOptions) {
    const [liveQuote, setLiveQuote] = useState<LiveQuote | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const connect = useCallback(() => {
        if (!enabled || !symbol) return;

        // Don't create new connection if already connected
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            return;
        }

        // Clean up existing connection
        if (wsRef.current) {
            wsRef.current.close(1000, 'Reconnecting');
            wsRef.current = null;
        }

        const apiKey = process.env.NEXT_PUBLIC_ALPACA_API_KEY || 'PK3ADSJ3QHTXXWDUDT7SJDQSDG';
        const apiSecret = process.env.NEXT_PUBLIC_ALPACA_API_SECRET || '2dj3HdJqjX1VSncZrygyCFRicSPonSNTyJSYh5M5Z7z1';

        try {
            const ws = new WebSocket(ALPACA_WS_URL);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('[Alpaca WS] Connected, authenticating...');
                ws.send(JSON.stringify({
                    action: 'auth',
                    key: apiKey,
                    secret: apiSecret
                }));
            };

            ws.onmessage = (event) => {
                try {
                    const messages = JSON.parse(event.data);

                    for (const msg of messages) {
                        if (msg.T === 'success' && msg.msg === 'authenticated') {
                            console.log('[Alpaca WS] Authenticated, subscribing to', symbol);
                            setIsConnected(true);
                            setError(null);

                            // Subscribe to quotes for the symbol
                            ws.send(JSON.stringify({
                                action: 'subscribe',
                                quotes: [symbol.toUpperCase()]
                            }));
                        }

                        if (msg.T === 'subscription') {
                            console.log('[Alpaca WS] Subscribed to:', msg.quotes);
                        }

                        // Quote update
                        if (msg.T === 'q' && msg.S === symbol.toUpperCase()) {
                            const quote: LiveQuote = {
                                symbol: msg.S,
                                bidPrice: msg.bp,
                                askPrice: msg.ap,
                                bidSize: msg.bs,
                                askSize: msg.as,
                                timestamp: msg.t,
                                midPrice: (msg.bp + msg.ap) / 2
                            };
                            setLiveQuote(quote);
                        }

                        if (msg.T === 'error') {
                            console.error('[Alpaca WS] Error:', msg.msg);
                            setError(msg.msg);
                        }
                    }
                } catch (e) {
                    console.error('[Alpaca WS] Parse error:', e);
                }
            };

            ws.onerror = (event) => {
                console.error('[Alpaca WS] WebSocket error:', event);
                setError('WebSocket connection error');
            };

            ws.onclose = (event) => {
                console.log('[Alpaca WS] Disconnected, code:', event.code);
                setIsConnected(false);

                // Reconnect after 5 seconds if not intentionally closed
                if (enabled && event.code !== 1000) {
                    reconnectTimeoutRef.current = setTimeout(() => {
                        console.log('[Alpaca WS] Reconnecting...');
                        connect();
                    }, 5000);
                }
            };

        } catch (err) {
            console.error('[Alpaca WS] Connection error:', err);
            setError('Failed to connect to Alpaca');
        }
    }, [symbol, enabled]);

    // Subscribe to new symbol
    const subscribe = useCallback((newSymbol: string) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            // Unsubscribe from old symbol first
            if (symbol && symbol !== newSymbol) {
                wsRef.current.send(JSON.stringify({
                    action: 'unsubscribe',
                    quotes: [symbol.toUpperCase()]
                }));
            }

            // Subscribe to new symbol
            wsRef.current.send(JSON.stringify({
                action: 'subscribe',
                quotes: [newSymbol.toUpperCase()]
            }));
        }
    }, [symbol]);

    // Connect on mount
    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close(1000, 'Component unmounted');
            }
        };
    }, [connect]);

    // Resubscribe when symbol changes
    useEffect(() => {
        if (isConnected && symbol) {
            subscribe(symbol);
        }
    }, [symbol, isConnected, subscribe]);

    return {
        liveQuote,
        isConnected,
        error,
        subscribe
    };
}
