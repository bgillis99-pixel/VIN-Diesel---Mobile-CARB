
import { GoogleGenAI, Type } from "@google/genai";
import { MODEL_NAMES } from "../constants";
import { Job, Vehicle, ExtractedTruckData, ImageGenerationConfig, Lead, AIAnalyticsReport } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const isValidVinFormat = (vin: string): boolean => {
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
  return vinRegex.test(vin.toUpperCase());
};

export const validateVINCheckDigit = (vin: string): boolean => {
  if (!vin || vin.length !== 17) return false;
  const v = vin.toUpperCase();
  if (!isValidVinFormat(v)) return false;

  const transliteration: Record<string, number> = { 
    A:1, B:2, C:3, D:4, E:5, f:6, G:7, H:8, 
    J:1, K:2, L:3, M:4, N:5, P:7, R:9, 
    S:2, T:3, U:4, V:5, W:6, X:7, Y:8, Z:9 
  }; 
  const weights = [8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2]; 
  
  let sum = 0; 
  for (let i = 0; i < 17; i++) { 
    const char = v[i]; 
    const value = isNaN(char as any) ? transliteration[char] : transliteration[char] || 0; 
    sum += (isNaN(parseInt(char)) ? transliteration[char] : parseInt(char)) * weights[i]; 
  } 
  
  const remainder = sum % 11; 
  const checkDigit = remainder === 10 ? 'X' : remainder.toString(); 
  return v[8] === checkDigit;
};

export const repairVin = (vin: string): string => {
    // Standard VIN protocol: NEVER I, O, or Q.
    let repaired = vin.toUpperCase().replace(/[^A-Z0-9]/g, '');
    repaired = repaired.replace(/[OQ]/g, '0');
    repaired = repaired.replace(/[I]/g, '1');
    return repaired;
};

/**
 * AI-Driven Marketing Intelligence and Metadata Analysis
 */
export const generateMarketingInsights = async (rawMetadata: any): Promise<AIAnalyticsReport> => {
  const prompt = `Act as a world-class Marketing Strategist for a California Heavy-Duty Compliance firm.
  Analyze the following application metadata and usage patterns:
  ${JSON.stringify(rawMetadata)}

  Return a JSON object containing:
  - "summary": A high-level overview of app health and market penetration.
  - "marketingStrategy": A 3-point plan to increase conversion (mention specific regions or tactics).
  - "whatsWorking": A list of successful features or user behaviors identified.
  - "suggestedActions": A list of technical or marketing steps to take next.
  
  Return ONLY valid JSON.`;

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
 * Enhanced extraction prompt for both VIN and License Plate.
 */
export const extractVinAndPlateFromImage = async (file: File | Blob): Promise<{vin: string, plate: string, confidence: string}> => {
  const b64 = await fileToBase64(file);
  const prompt = `Identify the 17-character VIN and the License Plate number from this vehicle photo.

CRITICAL VIN CHARACTER RESOLUTION:
1. Standard VINs NEVER contain letters I, O, or Q.
2. Circle shapes 'O' or 'Q' are ALWAYS digit '0' (ZERO).
3. Vertical bars 'I' are ALWAYS digit '1' (ONE).

Return ONLY valid JSON:
{
  "vin": "EXACT_17_CHAR_VIN",
  "plate": "LICENSE_PLATE_IF_VISIBLE",
  "confidence": "high|medium|low"
}`;

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
    console.error("Extraction Error:", error);
    return { vin: '', plate: '', confidence: 'low' };
  }
};

/**
 * Enhanced VIN extraction prompt focusing on field ambiguity.
 */
export const extractVinFromImage = async (file: File | Blob): Promise<{vin: string, description: string, confidence: string}> => {
  const result = await extractVinAndPlateFromImage(file);
  return {
    vin: result.vin,
    description: result.plate ? `Plate detected: ${result.plate}` : 'Optics verification complete.',
    confidence: result.confidence
  };
};

export const sendMessage = async (
  text: string, 
  mode: 'standard' | 'search' | 'maps' | 'thinking', 
  history: any[], 
  location?: { lat: number, lng: number },
  imageData?: { data: string, mimeType: string }
) => {
    try {
        let modelName = mode === 'thinking' ? MODEL_NAMES.PRO : MODEL_NAMES.FLASH;
        const config: any = { 
            systemInstruction: `You are 'VIN DIESEL AI', the official regulatory assistant for California Clean Truck Check (CTC).
            You ONLY answer questions related to CARB regulations, HD I/M protocols, and CTC compliance.
            Rule #1: Standard VINs NEVER contain I, O, or Q.
            Rule #2: Direct users to register in the CTC-VIS portal for official compliance.
            Rule #3: If a user asks a non-CARB question, politely decline and steer them back to trucking compliance.
            Tone: Professional, credentialed, and focused on helping testers and fleets avoid state hotline waits.
            Support Reference: "Text/Call: 617-359-6953"`,
            tools: [{ googleSearch: {} }]
        };
        
        if (mode === 'thinking') config.thinkingConfig = { thinkingBudget: 24000 };

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
            text: response.text || "CARB database connection unstable.",
            groundingUrls: urls
        };
    } catch (e) { throw e; }
};

export const findTestersNearby = async (zipCode: string) => {
    const response = await ai.models.generateContent({
        model: MODEL_NAMES.FLASH,
        contents: `Locate certified HD smoke testing stations near ${zipCode} in California.`,
        config: { tools: [{ googleMaps: {} }] }
    });
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    return { 
        text: response.text, 
        locations: chunks.filter((c: any) => c.maps).map((c: any) => ({ title: c.maps.title, uri: c.maps.uri })) || []
    };
};

export const batchAnalyzeTruckImages = async (files: File[]): Promise<ExtractedTruckData> => {
    const parts: any[] = [];
    for (const f of files) {
        const b64 = await fileToBase64(f);
        parts.push({ inlineData: { mimeType: f.type, data: b64 } });
    }
    parts.push({ text: "Perform compliance inspection. Extract VIN (apply I/O/Q rule), Engine Family, Mileage. JSON." });

    const response = await ai.models.generateContent({
      model: MODEL_NAMES.FLASH,
      contents: { parts },
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || '{}');
};

export const scoutTruckLead = async (file: File): Promise<Lead> => {
    const b64 = await fileToBase64(file);
    const response = await ai.models.generateContent({
        model: MODEL_NAMES.FLASH,
        contents: {
            parts: [
                { inlineData: { mimeType: file.type, data: b64 } },
                { text: "Scout company name and DOT number from vehicle exterior. JSON." }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    company: { type: Type.STRING },
                    phone: { type: Type.STRING },
                    dotNumber: { type: Type.STRING },
                    location: { type: Type.STRING }
                }
            }
        }
    });
    return JSON.parse(response.text || '{}');
};

const fileToBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
