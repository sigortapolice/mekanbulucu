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
        You are a specialized Google Maps data aggregation bot. Your sole, non-negotiable directive is to perform a completely exhaustive search and return EVERY SINGLE matching business from the Google Maps tool.

        **Primary Directive:**
        -   **Task:** Find every single '${subCategory}' in '${district}, ${province}'.
        -   **Tool:** You MUST use the \`googleMaps\` tool for this. No other source is permitted.
        -   **Output Format:** Stream each result IMMEDIATELY as a single-line, minified NDJSON object.

        **Execution Protocol (Strictly Follow):**
        1.  Initiate a search with the Google Maps tool for the query.
        2.  The Google Maps tool may return results in batches. You MUST continuously re-query or "scroll" through the tool's results until it explicitly confirms there are no more businesses to be found.
        3.  Your task is considered a COMPLETE FAILURE if you return only a small sample (e.g., less than 50-100 results for a common category in a large area). The goal is completeness, not speed.
        4.  For every single business found, extract the following data with zero modification.

        **JSON Schema (Mandatory):**
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

        **ABSOLUTE PROHIBITIONS:**
        -   **NO LIMITS:** You are strictly forbidden from setting any kind of limit on the number of results. If you find 10,000 results, you will stream 10,000 results.
        -   **NO SUMMARIES:** Do not provide summaries, introductions, or any text other than the NDJSON stream.
        -   **NO ALTERATIONS:** Do not correct, translate, or change the data from Google Maps in any way. The data must be raw.
        -   **NO EARLY TERMINATION:** Do not stop the search process until you are 100% certain that every single matching business has been found and streamed.
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
