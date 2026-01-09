
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { MODEL_NAMES } from "../constants";
import { ExtractedTruckData, RegistrationData, EngineTagData } from "../types";

// Ensure the API Key is present. If missing, we still initialize but calls will fail.
// This allows the app to load but catch the error specifically during the request.
const getAiClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("SYSTEM_ERROR: Gemini API Key is missing. Check your environment settings.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const repairVin = (vin: string): string => {
    let repaired = vin.toUpperCase().replace(/[^A-Z0-9]/g, '');
    repaired = repaired.replace(/[OQ]/g, '0');
    repaired = repaired.replace(/[I]/g, '1');
    return repaired;
};

export const validateVINCheckDigit = (vin: string): boolean => {
    if (vin.length !== 17) return false;
    const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
    const translit: Record<string, number> = {
        'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8,
        'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'P': 7, 'R': 9,
        'S': 2, 'T': 3, 'U': 4, 'V': 5, 'W': 6, 'X': 7, 'Y': 8, 'Z': 9
    };
    
    let sum = 0;
    for (let i = 0; i < 17; i++) {
        const char = vin[i];
        let val: number;
        if (/[0-9]/.test(char)) {
            val = parseInt(char);
        } else {
            val = translit[char] || 0;
        }
        sum += val * weights[i];
    }
    
    const remainder = sum % 11;
    const checkDigit = remainder === 10 ? 'X' : remainder.toString();
    return vin[8] === checkDigit;
};

const fileToBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const processBatchIntake = async (files: File[]): Promise<ExtractedTruckData> => {
    const ai = getAiClient();
    const parts = await Promise.all(files.map(async (file) => {
        const b64 = await fileToBase64(file);
        return { inlineData: { mimeType: file.type || 'image/jpeg', data: b64 } };
    }));

    const prompt = `
        Analyze these multiple images from a truck inspection. 
        Identify the content across all images (VIN label, Engine Tag, Registration, Odometer/Dash).
        Extract a UNIFIED record based on this specific template:
        - Inspection Date (if visible)
        - VIN (Never I, O, Q)
        - Odometer/Mileage
        - License Plate
        - Engine Family Name (CRITICAL 12-char ID)
        - Engine Manufacturer
        - Engine Model
        - Engine Year
        - Emission Components Status (EGR, SCR, TWC, NOx, SC/TC, ECM/PCM, DPF - mark as 'P' if passing/present)
        
        Combine data from all images into ONE JSON object. If a field is missing, leave it empty.
    `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAMES.FLASH,
            contents: { parts: [...parts, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        vin: { type: Type.STRING },
                        licensePlate: { type: Type.STRING },
                        mileage: { type: Type.STRING },
                        engineFamilyName: { type: Type.STRING },
                        engineManufacturer: { type: Type.STRING },
                        engineModel: { type: Type.STRING },
                        engineYear: { type: Type.STRING },
                        inspectionDate: { type: Type.STRING },
                        egr: { type: Type.STRING },
                        scr: { type: Type.STRING },
                        twc: { type: Type.STRING },
                        nox: { type: Type.STRING },
                        sctc: { type: Type.STRING },
                        ecmPcm: { type: Type.STRING },
                        dpf: { type: Type.STRING }
                    },
                    propertyOrdering: ["vin", "licensePlate", "mileage", "engineFamilyName", "engineManufacturer", "engineModel", "engineYear", "inspectionDate", "egr", "scr", "twc", "nox", "sctc", "ecmPcm", "dpf"]
                }
            }
        });
        const json = JSON.parse(response.text || '{}');
        if (json.vin) json.vin = repairVin(json.vin);
        return json;
    } catch (e) {
        console.error("Batch Extraction Error:", e);
        throw e;
    }
};

export const identifyAndExtractData = async (file: File | Blob): Promise<ExtractedTruckData> => {
    const ai = getAiClient();
    const b64 = await fileToBase64(file);
    const prompt = `Analyze document and extract JSON. Types: VIN_LABEL, REGISTRATION, ENGINE_TAG, ODOMETER.`;
    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAMES.FLASH,
            contents: { parts: [{ inlineData: { mimeType: file.type || 'image/jpeg', data: b64 } }, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        documentType: { type: Type.STRING, enum: ['VIN_LABEL', 'REGISTRATION', 'ENGINE_TAG', 'ODOMETER', 'UNKNOWN'] },
                        vin: { type: Type.STRING },
                        licensePlate: { type: Type.STRING },
                        mileage: { type: Type.STRING },
                        engineFamilyName: { type: Type.STRING },
                        engineModel: { type: Type.STRING },
                        engineYear: { type: Type.STRING },
                        confidence: { type: Type.STRING }
                    },
                    propertyOrdering: ["documentType", "vin", "licensePlate", "mileage", "engineFamilyName", "engineModel", "engineYear", "confidence"]
                }
            }
        });
        const json = JSON.parse(response.text || '{}');
        if (json.vin) json.vin = repairVin(json.vin);
        return json;
    } catch (e) { return { documentType: 'UNKNOWN' }; }
};

