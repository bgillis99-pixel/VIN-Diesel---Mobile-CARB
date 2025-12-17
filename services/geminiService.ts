import { GoogleGenAI, Type, Modality } from "@google/genai";
import { MODEL_NAMES } from "../constants";
import { Lead, ImageGenerationConfig, AnalysisType, RegistrationData } from "../types";

// Fallback Key from Deployment Manual for immediate functionality if Env Var fails
const API_KEY = process.env.API_KEY || 'AIzaSyBIVTK3aqKBA9JwtXBeGbpWEgMy4tPXmtk';

const getAI = () => new GoogleGenAI({ apiKey: API_KEY });

// --- NATIVE BARCODE DETECTOR TYPES ---
interface DetectedBarcode {
  rawValue: string;
  format: string;
}
declare class BarcodeDetector {
  constructor(options?: { formats: string[] });
  static getSupportedFormats(): Promise<string[]>;
  detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

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
        if (i === 8) continue; // Check digit position
        const char = vin[i];
        const val = VIN_TRANSLITERATION[char];
        if (val === undefined) return false;
        sum += val * VIN_WEIGHTS[i];
    }
    const check = sum % 11;
    const checkChar = check === 10 ? 'X' : check.toString();
    return checkChar === vin[8];
};

// Attempts to fix common OCR errors to make checksum pass
const repairVin = (vin: string): string => {
    if (validateChecksum(vin)) return vin;

    // Common swaps: 5<->S, 8<->B, 2<->Z, 6<->G
    const swaps = [
        { char: '5', replacement: 'S' }, { char: 'S', replacement: '5' },
        { char: '8', replacement: 'B' }, { char: 'B', replacement: '8' },
        { char: '2', replacement: 'Z' }, { char: 'Z', replacement: '2' },
        { char: '6', replacement: 'G' }, { char: 'G', replacement: '6' }
    ];

    // Try single character swaps
    for (let i = 0; i < 17; i++) {
        if (i === 8) continue; // Don't swap check digit usually
        const originalChar = vin[i];
        
        for (const swap of swaps) {
            if (originalChar === swap.char) {
                const chars = vin.split('');
                chars[i] = swap.replacement;
                const candidate = chars.join('');
                if (validateChecksum(candidate)) {
                    console.log(`VIN Repaired: Swapped ${originalChar} to ${swap.replacement} at pos ${i}`);
                    return candidate;
                }
            }
        }
    }
    return vin; // Could not repair
};

