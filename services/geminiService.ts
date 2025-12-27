
import { GoogleGenAI, Type } from "@google/genai";
import { MODEL_NAMES } from "../constants";
import { Job, Vehicle, ExtractedTruckData, ImageGenerationConfig } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Validates the VIN check digit (position 9) using the MOD 11 algorithm
 * as per the user's exact specification.
 */
export const validateVINCheckDigit = (vin: string): boolean => {
  if (!vin || vin.length !== 17) return false;
  
  // Strict regex check: 17 chars, A-H, J-N, P, R-Z, 0-9 (no I, O, Q)
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
  if (!vinRegex.test(vin)) return false;

  const transliteration: Record<string, number> = { 
    A:1, B:2, C:3, D:4, E:5, F:6, G:7, H:8, 
    J:1, K:2, L:3, M:4, N:5, P:7, R:9, 
    S:2, T:3, U:4, V:5, W:6, X:7, Y:8, Z:9 
  }; 
  const weights = [8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2]; 
  
  let sum = 0; 
  for (let i = 0; i < 17; i++) { 
    const char = vin[i]; 
    const value = isNaN(char as any) ? transliteration[char] : parseInt(char); 
    sum += value * weights[i]; 
  } 
  
  const remainder = sum % 11; 
  const checkDigit = remainder === 10 ? 'X' : remainder.toString(); 
  return vin[8] === checkDigit;
};

export const repairVin = (vin: string): string => {
    // Basic repair logic for common OCR confusions before validation
    let repaired = vin.toUpperCase().replace(/[^A-Z0-9]/g, '');
    repaired = repaired.replace(/[IOQ]/g, (m) => m === 'I' ? '1' : '0');
    return repaired;
};

export const SYSTEM_INSTRUCTION = `
You are VIN DIESEL, a specialized AI Compliance Officer for the California Clean Truck Check (HD I/M) Program.
Your goal is to provide accurate, proactive, and friendly advice to truck owners and testers.

SEARCH PROTOCOL:
Prioritize site:cleantruckcheck.arb.ca.gov and site:norcalcarbmobile.com.

STRICT SCOPE:
- Focus on Diesel vehicles over 14,000 lbs GVWR.
- NO Nutrition/Carbs advice.
- NO Gasoline vehicle advice unless explaining why they are exempt.

MANDATORY FOOTER:
Include this at the end of every response:
"Need clarity? Text/Call a Tester: 617-359-6953"
`;

export const sendMessage = async (
  text: string, 
  mode: 'standard' | 'search' | 'maps' | 'thinking', 
  history: any[], 
  location?: { lat: number, lng: number },
  imageData?: { data: string, mimeType: string }
) => {
  try {
    let modelName = MODEL_NAMES.FLASH;
    if (mode === 'maps') {
      modelName = 'gemini-2.5-flash-preview-09-2025';
    }

    let config: any = { 
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: mode === 'maps' ? [{ googleMaps: {} }] : (mode === 'search' || mode === 'standard' ? [{ googleSearch: {} }] : [])
    };
    
    if (mode === 'thinking') {
      modelName = MODEL_NAMES.PRO;
      config.thinkingConfig = { thinkingBudget: 32768 };
    } else if (imageData) {
      modelName = MODEL_NAMES.PRO;
    }

    if (mode === 'maps' && location) {
      config.toolConfig = { retrievalConfig: { latLng: { latitude: location.lat, longitude: location.lng } } };
    }

    const currentParts: any[] = [];
    if (imageData) {
        currentParts.push({ inlineData: { mimeType: imageData.mimeType, data: imageData.data } });
    }
    currentParts.push({ text });

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [...history, { role: 'user', parts: currentParts }],
      config
    });

    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const groundingChunks = groundingMetadata?.groundingChunks || [];
    let groundingUrls: Array<{uri: string, title: string}> = [];
    
    if (groundingChunks.length > 0) {
      groundingUrls = groundingChunks
        .map((c: any) => {
            if (c.web) return { uri: c.web.uri, title: c.web.title };
            if (c.maps) return { uri: c.maps.uri, title: c.maps.title };
            return null;
        })
        .filter((u: any) => u !== null);
    }

    return {
      text: response.text || "I couldn't generate a response.",
      groundingUrls,
      isOffline: false
    };
  } catch (error: any) {
    console.error("Gemini Error:", error);
    throw error;
  }
};

