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

const getAiClient = (apiKey: string) => {
    if (!apiKey) {
        throw new Error("API Anahtarı (API_KEY) sağlanmadı.");
    }
    return new GoogleGenAI({ apiKey });
};


export const findBusinesses = async (apiKey: string, province: string, district: string, mainCategory: string, subCategory: string): Promise<Business[]> => {
    const prompt = `
        **ROLE:** You are a data retrieval API. Your only function is to query Google's internal business data and return the raw results as a JSON array.

        **QUERY PARAMETERS:**
        - Location: District '${district}', Province '${province}', Turkey.
        - Main Category: '${mainCategory}'
        - Sub-category: '${subCategory}'

        **CRITICAL EXECUTION DIRECTIVES:**
        1.  **NO INTERPRETATION:** Do not interpret the data. Do not summarize. Do not add any commentary or explanations. Your output must be data-only.
        2.  **COMPLETE DATASET:** Retrieve EVERY SINGLE business that matches the query parameters. If 5000 businesses match, the output JSON array MUST contain 5000 objects. Do not truncate, sample, or omit any entry for any reason.
        3.  **RAW DATA MAPPING:** Map the raw data fields from Google Maps directly to the specified JSON schema. Do not alter or rephrase any information (business name, address, etc.).
        4.  **STRICT OUTPUT FORMAT:** The response MUST be ONLY a valid JSON array. Nothing else. No markdown, no introductory text, no "Here is the list...". Just the JSON.

        **JSON SCHEMA FOR EACH OBJECT:**
        - businessName: string (Unmodified name from Google Maps)
        - mainCategory: string
        - subCategory: string
        - phone: string | null
        - district: string
        - neighborhood: string
        - address: string (Unmodified address from Google Maps)
        - googleRating: number | null
        - googleMapsLink: string (Direct URL from Google Maps)
    `;

    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
        try {
            const ai = getAiClient(apiKey);

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
            if (errorMessage.includes('API key not valid')) {
                throw new Error('Sağlanan API Anahtarı geçersiz. Lütfen anahtarınızı kontrol edin.');
            }

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
                // Re-throw the original error to preserve the specific message.
                throw error;
            }
        }
    }

    throw new Error("Tüm yeniden deneme denemelerinden sonra API'ye ulaşılamadı.");
};