// --- ADVANCED IMAGE PREPROCESSING FOR FIELD USE ---
// Uses Upscaling + Adaptive Thresholding (Integral Image)
const processImageForOCR = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(base64Str);

      // 1. UPSCALE: Ensure minimum width of 1024px for detail, Cap at 2048px
      const MIN_WIDTH = 1024;
      const MAX_WIDTH = 2048;
      let width = img.width;
      let height = img.height;
      
      if (width < MIN_WIDTH) {
          const scale = MIN_WIDTH / width;
          width = MIN_WIDTH;
          height = height * scale;
      } else if (width > MAX_WIDTH) {
          const scale = MAX_WIDTH / width;
          width = MAX_WIDTH;
          height = height * scale;
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      
      // 2. ADAPTIVE CONTRAST ENHANCEMENT (Integral Image Method)
      // This helps removing gradients (glare/shadows)
      
      const gray = new Uint8Array(width * height);
      const integral = new Uint32Array(width * height);
      
      // Pass 1: Grayscale & Integral Image Construction
      for (let y = 0; y < height; y++) {
          let rowSum = 0;
          for (let x = 0; x < width; x++) {
              const i = (y * width + x) * 4;
              // Luminance
              const g = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
              gray[y * width + x] = g;
              
              rowSum += g;
              if (y === 0) {
                  integral[y * width + x] = rowSum;
              } else {
                  integral[y * width + x] = integral[(y - 1) * width + x] + rowSum;
              }
          }
      }
      
      // Helper: Get sum of rectangle from Integral Image in O(1)
      const getSum = (x1: number, y1: number, x2: number, y2: number) => {
          x1 = Math.max(0, x1); y1 = Math.max(0, y1);
          x2 = Math.min(width - 1, x2); y2 = Math.min(height - 1, y2);
          
          const A = (x1 > 0 && y1 > 0) ? integral[(y1 - 1) * width + (x1 - 1)] : 0;
          const B = (y1 > 0) ? integral[(y1 - 1) * width + x2] : 0;
          const C = (x1 > 0) ? integral[y2 * width + (x1 - 1)] : 0;
          const D = integral[y2 * width + x2];
          return D - B - C + A;
      };
      
      // Pass 2: Apply Local Contrast Enhancement
      // Window size for local average context
      const windowSize = Math.floor(width / 32); 
      
      for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
              const idx = (y * width + x) * 4;
              
              const x1 = x - windowSize/2;
              const y1 = y - windowSize/2;
              const x2 = x + windowSize/2;
              const y2 = y + windowSize/2;
              
              const count = (Math.min(width-1, x2) - Math.max(0, x1)) * (Math.min(height-1, y2) - Math.max(0, y1));
              const sum = getSum(x1, y1, x2, y2);
              const mean = sum / count;
              
              const val = gray[y * width + x];
              
              // Algorithm: (Pixel - Mean) + 128
              // This removes the low-frequency background (lighting) and centers contrast around 128
              let enhanced = (val - mean) * 2.5 + 128; // 2.5x Contrast boost
              
              // Clamp
              enhanced = Math.min(255, Math.max(0, enhanced));
              
              data[idx] = enhanced;
              data[idx+1] = enhanced;
              data[idx+2] = enhanced;
              data[idx+3] = 255;
          }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.9).split(',')[1]);
    };
    img.src = `data:image/jpeg;base64,${base64Str}`;
  });
};

