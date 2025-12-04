import { GoogleGenAI, Type, Modality } from "@google/genai";
import { MODEL_NAMES } from "../constants";
import { Lead, ImageGenerationConfig, AnalysisType, RegistrationData } from "../types";

// Fallback Key from Deployment Manual for immediate functionality if Env Var fails
const API_KEY = process.env.API_KEY || 'AIzaSyBIVTK3aqKBA9JwtXBeGbpWEgMy4tPXmtk';

const getAI = () => new GoogleGenAI({ apiKey: API_KEY });

export const SYSTEM_INSTRUCTION = `
You are VIN DIESEL, a specialized AI Compliance Officer for the **California Clean Truck Check - Heavy-Duty Inspection and Maintenance (HD I/M) Program**.

**YOUR PRIMARY TRAINING DATA & SOURCES:**
You must base your answers strictly on the Clean Truck Check program found at:
- https://ww2.arb.ca.gov/our-work/programs/CTC
- Official CARB Fact Sheets, PDF Guides, and CARB YouTube tutorials related to HD I/M.
- NorCal CARB Mobile LLC (for practical testing services).

**STRICT SCOPE & NEGATIVE CONSTRAINTS (DO NOT VIOLATE):**
1. **NO NUTRITION:** You are NOT a nutritionist. If a user asks about "carbs" in food, reply: "I only handle heavy-duty diesel compliance, not dietary carbohydrates."
2. **NO GASOLINE / LIGHT DUTY:** You DO NOT handle passenger cars, sedans, pickup trucks under 14,000 lbs, or gasoline vehicles.
   - If a user asks about a "Honda Civic" or "Smog Check" for a car, reply: "This app is strictly for Heavy-Duty Diesel Trucks (>14,000 lbs). For passenger car smog, please visit the BAR (Bureau of Automotive Repair)."

**VERIFICATION PROTOCOL:**
If a user uses ambiguous terms like "my car", "smog check", or "vehicle" without specifying the type:
- **YOU MUST ASK:** "Just to confirm, is this for a Heavy-Duty Diesel vehicle over 14,000 GVWR? I only assist with the Clean Truck Check program for big rigs, Ag equipment, and motorhomes."

**KNOWLEDGE BANK:**
- **Deadlines:** 2024 was open reporting. 2025 requires passing tests linked to DMV registration dates.
- **Testing Frequency:** 2025-2026 is 2x/year. 2027+ increases to 4x/year.
- **Lost Passwords:** Users must reset these at https://cleantruckcheck.arb.ca.gov/.
- **Blocked Registration:** Usually due to unpaid annual fees ($30) or missing passing tests.
- **Contact:** If asked for support email, provide: bryan@norcalcarbmobile.com

**MANDATORY FOOTER:**
You MUST conclude EVERY single response with this exact line (double line break before it):

"\n\nNeed clarity? Text/Call a Tester: 617-359-6953"

**TONE:**
Professional, authoritative, yet helpful. You are a regulatory expert.
`;

export const sendMessage = async (
  text: string, 
  mode: 'standard' | 'search' | 'maps' | 'thinking', 
  history: any[], 
  location?: { lat: number, lng: number },
  imageData?: { data: string, mimeType: string }
) => {
  const ai = getAI();
  let modelName = MODEL_NAMES.FLASH;
  let config: any = { systemInstruction: SYSTEM_INSTRUCTION };
  
  if (mode === 'search') {
    modelName = MODEL_NAMES.FLASH;
    // We strictly use Google Search to find CARB documents if internal knowledge is insufficient
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

  // Construct parts, optionally adding image
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
    3. Draft a cold outreach email (subject + body) offering CARB compliance services (Smoke Tests/OBD). 
    - Mention Norcal CARB Mobile keeps them on the road.
    - Contact Email: bryan@norcalcarbmobile.com
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

export const parseRegistrationPhoto = async (file: File): Promise<RegistrationData> => {
    const ai = getAI();
    const b64 = await fileToBase64(file);

    const prompt = `
    Analyze this California DMV Vehicle Registration card.
    Extract the following details carefully. If a field is not visible, use "Unknown".
    
    - VIN (Vehicle Identification Number)
    - License Plate Number
    - Model Year (Year)
    - Make
    - Model
    - GVWR (Gross Vehicle Weight Rating) usually found in the weight info section
    - Registered Owner Name
    - Address (Street, City, State, Zip)
    - Expiration Date

    Return JSON.
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
    reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};