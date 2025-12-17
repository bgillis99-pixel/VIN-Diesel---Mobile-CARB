
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { MODEL_NAMES } from "../constants";
import { Lead, ImageGenerationConfig, AnalysisType, RegistrationData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// --- VIN VALIDATION LOGIC ---
const VIN_TRANSLITERATION: Record<string, number> = {
    'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8,
    'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'P': 7, 'R': 9,
    'S': 2, 'T': 3, 'U': 4, 'V': 5, 'W': 6, 'X': 7, 'Y': 8, 'Z': 9,
    '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '0': 0
};
const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

const validateChecksum = (vin: string): boolean => {
    if (vin.length !== 17) return false;
    let sum = 0;
    for (let i = 0; i < 17; i++) {
        if (i === 8) continue;
        const char = vin[i];
        const val = VIN_TRANSLITERATION[char];
        if (val === undefined) return false;
        sum += val * VIN_WEIGHTS[i];
    }
    const check = sum % 11;
    const checkChar = check === 10 ? 'X' : check.toString();
    return checkChar === vin[8];
};

const repairVin = (vin: string): string => {
    if (validateChecksum(vin)) return vin;
    const swaps = [
        { char: '5', replacement: 'S' }, { char: 'S', replacement: '5' },
        { char: '8', replacement: 'B' }, { char: 'B', replacement: '8' },
        { char: '2', replacement: 'Z' }, { char: 'Z', replacement: '2' },
        { char: '6', replacement: 'G' }, { char: 'G', replacement: '6' }
    ];
    for (let i = 0; i < 17; i++) {
        if (i === 8) continue;
        const originalChar = vin[i];
        for (const swap of swaps) {
            if (originalChar === swap.char) {
                const chars = vin.split('');
                chars[i] = swap.replacement;
                const candidate = chars.join('');
                if (validateChecksum(candidate)) return candidate;
            }
        }
    }
    return vin;
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
    let config: any = { 
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: mode === 'maps' ? [{ googleMaps: {} }] : (mode === 'search' || mode === 'standard' ? [{ googleSearch: {} }] : [])
    };
    
    if (mode === 'thinking') {
      modelName = MODEL_NAMES.PRO;
      config.thinkingConfig = { thinkingBudget: 32768 }; // Max budget for deep reasoning
    } else if (imageData) {
      modelName = MODEL_NAMES.PRO; // Use Pro for any image-related understanding
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

export const extractVinFromImage = async (file: File): Promise<{vin: string, description: string}> => {
  const b64 = await fileToBase64(file);
  const prompt = `Extract the 17-character VIN from this vehicle label. Look for "VIN", "Vehicle ID", or stamps. Ignore dirt/glare. Output JSON: {"vin": "STRING", "description": "STRING"}`;

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
                  description: { type: Type.STRING }
              }
          }
      }
    });

    let json = JSON.parse(response.text || '{}');
    let vin = (json.vin || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/[IOQ]/g, (m: string) => m === 'I' ? '1' : '0');
    vin = repairVin(vin);
    
    return {
        vin: vin,
        description: json.description || (validateChecksum(vin) ? 'Verified' : 'Manual review recommended')
    };
  } catch (error) {
    console.error("VIN Extract Error:", error);
    return { vin: '', description: 'Scan failed' };
  }
};

export const extractEngineTagInfo = async (file: File): Promise<{familyName: string, modelYear: string, details: string}> => {
    const b64 = await fileToBase64(file);
    const prompt = `Analyze this Engine Control Label. Extract "Engine Family Name" (EFN) and "Model Year". Output JSON: {"familyName": "STRING", "modelYear": "STRING", "details": "STRING"}`;

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
                        familyName: { type: Type.STRING },
                        modelYear: { type: Type.STRING },
                        details: { type: Type.STRING }
                    }
                }
            }
        });
        return JSON.parse(response.text || '{}');
    } catch (error) {
        console.error("Engine Tag Error:", error);
        throw error;
    }
};

export const analyzeMedia = async (file: File, prompt: string, type: 'image' | 'video'): Promise<string> => {
  const b64 = await fileToBase64(file);
  const response = await ai.models.generateContent({
    model: MODEL_NAMES.PRO,
    contents: {
      parts: [
        { inlineData: { mimeType: file.type, data: b64 } },
        { text: `Analyze this ${type}. ${prompt} Context: CARB Compliance.` }
      ]
    }
  });
  return response.text || "Analysis failed.";
};

export const generateAppImage = async (prompt: string, config: ImageGenerationConfig): Promise<string> => {
  const response = await ai.models.generateContent({
    model: MODEL_NAMES.PRO_IMAGE,
    contents: { parts: [{ text: prompt }] },
    config: {
        imageConfig: {
            aspectRatio: config.aspectRatio,
            imageSize: config.size
        }
    }
  });
  for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("No image generated");
};

export const generateSpeech = async (text: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: MODEL_NAMES.TTS,
        contents: { parts: [{ text }] },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
            }
        }
    });
    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (audioData) return audioData;
    throw new Error("No audio generated");
};

export const transcribeAudio = async (file: File): Promise<string> => {
    const b64 = await fileToBase64(file);
    const response = await ai.models.generateContent({
        model: MODEL_NAMES.FLASH,
        contents: {
            parts: [
                { inlineData: { mimeType: file.type, data: b64 } },
                { text: "Transcribe this audio file related to diesel truck compliance." }
            ]
        }
    });
    return response.text || "";
};

export const scoutTruckLead = async (file: File): Promise<Lead> => {
    const b64 = await fileToBase64(file);
    const prompt = `Analyze this truck fleet image. Extract Company Name, Phone, DOT Number, Location. Draft outreach email/social post. JSON: {companyName, phone, dot, location, industry, emailDraft, blogDraft}`;
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
                  companyName: { type: Type.STRING },
                  phone: { type: Type.STRING },
                  dot: { type: Type.STRING },
                  location: { type: Type.STRING },
                  industry: { type: Type.STRING },
                  emailDraft: { type: Type.STRING },
                  blogDraft: { type: Type.STRING }
                }
            }
        }
    });
    const json = JSON.parse(response.text || '{}');
    return {
        id: Date.now().toString(),
        timestamp: Date.now(),
        ...json
    };
};

export const parseRegistrationPhoto = async (file: File): Promise<RegistrationData> => {
    const b64 = await fileToBase64(file);
    const prompt = `Extract all details from this CA Registration Card. JSON: {vin, licensePlate, year, make, model, gvwr, ownerName, address, expirationDate}`;
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
                    licensePlate: { type: Type.STRING },
                    year: { type: Type.STRING },
                    make: { type: Type.STRING },
                    model: { type: Type.STRING },
                    gvwr: { type: Type.STRING },
                    ownerName: { type: Type.STRING },
                    address: { type: Type.STRING },
                    expirationDate: { type: Type.STRING }
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
