
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

  // Fix: Standardized transliteration map and improved weight-sum logic
  const transliteration: Record<string, number> = { 
    A:1, B:2, C:3, D:4, E:5, F:6, G:7, H:8, 
    J:1, K:2, L:3, M:4, N:5, P:7, R:9, 
    S:2, T:3, U:4, V:5, W:6, X:7, Y:8, Z:9 
  }; 
  const weights = [8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2]; 
  
  let sum = 0; 
  for (let i = 0; i < 17; i++) { 
    const char = v[i]; 
    const isNum = !isNaN(char as any);
    const value = isNum ? parseInt(char) : (transliteration[char] || 0);
    sum += value * weights[i]; 
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
  const prompt = `Identify VIN and License Plate. Standard VINs NEVER contain I, O, or Q. Circle = 0. Vertical Bar = 1.`;

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

/**
 * Batch analysis of multiple truck photos.
 */
// Fix: Added missing export batchAnalyzeTruckImages to resolve compilation error
export const batchAnalyzeTruckImages = async (files: (File | Blob)[]): Promise<ExtractedTruckData> => {
  const parts = await Promise.all(files.map(async (file) => {
    const b64 = await fileToBase64(file);
    return { inlineData: { mimeType: file.type || 'image/jpeg', data: b64 } };
  }));

  const prompt = `Analyze these truck-related photos (VIN, license plate, odometer, engine tag, etc.) and extract relevant data for California Clean Truck Check (CTC) compliance. 
  Focus on: VIN, License Plate, Mileage (Odometer), Engine Details (Family Name, Manufacturer, Model, Year), and Dot Number. 
  Standard VINs NEVER contain I, O, or Q. Circle = 0. Vertical Bar = 1.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAMES.FLASH,
      contents: {
        parts: [...parts, { text: prompt }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            vin: { type: Type.STRING },
            licensePlate: { type: Type.STRING },
            mileage: { type: Type.STRING },
            registeredOwner: { type: Type.STRING },
            contactName: { type: Type.STRING },
            contactEmail: { type: Type.STRING },
            contactPhone: { type: Type.STRING },
            engineFamilyName: { type: Type.STRING },
            engineManufacturer: { type: Type.STRING },
            engineModel: { type: Type.STRING },
            engineYear: { type: Type.STRING },
            eclCondition: { type: Type.STRING },
            dotNumber: { type: Type.STRING },
            inspectionDate: { type: Type.STRING },
            inspectionLocation: { type: Type.STRING },
            confidence: { type: Type.STRING }
          }
        }
      }
    });

    const json = JSON.parse(response.text || '{}');
    if (json.vin) json.vin = repairVin(json.vin);
    return json;
  } catch (error) {
    console.error("Batch Analysis Error:", error);
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
            systemInstruction: `You are 'VIN DIESEL AI', the regulatory assistant for California Clean Truck Check (CTC). ONLY answer CARB/CTC related questions. Tone: Professional and efficient.`,
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
            text: response.text || "CARB database offline.",
            groundingUrls: urls
        };
    } catch (e) { throw e; }
};

export const findTestersNearby = async (zipCode: string) => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Certified HD smoke testing stations near ${zipCode} CA.`,
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
