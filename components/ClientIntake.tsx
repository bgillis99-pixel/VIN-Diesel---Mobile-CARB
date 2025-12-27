
import React, { useState, useRef } from 'react';
import { batchAnalyzeTruckImages } from '../services/geminiService';
import { saveIntakeSubmission } from '../services/firebase';
import { trackEvent } from '../services/analytics';

const IntakeIcon = ({ emoji, label, done }: { emoji: string, label: string, done: boolean }) => (
    <div className={`flex flex-col items-center gap-2 p-4 rounded-3xl border transition-all ${done ? 'bg-green-500/10 border-green-500/40 text-green-400' : 'bg-white/5 border-white/10 text-gray-500'}`}>
        <span className="text-3xl">{emoji}</span>
        <span className="text-[8px] font-black uppercase tracking-widest text-center leading-tight">{label}</span>
        {done && <span className="text-[10px]">✓</span>}
    </div>
);

const ClientIntake: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [clientName, setClientName] = useState('');
    const [photos, setPhotos] = useState<Record<string, File | null>>({
        vin: null, plate: null, odo: null, ecl: null, engine: null, exterior: null, registration: null
    });
    const [currentKey, setCurrentKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'name' | 'photos' | 'success'>('name');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePhotoClick = (key: string) => {
        setCurrentKey(key);
        fileInputRef.current?.click();
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && currentKey) {
            setPhotos(prev => ({ ...prev, [currentKey]: file }));
        }
    };

    const isComplete = Object.values(photos).every(v => v !== null);

    const handleSubmit = async () => {
        if (!isComplete || !clientName) return;
        setLoading(true);
        try {
            const filesArray = Object.values(photos) as File[];
            const extraction = await batchAnalyzeTruckImages(filesArray);
            
            await saveIntakeSubmission({
                clientName,
                timestamp: Date.now(),
                photos: {
                    vin: null, // In production, upload to bucket first
                    plate: null,
                    odometer: null,
                    ecl: null,
                    engine: null,
                    exterior: null,
                    registration: null
                },
                extractedData: extraction,
                status: 'pending'
            });

            trackEvent('client_intake_submit');
            setStep('success');
        } catch (err) {
            alert("Analysis Link Error. Ensure photos are clear.");
        } finally {
            setLoading(false);
        }
    };

    if (step === 'success') {
        return (
            <div className="text-center py-20 space-y-8 animate-in zoom-in duration-500">
                <div className="w-24 h-24 bg-green-500 rounded-full mx-auto flex items-center justify-center text-white text-4xl shadow-2xl border-4 border-white/20">✓</div>
                <div className="space-y-2">
                    <h2 className="text-3xl font-black italic tracking-tighter uppercase">Submission Linked</h2>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest px-10">Your fleet data is being verified by NorCal CARB Mobile.</p>
                </div>
                <button onClick={onComplete} className="bg-white text-carb-navy px-10 py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest italic active-haptic shadow-xl">Back to Home</button>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto space-y-10 py-6">
            {step === 'name' ? (
                <div className="glass p-10 rounded-[3.5rem] border border-blue-500/20 space-y-10 animate-in slide-in-from-bottom-8">
                    <div className="text-center space-y-2">
                        <h2 className="text-3xl font-black italic tracking-tighter uppercase">Client Intake</h2>
                        <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.4em]">OVI Incoming Truck Info</p>
                    </div>
                    <div className="space-y-4">
                        <input 
                            value={clientName}
                            onChange={e => setClientName(e.target.value)}
                            placeholder="YOUR FULL NAME / COMPANY"
                            className="w-full bg-white/5 p-6 rounded-3xl border border-white/10 outline-none focus:border-blue-500 text-sm font-black text-white uppercase italic tracking-widest"
                        />
                        <button 
                            onClick={() => setStep('photos')}
                            disabled={!clientName}
                            className="w-full py-6 bg-blue-600 text-white font-black rounded-[2rem] uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 disabled:opacity-50"
                        >
                            START PHOTO PROTOCOL
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-10 animate-in fade-in duration-700">
                    <div className="text-center space-y-1">
                        <h2 className="text-xl font-black italic tracking-tighter uppercase">{clientName}</h2>
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Capture 7 Required Protocols</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { key: 'vin', label: 'VIN PLATE', emoji: '🏷️' },
                            { key: 'plate', label: 'LICENSE PLATE', emoji: '🔢' },
                            { key: 'odo', label: 'ODOMETER', emoji: '📟' },
                            { key: 'ecl', label: 'ENGINE TAG (ECL)', emoji: '⚙️' },
                            { key: 'engine', label: 'ENGINE BAY', emoji: '🔩' },
                            { key: 'exterior', label: 'TRUCK PHOTO', emoji: '🚛' },
                            { key: 'registration', label: 'REGISTRATION', emoji: '📄' }
                        ].map(item => (
                            <button key={item.key} onClick={() => handlePhotoClick(item.key)} className="active-haptic">
                                <IntakeIcon emoji={item.emoji} label={item.label} done={!!photos[item.key]} />
                            </button>
                        ))}
                    </div>

                    <div className="bg-white/5 border border-white/5 p-6 rounded-[2.5rem] text-center">
                        <p className="text-[9px] font-black text-carb-accent uppercase tracking-widest italic mb-4">
                            {isComplete ? 'Protocol Ready' : 'Awaiting Remaining Optics...'}
                        </p>
                        <button 
                            onClick={handleSubmit}
                            disabled={!isComplete || loading}
                            className="w-full py-6 bg-white text-carb-navy font-black rounded-[2rem] uppercase tracking-widest text-xs italic shadow-2xl disabled:opacity-30 active-haptic"
                        >
                            {loading ? 'UPLOADING TO CRM...' : 'SEND TO TESTER'}
                        </button>
                    </div>
                    
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={onFileChange} />
                </div>
            )}
        </div>
    );
};

export default ClientIntake;
