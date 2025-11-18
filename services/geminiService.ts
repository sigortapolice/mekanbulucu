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
        **Command:** Perform an exhaustive search and stream all results.

        **Search Criteria:**
        - Location: District '${district}', Province '${province}', Turkey.
        - Business Category: '${mainCategory}'
        - Business Sub-category: '${subCategory}'

        **ABSOLUTE REQUIREMENT: COMPLETE AND UNALTERED DATA STREAM**
        1.  **Exhaustive Search:** You MUST perform a deep and exhaustive search of all available Google Maps data for the specified location and category. Finding only 5-10 results for a common category in a large district is considered a failure. The expectation is a complete list, even if it contains hundreds or thousands of entries.
        2.  **Raw Data ONLY:** The data for each business (name, address, etc.) MUST be returned exactly as it is found on Google Maps. DO NOT modify, translate, summarize, or alter the information in any way.
        3.  **Immediate Streaming:** Stream each business as a single line of NDJSON the moment it is found. Do not buffer the results.
        4.  **Strict JSON Schema:** Every line must strictly adhere to this JSON object schema:
            {
              "businessName": "string",
              "mainCategory": "string",
              "subCategory": "string",
              "phone": "string | null",
              "district": "string",
              "neighborhood": "string",
              "address": "string",
              "googleRating": "number | null",
              "googleMapsLink": "string"
            }

        **Execution Constraints:**
        - DO NOT provide any text, explanation, or summary before or after the JSON stream.
        - DO NOT wrap the output in a list (\`[]\`).
        - DO NOT stop until all matching businesses have been streamed.
    `;

    try {
        const ai = new GoogleGenAI({ apiKey });
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