export const findTestersNearby = async (zipCode: string, location?: { lat: number, lng: number }) => {
  try {
    const prompt = `Find certified CARB HD I/M Clean Truck Check testers and commercial smoke testing stations near zip code ${zipCode}. Focus on mobile units if available.`;
    const config: any = { tools: [{ googleMaps: {} }] };
    if (location) {
      config.toolConfig = { retrievalConfig: { latLng: { latitude: location.lat, longitude: location.lng } } };
    }
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-09-2025',
      contents: prompt,
      config
    });
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const locations = groundingChunks
      .filter((chunk: any) => chunk.maps)
      .map((chunk: any) => ({
        title: chunk.maps.title,
        uri: chunk.maps.uri,
      }));
    return { text: response.text, locations };
  } catch (error) {
    console.error("Maps Grounding Error:", error);
    return { text: "Search failed", locations: [] };
  }
};

export const extractVinFromImage = async (file: File): Promise<{vin: string, description: string, confidence: string}> => {
  const b64 = await fileToBase64(file);
  const prompt = `SYSTEM: You are a VIN extraction specialist. Extract the 17-character Vehicle Identification Number from this photo of a VIN plate.
RULES:
- VINs are exactly 17 characters
- VINs never contain I, O, or Q (often confused with 1, 0)
- If you see I, replace with 1
- If you see O, replace with 0
- Common confusions: 8/B, 5/S, 0/D, 1/I, 2/Z
OUTPUT FORMAT (JSON only):
{
  "vin": "string or null",
  "confidence": "high|medium|low",
  "notes": "any issues or ambiguities"
}`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAMES.PRO,
      contents: {
        parts: [
          { inlineData: { mimeType: file.type, data: b64 } },
          { text: prompt }
        ]
      },
      config: {
          responseMimeType: "application/json",
          responseSchema: {
              type: Type.OBJECT,
              properties: {
                  vin: { type: Type.STRING },
                  confidence: { type: Type.STRING },
                  notes: { type: Type.STRING }
              }
          }
      }
    });

    let json = JSON.parse(response.text || '{}');
    let vin = repairVin(json.vin || '');
    
    return {
        vin: vin,
        confidence: json.confidence || 'low',
        description: json.notes || (validateVINCheckDigit(vin) ? 'Verified' : 'Manual review recommended')
    };
  } catch (error) {
    console.error("VIN Extract Error:", error);
    return { vin: '', description: 'Scan failed', confidence: 'low' };
  }
};

