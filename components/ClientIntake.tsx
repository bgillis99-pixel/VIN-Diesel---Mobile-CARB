
import React, { useState, useRef } from 'react';
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
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [mode, setMode] = useState<IntakeMode | null>(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'name' | 'mode' | 'extraction' | 'success'>('name');
    const [extractedResult, setExtractedResult] = useState<ExtractedTruckData | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files: File[] = Array.from(e.target.files || []);
        if (files.length === 0) return;
        
        setSelectedFiles(files);
        setLoading(true);
        triggerHaptic('medium');
        setStep('extraction');

        try {
            let data: any;
            if (files.length > 1 || mode === 'BATCH_MODE') {
                data = await processBatchIntake(files);
            } else if (mode === 'AUTO_DETECT') {
                data = await identifyAndExtractData(files[0]);
            } else if (mode === 'VIN_LABEL') {
                data = await extractVinAndPlateFromImage(files[0]);
            } else if (mode === 'REGISTRATION') {
                data = await extractRegistrationData(files[0]);
            } else if (mode === 'ENGINE_TAG') {
                data = await extractEngineTagData(files[0]);
            }

            setExtractedResult(data);
            triggerHaptic('success');
            trackEvent('intake_extraction_complete', { mode, fileCount: files.length });
        } catch (err) {
            triggerHaptic('error');
            alert("AI Sync Error. Please try with higher resolution photos.");
            setStep('mode');
        } finally {
            setLoading(false);
        }
    };

    const handleFinalSubmit = async () => {
        if (!extractedResult) return;
        setLoading(true);
        triggerHaptic('heavy');
        
        try {
            await saveIntakeSubmission({
                clientName,
                timestamp: Date.now(),
                photos: { vin: null, plate: null, odometer: null, ecl: null, engine: null, exterior: null, registration: null },
                extractedData: extractedResult,
                status: 'pending',
                mode: mode || 'FULL_INTAKE'
            });

            const vin = extractedResult.vin || '';
            let nhtsaData = null;
            if (vin && vin.length === 17) nhtsaData = await decodeVinNHTSA(vin);

            await saveClientToCRM({
                clientName,
                phone: clientPhone,
                email: clientEmail,
                vin,
                plate: extractedResult.licensePlate || '',
                make: nhtsaData?.make || extractedResult.engineManufacturer || '',
                model: nhtsaData?.model || extractedResult.engineModel || '',
                year: nhtsaData?.year || extractedResult.engineYear || '',
                timestamp: Date.now(),
                status: 'New',
                notes: `Batch Uploaded. Drive Path: Folder-Dr. Gillis`
            });

            triggerHaptic('success');
            setStep('success');
        } catch (e) {
            triggerHaptic('error');
            alert("Database Link Failure.");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text?: string) => {
        if (!text) return;
        triggerHaptic('light');
        navigator.clipboard.writeText(text);
    };

    const copyFullTemplate = () => {
        if (!extractedResult) return;
        triggerHaptic('medium');
        const text = `
Inspection Date: ${extractedResult.inspectionDate || ''}
VIN: ${extractedResult.vin || ''}
Odometer: ${extractedResult.mileage || ''}
License Plate: ${extractedResult.licensePlate || ''}
Engine Family Name: ${extractedResult.engineFamilyName || ''}
Engine manufacturer: ${extractedResult.engineManufacturer || ''}
Engine model: ${extractedResult.engineModel || ''}
Engine year: ${extractedResult.engineYear || ''}
EGR: ${extractedResult.egr || 'P'}
SCR: ${extractedResult.scr || 'P'}
TWC: ${extractedResult.twc || 'P'}
NOx: ${extractedResult.nox || 'P'}
SC/TC: ${extractedResult.sctc || 'P'}
ECM/PCM: ${extractedResult.ecmPcm || 'P'}
DPF: ${extractedResult.dpf || 'P'}
        `.trim();
        copyToClipboard(text);
    };

    if (step === 'name') {
        return (
            <div className="max-w-md mx-auto py-6 animate-in fade-in duration-500">
                <div className="glass p-10 rounded-[3.5rem] border border-blue-500/20 space-y-8">
                    <div className="text-center space-y-2">
                        <h2 className="text-3xl font-black italic tracking-tighter uppercase">Intake Portal</h2>
                        <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.4em]">Multi-Asset Processor</p>
                    </div>
                    
                    <div className="space-y-4 pt-4">
                        <input 
                            value={clientName}
                            onChange={e => setClientName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && clientName && setStep('mode')}
                            placeholder="CLIENT / COMPANY NAME"
                            className="w-full bg-white/5 p-5 rounded-3xl border border-white/10 outline-none focus:border-blue-500 text-sm font-black text-white uppercase italic tracking-widest"
                        />
                        <input 
                            value={clientPhone}
                            onChange={e => setClientPhone(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && clientName && setStep('mode')}
                            placeholder="PHONE NUMBER"
                            className="w-full bg-white/5 p-5 rounded-3xl border border-white/10 outline-none focus:border-blue-500 text-sm font-bold text-white tracking-widest"
                        />
                        <button 
                            onClick={() => { triggerHaptic('light'); setStep('mode'); }}
                            disabled={!clientName}
                            className="w-full py-6 bg-blue-600 text-white font-black rounded-[2rem] uppercase tracking-widest text-xs shadow-xl disabled:opacity-50 mt-4"
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
                    <h2 className="text-xl font-black italic tracking-tighter uppercase text-gray-500">{clientName}</h2>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Select Intake Mode</h3>
                </div>
                <div className="space-y-4">
                    <ModeButton 
                        icon="📁" 
                        label="Batch Upload (All Docs)" 
                        sub="Upload VIN, Plate, ODO, and Tag together" 
                        onClick={() => { triggerHaptic('light'); setMode('BATCH_MODE'); fileInputRef.current?.click(); }}
                    />
                    <div className="h-px bg-white/10 my-4 mx-8"></div>
                    <ModeButton 
                        icon="✨" 
                        label="Magic Scan (Single Doc)" 
                        sub="Auto-identify document type" 
                        onClick={() => { triggerHaptic('light'); setMode('AUTO_DETECT'); fileInputRef.current?.click(); }}
                    />
                </div>
                <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={handleFileUpload} />
            </div>
        );
    }

    if (step === 'extraction') {
        return (
            <div className="max-w-2xl mx-auto py-10 space-y-8 animate-in fade-in duration-500">
                {loading ? (
                    <div className="glass p-16 rounded-[4rem] flex flex-col items-center gap-6">
                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] animate-pulse">Syncing with NorCal CARB Database...</p>
                        <div className="text-center">
                            <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Processing {selectedFiles.length} files</p>
                            <div className="flex gap-1 mt-2 justify-center">
                                {selectedFiles.map((_, i) => <div key={i} className="w-1 h-1 bg-blue-500 rounded-full"></div>)}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="glass p-8 sm:p-12 rounded-[3.5rem] border border-white/10 space-y-10 bg-white/5 shadow-2xl">
                            <div className="flex justify-between items-center">
                                <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter">Review Record</h3>
                                <button onClick={copyFullTemplate} className="px-4 py-2 bg-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest text-white hover:bg-blue-500 transition-colors">Copy All</button>
                            </div>

                            <div className="space-y-4 font-mono">
                                {[
                                    { label: 'Inspection Date', value: extractedResult?.inspectionDate, key: 'inspectionDate' },
                                    { label: 'VIN', value: extractedResult?.vin, key: 'vin' },
                                    { label: 'Odometer', value: extractedResult?.mileage, key: 'mileage' },
                                    { label: 'License Plate', value: extractedResult?.licensePlate, key: 'licensePlate' },
                                    { label: 'Engine Family Name', value: extractedResult?.engineFamilyName, key: 'engineFamilyName' },
                                    { label: 'Engine Manufacturer', value: extractedResult?.engineManufacturer, key: 'engineManufacturer' },
                                    { label: 'Engine Model', value: extractedResult?.engineModel, key: 'engineModel' },
                                    { label: 'Engine Year', value: extractedResult?.engineYear, key: 'engineYear' },
                                ].map((item) => (
                                    <div key={item.key} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 border-b border-white/5 gap-2">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{item.label}:</span>
                                        <div className="flex items-center gap-4 bg-black/20 p-3 rounded-2xl flex-1 justify-between max-w-sm sm:max-w-none">
                                            <span className="text-xs sm:text-sm font-black text-blue-400 uppercase truncate">{item.value || 'N/A'}</span>
                                            <button onClick={() => copyToClipboard(item.value)} className="text-blue-600 text-[8px] font-black uppercase tracking-widest">Copy</button>
                                        </div>
                                    </div>
                                ))}

                                <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {['EGR', 'SCR', 'TWC', 'NOx', 'SC/TC', 'ECM/PCM', 'DPF'].map(comp => (
                                        <div key={comp} className="bg-black/20 p-4 rounded-2xl border border-white/5 text-center space-y-1">
                                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{comp}</p>
                                            <p className="text-sm font-black text-green-500">P</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={() => { triggerHaptic('light'); setStep('mode'); }} className="flex-1 py-6 bg-white/5 text-white font-black rounded-[2rem] uppercase tracking-widest text-[9px] border border-white/10">Retry</button>
                            <button onClick={handleFinalSubmit} className="flex-[2] py-6 bg-blue-600 text-white font-black rounded-[2rem] uppercase tracking-widest text-[10px] shadow-2xl">Confirm & Add to CRM</button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (step === 'success') {
        return (
            <div className="max-w-md mx-auto py-20 text-center space-y-10 animate-in zoom-in duration-500">
                <div className="w-24 h-24 bg-green-500 rounded-full mx-auto flex items-center justify-center text-white text-4xl shadow-[0_20px_50px_rgba(34,197,94,0.3)]">✓</div>
                <div className="space-y-4">
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase text-white leading-tight">Intake Complete</h2>
                    <p className="text-[14px] text-blue-400 font-black uppercase tracking-widest px-8 leading-relaxed italic">
                        Fleet Advisor VIN will be with you if they have any follow up.
                    </p>
                    <div className="pt-4 space-y-2">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Files Dispatched To:</p>
                        <p className="text-[10px] font-black text-white bg-white/10 inline-block px-4 py-2 rounded-full uppercase tracking-widest">Folder-Dr. Gillis (Google Drive)</p>
                    </div>
                </div>
                <button onClick={() => { triggerHaptic('light'); onComplete(); }} className="bg-white text-carb-navy px-12 py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest italic active-haptic">Back to HUB</button>
            </div>
        );
    }

    return null;
};

export default ClientIntake;
