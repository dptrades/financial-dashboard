import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from './env';

let genAI: GoogleGenerativeAI | null = null;
let model: any = null;

if (env.GEMINI_API_KEY) {
    try {
        genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
        // Using "gemini-2.0-flash-exp" or standard "gemini-1.5-flash" depending on availability.
        // Let's use 1.5-flash for stability and speed, or 2.0-flash if user requested bleeding edge.
        // User mentioned "gemini", let's use the stable fast model.
        model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    } catch (e) {
        console.error("Failed to initialize Gemini:", e);
    }
}

export async function generateMarketAnalysis(prompt: string): Promise<string | null> {
    if (!model) {
        if (!env.GEMINI_API_KEY) {
            console.warn("Gemini API Key missing. Skipping analysis.");
            return null;
        }
        return null;
    }

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini Generation Error:", error);
        return null;
    }
}

export const isGeminiEnabled = () => !!model;
