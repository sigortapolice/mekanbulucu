import { GoogleGenAI, Type } from '@google/genai';
import type { Business } from '../types';

const responseSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            businessName: { type: Type.STRING, description: "İşletmenin tam adı." },
            mainCategory: { type: Type.STRING, description: "İşletmenin ana kategorisi." },
            subCategory: { type: Type.STRING, description: "İşletmenin alt kategorisi." },
            phone: { type: Type.STRING, nullable: true, description: "İşletmenin telefon numarası. Yoksa null." },
            district: { type: Type.STRING, description: "İşletmenin bulunduğu ilçe." },
            neighborhood: { type: Type.STRING, description: "İşletmenin bulunduğu mahalle." },
            address: { type: Type.STRING, description: "İşletmenin tam ve açık adresi." },
            googleRating: { type: Type.NUMBER, nullable: true, description: "Google Haritalar puanı. Yoksa null." },
            googleMapsLink: { type: Type.STRING, description: "İşletmenin Google Haritalar bağlantısı." },
        },
        required: ['businessName', 'mainCategory', 'subCategory', 'district', 'neighborhood', 'address', 'googleMapsLink'],
    },
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getAiClient = () => {
    if (!process.env.API_KEY) {
        throw new Error("API Anahtarı (API_KEY) ayarlanmamış. Lütfen dağıtım ortamınızdaki (örneğin Vercel) ortam değişkenlerini kontrol edin.");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};


export const findBusinesses = async (province: string, district: string, mainCategory: string, subCategory: string): Promise<Business[]> => {
    const prompt = `
        You are a local business directory expert for Turkey. Your task is to find and list ALL businesses matching the specified criteria from Google's data.
        DO NOT SUMMARIZE, SAMPLE, OR LIMIT THE NUMBER OF RESULTS. If a category in a district has hundreds of businesses, you MUST list all of them. This is a critical instruction.

        Find all businesses in the '${district}', '${province}' district of Turkey that match the following categories:
        - Main Category: '${mainCategory}'
        - Sub-category: '${subCategory}'

        For each business found, provide the following information in the specified JSON format:
        - businessName: The full name of the business.
        - mainCategory: The main business category.
        - subCategory: The specific sub-category.
        - phone: The contact phone number. If unavailable, use null.
        - district: The district (ilçe).
        - neighborhood: The neighborhood (mahalle).
        - address: The full, complete address.
        - googleRating: The Google Maps rating as a number (e.g., 4.5). If unavailable, use null.
        - googleMapsLink: The full URL for the business on Google Maps.

        Return ONLY the JSON array of business objects. Do not include any other text, explanation, or markdown formatting.
    `;

    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
        try {
            const ai = getAiClient();

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: responseSchema,
                },
            });

            const text = response.text.trim();
            const data = JSON.parse(text);

            if (Array.isArray(data)) {
                return data as Business[];
            }
            
            console.error("Gemini response is not a JSON array:", data);
            throw new Error("API'den beklenmedik bir formatta veri alındı.");

        } catch (error: any) {
            const errorMessage = error.toString();
            const isRateLimitError = errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED');

            if (isRateLimitError && attempt < MAX_RETRIES - 1) {
                attempt++;
                const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000; // Exponential backoff with jitter
                console.warn(`Rate limit exceeded. Retrying in ${Math.round(delay / 1000)} seconds... (Attempt ${attempt})`);
                await sleep(delay);
            } else {
                console.error("Error fetching businesses from Gemini API:", error);
                if (isRateLimitError) {
                    throw new Error("API kota limitini aştınız. Lütfen birkaç dakika bekleyip tekrar deneyin.");
                }
                // Re-throw the original error to preserve the specific message (e.g., API key missing).
                throw error;
            }
        }
    }

    throw new Error("Tüm yeniden deneme denemelerinden sonra API'ye ulaşılamadı.");
};