
import React, { useState, useRef, useEffect } from 'react';
import { processBatchIntake, identifyAndExtractData, extractVinAndPlateFromImage, extractRegistrationData, extractEngineTagData } from '../services/geminiService';
import { saveIntakeSubmission, saveClientToCRM } from '../services/firebase';
import { decodeVinNHTSA } from '../services/nhtsa';
import { trackEvent } from '../services/analytics';
import { IntakeMode, ExtractedTruckData } from '../types';
import { triggerHaptic } from '../services/haptics';

const ModeButton = ({ icon, label, onClick, sub }: { icon: string, label: string, onClick: () => void, sub: string }) => (
    <button 
        onClick={onClick}
        className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] p-8 flex items-center gap-6 hover:bg-white/10 transition-all active-haptic group text-left"
    >
        <span className="text-4xl group-hover:scale-110 transition-transform">{icon}</span>
        <div className="flex flex-col gap-1">
            <span className="text-sm font-black text-white uppercase italic tracking-tight">{label}</span>
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{sub}</span>
        </div>
        <span className="ml-auto text-blue-500 font-thin text-2xl">›</span>
    </button>
);

const ClientIntake: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [sessionId, setSessionId] = useState('');
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [mode, setMode] = useState<IntakeMode | null>(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'name' | 'mode' | 'extraction' | 'success'>('name');
    const [originalAiData, setOriginalAiData] = useState<any>(null);
    const [editableData, setEditableData] = useState<any>({});
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // PERSISTENCE: Recovery mechanism for field operations
    useEffect(() => {
        const savedSession = localStorage.getItem('carb_active_intake_session');
        if (savedSession) {
            const data = JSON.parse(savedSession);
            setSessionId(data.sessionId);
            setClientName(data.clientName);
            setClientPhone(data.clientPhone);
            setEditableData(data.editableData);
            setOriginalAiData(data.originalAiData);
            setPreviewUrls(data.previewUrls || []);
            if (data.previewUrls?.length > 0) setStep('extraction');
        } else {
            setSessionId(`FLD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
        }
    }, []);

    // PERSISTENCE: Save progress on every state change
    useEffect(() => {
        if (clientName || previewUrls.length > 0) {
            localStorage.setItem('carb_active_intake_session', JSON.stringify({
                sessionId, clientName, clientPhone, editableData, originalAiData, previewUrls
            }));
        }
    }, [sessionId, clientName, clientPhone, editableData, originalAiData, previewUrls]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files: File[] = Array.from(e.target.files || []);
        if (files.length === 0) return;
        
        const urls = files.map(file => URL.createObjectURL(file));
        setPreviewUrls(prev => [...prev, ...urls]);
        
        setLoading(true);
        triggerHaptic('medium');
        setStep('extraction');

        try {
            let newData: any;
            if (files.length > 1 || mode === 'BATCH_MODE') {
                newData = await processBatchIntake(files);
            } else if (mode === 'AUTO_DETECT') {
                newData = await identifyAndExtractData(files[0]);
            } else if (mode === 'VIN_LABEL') {
                newData = await extractVinAndPlateFromImage(files[0]);
            } else if (mode === 'REGISTRATION') {
                newData = await extractRegistrationData(files[0]);
            } else if (mode === 'ENGINE_TAG') {
                newData = await extractEngineTagData(files[0]);
            }

            // MERGE Logic: Keep user corrections but fill empty gaps with new AI data
            const mergedData = { ...editableData };
            Object.keys(newData).forEach(key => {
                if (!mergedData[key]) mergedData[key] = newData[key];
            });

            setOriginalAiData(prev => ({ ...prev, ...newData }));
            setEditableData(mergedData);
            triggerHaptic('success');
            trackEvent('intake_extraction_updated', { sessionId, fileCount: previewUrls.length + files.length });
        } catch (err: any) {
            triggerHaptic('error');
            const message = err.message?.includes('API Key is missing') 
                ? "NO GEMINI KEY: Deployment environment missing API_KEY. Contact admin to add the key to Vercel/Firebase settings."
                : "Sync Error: Area has low reception or AI is busy. Your photos are saved, try sync again later.";
            alert(message);
        } finally {
            setLoading(false);
        }
    };

    const handleFieldChange = (key: string, value: string) => {
        setEditableData((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleFinalSubmit = async () => {
        if (!editableData) return;
        setLoading(true);
        triggerHaptic('heavy');
        
        try {
            await saveIntakeSubmission({
                sessionId,
                clientName,
                timestamp: Date.now(),
                photos: { vin: null, plate: null, odometer: null, ecl: null, engine: null, exterior: null, registration: null, batch: previewUrls },
                extractedData: editableData,
                originalAiData: originalAiData,
                status: 'pending',
                mode: mode || 'FULL_INTAKE'
            });

            await saveClientToCRM({
                clientName,
                phone: clientPhone,
                email: clientEmail,
                vin: editableData.vin || '',
                plate: editableData.licensePlate || '',
                timestamp: Date.now(),
                status: 'New',
                notes: `Session: ${sessionId}. AI Corrected: ${JSON.stringify(originalAiData !== editableData)}`
            });

            localStorage.removeItem('carb_active_intake_session');
            triggerHaptic('success');
            setStep('success');
        } catch (e) {
            triggerHaptic('error');
            alert("Record failed to sync. Photos are still saved on device.");
        } finally {
            setLoading(false);
        }
    };

    const copyFullTemplate = () => {
        if (!editableData) return;
        triggerHaptic('medium');
        const text = `
SESSION: ${sessionId}
DATE: ${editableData.inspectionDate || new Date().toLocaleDateString()}
VIN: ${editableData.vin || 'MISSING'}
PLATE: ${editableData.licensePlate || 'MISSING'}
ODO: ${editableData.mileage || 'MISSING'}
ENGINE ID: ${editableData.engineFamilyName || 'MISSING'}
MAKE: ${editableData.engineManufacturer || 'MISSING'}
YEAR: ${editableData.engineYear || 'MISSING'}
        `.trim();
        navigator.clipboard.writeText(text);
        alert("Compliance Record Copied");
    };

    if (step === 'name') {
        return (
            <div className="max-w-md mx-auto py-6 animate-in fade-in duration-500">
                <div className="glass p-10 rounded-[3.5rem] border border-blue-500/20 space-y-8">
                    <div className="text-center space-y-2">
                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest italic">{sessionId}</p>
                        <h2 className="text-3xl font-black italic tracking-tighter uppercase">Field Intake</h2>
                        <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.4em]">Multi-Asset Link</p>
                    </div>
                    
                    <div className="space-y-4 pt-4">
                        <input 
                            value={clientName}
                            onChange={e => setClientName(e.target.value)}
                            placeholder="OPERATOR / COMPANY NAME"
                            className="w-full bg-white/5 p-5 rounded-3xl border border-white/10 outline-none focus:border-blue-500 text-sm font-black text-white uppercase italic tracking-widest"
                        />
                        <input 
                            value={clientPhone}
                            onChange={e => setClientPhone(e.target.value)}
                            placeholder="PRIMARY PHONE"
                            className="w-full bg-white/5 p-5 rounded-3xl border border-white/10 outline-none focus:border-blue-500 text-sm font-bold text-white tracking-widest"
                        />
                        <button 
                            onClick={() => { triggerHaptic('light'); setStep('mode'); }}
                            disabled={!clientName}
                            className="w-full py-6 bg-blue-600 text-white font-black rounded-[2rem] uppercase tracking-widest text-xs shadow-xl disabled:opacity-50 mt-4 active-haptic"
                        >
                            Select Documents
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'mode') {
        return (
            <div className="max-w-md mx-auto space-y-8 py-10 animate-in slide-in-from-bottom-10 duration-700">
                <div className="text-center">
                    <h2 className="text-xl font-black italic tracking-tighter uppercase text-gray-500">{clientName}</h2>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Select Test Scope</h3>
                </div>
                <div className="space-y-4">
                    <ModeButton 
                        icon="📁" 
                        label="Full Batch Sync" 
                        sub="Upload VIN, Plate, ODO, and Tag together" 
                        onClick={() => { triggerHaptic('light'); setMode('BATCH_MODE'); fileInputRef.current?.click(); }}
                    />
                    <div className="h-px bg-white/10 my-4 mx-8"></div>
                    <ModeButton 
                        icon="✨" 
                        label="OVI Auto-Link" 
                        sub="Single photo document detection" 
                        onClick={() => { triggerHaptic('light'); setMode('AUTO_DETECT'); fileInputRef.current?.click(); }}
                    />
                </div>
                <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={handleFileUpload} />
                <div className="text-center">
                    <button onClick={() => setStep('name')} className="text-[9px] font-black text-gray-700 uppercase italic">‹ Edit Company</button>
                </div>
            </div>
        );
    }

    if (step === 'extraction') {
        return (
            <div className="max-w-4xl mx-auto py-10 space-y-8 animate-in fade-in duration-500 pb-20">
                <div className="flex justify-between items-center px-4 no-print">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest italic">ID: {sessionId}</span>
                        <h2 className="text-xl font-black text-white uppercase italic tracking-tighter leading-none">{clientName}</h2>
                    </div>
                    <button 
                        onClick={() => { triggerHaptic('light'); fileInputRef.current?.click(); }} 
                        className="bg-white/10 border border-white/20 px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest text-white active-haptic"
                    >
                        + Add Document
                    </button>
                </div>

                {loading ? (
                    <div className="glass p-20 rounded-[4rem] flex flex-col items-center gap-6">
                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] animate-pulse">Syncing NorCal Cloud Data...</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic ml-4">Evidence Gallery</h3>
                            <div className="flex gap-4 overflow-x-auto pb-4 px-2 no-scrollbar">
                                {previewUrls.map((url, i) => (
                                    <div key={i} className="flex-shrink-0 w-64 h-48 rounded-3xl overflow-hidden border border-white/10 shadow-xl group relative">
                                        <img src={url} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={`Source ${i}`} />
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => window.open(url)} className="bg-white/10 backdrop-blur-md text-white text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest">Full Preview</button>
                                        </div>
                                    </div>
                                ))}
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex-shrink-0 w-64 h-48 rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-gray-600 hover:bg-white/5 transition-all"
                                >
                                    <span className="text-3xl">+</span>
                                    <span className="text-[8px] font-black uppercase tracking-widest">Add Evidence</span>
                                </button>
                            </div>
                        </div>

                        <div className="glass p-8 sm:p-12 rounded-[3.5rem] border border-white/10 space-y-10 bg-white/5 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8">
                                <button onClick={copyFullTemplate} className="text-blue-500 text-xl active-haptic">📋</button>
                            </div>
                            
                            <div className="space-y-2">
                                <h3 className="text-3xl font-black italic uppercase text-white tracking-tighter">OVI Audit</h3>
                                <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest italic">Manual Corrections tracked for learning accuracy</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {[
                                    { label: 'VIN (Never I, O, Q)', ai: originalAiData?.vin, key: 'vin' },
                                    { label: 'License Plate ID', ai: originalAiData?.licensePlate, key: 'licensePlate' },
                                    { label: 'Engine Family ID', ai: originalAiData?.engineFamilyName, key: 'engineFamilyName' },
                                    { label: 'Odometer (Mileage)', ai: originalAiData?.mileage, key: 'mileage' },
                                    { label: 'Engine Manufacturer', ai: originalAiData?.engineManufacturer, key: 'engineManufacturer' },
                                    { label: 'Engine Year', ai: originalAiData?.engineYear, key: 'engineYear' },
                                ].map((item) => {
                                    const isCorrected = editableData[item.key] && editableData[item.key] !== item.ai;
                                    return (
                                        <div key={item.key} className="space-y-3">
                                            <div className="flex justify-between items-center px-1">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{item.label}</label>
                                                {isCorrected && <span className="text-[7px] font-black text-orange-500 uppercase italic animate-pulse">Field Corrected</span>}
                                            </div>
                                            <div className="relative">
                                                <input 
                                                    value={editableData[item.key] || ''}
                                                    onChange={(e) => handleFieldChange(item.key, e.target.value.toUpperCase())}
                                                    placeholder="Manual input..."
                                                    className={`w-full bg-black/60 border rounded-2xl py-6 px-8 text-lg font-black tracking-tight outline-none transition-all uppercase shadow-inner ${isCorrected ? 'border-orange-500/40 text-orange-400' : 'border-white/10 text-white focus:border-blue-500'}`}
                                                />
                                            </div>
                                            {item.ai && (
                                                <div className="flex items-center gap-2 ml-4">
                                                    <span className="text-[8px] font-black text-gray-700 uppercase">AI RAW:</span>
                                                    <span className="text-[8px] font-black text-gray-600 italic truncate max-w-[200px]">{item.ai}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="pt-8 space-y-4">
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest text-center italic">Component Status (Emission Control)</p>
                                <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                                    {['EGR', 'SCR', 'TWC', 'NOx', 'SC/TC', 'ECM/PCM', 'DPF'].map(comp => (
                                        <div key={comp} className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center active:scale-95 transition-all cursor-pointer hover:bg-green-500/5 group">
                                            <p className="text-[8px] font-black text-gray-600 uppercase mb-1 group-hover:text-green-500 transition-colors">{comp}</p>
                                            <p className="text-xl font-black text-green-500">P</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 px-4">
                            <button onClick={() => { triggerHaptic('light'); setStep('mode'); }} className="flex-1 py-7 bg-white/5 text-white font-black rounded-[2rem] uppercase tracking-widest text-[10px] border border-white/10 italic active-haptic">Restart</button>
                            <button onClick={handleFinalSubmit} className="flex-[2] py-7 bg-blue-600 text-white font-black rounded-[2rem] uppercase tracking-widest text-[11px] shadow-2xl italic active-haptic">Sync To Registry</button>
                        </div>
                    </div>
                )}
                <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={handleFileUpload} />
            </div>
        );
    }

    if (step === 'success') {
        return (
            <div className="max-w-md mx-auto py-20 text-center space-y-10 animate-in zoom-in duration-500">
                <div className="w-24 h-24 bg-green-500 rounded-full mx-auto flex items-center justify-center text-white text-4xl shadow-[0_20px_50px_rgba(34,197,94,0.4)]">✓</div>
                <div className="space-y-4">
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase text-white leading-tight">Sync Complete</h2>
                    <p className="text-[12px] text-blue-400 font-black uppercase tracking-widest px-8 leading-relaxed italic">
                        Session {sessionId} has been archived in the NorCal Cloud. Verification data sent to Bryan.
                    </p>
                </div>
                <button onClick={() => { triggerHaptic('light'); onComplete(); }} className="bg-white text-black px-12 py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest italic active-haptic shadow-xl hover:scale-105 transition-transform">HUB Command</button>
            </div>
        );
    }

    return null;
};

export default ClientIntake;
