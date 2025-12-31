
import { GoogleGenAI, Type } from "@google/genai";
import { MODEL_NAMES } from "../constants";
import { Job, Vehicle, ExtractedTruckData, ImageGenerationConfig, Lead } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const isValidVinFormat = (vin: string): boolean => {
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
  return vinRegex.test(vin.toUpperCase());
};

export const validateVINCheckDigit = (vin: string): boolean => {
  if (!vin || vin.length !== 17) return false;
  if (!isValidVinFormat(vin)) return false;

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
    let repaired = vin.toUpperCase().replace(/[^A-Z0-9]/g, '');
    repaired = repaired.replace(/[IOQ]/g, (m) => m === 'I' ? '1' : '0');
    return repaired;
};

/**
 * High-precision extraction optimized for field conditions (glare, vibration).
 */
export const extractVinFromImage = async (file: File): Promise<{vin: string, description: string, confidence: string}> => {
  const b64 = await fileToBase64(file);
  const prompt = `SYSTEM: You are a high-precision VIN and barcode extraction specialist for heavy-duty commercial trucks.
Analyze the provided photo.

CRITICAL FIELD DATA:
- Look for a 17-character VIN.
- PRIORITY: If a barcode (Code 39, 128) is visible, decode it first. It is more reliable than text.
- SENSOR NOTES: Modern mobile sensors (Samsung/Apple) often over-sharpen text. Focus on the raw shapes.

GENERAL RULES:
1. VINs are exactly 17 characters.
2. VINs NEVER contain I, O, or Q.
3. Common OCR confusions: I/1, O/0, Q/0, S/5, B/8, Z/2.
4. Output MUST be valid JSON.

JSON FORMAT:
{
  "vin": "17_CHAR_STRING",
  "confidence": "high|medium|low",
  "notes": "Description of scan quality"
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
              },
              required: ["vin", "confidence", "notes"]
          }
      }
    });

    const json = JSON.parse(response.text || '{}');
    const vin = repairVin(json.vin || '');
    
    return {
        vin: vin,
        confidence: json.confidence || 'low',
        description: json.notes || 'Extraction complete.'
    };
  } catch (error) {
    console.error("VIN Extract Error:", error);
    return { vin: '', description: 'Optical scan failed. Use the barcode tip below.', confidence: 'low' };
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
        let modelName = mode === 'thinking' ? MODEL_NAMES.PRO : MODEL_NAMES.FLASH;
        
        const config: any = { 
            systemInstruction: `You are VIN DIESEL, the specialized AI for California Clean Truck Check (HD I/M) compliance. 
            Prioritize official sources: cleantruckcheck.arb.ca.gov. 
            Focus on Diesel >14k GVWR. 
            End every message with: "Need clarity? Text/Call a Tester: 617-359-6953"`,
            tools: [{ googleSearch: {} }]
        };
        
        if (mode === 'thinking') {
            config.thinkingConfig = { thinkingBudget: 24000 };
        }

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
            text: response.text || "I'm currently recalibrating my sensors. Please try again.",
            groundingUrls: urls
        };
    } catch (e) { throw e; }
};

export const findTestersNearby = async (zipCode: string) => {
    const response = await ai.models.generateContent({
        model: MODEL_NAMES.FLASH,
        contents: `Find heavy-duty smoke testing stations and mobile CARB testers near ${zipCode}. List their names and links.`,
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
    parts.push({ text: "Perform a full OVI inspection analysis. Extract VIN, Engine Family Name, Mileage, Owner, and ECL Condition. Return JSON ONLY." });

    const response = await ai.models.generateContent({
        model: MODEL_NAMES.PRO,
        contents: { parts },
        config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || '{}');
};

export const scoutTruckLead = async (file: File): Promise<Lead> => {
    const b64 = await fileToBase64(file);
    const response = await ai.models.generateContent({
        model: MODEL_NAMES.PRO,
        contents: {
            parts: [
                { inlineData: { mimeType: file.type, data: b64 } },
                { text: "Scout this truck for business lead info. Extract Company Name, Phone, and DOT Number. JSON output." }
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

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
