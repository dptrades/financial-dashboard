export const SECTOR_MAP: Record<string, string> = {
    // Technology
    NVDA: 'Technology', AMD: 'Technology', AAPL: 'Technology', MSFT: 'Technology',
    META: 'Technology', GOOGL: 'Technology', INTC: 'Technology',
    PLTR: 'Technology', TSM: 'Technology', AVGO: 'Technology', ORCL: 'Technology',
    // Consumer Cyclical (EV / Retail)
    TSLA: 'Consumer', AMZN: 'Consumer', HD: 'Consumer', MCD: 'Consumer',
    NKE: 'Consumer', RIVN: 'Consumer', LCID: 'Consumer', GME: 'Consumer',
    // Finance / Fintech
    JPM: 'Finance', BAC: 'Finance', WFC: 'Finance', C: 'Finance',
    GS: 'Finance', MS: 'Finance', V: 'Finance', MA: 'Finance',
    COIN: 'Finance', HOOD: 'Finance', SOFI: 'Finance', PYPL: 'Finance',
    // Communications
    NFLX: 'Communication', DIS: 'Communication', T: 'Communication', VZ: 'Communication',
    // Healthcare
    LLY: 'Healthcare', JNJ: 'Healthcare', ABBV: 'Healthcare', MRK: 'Healthcare', PFE: 'Healthcare', UNH: 'Healthcare',
    // Energy
    XOM: 'Energy', CVX: 'Energy', OXY: 'Energy', COP: 'Energy', SLB: 'Energy',
    // Industrial
    CAT: 'Industrial', BA: 'Industrial', GE: 'Industrial', UNP: 'Industrial',
    // ETF / Crypto Proxies
    MSTR: 'Technology', MARA: 'Technology', DKNG: 'Consumer',
    SPY: 'Indices', QQQ: 'Indices', IWM: 'Indices', DIA: 'Indices',
    // Sector ETFs
    XLK: 'Sector ETFs', XLF: 'Sector ETFs', XLE: 'Sector ETFs', XLY: 'Sector ETFs',
    XLP: 'Sector ETFs', XLV: 'Sector ETFs', XLI: 'Sector ETFs', XLB: 'Sector ETFs',
    XLU: 'Sector ETFs', XLRE: 'Sector ETFs', XLC: 'Sector ETFs',
    // Commodities
    'CL=F': 'Energy', 'NG=F': 'Energy',       // Oil, Gas
    'GC=F': 'Metals', 'SI=F': 'Metals',       // Gold, Silver
    'HG=F': 'Metals', 'ALI=F': 'Metals',      // Copper, Aluminum
    GLD: 'Metals', SLV: 'Metals', GDX: 'Metals', GDXJ: 'Metals',
    // Market Internals
    '^VIX': 'Internals',
    '^GSPC': 'Indices', '^IXIC': 'Indices', // S&P 500, Nasdaq 100
    // Extended Tech
    ADBE: 'Technology', CRM: 'Technology', CSCO: 'Technology',
    QCOM: 'Technology', TXN: 'Technology', AMAT: 'Technology', INTU: 'Technology',
    // Financials
    'BRK-B': 'Finance', BLK: 'Finance',
    // Healthcare
    TMO: 'Healthcare',
    // Consumer / Retail
    WMT: 'Consumer', PG: 'Consumer', COST: 'Consumer', PEP: 'Consumer', KO: 'Consumer',
    // Industrial
    HON: 'Industrial',
    // Bonds & Forex (Existing)
    '^TNX': 'Bonds', '^TYX': 'Bonds', '^FVX': 'Bonds',
    // Forex
    'EURUSD=X': 'Forex', 'JPY=X': 'Forex', 'GBPUSD=X': 'Forex', 'CAD=X': 'Forex',
    // Market Internals (Hidden from main grid, used for Dashboard)
    'DX-Y.NYB': 'Internals'
};

export const SCANNER_WATCHLIST = Object.keys(SECTOR_MAP);
