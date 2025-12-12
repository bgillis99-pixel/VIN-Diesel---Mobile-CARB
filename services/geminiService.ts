import { GoogleGenAI, Type, Modality } from "@google/genai";
import { MODEL_NAMES } from "../constants";
import { Lead, ImageGenerationConfig, AnalysisType, RegistrationData } from "../types";

// Fallback Key from Deployment Manual for immediate functionality if Env Var fails
const API_KEY = process.env.API_KEY || 'AIzaSyBIVTK3aqKBA9JwtXBeGbpWEgMy4tPXmtk';

const getAI = () => new GoogleGenAI({ apiKey: API_KEY });

// --- IMAGE PREPROCESSING FOR FIELD USE ---
const processImageForOCR = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(base64Str);

      // limit size to speed up processing but keep high enough for OCR
      const MAX_WIDTH = 1024;
      const scale = MAX_WIDTH / img.width;
      canvas.width = MAX_WIDTH;
      canvas.height = img.height * scale;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // High Contrast Grayscale Algorithm
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // Standard grayscale
        let gray = 0.299 * r + 0.587 * g + 0.114 * b;
        
        // Binarize (increase contrast extremely)
        gray = gray > 100 ? 255 : 0;

        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }

      ctx.putImageData(imageData, 0, 0);
      // Return processed base64 (remove prefix)
      resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
    };
    img.src = `data:image/jpeg;base64,${base64Str}`;
  });
};

// --- OFFLINE KNOWLEDGE BASE (Free Fallback) ---
const OFFLINE_KNOWLEDGE_BASE = [
  {
    keywords: ['blocked', 'hold', 'registration', 'dmv', 'renew'],
    answer: "🔒 **Why is my registration blocked?**\n\nCommon reasons:\n1. **Unpaid State Fee:** You must pay the $30 annual compliance fee per vehicle at https://cleantruckcheck.arb.ca.gov/.\n2. **Missing Test:** You need a passing Smoke/OBD test submitted within 90 days of your registration date.\n3. **Data Mismatch:** The VIN on the test must match the DMV database exactly."
  },
  {
    keywords: ['deadline', 'when', 'due', 'date', 'frequency', 'often'],
    answer: "📅 **Testing Deadlines:**\n\n• **2025-2026:** Most vehicles need to pass a test **Twice a Year** (every 6 months).\n• **2027+:** Increases to **4 times a year**.\n• The deadline is based on your DMV registration expiration date."
  },
  {
    keywords: ['password', 'login', 'reset', 'access', 'account'],
    answer: "🔑 **Lost Password:**\n\nWe cannot reset your password. You must do it on the official CARB portal:\nhttps://cleantruckcheck.arb.ca.gov/\n\nClick 'Forgot Password' on their login screen."
  },
  {
    keywords: ['cost', 'price', 'fee', 'how much', 'charge'],
    answer: "💰 **Program Costs:**\n\n1. **CARB Annual Fee:** $30 per vehicle (paid to the State).\n2. **Testing Fee:** Paid to the certified tester. Prices vary by location (typically $150-$250).\n\nCall 617-359-6953 for a quote."
  },
  {
    keywords: ['pickup', 'light', 'f250', '2500', 'gas', 'gasoline'],
    answer: "❌ **Wrong Program:**\n\nThe Clean Truck Check ONLY applies to **Diesel** vehicles over **14,000 lbs GVWR**.\n\n• Pickups (F-250/2500) are usually under 14k lbs.\n• Gas vehicles need a BAR Smog Check, not this program."
  },
  {
    keywords: ['contact', 'phone', 'email', 'help', 'human', 'support', 'number'],
    answer: "📞 **Contact Support:**\n\n• **NorCal CARB Mobile:** 617-359-6953 (Testing & Help)\n• **Official CARB Hotline:** 866-634-3735 (hdim@arb.ca.gov)"
  },
  {
    keywords: ['certificate', 'print', 'proof', 'paper'],
    answer: "📄 **Compliance Certificate:**\n\nOnce you pay the $30 fee AND pass the smoke test, you can print your certificate instantly from your CTC-VIS account dashboard."
  }
];

