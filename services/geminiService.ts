
import { GoogleGenAI, Type } from "@google/genai";
import { MODEL_NAMES } from "../constants";
import { Job, Vehicle, ExtractedTruckData, ImageGenerationConfig, Lead, AIAnalyticsReport } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Validates basic VIN format excluding forbidden letters I, O, Q.
 */
export const isValidVinFormat = (vin: string): boolean => {
  const v = vin.toUpperCase().trim();
  // Standard VINs are exactly 17 characters and exclude I, O, and Q.
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
  return vinRegex.test(v);
};

/**
 * Implements the standard MOD 11 Check Digit algorithm for VIN validation.
 * Used to ensure character accuracy before state registry lookup.
 */
export const validateVINCheckDigit = (vin: string): boolean => {
  if (!vin || vin.length !== 17) return false;
  const v = vin.toUpperCase().trim();
  
  // Basic format check including I, O, Q exclusion
  if (!isValidVinFormat(v)) return false;

  // Standard transliteration map for alphabetical characters (US CFR 565)
  const transliteration: Record<string, number> = { 
    A:1, B:2, C:3, D:4, E:5, F:6, G:7, H:8, 
    J:1, K:2, L:3, M:4, N:5, P:7, R:9, 
    S:2, T:3, U:4, V:5, W:6, X:7, Y:8, Z:9 
  }; 
  
  // Positional weights defined by the federal VIN standard
  const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2]; 
  
  let sum = 0; 
  for (let i = 0; i < 17; i++) { 
    const char = v[i]; 
    let value: number;
    
    if (/[0-9]/.test(char)) {
      value = parseInt(char, 10);
    } else {
      value = transliteration[char] || 0;
    }
    
    sum += value * weights[i]; 
  } 
  
  const remainder = sum % 11; 
  // Remainder 10 is represented as the letter 'X'
  const calculatedCheckDigit = remainder === 10 ? 'X' : remainder.toString(); 
  
  // The check digit is located at the 9th position (index 8)
  return v[8] === calculatedCheckDigit;
};

/**
 * Corrects common user optical errors (mistaking I for 1, O/Q for 0).
 */
export const repairVin = (vin: string): string => {
    let repaired = vin.toUpperCase().replace(/[^A-Z0-9]/g, '');
    repaired = repaired.replace(/[OQ]/g, '0');
    repaired = repaired.replace(/[I]/g, '1');
    return repaired;
};

/**
 * AI-Driven Marketing Intelligence
 */
export const generateMarketingInsights = async (rawMetadata: any): Promise<AIAnalyticsReport> => {
  const prompt = `Analyze application metadata and usage: ${JSON.stringify(rawMetadata)}`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAMES.PRO,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            marketingStrategy: { type: Type.STRING },
            whatsWorking: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedActions: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["summary", "marketingStrategy", "whatsWorking", "suggestedActions"]
        }
      }
    });

    return {
      ...JSON.parse(response.text || '{}'),
      timestamp: Date.now()
    };
  } catch (error) {
    console.error("AI Analytics Error:", error);
    throw error;
  }
};

/**
 * Extraction prompt for both VIN and License Plate.
 */
export const extractVinAndPlateFromImage = async (file: File | Blob): Promise<{vin: string, plate: string, confidence: string}> => {
  const b64 = await fileToBase64(file);
  const prompt = `Extract VIN and License Plate. CRITICAL RULE: VINs NEVER contain letters I, O, or Q. Circle = 0. Vertical Bar = 1. Return JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAMES.FLASH,
      contents: {
        parts: [
          { inlineData: { mimeType: file.type || 'image/jpeg', data: b64 } },
          { text: prompt }
        ]
      },
      config: {
          responseMimeType: "application/json",
          responseSchema: {
              type: Type.OBJECT,
              properties: {
                  vin: { type: Type.STRING },
                  plate: { type: Type.STRING },
                  confidence: { type: Type.STRING }
              },
              required: ["vin", "plate", "confidence"]
          }
      }
    });

    const json = JSON.parse(response.text || '{}');
    const vin = repairVin(json.vin || '');
    const plate = (json.plate || '').toUpperCase().trim();
    
    return {
        vin: vin,
        plate: plate,
        confidence: json.confidence || 'low'
    };
  } catch (error) {
    return { vin: '', plate: '', confidence: 'low' };
  }
};

export const batchAnalyzeTruckImages = async (files: (File | Blob)[]): Promise<ExtractedTruckData> => {
  const parts = await Promise.all(files.map(async (file) => {
    const b64 = await fileToBase64(file);
    return { inlineData: { mimeType: file.type || 'image/jpeg', data: b64 } };
  }));

  const prompt = `Perform comprehensive batch analysis of these fleet photos. Extract VIN, License Plate, and Engine Details. Standard VIN rules apply (No I, O, Q).`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAMES.FLASH,
      contents: {
        parts: [...parts, { text: prompt }]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const json = JSON.parse(response.text || '{}');
    if (json.vin) json.vin = repairVin(json.vin);
    return json;
  } catch (error) {
    return { confidence: 'low' };
  }
};

export const sendMessage = async (
  text: string, 
  mode: 'standard' | 'search' | 'maps' | 'thinking', 
  history: any[], 
  location?: { lat: number, lng: number },
  imageData?: { data: string, mimeType: string }
) => {
    try {
        let modelName = mode === 'thinking' ? MODEL_NAMES.PRO : MODEL_NAMES.FLASH_LITE;
        const config: any = { 
            systemInstruction: `You are 'VIN DIESEL AI', the regulatory assistant for California Clean Truck Check (CTC). You provide high-accuracy guidance on CARB compliance. If a query is unrelated to trucking or CARB, steer back to the topic. Support: 617-359-6953.`,
            tools: [{ googleSearch: {} }]
        };
        
        if (mode === 'thinking') config.thinkingConfig = { thinkingBudget: 32768 };

        const currentParts: any[] = [];
        if (imageData) currentParts.push({ inlineData: imageData });
        currentParts.push({ text });

        const response = await ai.models.generateContent({
            model: modelName,
            contents: [...history, { role: 'user', parts: currentParts }],
            config
        });

        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const urls = chunks.map((c: any) => ({ uri: c.web?.uri || c.maps?.uri, title: c.web?.title || c.maps?.title })).filter((u: any) => u.uri);

        return {
            text: response.text || "Database connection interrupted.",
            groundingUrls: urls
        };
    } catch (e) { throw e; }
};

export const findTestersNearby = async (zipCode: string) => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Locate active certified heavy-duty smoke testing stations in or near ${zipCode} California.`,
        config: { tools: [{ googleMaps: {} }] }
    });
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    return { 
        text: response.text, 
        locations: chunks.filter((c: any) => c.maps).map((c: any) => ({ title: c.maps.title, uri: c.maps.uri })) || []
    };
};

const fileToBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
