import { GoogleGenAI } from '@google/genai';
import type { Business } from '../types';

// FIX: API key is now retrieved from environment variables as per guidelines, and the function no longer takes an argument.
const getAiClient = () => {
    if (!process.env.API_KEY) {
        // This error message is for developers, not users, as the key should be pre-configured.
        throw new Error("API Anahtarı (API_KEY) ortam değişkenlerinde ayarlanmamış.");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

interface StreamCallbacks {
    // FIX: apiKey is no longer passed as an argument.
    province: string;
    district: string;
    mainCategory: string;
    subCategory: string;
    onData: (business: Business) => void;
    onComplete: () => void;
    onError: (error: Error) => void;
}

export const findBusinessesStream = async ({
    province,
    district,
    mainCategory,
    subCategory,
    onData,
    onComplete,
    onError,
}: StreamCallbacks) => {
    const prompt = `
        **ROLE:** You are a data retrieval API. Your only function is to query Google's internal business data and return the raw results as a stream of JSON objects.

        **QUERY PARAMETERS:**
        - Location: District '${district}', Province '${province}', Turkey.
        - Main Category: '${mainCategory}'
        - Sub-category: '${subCategory}'

        **CRITICAL EXECUTION DIRECTIVES:**
        1.  **NO INTERPRETATION:** Do not interpret the data. Do not summarize. Do not add any commentary or explanations.
        2.  **COMPLETE DATASET:** Retrieve EVERY SINGLE business that matches the query parameters. Stream every single entry you find immediately. Do not wait to complete the full list before starting the stream.
        3.  **RAW DATA MAPPING:** Map the raw data fields from Google Maps directly to the JSON format below. Do not alter or rephrase any information.
        4.  **STRICT OUTPUT FORMAT:** The response MUST be ONLY a stream of valid JSON objects, one per line (Newline Delimited JSON - NDJSON). Each line must be a complete JSON object. Do not wrap the output in a JSON array (\`[]\`) or use commas between lines.

        **JSON SCHEMA FOR EACH LINE (EACH OBJECT):**
        {
          "businessName": "string (Unmodified name from Google Maps)",
          "mainCategory": "string",
          "subCategory": "string",
          "phone": "string | null",
          "district": "string",
          "neighborhood": "string",
          "address": "string (Unmodified address from Google Maps)",
          "googleRating": "number | null",
          "googleMapsLink": "string (Direct URL from Google Maps)"
        }
    `;

    try {
        // FIX: The AI client is now initialized without a passed API key.
        const ai = getAiClient();
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        let buffer = '';
        for await (const chunk of responseStream) {
            buffer += chunk.text;
            
            let newlineIndex;
            while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                const line = buffer.substring(0, newlineIndex).trim();
                buffer = buffer.substring(newlineIndex + 1);

                if (line) {
                    try {
                        const business = JSON.parse(line);
                        onData(business as Business);
                    } catch (parseError) {
                        console.warn('Skipping malformed JSON line:', line, parseError);
                    }
                }
            }
        }
        
        if (buffer.trim()) {
            try {
                const business = JSON.parse(buffer.trim());
                onData(business as Business);
            // FIX: Removed incorrect arrow function '=>' from catch block. This was causing multiple cascading scope errors.
            } catch (parseError) {
                console.warn('Skipping malformed JSON line at end of stream:', buffer.trim(), parseError);
            }
        }
        
        onComplete();

    } catch (error: any) {
        const errorMessage = error.toString();
        if (errorMessage.includes('API key not valid')) {
            // Note: This error is less likely now, but kept for robustness.
            onError(new Error('Sağlanan API Anahtarı geçersiz. Lütfen anahtarınızı kontrol edin.'));
        } else if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
             onError(new Error("API kota limitini aştınız. Lütfen birkaç dakika bekleyip tekrar deneyin."));
        } else {
            console.error("Error fetching businesses from Gemini API:", error);
            onError(error as Error);
        }
    }
};