export const extractEclLabel = async (file: File): Promise<any> => {
  const b64 = await fileToBase64(file);
  const prompt = `SYSTEM: Extract Emission Control Label (ECL) data from this photo.
EXTRACT THESE FIELDS:
- Engine Family Name (format: usually starts with letter, ~12 chars)
- Engine Manufacturer (e.g., Cummins, Paccar, Detroit Diesel, Caterpillar)
- Engine Model (e.g., ISX, PX-8, DD15, C15)
- Engine Year (4-digit year)
- ECL Condition: assess if label is clear/faded/damaged/missing
OUTPUT FORMAT (JSON only):
{
  "engineFamilyName": "string or null",
  "engineManufacturer": "string or null", 
  "engineModel": "string or null",
  "engineYear": number or null,
  "eclCondition": "clear|faded|damaged|missing",
  "confidence": "high|medium|low"
}`;

  const response = await ai.models.generateContent({
    model: MODEL_NAMES.PRO,
    contents: {
      parts: [
        { inlineData: { mimeType: file.type, data: b64 } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json"
    }
  });
  return JSON.parse(response.text || '{}');
};

export const extractOdometer = async (file: File): Promise<{mileage: string, confidence: string}> => {
  const b64 = await fileToBase64(file);
  const prompt = `SYSTEM: Extract mileage from this odometer photo.
RULES:
- Return numeric value only (no commas)
- If digital display shows multiple values, extract the main odometer
- Ignore trip meters
OUTPUT FORMAT (JSON only):
{
  "mileage": number or null,
  "displayType": "digital|analog",
  "confidence": "high|medium|low"
}`;
  const response = await ai.models.generateContent({
      model: MODEL_NAMES.PRO,
      contents: { parts: [{ inlineData: { mimeType: file.type, data: b64 } }, { text: prompt }] },
      config: { responseMimeType: "application/json" }
  });
  const json = JSON.parse(response.text || '{}');
  return { mileage: String(json.mileage || ''), confidence: json.confidence };
};

export const extractCompanyInfo = async (file: File): Promise<any> => {
    const b64 = await fileToBase64(file);
    const prompt = `SYSTEM: Extract company information from this truck photo.
LOOK FOR:
- Company name on door, cab, or trailer
- Phone numbers (format as (XXX) XXX-XXXX)
- DOT/MC numbers
- City/location text
OUTPUT FORMAT (JSON only):
{
  "companyName": "string or null",
  "phone": "string or null",
  "dotNumber": "string or null",
  "mcNumber": "string or null",
  "location": "string or null"
}`;
    const response = await ai.models.generateContent({
        model: MODEL_NAMES.PRO,
        contents: { parts: [{ inlineData: { mimeType: file.type, data: b64 } }, { text: prompt }] },
        config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || '{}');
};

export const batchAnalyzeTruckImages = async (files: File[]): Promise<ExtractedTruckData> => {
  const parts: any[] = [];
  for (const file of files) {
    const b64 = await fileToBase64(file);
    parts.push({ inlineData: { mimeType: file.type, data: b64 } });
  }

  const prompt = `OBJECTIVE: You are a high-precision CARB (California Air Resources Board) Field Diagnostic Engineer. 
You are analyzing a set of photos from a heavy-duty diesel truck inspection (OVI - Opacity & Visual Inspection).

INSTRUCTIONS:
1. Examine all provided photos to extract the required fields.
2. PRIORITIZE these critical compliance fields:
   - VIN: The 17-character Vehicle Identification Number. Clean it (no I, O, Q) and validate strictly.
   - MILEAGE: The primary numerical odometer reading. Ignore trip meters.
   - ENGINE FAMILY NAME (EFN): Typically a 12-character alphanumeric code found on the Emission Control Label (ECL).
   - REGISTERED OWNER: The company name visible on the door, registration, or cab markings.
3. EXTRACT other details if visible (Manufacturer, DOT number, etc.).
4. ASSESS the ECL Condition (clear, faded, damaged, or missing).

OUTPUT RULES:
- Return ONLY a valid JSON object.
- NO markdown formatting (no \`\`\`json blocks).
- Ensure all values are strings or null.

JSON SCHEMA:
{
  "vin": "string",
  "licensePlate": "string",
  "mileage": "string",
  "registeredOwner": "string",
  "contactName": "string",
  "contactEmail": "string",
  "contactPhone": "string",
  "engineFamilyName": "string",
  "engineManufacturer": "string",
  "engineModel": "string",
  "engineYear": "string",
  "eclCondition": "string",
  "dotNumber": "string",
  "inspectionDate": "string",
  "inspectionLocation": "string",
  "confidence": "high|medium|low"
}`;

  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAMES.PRO,
      contents: { parts },
      config: {
        responseMimeType: "application/json"
      }
    });
    // The model is asked for JSON only, but we trim to be safe.
    const text = response.text.trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("Batch Analysis Error:", error);
    throw error;
  }
};

export const scoutTruckLead = async (file: File): Promise<any> => {
  const b64 = await fileToBase64(file);
  const prompt = `SYSTEM: Analyze this commercial truck image for lead generation.
Extract the following information if visible on the vehicle:
- Company Name
- Phone Number
- USDOT Number
- City/Location
OUTPUT FORMAT (JSON only):
{
  "company": "string or null",
  "phone": "string or null",
  "dotNumber": "string or null",
  "location": "string or null"
}`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAMES.PRO,
      contents: {
        parts: [
          { inlineData: { mimeType: file.type, data: b64 } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Scout Truck Lead Error:", error);
    throw error;
  }
};

export const generateAppImage = async (prompt: string, config: ImageGenerationConfig): Promise<string> => {
  let model = 'gemini-2.5-flash-image';
  if (config.size === '2K' || config.size === '4K') {
      model = MODEL_NAMES.PRO_IMAGE;
      if (typeof window !== 'undefined' && window.aistudio) {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          if (!hasKey) await window.aistudio.openSelectKey();
      }
  }
  const imageAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await imageAi.models.generateContent({
    model: model,
    contents: { parts: [{ text: prompt }] },
    config: { imageConfig: { aspectRatio: config.aspectRatio, ...(model === MODEL_NAMES.PRO_IMAGE ? { imageSize: config.size } : {}) } }
  });
  for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("No image generated");
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
