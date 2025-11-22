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
    
    const neighborhoodValidationRule = neighborhood 
        ? `3.  Compare the neighborhood in the address with the target neighborhood: '${neighborhood}'.` 
        : '';
    const neighborhoodSchemaRule = neighborhood ? `'${neighborhood}'` : 'any';


    const prompt = `
        You are a hyper-precise Google Maps data extraction bot. Your mission is to find and return every single business matching the criteria within a strictly defined geographical area. Adherence to the location boundary is your absolute top priority.

        **Task:** ${taskDescription} in the location: ${locationQuery}.

        **CRITICAL VALIDATION PROTOCOL (MANDATORY):**
        For every single business the \`googleMaps\` tool finds, you MUST perform the following validation before streaming its data:
        1.  Examine the full address of the business.
        2.  Compare the district in the address with the target district: '${district}'.
        ${neighborhoodValidationRule}
        4.  **NON-NEGOTIABLE RULE:** If the business's address does NOT contain the EXACT district (and neighborhood, if specified) from the search query, you MUST DISCARD that result. DO NOT stream it. Minor variations like 'Mahallesi' or case differences are acceptable, but the core names must match.
        5.  For example, if the search is for 'Davutdede, Yıldırım', a business located in 'Elmasbahçeler, Osmangazi' is an INVALID result and must be ignored.

        **Execution and Output:**
        -   **Tool:** Use the \`googleMaps\` tool exclusively.
        -   **Exhaustiveness:** Within the strict location boundary defined above, find ALL matching businesses. Do not stop until the tool has no more results for that specific area. Your task is a failure if you miss businesses within the target zone.
        -   **Output Format:** Stream each VALIDATED result IMMEDIATELY as a single-line, minified NDJSON object.

        **JSON Schema (Mandatory for Validated Results):**
        {
          "businessName": "string",
          "mainCategory": ${mainCategorySchemaValue},
          "subCategory": ${subCategorySchemaValue},
          "phone": "string | null",
          "district": "string (Must exactly match '${district}')",
          "neighborhood": "string (Must exactly match ${neighborhoodSchemaRule} if specified)",
          "address": "string",
          "googleRating": "number | null",
          "googleMapsLink": "string",
          "placeId": "string (Unique Google Place ID)",
          "reviewCount": "number | null (Total number of reviews)"
        }

        **ABSOLUTE PROHIBITIONS:**
        -   **NO LOCATION EXPANSION:** You are strictly forbidden from expanding the search area. Only results from ${locationQuery} are permitted.
        -   **NO SUMMARIES:** Do not provide any text other than the NDJSON stream.
        -   **NO DATA ALTERATION:** Stream the raw data for validated businesses only.
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