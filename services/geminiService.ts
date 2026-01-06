
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
    const value = isNaN(char as any) ? transliteration[char] : parseInt(char); 
    sum += value * weights[i]; 
  } 
  
  const remainder = sum % 11; 
  const checkDigit = remainder === 10 ? 'X' : remainder.toString(); 
  return v[8] === checkDigit;
};

export const repairVin = (vin: string): string => {
    // Remove all non-alphanumeric
    let repaired = vin.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // THE 17-DIGIT RULE: Standard VINs NEVER contain I, O, or Q.
    // Map common misreads to their numeric counterparts.
    repaired = repaired.replace(/[OQ]/g, '0');
    repaired = repaired.replace(/[I]/g, '1');
    
    return repaired;
};

/**
 * High-speed high-precision VIN extraction with character confusion prevention.
 */
export const extractVinFromImage = async (file: File | Blob): Promise<{vin: string, description: string, confidence: string}> => {
  const b64 = await fileToBase64(file);
  const prompt = `Identify the 17-character VIN in this truck photo. 
Check for barcodes, door jamb labels, chassis stamps, or manufacturer tags.

CRITICAL CHARACTER RULES:
1. VINs NEVER contain the letters I, O, or Q.
2. If a character looks like 'O' or 'Q', it is '0' (ZERO).
3. If a character looks like 'I', it is '1' (ONE).
4. Do not confuse '8' with '3' or '5' with 'S'.

Return ONLY valid JSON.
{
  "vin": "EXACT_17_CHAR_VIN",
  "confidence": "high|medium|low",
  "notes": "Character ambiguity notes if any"
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
                  confidence: { type: Type.STRING },
                  notes: { type: Type.STRING }
              },
              required: ["vin", "confidence", "notes"]
          }
      }
    });

    const json = JSON.parse(response.text || '{}');
    const rawVin = json.vin || '';
    const vin = repairVin(rawVin);
    
    return {
        vin: vin,
        confidence: json.confidence || 'low',
        description: json.notes || 'Scan successful.'
    };
  } catch (error) {
    console.error("VIN Extract Error:", error);
    return { vin: '', description: 'Optics failed. Ensure lighting is sufficient.', confidence: 'low' };
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
            systemInstruction: `You are a specialized AI for California Clean Truck Check (HD I/M) compliance. 
            Focus: Diesel vehicles >14,000 lbs. 
            Official site: cleantruckcheck.arb.ca.gov.
            Rule: VINs NEVER use I, O, or Q.
            Footer: "Need clarity? Text/Call: 617-359-6953"`,
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
            text: response.text || "Sensors offline.",
            groundingUrls: urls
        };
    } catch (e) { throw e; }
};

export const findTestersNearby = async (zipCode: string) => {
    const response = await ai.models.generateContent({
        model: MODEL_NAMES.FLASH,
        contents: `Locate heavy-duty smoke testing stations and mobile CARB testers near ${zipCode}.`,
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
    parts.push({ text: "Perform inspection. Extract VIN (No I/O/Q), Engine Family, Mileage, Owner. JSON." });

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
                { text: "Scout company name, phone, and DOT number from truck side. JSON." }
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
