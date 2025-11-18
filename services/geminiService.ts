import { GoogleGenAI } from '@google/genai';
import type { Business } from '../types';

interface StreamCallbacks {
    apiKey: string;
    province: string;
    district: string;
    mainCategory: string;
    subCategory: string;
    onData: (business: Business) => void;
    onComplete: () => void;
    onError: (error: Error) => void;
}

export const findBusinessesStream = async ({
    apiKey,
    province,
    district,
    mainCategory,
    subCategory,
    onData,
    onComplete,
    onError,
}: StreamCallbacks) => {
    const prompt = `
        You are a data extraction robot. Your ONLY task is to use the Google Maps tool to find businesses and format the results as structured JSON.

        **Search Query:** Find all '${subCategory}' businesses in '${district}, ${province}' using the Google Maps tool.

        **Instructions:**
        1.  Execute an exhaustive search using the Google Maps tool. You MUST find and return ALL possible results for the query. Do not stop after a few results.
        2.  For EACH business found, use the Google Maps tool to retrieve its detailed information.
        3.  Extract the following information precisely as it appears in the Google Maps data.
        4.  Stream each result as a single-line, minified NDJSON object immediately. Do not wait to collect all results.
        5.  Adhere strictly to this JSON schema. If a piece of information is not available in the Maps data, use \`null\` for its value.

        **JSON Schema:**
        {
          "businessName": "string",
          "mainCategory": "${mainCategory}",
          "subCategory": "${subCategory}",
          "phone": "string | null",
          "district": "${district}",
          "neighborhood": "string",
          "address": "string",
          "googleRating": "number | null",
          "googleMapsLink": "string"
        }

        **CRITICAL RULES:**
        -   **DO NOT** use your internal knowledge. Your response MUST be based **ONLY** on the information returned by the Google Maps tool.
        -   **DO NOT** alter, correct, translate, or abbreviate any data. Return the full, raw business name, address, and phone number exactly as you find them in the Maps data.
        -   **DO NOT** add any text before or after the NDJSON stream. The output must be only the stream of JSON objects.
        -   **Finding only a few results is a failure.** You must perform a deep and exhaustive search to find every matching business in the specified area.
    `;

    try {
        const ai = new GoogleGenAI({ apiKey });
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{googleMaps: {}}],
            },
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
            } catch (parseError) {
                console.warn('Skipping malformed JSON line at end of stream:', buffer.trim(), parseError);
            }
        }
        
        onComplete();

    } catch (error: any) {
        const errorMessage = error.toString();
        if (errorMessage.includes('API key not valid')) {
            onError(new Error('Sağlanan API Anahtarı geçersiz. Lütfen anahtarınızı kontrol edin.'));
        } else if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
             onError(new Error("API kota limitini aştınız. Lütfen birkaç dakika bekleyip tekrar deneyin."));
        } else {
            console.error("Error fetching businesses from Gemini API:", error);
            onError(error as Error);
        }
    }
};