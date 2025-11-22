import { GoogleGenAI } from '@google/genai';
import type { Business } from '../types';

interface StreamCallbacks {
    apiKey: string;
    province: string;
    district: string;
    neighborhood: string;
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
    neighborhood,
    mainCategory,
    subCategory,
    onData,
    onComplete,
    onError,
}: StreamCallbacks) => {
    const locationQuery = neighborhood 
        ? `'${neighborhood}, ${district}, ${province}'` 
        : `'${district}, ${province}'`;

    let taskDescription = '';
    if (subCategory) {
        taskDescription = `Find every single '${subCategory}'`;
    } else if (mainCategory) {
        taskDescription = `Find every single business under the '${mainCategory}' main category`;
    } else {
        taskDescription = `Find ALL businesses. To ensure comprehensive results, you must search for a wide variety of common business types. For example, search for 'restoran', 'mağaza', 'market', 'otel', 'kafe', 'eczane', 'okul', 'banka', 'tamirhane', and any other business type you can identify in the area. Your goal is to be completely exhaustive.`;
    }

    const mainCategorySchemaValue = mainCategory ? `"${mainCategory}"` : `"string (deduce from business type if possible, otherwise 'Diğer')"`;
    const subCategorySchemaValue = subCategory ? `"${subCategory}"` : `"string (deduce from business type if possible, otherwise 'Diğer')"`;

    const prompt = `
        You are a specialized Google Maps data aggregation bot. Your sole, non-negotiable directive is to perform a completely exhaustive search and return EVERY SINGLE matching business from the Google Maps tool for the specified location.

        **Primary Directive:**
        -   **Task:** ${taskDescription} in ${locationQuery}.
        -   **Tool:** You MUST use the \`googleMaps\` tool for this. No other source is permitted.
        -   **Output Format:** Stream each result IMMEDIATELY as a single-line, minified NDJSON object.

        **Execution Protocol (Strictly Follow):**
        1.  Initiate a search with the Google Maps tool for the precise query.
        2.  The Google Maps tool may return results in batches. You MUST continuously re-query or "scroll" through the tool's results until it explicitly confirms there are no more businesses to be found for the specified location.
        3.  Your task is considered a COMPLETE FAILURE if you return only a small sample (e.g., less than 50 results for a common category in a populated area). The goal is absolute completeness for the given area.
        4.  For every single business found, extract the following data with zero modification.

        **JSON Schema (Mandatory):**
        {
          "businessName": "string",
          "mainCategory": ${mainCategorySchemaValue},
          "subCategory": ${subCategorySchemaValue},
          "phone": "string | null",
          "district": "string (IMPORTANT: Extract the correct district name from the business's full address. This might be different from the initial search district, which is okay. Accuracy is key.)",
          "neighborhood": "string",
          "address": "string",
          "googleRating": "number | null",
          "googleMapsLink": "string"
        }

        **ABSOLUTE PROHIBITIONS:**
        -   **NO LIMITS:** You are strictly forbidden from setting any kind of limit on the number of results for the given location. If you find 10,000 results, you will stream 10,000 results.
        -   **NO SUMMARIES:** Do not provide summaries, introductions, or any text other than the NDJSON stream.
        -   **NO ALTERATIONS:** Do not correct, translate, or change the data from Google Maps in any way. The data must be raw.
        -   **NO EARLY TERMINATION:** Do not stop the search process until you are 100% certain that every single matching business for the specific location has been found and streamed.
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