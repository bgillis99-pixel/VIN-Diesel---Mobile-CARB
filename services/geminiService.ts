import { GoogleGenAI, Type, Modality } from "@google/genai";
import { MODEL_NAMES } from "../constants";
import { Lead, ImageGenerationConfig, AnalysisType } from "../types";

// This will be replaced by Vercel environment variable
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_INSTRUCTION = `
You are VIN DIESEL, a specialized AI assistant for California CARB compliance (California Air Resources Board).

CONTEXT & SCOPE:
- TOPIC: Heavy-duty diesel trucks (>14,000 lbs), Motorhomes, and Agricultural equipment ONLY.
- EXCLUDED: GASOLINE CARS, light-duty vehicles, smog checks for sedans, and nutritional carbohydrates (food).
- AUTHORITY: Primarily use arb.ca.gov. Use norcalcarbmobile.com for practical testing advice only if CARB does not specify.
- KNOWLEDGE BANK:
  - LOST PASSWORD: Users must reset passwords at https://cleantruckcheck.arb.ca.gov/ themselves. We cannot do it.
  - TESTING DATES: Deadlines are linked to DMV registration month. 2025 is 2x/year. 2027 becomes 4x/year.
  - OFFICIAL SOURCES: If uncertain, advise user to check the official CARB YouTube channel for "Clean Truck Check" tutorials.

BEHAVIOR:
- If the user asks about gasoline cars or standard smog checks, clarify that we ONLY test heavy-duty diesel >14,000 lbs.
- If users seem flustered, be extremely concise and reassuring.
- If asked about services, prioritize NorCal CARB Mobile LLC (San Diego to Woodland Hills, Fresno to Butte County).
- PRIORITY #1: HELP. Solve the user's problem first.
- PRIORITY #2: SHARE. Only after helping, politely suggest sharing the app.
`;

export const sendMessage = async (
  text: string, 
  mode: 'standard' | 'search' | 'maps' | 'thinking', 
  history: any[], 
  location?: { lat: number, lng: number }
) => {
  const ai = getAI();
  let modelName = MODEL_NAMES.FLASH;
  let config: any = { systemInstruction: SYSTEM_INSTRUCTION };
  
  if (mode === 'search') {
    modelName = MODEL_NAMES.FLASH;
    config.tools = [{ googleSearch: {} }];
  } else if (mode === 'maps') {
    modelName = MODEL_NAMES.FLASH;
    config.tools = [{ googleMaps: {} }];
    if (location) {
      config.toolConfig = { retrievalConfig: { latLng: { latitude: location.lat, longitude: location.lng } } };
    }
  } else if (mode === 'thinking') {
    modelName = MODEL_NAMES.PRO;
    config.thinkingConfig = { thinkingBudget: 1024 };
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: [...history, { role: 'user', parts: [{ text }] }],
    config
  });

  const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
  const groundingChunks = groundingMetadata?.groundingChunks || [];
  
  let groundingUrls: Array<{uri: string, title: string}> = [];
  
  if (mode === 'search') {
    groundingUrls = groundingChunks
      .filter((c: any) => c.web?.uri)
      .map((c: any) => ({ uri: c.web.uri, title: c.web.title }));
  } else if (mode === 'maps') {
    groundingUrls = groundingChunks
      .filter((c: any) => c.maps?.uri)
      .map((c: any) => ({ uri: "https://maps.google.com", title: "Google Maps Result" }));
  }

  return {
    text: response.text || "I couldn't generate a response.",
    groundingUrls
  };
};

export const extractVinFromImage = async (file: File): Promise<string> => {
  const ai = getAI();
  const b64 = await fileToBase64(file);
  
  const response = await ai.models.generateContent({
    model: MODEL_NAMES.PRO,
    contents: {
      parts: [
        { inlineData: { mimeType: file.type, data: b64 } },
        { text: "Extract the 17-character VIN from this image. Return ONLY the VIN. If you see a TRUCRS ID (9 digits) or Entity ID, return that with a prefix 'TRUCRS:' or 'ENTITY:'. IGNORE 'I' (Eye), 'O' (Oh), and 'Q'. If the image is blurry or dirty, try your best to infer valid VIN characters (0-9, A-Z excluding I,O,Q). If unreadable, say FAILED." }
      ]
    }
  });

  return response.text?.trim() || '';
};

export const analyzeMedia = async (file: File, prompt: string, type: 'image' | 'video'): Promise<string> => {
  const ai = getAI();
  const b64 = await fileToBase64(file);
  const model = MODEL_NAMES.PRO;

  const response = await ai.models.generateContent({
    model,
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
  const ai = getAI();
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
      if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
      }
  }
  throw new Error("No image generated");
};

export const generateSpeech = async (text: string): Promise<string> => {
    const ai = getAI();
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
    if (audioData) {
        return audioData;
    }
    throw new Error("No audio generated");
};

export const transcribeAudio = async (file: File): Promise<string> => {
    const ai = getAI();
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
    const ai = getAI();
    const b64 = await fileToBase64(file);
    
    const prompt = `
    You are a sales scout for Norcal CARB Mobile LLC. 
    Analyze this image of a truck or fleet.
    
    1. Extract Company Name, Phone, DOT Number, and likely Industry.
    2. Detect the location if visible or infer from context (e.g. "Highway 99").
    3. Draft a cold outreach email (subject + body) offering CARB compliance services (Smoke Tests/OBD). Mention Norcal CARB Mobile keeps them on the road.
    4. Draft a short LinkedIn/Blog post about "Spotting hard working trucks in [Location]" and the importance of compliance.

    Return JSON with keys: companyName, phone, dot, location, industry, emailDraft, blogDraft.
    `;

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
        companyName: json.companyName || "Unknown Company",
        phone: json.phone || "",
        dot: json.dot || "",
        location: json.location || "California",
        industry: json.industry || "Trucking",
        emailDraft: json.emailDraft || "",
        blogDraft: json.blogDraft || ""
    };
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};