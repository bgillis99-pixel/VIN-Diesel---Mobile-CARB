
import React, { useState, useRef, useEffect } from 'react';
import { processBatchIntake, identifyAndExtractData, extractVinAndPlateFromImage, extractRegistrationData, extractEngineTagData } from '../services/geminiService';
import { saveIntakeSubmission, saveClientToCRM } from '../services/firebase';
import { IntakeMode } from '../types';
import { triggerHaptic } from '../services/haptics';

const FieldInput = ({ label, value, onChange, aiValue, fieldKey }: { 
  label: string, value: string, onChange: (v: string) => void, aiValue?: string, fieldKey: string 
}) => {
  const isCorrected = aiValue && value !== aiValue;
  return (
    <div className="space-y-2 group">
      <div className="flex justify-between items-center px-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
        {isCorrected && <span className="text-[7px] font-black text-carb-orange uppercase italic">Corrected</span>}
      </div>
      <div className="relative">
        <input 
          value={value || ''}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="Enter Manual..."
          className={`w-full bg-slate-900/60 border rounded-2xl py-5 px-6 text-base font-bold tracking-tight outline-none transition-all uppercase shadow-inner ${isCorrected ? 'border-carb-orange/40 text-carb-orange' : 'border-white/5 text-white focus:border-carb-accent/40'}`}
        />
      </div>
      {aiValue && (
        <div className="flex items-center gap-2 ml-4">
          <span className="text-[8px] font-bold text-slate-600 uppercase">AI Detected:</span>
          <span className="text-[8px] font-bold text-slate-500 italic truncate max-w-[200px]">{aiValue}</span>
        </div>
      )}
    </div>
  );
};