export const extractVinAndPlateFromImage = async (file: File | Blob) => {
    const ai = getAiClient();
    const b64 = await fileToBase64(file);
    const response = await ai.models.generateContent({
        model: MODEL_NAMES.FLASH,
        contents: { parts: [{ inlineData: { mimeType: file.type || 'image/jpeg', data: b64 } }, { text: "Extract VIN and Plate JSON." }] },
        config: { responseMimeType: "application/json" }
    });
    const json = JSON.parse(response.text || '{}');
    return { vin: repairVin(json.vin || ''), plate: json.plate || '', confidence: 'high' };
};

export const extractRegistrationData = async (file: File | Blob): Promise<RegistrationData> => {
    const ai = getAiClient();
    const b64 = await fileToBase64(file);
    const prompt = `Extract vehicle registration data from this image. Return JSON format.`;
    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAMES.FLASH,
            contents: { parts: [{ inlineData: { mimeType: file.type || 'image/jpeg', data: b64 } }, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        ownerName: { type: Type.STRING },
                        address: { type: Type.STRING },
                        plate: { type: Type.STRING },
                        vin: { type: Type.STRING },
                        expirationDate: { type: Type.STRING },
                        vehicleMake: { type: Type.STRING },
                        vehicleYear: { type: Type.STRING }
                    },
                    propertyOrdering: ["ownerName", "address", "plate", "vin", "expirationDate", "vehicleMake", "vehicleYear"]
                }
            }
        });
        const json = JSON.parse(response.text || '{}');
        if (json.vin) json.vin = repairVin(json.vin);
        return json;
    } catch (e) {
        console.error("Registration Extraction Error:", e);
        return {};
    }
};

export const extractEngineTagData = async (file: File | Blob): Promise<EngineTagData> => {
    const ai = getAiClient();
    const b64 = await fileToBase64(file);
    const prompt = `Extract engine tag/label data from this image. Return JSON format.`;
    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAMES.FLASH,
            contents: { parts: [{ inlineData: { mimeType: file.type || 'image/jpeg', data: b64 } }, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        engineModel: { type: Type.STRING },
                        engineYear: { type: Type.STRING },
                        engineManufacturer: { type: Type.STRING },
                        familyName: { type: Type.STRING },
                        serialNumber: { type: Type.STRING }
                    },
                    propertyOrdering: ["engineModel", "engineYear", "engineManufacturer", "familyName", "serialNumber"]
                }
            }
        });
        const json = JSON.parse(response.text || '{}');
        return json;
    } catch (e) {
        console.error("Engine Tag Extraction Error:", e);
        return {};
    }
};

export const sendMessage = async (text: string, history: any[], location?: { lat: number, lng: number }) => {
    const ai = getAiClient();
    const tools: any[] = [{ googleSearch: {} }];
    let toolConfig: any = undefined;

    // Use gemini-2.5-flash for maps grounding as per guidelines (only supported in 2.5 series)
    const modelName = location ? 'gemini-2.5-flash' : MODEL_NAMES.FLASH;
    
    if (location) {
        tools.push({ googleMaps: {} });
        toolConfig = {
            retrievalConfig: {
                latLng: {
                    latitude: location.lat,
                    longitude: location.lng
                }
            }
        };
    }

    const response = await ai.models.generateContent({
        model: modelName,
        contents: [...history, { role: 'user', parts: [{ text }] }],
        config: { 
            systemInstruction: "You are VIN DIESEL AI, the ultimate proactive CARB Clean Truck Check (CTC) expert. Your mission is to fill the information gap left by the state. Be proactive: don't just answer questions, provide context on upcoming deadlines, hidden registry fees, and common testing pitfalls that the state doesn't clearly explain to fleet owners. Use Google Maps for testing locations and Google Search for the latest regulatory updates. Always aim to educate the user on the 'next step' they need to take for full compliance.",
            tools,
            toolConfig
        }
    });

    const groundingUrls = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map(chunk => {
            if (chunk.web) return { uri: chunk.web.uri || '', title: chunk.web.title || '' };
            if (chunk.maps) return { uri: chunk.maps.uri || '', title: chunk.maps.title || '' };
            return null;
        })
        .filter(Boolean) as Array<{ uri: string, title: string }>;

    return { 
        text: response.text || '',
        groundingUrls: groundingUrls || []
    };
};

export const speakText = async (text: string, voiceName: 'Kore' | 'Puck' | 'Zephyr' = 'Kore') => {
    const ai = getAiClient();
    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAMES.TTS,
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            const decode = (base64: string) => {
                const binaryString = atob(base64);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                return bytes;
            };

            const decodeAudioData = async (
                data: Uint8Array,
                ctx: AudioContext,
                sampleRate: number,
                numChannels: number,
            ): Promise<AudioBuffer> => {
                const dataInt16 = new Int16Array(data.buffer);
                const frameCount = dataInt16.length / numChannels;
                const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

                for (let channel = 0; channel < numChannels; channel++) {
                    const channelData = buffer.getChannelData(channel);
                    for (let i = 0; i < frameCount; i++) {
                        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
                    }
                }
                return buffer;
            };

            const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            source.start();
        }
    } catch (e) {
        console.error("TTS Error:", e);
    }
};