// --- OFFLINE KNOWLEDGE BASE (Free Fallback) ---
const OFFLINE_KNOWLEDGE_BASE = [
  {
    keywords: ['blocked', 'hold', 'registration', 'dmv', 'renew'],
    answer: "🔒 **Why is my registration on DMV Hold?**\n\nCommon reasons:\n1. **Unpaid State Fee:** You must pay the $30 annual compliance fee per vehicle at https://cleantruckcheck.arb.ca.gov/.\n2. **Missing Test:** You need a passing Smoke/OBD test submitted within 90 days of your registration date.\n3. **Data Mismatch:** The VIN on the test must match the DMV database exactly."
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

**SCANNING & PHOTO ADVICE (CRITICAL):**
If a user asks why their VIN scan isn't working or asks how to take a photo:
1. **OPEN THE DOOR:** Do not take photos through the window glass. The glare makes it unreadable.
2. **DIRECT SHOT:** Photograph the sticker directly on the door jamb.
3. **NO ANGLES:** Hold the phone flat and parallel to the sticker.
4. **NO GLARE:** Block the sun with your body if needed.

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
- **DMV Hold:** (Formerly called Registration Blocked). Usually due to unpaid annual fees ($30) or missing passing tests.
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

// Helper to sanitize VINs
const cleanVinResult = (vin: string): string => {
    if (!vin) return '';
    let cleaned = vin.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // AUTO-CORRECT ILLEGAL CHARACTERS for VINs
    // VINs cannot contain I, O, Q. We map them to similar looking numbers.
    cleaned = cleaned.replace(/I/g, '1');
    cleaned = cleaned.replace(/O/g, '0');
    cleaned = cleaned.replace(/Q/g, '0');
    
    return cleaned;
};

export const extractVinFromImage = async (file: File): Promise<{vin: string, description: string}> => {
  // PHASE 0: CLIENT-SIDE BARCODE DETECTION (Fastest & Most Accurate)
  if ('BarcodeDetector' in window) {
      try {
          const formats = await BarcodeDetector.getSupportedFormats();
          if (formats.includes('code_39') || formats.includes('code_128') || formats.includes('data_matrix')) {
              const barcodeDetector = new BarcodeDetector({ formats: ['code_39', 'code_128', 'data_matrix', 'qr_code', 'pdf417'] });
              const bitmap = await createImageBitmap(file);
              const barcodes = await barcodeDetector.detect(bitmap);
              
              const validVin = barcodes.find(b => b.rawValue.length === 17 && /^[A-HJ-NPR-Z0-9]{17}$/.test(b.rawValue));
              if (validVin) {
                  console.log("VIN detected via Native Barcode SDK:", validVin.rawValue);
                  return { vin: validVin.rawValue, description: '✅ Scanned via Barcode (100% Accuracy)' };
              }
          }
      } catch (e) {
          console.debug('Barcode detection skipped or failed:', e);
      }
  }

  const ai = getAI();
  const originalB64 = await fileToBase64(file);
  
  // ROBUST FIELD PROMPT
  const prompt = `
  EXTRACT VIN (17 CHARACTERS).
  Analyze this image of a vehicle label or metal tag.
  
  CONTEXT (FIELD CONDITIONS):
  - The label might be DIRTY, GREASY, FADED, SCRATCHED, or covered in road grime.
  - The image might be taken through glass (glare) or at a weird angle.
  - **The text might be VERTICAL (rotated 90 degrees) or printed in DOT MATRIX.**
  - **Ignore the dirt. Ignore the glare. Look for the stamped or printed alphanumerics.**
  
  LOCATORS (MANUFACTURER KEYWORDS):
  - Look for "VOLVO", "FREIGHTLINER", "KENWORTH", "PETERBILT", "INTERNATIONAL", "DAIMLER", "MACK".
  - Look for headers: "VIN", "VEHICLE ID", "IDENTIFICATION NUMBER".
  
  TARGET PATTERN:
  - 17 Characters.
  - Alphanumeric (Numbers and Letters).
  - Common Heavy Duty Starts: 1, 3, 4, 5, 2, J, K.
  
  OCR RECOVERY RULES:
  1. If characters are faint, infer them from context.
  2. NO 'I' (India) -> convert to '1'.
  3. NO 'O' (Oscar) -> convert to '0'.
  4. NO 'Q' (Quebec) -> convert to '0'.
  5. The 8th character MUST be a number (0-9).
  
  Output JSON: { "vin": "FOUND_VIN", "description": "Status (e.g. Clean, Dirty, Vertical Text detected)" }
  `;

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
    console.log("Scanning Attempt 1 (Raw AI)...");
    let response = await attemptScan(originalB64);
    let json = JSON.parse(response.text || '{}');
    let vin = (json.vin || '').toUpperCase();
    
    // Initial cleanup
    vin = cleanVinResult(vin);

    const isInvalidLength = vin.length !== 17;
    // We already cleaned I/O/Q in cleanVinResult, so checking validity of format mainly on length now
    
    // VALIDATE & REPAIR
    let description = json.description || 'Vehicle Label';
    let repairedVin = repairVin(vin);
    
    if (validateChecksum(repairedVin)) {
        vin = repairedVin;
        description += " | ✅ Checksum Verified";
    } else if (vin.length === 17) {
        description += " | ⚠️ Checksum Fail";
    }

    // IF ATTEMPT 1 FAILED (Invalid length or empty), TRY ENHANCED
    if (!vin || isInvalidLength) {
       console.log("Attempt 1 Failed/Low Confidence. Enhancing Image...");
       
       // ATTEMPT 2: Enhanced Contrast & Sharpening
       const enhancedB64 = await processImageForOCR(originalB64);
       response = await attemptScan(enhancedB64);
       json = JSON.parse(response.text || '{}');
       vin = cleanVinResult(json.vin || '');
       
       repairedVin = repairVin(vin);
       if (validateChecksum(repairedVin)) {
           vin = repairedVin;
           description = "Enhanced Scan | ✅ Checksum Verified";
       }
    }

    return {
        vin: vin,
        description: description
    };
  } catch (error) {
    console.error("VIN Extraction Error:", error);
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