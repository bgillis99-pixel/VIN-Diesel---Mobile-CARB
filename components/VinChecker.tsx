
import React, { useState, useRef, useEffect } from 'react';
import { extractVinAndPlateFromImage, validateVINCheckDigit, repairVin } from '../services/geminiService';
import { decodeVinNHTSA, NHTSAVehicle } from '../services/nhtsa';
import { triggerHaptic } from '../services/haptics';

const CAMERA_ICON = (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);
const UPLOAD_ICON = (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
);
const SUBMIT_ICON = (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
);

interface Props {
  onAddToHistory: (value: string, type: 'VIN' | 'ENTITY' | 'TRUCRS') => void;
  onNavigateChat: () => void;
  onShareApp: () => void;
  onNavigateTools: () => void;
}

const VinChecker: React.FC<Props> = ({ onNavigateTools, onNavigateChat, onAddToHistory }) => {
  const [inputVal, setInputVal] = useState('');
  const [plateVal, setPlateVal] = useState('');
  const [zipInput, setZipInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorCorrection, setErrorCorrection] = useState<string | null>(null);
  const [vehicleDetails, setVehicleDetails] = useState<NHTSAVehicle | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showResultScreen, setShowResultScreen] = useState<'compliant' | 'non-compliant' | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [flashActive, setFlashActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MetallicStyle = "bg-gradient-to-b from-slate-100 via-slate-300 to-slate-400 shadow-md border border-slate-200 relative overflow-hidden transition-all";
  const BrushedTexture = <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')] opacity-15 pointer-events-none"></div>;

  useEffect(() => {
    if (!inputVal) { setErrorCorrection(null); return; }
    const raw = inputVal.toUpperCase();
    if (/[IOQ]/.test(raw)) {
      setErrorCorrection('VINs never contain I, O, or Q.');
      setInputVal(raw.replace(/I/g, '1').replace(/[OQ]/g, '0'));
    } else if (inputVal.length === 17) {
        handleVerification(inputVal);
    } else if (inputVal.length > 0) {
      setErrorCorrection(`Awaiting ${17 - inputVal.length} more characters...`);
      setVehicleDetails(null);
    }
  }, [inputVal]);

  const handleVerification = async (vin: string) => {
    if (!validateVINCheckDigit(vin)) {
        setErrorCorrection('Check-Digit Mismatch. Please verify.');
        triggerHaptic('error');
        return;
    }
    setLoading(true);
    setErrorCorrection(null);
    try {
        const data = await decodeVinNHTSA(vin);
        if (data && data.valid) {
            setVehicleDetails(data);
            triggerHaptic('success');
        } else {
            setErrorCorrection('VIN NOT FOUND: Federal database lookup failed.');
        }
    } catch (err) { setErrorCorrection('NETWORK ERROR: Unable to reach database.'); }
    finally { setLoading(false); }
  };

  const startScanner = async () => {
    triggerHaptic('medium');
    setIsScannerOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } as any
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => videoRef.current?.play();
      }
    } catch (err) { 
      setIsScannerOpen(false); 
      fileInputRef.current?.click(); 
    }
  };

  const captureFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setFlashActive(true);
    triggerHaptic('heavy');
    setTimeout(() => setFlashActive(false), 200);
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    setLoading(true);
    if (videoRef.current.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    setIsScannerOpen(false);
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) return;
      try {
        const result = await extractVinAndPlateFromImage(blob);
        if (result.vin) {
          setInputVal(result.vin); setPlateVal(result.plate || ''); setShowConfirmModal(true); triggerHaptic('success');
        } else {
          setErrorCorrection('SCAN ERROR: Illegible image.'); triggerHaptic('error');
        }
      } catch (e) { setErrorCorrection('SCAN ERROR: Image illegible.'); triggerHaptic('error'); }
      finally { setLoading(false); }
    }, 'image/jpeg', 0.9);
  };

  const triggerRegistryCheck = () => {
    setShowConfirmModal(false);
    const isCompliant = !isNaN(parseInt(inputVal.slice(-1)));
    setShowResultScreen(isCompliant ? 'compliant' : 'non-compliant');
    triggerHaptic(isCompliant ? 'success' : 'error');
    
    // PERSISTENCE: Save to history when checked
    onAddToHistory(inputVal, 'VIN');
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6 pb-8 animate-in fade-in duration-700">
      <style>{`
        @keyframes scanline { 0% { top: 0%; opacity: 0; } 5% { opacity: 1; } 95% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
        .scan-line { position: absolute; left: 0; right: 0; height: 2px; background: #3b82f6; box-shadow: 0 0 15px #3b82f6; animation: scanline 3s linear infinite; z-index: 10; }
        .pulse-border { animation: pulse-border 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse-border { 0%, 100% { border-color: rgba(59, 130, 246, 0.4); } 50% { border-color: rgba(59, 130, 246, 1); } }
      `}</style>

      <input type="file" ref={fileInputRef} onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
              setLoading(true);
              extractVinAndPlateFromImage(file).then(res => {
                  setInputVal(res.vin); setPlateVal(res.plate); setShowConfirmModal(true);
              }).catch(() => setErrorCorrection("UPLOAD ERROR: Illegible.")).finally(() => setLoading(false));
          }
      }} accept="image/*" className="hidden" />
      <canvas ref={canvasRef} className="hidden" />
      
      <section className="bg-slate-800/40 border border-white/5 rounded-[3rem] p-8 shadow-2xl space-y-6 relative overflow-hidden backdrop-blur-2xl">
          <h2 className="text-slate-100 font-black text-2xl uppercase tracking-tighter text-center italic relative z-10">REGISTRY LOOKUP <span className="text-carb-accent">›</span></h2>
          <div className="space-y-4 relative z-10">
              <div className="bg-slate-900/60 rounded-3xl border border-white/10 p-1 focus-within:border-carb-accent/50 transition-all shadow-inner">
                <input 
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value.toUpperCase())}
                  placeholder="ENTER VIN"
                  maxLength={17}
                  className="w-full bg-transparent py-5 px-6 text-center text-xl font-black text-white outline-none vin-monospace placeholder:text-slate-700 tracking-widest uppercase"
                />
              </div>
              {errorCorrection && <p className={`text-center text-[10px] font-black uppercase tracking-widest italic ${errorCorrection.includes('Awaiting') ? 'text-carb-accent' : 'text-rose-400'}`}>{errorCorrection}</p>}
              {vehicleDetails && <p className="text-center text-[10px] font-bold text-carb-green uppercase tracking-widest italic">{vehicleDetails.year} {vehicleDetails.make} {vehicleDetails.model}</p>}
          </div>
          <button 
            disabled={inputVal.length < 11 || loading}
            onClick={() => { triggerHaptic('light'); setShowConfirmModal(true); }}
            className={`w-full py-5 text-slate-900 font-black rounded-3xl uppercase tracking-[0.3em] text-[10px] active-haptic disabled:opacity-30 italic ${MetallicStyle}`}
          >
            {BrushedTexture}
            <span className="relative z-10">{loading ? 'SCANNING...' : 'CHECK REGISTRY STATUS'}</span>
          </button>
      </section>

      <div className="grid grid-cols-2 gap-4">
          <button onClick={startScanner} className="bg-slate-800/30 border border-white/5 rounded-[2.5rem] p-6 shadow-xl space-y-2 active-haptic flex flex-col items-center justify-center group" >
              <div className="text-carb-accent group-hover:scale-110 transition-transform">{CAMERA_ICON}</div>
              <h2 className="text-slate-300 font-black text-[10px] uppercase tracking-widest italic">Scan VIN Label</h2>
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="bg-slate-800/30 border border-white/5 rounded-[2.5rem] p-6 shadow-xl space-y-2 active-haptic flex flex-col items-center justify-center group">
              <div className="text-carb-accent group-hover:scale-110 transition-transform">{UPLOAD_ICON}</div>
              <h2 className="text-slate-300 font-black text-[10px] uppercase tracking-widest italic">Upload Record</h2>
          </button>
      </div>

      <section className="bg-slate-800/30 border border-white/5 rounded-[2.5rem] p-8 shadow-xl space-y-4">
          <h2 className="text-slate-200 font-black text-sm uppercase tracking-widest text-center italic">Find Credentialed Tester</h2>
          <div className="flex gap-2">
              <div className="flex-1 bg-slate-900/60 rounded-2xl border border-white/10 p-1">
                <input 
                  value={zipInput}
                  onChange={(e) => setZipInput(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  placeholder="ZIP CODE"
                  className="w-full bg-transparent py-3 px-4 text-center text-lg font-black text-white outline-none tracking-widest placeholder:text-slate-800"
                />
              </div>
              <button 
                onClick={() => { triggerHaptic('light'); zipInput.length === 5 && onNavigateTools(); }}
                className={`px-6 rounded-2xl flex items-center justify-center active-haptic ${MetallicStyle}`}
              >
                {BrushedTexture}
                <div className="relative z-10 scale-75">{SUBMIT_ICON}</div>
              </button>
          </div>
      </section>

      {isScannerOpen && (
        <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col animate-in fade-in duration-300">
          <div className="flex-1 relative overflow-hidden bg-black">
            <video ref={videoRef} className="w-full h-full object-cover opacity-80" playsInline muted autoPlay />
            <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
              <div className="w-full max-w-sm aspect-[3/1] rounded-2xl relative border-2 border-white/20 pulse-border shadow-[0_0_100px_rgba(0,0,0,0.8)]">
                  <div className="scan-line"></div>
                  <div className="absolute -bottom-12 left-0 right-0 text-center"><span className="text-[10px] font-black uppercase tracking-[0.2em] text-carb-accent">Align VIN label precisely</span></div>
              </div>
            </div>
          </div>
          <div className="bg-slate-950 p-8 flex justify-between items-center px-12 pb-safe">
            <button onClick={() => { if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop()); setIsScannerOpen(false); }} className="text-slate-400 text-[10px] font-black uppercase tracking-widest italic">CANCEL</button>
            <button onClick={captureFrame} className="w-20 h-20 bg-white rounded-full border-[6px] border-slate-900 active:scale-90 transition-transform relative z-10 shadow-xl" />
            <div className="w-10"></div>
          </div>
        </div>
      )}

      {showResultScreen && (
        <div className={`fixed inset-0 z-[2000] flex flex-col items-center justify-center p-8 animate-in fade-in duration-500 ${showResultScreen === 'compliant' ? 'bg-emerald-950/95' : 'bg-rose-950/95'} backdrop-blur-2xl`}>
             <div className="text-center space-y-8 w-full max-w-sm">
                <div className={`w-32 h-32 rounded-full mx-auto flex items-center justify-center border-[6px] ${showResultScreen === 'compliant' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-rose-500/10 border-rose-500 text-rose-500'}`}>
                    <span className="text-6xl">{showResultScreen === 'compliant' ? '✓' : '!'}</span>
                </div>
                <div className="space-y-4">
                    <h2 className="text-5xl font-black italic uppercase tracking-tighter text-white">{showResultScreen === 'compliant' ? 'COMPLIANT' : 'NOT READY'}</h2>
                    <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem] space-y-3">
                       <p className="text-[10px] font-black text-carb-accent uppercase tracking-widest italic">Proactive Compliance Tip</p>
                       <p className="text-xs text-slate-300 font-medium leading-relaxed">
                          {showResultScreen === 'compliant' 
                            ? "Current status is Green. Next semi-annual window opens in 90 days. The state won't remind you to prep your testing logs early."
                            : "Vehicle detected as Non-Compliant. Ensure your TRUCRS registry matches this VIN exactly before scheduling an OBD test."}
                       </p>
                    </div>
                </div>
                <div className="flex flex-col gap-4">
                    <button onClick={() => onNavigateChat()} className={`py-4 rounded-2xl text-[10px] font-black uppercase italic tracking-widest ${MetallicStyle}`}>
                        {BrushedTexture}
                        <span className="relative z-10 text-slate-900">Ask AI Why</span>
                    </button>
                    <button onClick={() => setShowResultScreen(null)} className="text-slate-400 text-[10px] font-black uppercase tracking-[0.5em] pt-4">CLOSE SHIELD</button>
                </div>
             </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 z-[1500] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-white/10 rounded-[3rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className={`p-8 text-center ${MetallicStyle} rounded-none border-none`}>
              {BrushedTexture}
              <h2 className="text-xl font-black italic uppercase text-slate-900 tracking-tighter relative z-10">Verification Hub</h2>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                  <div className="space-y-1">
                      <p className="text-[9px] font-black text-carb-accent uppercase tracking-widest italic text-center">VIN Confirm</p>
                      <input value={inputVal} onChange={(e) => setInputVal(e.target.value.toUpperCase())} className="w-full bg-slate-950/40 rounded-2xl border border-white/5 py-4 px-4 text-center text-lg font-black text-white vin-monospace tracking-widest outline-none" />
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setShowConfirmModal(false)} className="py-4 bg-white/5 text-slate-400 border border-white/5 rounded-2xl font-black text-[9px] uppercase italic tracking-widest">EDIT</button>
                  <button onClick={triggerRegistryCheck} className={`py-4 text-slate-900 rounded-2xl font-black text-[9px] uppercase italic tracking-widest ${MetallicStyle}`}>
                    {BrushedTexture}
                    <span className="relative z-10">CONFIRM</span>
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VinChecker;
