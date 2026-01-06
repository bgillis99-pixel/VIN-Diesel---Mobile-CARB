
import React, { useState, useRef, useEffect } from 'react';
import { extractVinAndPlateFromImage, validateVINCheckDigit, repairVin } from '../services/geminiService';
import { decodeVinNHTSA, NHTSAVehicle } from '../services/nhtsa';
import { trackEvent } from '../services/analytics';

const CAMERA_ICON = (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
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

const VinChecker: React.FC<Props> = ({ onNavigateTools, onNavigateChat }) => {
  const [inputVal, setInputVal] = useState('');
  const [plateVal, setPlateVal] = useState('');
  const [zipInput, setZipInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorCorrection, setErrorCorrection] = useState<string | null>(null);
  const [vehicleDetails, setVehicleDetails] = useState<NHTSAVehicle | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showResultScreen, setShowResultScreen] = useState<'compliant' | 'non-compliant' | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Proactive 17-Digit Rule enforcement.
   * Auto-corrects I, O, Q to numbers and alerts the user.
   */
  useEffect(() => {
    if (!inputVal) {
      setErrorCorrection(null);
      return;
    }

    const raw = inputVal.toUpperCase();
    if (/[IOQ]/.test(raw)) {
      setErrorCorrection('RULE ALERT: VINs never contain Letters I, O, or Q. Auto-correcting to 1 and 0.');
      const corrected = raw.replace(/I/g, '1').replace(/[OQ]/g, '0');
      setInputVal(corrected);
    } else {
      setErrorCorrection(null);
    }

    if (inputVal.length === 17) {
        handleVerification(inputVal);
    } else {
      setVehicleDetails(null);
    }
  }, [inputVal]);

  const handleVerification = async (vin: string) => {
    // Phase 1: Check Digit Validation (MOD 11)
    if (!validateVINCheckDigit(vin)) {
        setErrorCorrection('CRITICAL: Check-Digit Mismatch. Please double-check characters.');
        trackEvent('vin_validation_fail', { vin });
        return;
    }
    
    // Phase 2: NHTSA Decoding
    setLoading(true);
    const data = await decodeVinNHTSA(vin);
    if (data && data.valid) {
        setVehicleDetails(data);
        setErrorCorrection(null);
    } else {
        setErrorCorrection('WARNING: VIN not recognized by NHTSA database.');
    }
    setLoading(false);
  };

  const startScanner = async () => {
    setIsScannerOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      setIsScannerOpen(false);
      fileInputRef.current?.click();
    }
  };

  const captureFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    
    setLoading(true);
    if (videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
    setIsScannerOpen(false);

    canvasRef.current.toBlob(async (blob) => {
      if (!blob) return;
      const result = await extractVinAndPlateFromImage(blob);
      setInputVal(result.vin);
      setPlateVal(result.plate);
      setShowConfirmModal(true);
      setLoading(false);
    }, 'image/jpeg');
  };

  const handleManualFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const result = await extractVinAndPlateFromImage(file);
    setInputVal(result.vin);
    setPlateVal(result.plate);
    setShowConfirmModal(true);
    setLoading(false);
  };

  const triggerRegistryCheck = () => {
    setShowConfirmModal(false);
    // Simulation logic for result screen
    const isCompliant = !isNaN(parseInt(inputVal.slice(-1)));
    setShowResultScreen(isCompliant ? 'compliant' : 'non-compliant');
    trackEvent('registry_check', { result: isCompliant ? 'compliant' : 'non-compliant' });
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6 pb-20 animate-in fade-in duration-700">
      <input type="file" ref={fileInputRef} onChange={handleManualFile} accept="image/*" className="hidden" />
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Bubble 1: Enter VIN */}
      <div className="bg-white/5 border border-white/10 rounded-[3rem] p-10 shadow-2xl space-y-6 relative overflow-hidden transition-transform active:scale-[0.99]">
          <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em] italic text-center mb-2">Bubble (1)</div>
          <h2 className="text-white font-black text-2xl uppercase tracking-widest text-center italic">Enter VIN</h2>
          <div className="space-y-4">
              <input 
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value.toUpperCase())}
                placeholder="VIN ENTRY"
                maxLength={17}
                className="w-full bg-black/60 border border-white/10 rounded-2xl py-6 px-6 text-center text-2xl font-black text-white outline-none focus:border-blue-500 transition-all vin-monospace placeholder:text-gray-800"
              />
              {errorCorrection && <p className="text-center text-[8px] font-black text-red-500 uppercase tracking-widest animate-pulse leading-relaxed">{errorCorrection}</p>}
              {vehicleDetails && <p className="text-center text-[9px] font-black text-green-500 uppercase tracking-widest italic">{vehicleDetails.year} {vehicleDetails.make} {vehicleDetails.model} IDENTIFIED</p>}
          </div>
          <button 
            disabled={inputVal.length < 11 || loading}
            onClick={() => setShowConfirmModal(true)}
            className="w-full py-6 bg-blue-600 text-white font-black rounded-3xl uppercase tracking-[0.3em] text-xs shadow-lg active-haptic disabled:opacity-30 italic"
          >
            {loading ? 'ANALYZING...' : 'Check Status'}
          </button>
      </div>

      {/* Bubble 2: Upload/Scan */}
      <div className="bg-white/5 border border-white/10 rounded-[3rem] p-10 shadow-2xl space-y-6 relative overflow-hidden active-haptic cursor-pointer" onClick={startScanner}>
          <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em] italic text-center mb-2">Bubble (2)</div>
          <div className="flex flex-col items-center gap-4">
              <div className="text-blue-500">{CAMERA_ICON}</div>
              <h2 className="text-white font-black text-2xl uppercase tracking-widest text-center italic">Scan Label</h2>
              <p className="text-[8px] font-bold text-gray-500 uppercase tracking-[0.2em] -mt-2">AI OPTICS DETECTION PROTOCOL</p>
          </div>
      </div>

      {/* Bubble 3: Tester Zip */}
      <div className="bg-white/5 border border-white/10 rounded-[3rem] p-10 shadow-2xl space-y-6">
          <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em] italic text-center mb-2">Bubble (3)</div>
          <h2 className="text-white font-black text-2xl uppercase tracking-widest text-center italic">Find Tester</h2>
          <div className="flex gap-2">
              <input 
                value={zipInput}
                onChange={(e) => setZipInput(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="LOCAL ZIP"
                className="flex-1 bg-black/40 border border-white/10 rounded-2xl py-6 px-6 text-center text-xl font-black text-white outline-none focus:border-blue-500 transition-all uppercase tracking-widest placeholder:text-gray-800"
              />
              <button 
                onClick={() => zipInput.length === 5 && onNavigateTools()}
                className="bg-blue-600 text-white px-8 rounded-2xl flex items-center justify-center active-haptic"
              >
                {SUBMIT_ICON}
              </button>
          </div>
      </div>

      {/* Bubble 4: AI Bot */}
      <div className="bg-white/5 border border-white/10 rounded-[3rem] p-10 shadow-2xl space-y-6 active-haptic cursor-pointer" onClick={onNavigateChat}>
          <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em] italic text-center mb-2">Bubble (4)</div>
          <div className="flex flex-col items-center gap-4">
              <span className="text-4xl">🤖</span>
              <h2 className="text-white font-black text-2xl uppercase tracking-widest text-center italic">Ask AI Bot</h2>
              <p className="text-[8px] font-bold text-gray-500 uppercase tracking-[0.2em] -mt-2">REGULATORY GUIDANCE v12.26</p>
          </div>
      </div>

      {/* Scanner Viewfinder Overlay */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-[1000] bg-black flex flex-col animate-in fade-in duration-300">
          <div className="flex-1 relative overflow-hidden">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <div className="absolute inset-0 border-[60px] border-black/80 flex items-center justify-center pointer-events-none">
              <div className="w-full h-32 border-2 border-white/30 rounded-2xl relative shadow-[0_0_0_1000px_rgba(0,0,0,0.5)]">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
              </div>
            </div>
          </div>
          <div className="bg-black p-12 flex justify-between items-center px-16">
            <button onClick={() => setIsScannerOpen(false)} className="text-white/40 text-[10px] font-black uppercase tracking-widest italic">EXIT</button>
            <button onClick={captureFrame} className="w-24 h-24 bg-white rounded-full border-[10px] border-white/20 active:scale-90 transition-transform">
                <div className="w-full h-full border-2 border-black rounded-full"></div>
            </button>
            <div className="w-10"></div>
          </div>
        </div>
      )}

      {/* CRITICAL VERIFICATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[1500] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-6">
          <div className="bg-[#020617] border border-red-500/20 rounded-[4rem] w-full max-w-lg overflow-hidden shadow-[0_0_100px_rgba(239,68,68,0.1)] animate-in zoom-in duration-300">
            <div className="bg-red-600 p-10 text-center">
              <h2 className="text-3xl font-black italic uppercase text-white tracking-tighter">Critical Verification</h2>
              <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.4em] mt-2 italic">Verify Detected Optics Accuracy</p>
            </div>
            
            <div className="p-10 space-y-10">
              <div className="space-y-6">
                <div className="space-y-2">
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest italic text-center">17-Character VIN Chain</p>
                    <input 
                      value={inputVal}
                      onChange={(e) => setInputVal(e.target.value.toUpperCase())}
                      className="w-full bg-black border border-white/10 p-6 rounded-2xl text-center text-3xl font-black text-white vin-monospace tracking-[0.1em] focus:border-blue-500 transition-all shadow-inner"
                    />
                </div>
                <div className="space-y-2">
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest italic text-center">License Plate Identifier</p>
                    <input 
                      value={plateVal}
                      onChange={(e) => setPlateVal(e.target.value.toUpperCase())}
                      className="w-full bg-black border border-white/10 p-6 rounded-2xl text-center text-2xl font-black text-white tracking-[0.2em] focus:border-blue-500 transition-all shadow-inner"
                    />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setShowConfirmModal(false)} className="py-6 bg-white/5 text-white border border-white/10 rounded-3xl font-black text-[10px] uppercase italic tracking-widest active-haptic">EDIT DATA</button>
                  <button 
                    disabled={inputVal.length !== 17}
                    onClick={triggerRegistryCheck} 
                    className="py-6 bg-blue-600 text-white rounded-3xl font-black text-[10px] uppercase italic tracking-widest shadow-2xl active-haptic disabled:opacity-30"
                  >
                    VERIFY & CHECK
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESULTS DISPLAY */}
      {showResultScreen && (
        <div className={`fixed inset-0 z-[2000] flex flex-col items-center justify-center p-8 animate-in fade-in duration-500 ${showResultScreen === 'compliant' ? 'bg-[#052e16]' : 'bg-[#450a0a]'}`}>
             <div className="text-center space-y-12 w-full max-w-sm">
                <div className={`w-32 h-32 rounded-full mx-auto flex items-center justify-center border-[8px] ${showResultScreen === 'compliant' ? 'bg-green-600/20 border-green-500 text-green-500' : 'bg-red-600/20 border-red-500 text-red-500'}`}>
                    <span className="text-5xl">{showResultScreen === 'compliant' ? '✓' : '!'}</span>
                </div>
                <div className="space-y-4">
                    <h2 className="text-6xl font-black italic uppercase tracking-tighter text-white">
                        {showResultScreen === 'compliant' ? 'COMPLIANT' : 'ALERT'}
                    </h2>
                    <p className="text-xs font-black uppercase tracking-[0.4em] opacity-60 italic">Status Verified in State Registry</p>
                </div>
                <button onClick={() => setShowResultScreen(null)} className="text-white/40 text-[10px] font-black uppercase tracking-[0.5em] hover:text-white pt-10">Close Dashboard</button>
             </div>
        </div>
      )}
    </div>
  );
};

export default VinChecker;