const findOfflineAnswer = (query: string): string => {
    const lowerQuery = query.toLowerCase();
    const match = OFFLINE_KNOWLEDGE_BASE.find(item => 
        item.keywords.some(k => lowerQuery.includes(k))
    );
    
    if (match) return match.answer;
    
    return "ℹ️ **Offline Mode:**\n\nI couldn't match your question to my offline database, but here is a compliance checklist:\n\n1. Did you pay the $30 annual fee?\n2. Is your test less than 90 days old?\n3. Is your GVWR over 14,000 lbs?\n\nFor complex issues, please Text/Call: **617-359-6953**.";
};

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
  try {
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
      groundingUrls,
      isOffline: false
    };
  } catch (error: any) {
    console.warn("Gemini API Error - Switching to Offline Mode:", error.message);
    
    // OFFLINE FALLBACK
    const offlineAnswer = findOfflineAnswer(text);
    return {
        text: offlineAnswer + "\n\nNeed clarity? Text/Call a Tester: 617-359-6953",
        groundingUrls: [],
        isOffline: true
    };
  }
};

export const extractVinFromImage = async (file: File): Promise<{vin: string, description: string}> => {
  const ai = getAI();
  // Phase 1: Convert original to Base64
  const originalB64 = await fileToBase64(file);
  
  const prompt = `
  EXTRACT VIN ONLY.
  Analyze this image (Vehicle Tag/Door Jamb/Windshield).
  Find the 17-character VIN (Vehicle Identification Number).
  
  RULES:
  1. IGNORE strict 8th digit check. Just read what is there.
  2. If rotated, read it rotated.
  3. Fix OCR errors: 'I' -> '1', 'O' -> '0', 'Q' -> '0', 'B' -> '8'.
  4. Output JSON: { "vin": "FOUND_VIN", "description": "Label Type" }
  `;

  // HELPER: The actual API call
  const attemptScan = async (imageData: string) => {
    return await ai.models.generateContent({
      model: MODEL_NAMES.PRO,
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: imageData } },
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
  };

  try {
    // ATTEMPT 1: Raw Image
    console.log("Scanning Attempt 1 (Raw)...");
    let response = await attemptScan(originalB64);
    let json = JSON.parse(response.text || '{}');

    // Validation: If VIN looks too short or empty, try preprocessing
    if (!json.vin || json.vin.length < 11) {
       console.log("Attempt 1 Failed or Low Confidence. Enhancing Image...");
       
       // ATTEMPT 2: Enhanced Contrast (Client Side)
       const enhancedB64 = await processImageForOCR(originalB64);
       response = await attemptScan(enhancedB64);
       json = JSON.parse(response.text || '{}');
    }

    return {
        vin: (json.vin || '').toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, ''),
        description: json.description || 'Vehicle Label'
    };
  } catch (error) {
    console.error("VIN Extraction Error:", error);
    // Return empty to allow manual fallback in UI
    return { vin: '', description: 'Scan Failed' };
  }
};

export const extractEngineTagInfo = async (file: File): Promise<{familyName: string, modelYear: string, details: string}> => {
    const ai = getAI();
    const b64 = await fileToBase64(file);

    const prompt = `
    Analyze this Engine Control Label (ECL) or Engine Tag.
    
    I need to extract specific data required for a CARB Smoke Test (J1667).
    
    FIND:
    1. **Engine Family Name** (Often labeled as "ENGINE FAMILY", "FAMILY", "EFN", or "E.F."). It is a code like "NCEXH0912XAT" or "RVPTH12.8G01".
    2. **Model Year** (Labeled "MY", "Model Year", or found in the family code).
    
    OUTPUT JSON:
    {
      "familyName": "The extracted family code",
      "modelYear": "The 4 digit year",
      "details": "A short summary of what you found"
    }
    `;

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
        console.error("Engine Tag Extraction Error:", error);
        throw error;
    }
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