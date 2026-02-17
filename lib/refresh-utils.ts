export type MarketSession = 'PRE' | 'REG' | 'POST' | 'OFF';

export const REFRESH_INTERVALS = {
    PRICE: 60 * 1000,           // 1 Minute
    DAYDREAM: 5 * 60 * 1000,    // 5 Minutes
    DEEP_DIVE: 60 * 1000,  // 1 Minute
    WIDGETS: 15 * 60 * 1000,    // 15 Minutes
    NEWS: 2 * 60 * 60 * 1000,       // 2 Hours
    AUTO_REFRESH: 15 * 60 * 1000, // 15 Minutes (Universal for Alpha Hunter, Top Picks, etc)
};

const isMarketHoliday = (date: Date): boolean => {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed
    const day = date.getDate();
    const weekDay = date.getDay(); // 0 is Sunday, 1 is Monday...

    // Date string for easy specific matching
    const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

    // 2026 Specific Holidays (US Market)
    const holidays2026 = [
        '2026-01-01', // New Year's
        '2026-01-19', // MLK Day
        '2026-02-16', // Presidents' Day
        '2026-04-03', // Good Friday
        '2026-05-25', // Memorial Day
        '2026-06-19', // Juneteenth
        '2026-07-03', // Independence Day (Observed)
        '2026-09-07', // Labor Day
        '2026-11-26', // Thanksgiving
        '2026-12-25', // Christmas
    ];

    if (holidays2026.includes(dateStr)) return true;

    // Generic Rules if missing from specific list
    if (month === 0 && day === 1) return true; // New Year
    if (month === 11 && day === 25) return true; // Christmas
    if (month === 6 && day === 4) return true; // July 4th

    return false;
};

export const getMarketSession = (): MarketSession => {
    const now = new Date();
    const estDateString = now.toLocaleString("en-US", { timeZone: "America/New_York" });
    const estTime = new Date(estDateString);
    const hours = estTime.getHours();
    const minutes = estTime.getMinutes();
    const timeVal = hours + minutes / 60;
    const day = estTime.getDay();

    if (day === 0 || day === 6 || isMarketHoliday(estTime)) return 'OFF';
    if (timeVal >= 9.5 && timeVal < 16) return 'REG';
    if (timeVal >= 4 && timeVal < 9.5) return 'PRE';
    if (timeVal >= 16 && timeVal < 20) return 'POST';
    return 'OFF';
};

export const isMarketActive = (): boolean => {
    return getMarketSession() !== 'OFF';
};

export const getNextMarketOpen = (): Date => {
    const now = new Date();
    const estDateString = now.toLocaleString("en-US", { timeZone: "America/New_York" });
    const estTime = new Date(estDateString);

    // Create a new date for "tomorrow" at 4:00 AM EST (Pre-market start)
    const nextOpen = new Date(estTime);
    nextOpen.setHours(4, 0, 0, 0);

    // If it's already past 4am today, or it's a weekend/holiday, move forward
    if (estTime.getHours() >= 4 || estTime.getDay() === 0 || estTime.getDay() === 6 || isMarketHoliday(estTime)) {
        nextOpen.setDate(nextOpen.getDate() + 1);
    }

    // Skip weekends AND holidays
    while (nextOpen.getDay() === 0 || nextOpen.getDay() === 6 || isMarketHoliday(nextOpen)) {
        nextOpen.setDate(nextOpen.getDate() + 1);
    }

    return nextOpen;
};

export const formatLastUpdated = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};