const ClientIntake: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [sessionId, setSessionId] = useState('');
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [mode, setMode] = useState<IntakeMode | null>(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'name' | 'mode' | 'extraction' | 'success'>('name');
    const [originalAiData, setOriginalAiData] = useState<any>(null);
    const [editableData, setEditableData] = useState<any>({});
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // RESTORE Draft from LocalStorage
    useEffect(() => {
        const saved = localStorage.getItem('carb_field_draft');
        if (saved) {
            const data = JSON.parse(saved);
            setSessionId(data.sessionId);
            setClientName(data.clientName);
            setClientPhone(data.clientPhone);
            setEditableData(data.editableData || {});
            setOriginalAiData(data.originalAiData || null);
            setPreviewUrls(data.previewUrls || []);
            if (data.previewUrls?.length > 0) setStep('extraction');
        } else {
            setSessionId(`FLD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
        }
    }, []);

    // SAVE Draft continuously
    useEffect(() => {
        if (clientName || previewUrls.length > 0) {
            localStorage.setItem('carb_field_draft', JSON.stringify({
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

            // MERGE: AI data into current record, keeping existing manual changes
            const merged = { ...editableData };
            Object.keys(newData).forEach(key => {
                if (!merged[key]) merged[key] = newData[key];
            });

            setOriginalAiData(prev => ({ ...prev, ...newData }));
            setEditableData(merged);
            triggerHaptic('success');
        } catch (err: any) {
            triggerHaptic('error');
            alert(err.message?.includes('API Key') ? "Admin Error: Gemini Key Missing." : "Area Signal Weak. Photo stored locally.");
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
                vin: editableData.vin || '',
                plate: editableData.licensePlate || '',
                timestamp: Date.now(),
                status: 'New'
            });

            localStorage.removeItem('carb_field_draft');
            triggerHaptic('success');
            setStep('success');
        } catch (e) {
            triggerHaptic('error');
            alert("Registry Sync Failed. Data remains on device.");
        } finally {
            setLoading(false);
        }
    };

    const copyTemplate = () => {
        triggerHaptic('light');
        const text = `
SESSION: ${sessionId}
CLIENT: ${clientName}
VIN: ${editableData.vin || ''}
ODO: ${editableData.mileage || ''}
PLATE: ${editableData.licensePlate || ''}
ENG FAMILY: ${editableData.engineFamilyName || ''}
ENG YEAR: ${editableData.engineYear || ''}
        `.trim();
        navigator.clipboard.writeText(text);
        alert("Record Copied");
    };

    if (step === 'name') {
        return (
            <div className="max-w-md mx-auto py-12 animate-in fade-in duration-500">
                <div className="glass-card p-10 rounded-[3rem] space-y-8">
                    <div className="text-center space-y-2">
                        <span className="text-[10px] font-black text-carb-accent uppercase tracking-widest">{sessionId}</span>
                        <h2 className="text-3xl font-black italic uppercase text-white tracking-tighter">Field Portal</h2>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Identify & Archive Truck Assets</p>
                    </div>
                    <div className="space-y-4">
                        <input 
                            value={clientName}
                            onChange={e => setClientName(e.target.value)}
                            placeholder="Operator / Company"
                            className="w-full bg-slate-900/50 p-5 rounded-3xl border border-white/5 outline-none focus:border-carb-accent/40 text-sm font-bold text-white uppercase italic tracking-widest"
                        />
                        <input 
                            value={clientPhone}
                            onChange={e => setClientPhone(e.target.value)}
                            placeholder="Contact Phone"
                            className="w-full bg-slate-900/50 p-5 rounded-3xl border border-white/5 outline-none focus:border-carb-accent/40 text-sm font-bold text-white tracking-widest"
                        />
                        <button 
                            onClick={() => setStep('mode')}
                            disabled={!clientName}
                            className="w-full py-6 metallic-btn rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl disabled:opacity-30 active-haptic"
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
                <div className="text-center space-y-1">
                    <h2 className="text-xl font-bold italic text-slate-400 uppercase tracking-tight">{clientName}</h2>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Intake Method</h3>
                </div>
                <div className="space-y-4">
                    <button onClick={() => { setMode('BATCH_MODE'); fileInputRef.current?.click(); }} className="w-full glass-card p-8 flex items-center gap-6 rounded-[2.5rem] hover:bg-slate-800 transition-all active-haptic text-left">
                        <span className="text-4xl">📁</span>
                        <div className="flex flex-col">
                            <span className="text-sm font-black text-white uppercase italic">Batch Documents</span>
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Upload Multiple Label Photos</span>
                        </div>
                    </button>
                    <button onClick={() => { setMode('AUTO_DETECT'); fileInputRef.current?.click(); }} className="w-full glass-card p-8 flex items-center gap-6 rounded-[2.5rem] hover:bg-slate-800 transition-all active-haptic text-left">
                        <span className="text-4xl">✨</span>
                        <div className="flex flex-col">
                            <span className="text-sm font-black text-white uppercase italic">AI Smart Sync</span>
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Single Photo Auto-ID</span>
                        </div>
                    </button>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={handleFileUpload} />
                <div className="text-center">
                    <button onClick={() => setStep('name')} className="text-[10px] font-black text-slate-600 uppercase italic">‹ Go Back</button>
                </div>
            </div>
        );
    }

    if (step === 'extraction') {
        return (
            <div className="max-w-4xl mx-auto py-10 space-y-8 animate-in fade-in duration-500 pb-24">
                <div className="flex justify-between items-center px-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-carb-accent uppercase italic">{sessionId}</span>
                        <h2 className="text-xl font-black text-white uppercase italic tracking-tighter leading-none">{clientName}</h2>
                    </div>
                    <button onClick={() => fileInputRef.current?.click()} className="bg-slate-800 border border-white/5 px-6 py-3 rounded-2xl text-[9px] font-black uppercase text-white active-haptic">+ Add Document</button>
                </div>

                {loading ? (
                    <div className="glass-card p-20 rounded-[4rem] flex flex-col items-center gap-6">
                        <div className="w-16 h-16 border-4 border-carb-accent border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black text-carb-accent uppercase tracking-[0.4em] animate-pulse">Syncing NorCal Data...</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic ml-4">Source Evidence</h3>
                            <div className="flex gap-4 overflow-x-auto pb-4 px-2 no-scrollbar">
                                {previewUrls.map((url, i) => (
                                    <div key={i} className="flex-shrink-0 w-64 h-48 rounded-3xl overflow-hidden border border-white/5 shadow-xl group relative">
                                        <img src={url} className="w-full h-full object-cover grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all" alt="Doc" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <button onClick={() => window.open(url)} className="bg-white/10 backdrop-blur-md text-white text-[10px] font-black px-4 py-2 rounded-full uppercase">View Full</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="glass-card p-8 sm:p-12 rounded-[3.5rem] space-y-10 shadow-2xl relative">
                            <button onClick={copyTemplate} className="absolute top-8 right-8 text-xl opacity-40 hover:opacity-100 active-haptic">📋</button>
                            <div className="space-y-1">
                                <h3 className="text-3xl font-black italic uppercase text-white tracking-tighter">OVI Manual Audit</h3>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest italic">Always verify AI output against physical tags</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {[
                                    { label: 'VIN (Identity)', key: 'vin' },
                                    { label: 'License Plate', key: 'licensePlate' },
                                    { label: 'Engine Family ID', key: 'engineFamilyName' },
                                    { label: 'Odometer (Mileage)', key: 'mileage' },
                                    { label: 'Engine Year', key: 'engineYear' },
                                    { label: 'Model Name', key: 'engineModel' },
                                ].map((item) => (
                                    <FieldInput 
                                        key={item.key}
                                        label={item.label}
                                        fieldKey={item.key}
                                        value={editableData[item.key]}
                                        aiValue={originalAiData?.[item.key]}
                                        onChange={(v) => handleFieldChange(item.key, v)}
                                    />
                                ))}
                            </div>

                            <div className="pt-8 space-y-4 border-t border-white/5">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center italic">Component Checklist</p>
                                <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                                    {['EGR', 'SCR', 'TWC', 'NOx', 'SC/TC', 'ECM/PCM', 'DPF'].map(comp => (
                                        <div key={comp} className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 text-center">
                                            <p className="text-[8px] font-bold text-slate-600 uppercase mb-1">{comp}</p>
                                            <p className="text-xl font-black text-carb-green italic">P</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 px-4">
                            <button onClick={() => { localStorage.removeItem('carb_field_draft'); setStep('name'); }} className="flex-1 py-7 bg-slate-800 text-white font-black rounded-[2rem] uppercase tracking-widest text-[10px] border border-white/5 italic active-haptic">Wipe & Restart</button>
                            <button onClick={handleFinalSubmit} className="flex-[2] py-7 bg-carb-accent text-slate-900 font-black rounded-[2rem] uppercase tracking-widest text-[11px] shadow-2xl italic active-haptic">Archive Session</button>
                        </div>
                    </div>
                )}
                <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={handleFileUpload} />
            </div>
        );
    }

    if (step === 'success') {
        return (
            <div className="max-w-md mx-auto py-24 text-center space-y-10 animate-in zoom-in duration-500">
                <div className="w-24 h-24 bg-carb-green rounded-full mx-auto flex items-center justify-center text-slate-900 text-4xl shadow-[0_20px_50px_rgba(16,185,129,0.3)]">✓</div>
                <div className="space-y-4">
                    <h2 className="text-4xl font-black italic uppercase text-white tracking-tighter">Sync Complete</h2>
                    <p className="text-sm text-slate-400 font-medium px-8 leading-relaxed">
                        Session <span className="text-carb-accent">{sessionId}</span> has been stored in the NorCal Cloud. Verification link sent to Dispatch.
                    </p>
                </div>
                <button onClick={onComplete} className="bg-white text-slate-900 px-12 py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] italic active-haptic shadow-xl">Back to Hub</button>
            </div>
        );
    }

    return null;
};

export default ClientIntake;
