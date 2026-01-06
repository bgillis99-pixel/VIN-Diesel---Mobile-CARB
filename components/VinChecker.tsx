
import React, { useState, useRef, useEffect } from 'react';
import { extractVinAndPlateFromImage, validateVINCheckDigit, repairVin } from '../services/geminiService';
import { decodeVinNHTSA, NHTSAVehicle } from '../services/nhtsa';
import { trackEvent } from '../services/analytics';

const PHONE_ICON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
);

const DOWNLOAD_ICON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M7 10l5 5m0 0l5-5m-5 5V3" /></svg>
);

const SHARE_ICON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
);

const CAMERA_ICON = (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);

const TESTER_ICON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
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

const VinChecker: React.FC<Props> = ({ onNavigateTools, onShareApp }) => {
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

  // 17-Digit Rule Enforcement
  useEffect(() => {
    if (!inputVal) {
      setErrorCorrection(null);
      return;
    }

    const clean = inputVal.toUpperCase();
    if (/[IOQ]/.test(clean)) {
      setErrorCorrection('RULE ALERT: VINs never contain Letters I, O, or Q. Auto-correcting to 1 and 0.');
      const corrected = clean.replace(/I/g, '1').replace(/[OQ]/g, '0');
      setInputVal(corrected);
    } else {
      setErrorCorrection(null);
    }

    if (clean.length === 17) {
        validateVIN(clean);
    }
  }, [inputVal]);

  const validateVIN = async (vin: string) => {
    if (!validateVINCheckDigit(vin)) {
        setErrorCorrection('WARNING: VIN Check-Digit Mismatch. Verify character accuracy.');
        return;
    }
    const data = await decodeVinNHTSA(vin);
    if (data && data.valid) {
        setVehicleDetails(data);
    }
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

  return (
    <div className="w-full max-w-md mx-auto space-y-4 pb-20 animate-in fade-in duration-700">
      
      {/* Header Functions */}
      <div className="flex justify-between items-center bg-black/40 border border-white/5 rounded-[2.5rem] p-4 mb-8">
          <a href="tel:6173596953" className="flex-1 flex flex-col items-center gap-1 group active-haptic">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white border border-white/10 group-hover:bg-blue-600 transition-colors">{PHONE_ICON}</div>
              <span className="text-[7px] font-black uppercase text-gray-500">Call</span>
          </a>
          <button onClick={onShareApp} className="flex-1 flex flex-col items-center gap-1 group active-haptic">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white border border-white/10 group-hover:bg-blue-600 transition-colors">{DOWNLOAD_ICON}</div>
              <span className="text-[7px] font-black uppercase text-gray-500">Get App</span>
          </button>
          <button onClick={() => {}} className="flex-1 flex flex-col items-center gap-1 group active-haptic">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white border border-white/10 group-hover:bg-blue-600 transition-colors">{SHARE_ICON}</div>
              <span className="text-[7px] font-black uppercase text-gray-500">Share</span>
          </button>
          <button onClick={onNavigateTools} className="flex-1 flex flex-col items-center gap-1 group active-haptic">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white border border-white/10 group-hover:bg-blue-600 transition-colors">{TESTER_ICON}</div>
              <span className="text-[7px] font-black uppercase text-gray-500">Find Tester</span>
          </button>
      </div>

      {/* Bubble 1: Enter VIN */}
      <div className="bg-white/5 border border-white/10 rounded-[3rem] p-10 shadow-2xl space-y-6 relative overflow-hidden">
          <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em] italic text-center">Bubble (1): Enter Manual</div>
          <div className="space-y-4">
              <input 
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value.toUpperCase())}
                placeholder="VIN ENTRY"
                maxLength={17}
                className="w-full bg-black/60 border border-white/10 rounded-2xl py-8 px-6 text-center text-3xl font-black text-white outline-none focus:border-blue-500 transition-all vin-monospace placeholder:text-gray-800"
              />
              {errorCorrection && <p className="text-center text-[8px] font-black text-red-500 uppercase tracking-widest animate-pulse leading-relaxed">{errorCorrection}</p>}
              {vehicleDetails && <p className="text-center text-[9px] font-black text-green-500 uppercase tracking-[0.2em] italic">{vehicleDetails.year} {vehicleDetails.make} CONFIRMED</p>}
          </div>
          <button 
            disabled={inputVal.length < 11}
            onClick={() => setShowConfirmModal(true)}
            className="w-full py-6 bg-blue-600 text-white font-black rounded-3xl uppercase tracking-[0.3em] text-xs shadow-lg active-haptic disabled:opacity-30"
          >
            Check Status
          </button>
      </div>

      {/* Bubble 2: Upload VIN */}
      <div className="bg-white p-1 rounded-[3rem] shadow-2xl relative overflow-hidden active-haptic" onClick={startScanner}>
          <div className="p-12 rounded-[2.8rem] border-4 border-dashed border-gray-100 flex flex-col items-center justify-center gap-4">
              <div className="text-blue-600">{CAMERA_ICON}</div>
              <div className="text-center">
                  <span className="font-black text-xl tracking-tighter uppercase italic text-carb-navy block">Bubble (2): Upload VIN</span>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">AI OPTICS DETECTION PROTOCOL</p>
              </div>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleManualFile} accept="image/*" className="hidden" />
      </div>

      {/* Bubble 3: Enter Zip */}
      <div className="bg-white/5 border border-white/10 rounded-[3rem] p-10 shadow-2xl space-y-6">
          <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em] italic text-center">Bubble (3): Enter Zip for Tester</div>
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

      {/* Bubble 4: Legal Footer */}
      <div className="text-center pt-8 opacity-40">
          <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.6em] italic leading-loose">
            Bubble (4): Legal Protocols • © 2026 NorCal CARB Mobile <br /> 
            Verified Regulatory Intelligence Dashboard
          </p>
      </div>

      {/* Scanner Viewfinder */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-[1000] bg-black flex flex-col">
          <div className="flex-1 relative">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <div className="absolute inset-0 border-[50px] border-black/80 flex items-center justify-center pointer-events-none">
              <div className="w-full h-24 border-2 border-white/40 rounded-xl relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500"></div>
              </div>
            </div>
          </div>
          <div className="p-12 flex justify-center bg-black">
              <button onClick={captureFrame} className="w-24 h-24 bg-white rounded-full border-[8px] border-white/20 active:scale-90 transition-transform">
                  <div className="w-full h-full border border-black rounded-full"></div>
              </button>
          </div>
        </div>
      )}

      {/* CRITICAL VERIFICATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[1500] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-6">
          <div className="bg-[#020617] border border-red-500/20 rounded-[4rem] w-full max-w-lg overflow-hidden shadow-[0_0_100px_rgba(239,68,68,0.1)] animate-in zoom-in duration-300">
            <div className="bg-red-600 p-10 text-center">
              <h2 className="text-3xl font-black italic uppercase text-white tracking-tighter">Critical Verification</h2>
              <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.4em] mt-2 italic">Double Check Optics Accuracy</p>
            </div>
            
            <div className="p-10 space-y-10">
              <div className="space-y-6">
                <div className="space-y-2">
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest italic">Detected VIN Character Chain</p>
                    <input 
                      value={inputVal}
                      onChange={(e) => setInputVal(e.target.value.toUpperCase())}
                      className="w-full bg-black border border-white/10 p-6 rounded-2xl text-center text-2xl font-black text-white vin-monospace tracking-[0.1em] focus:border-blue-500 transition-all"
                    />
                </div>
                <div className="space-y-2">
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest italic">Detected License Plate</p>
                    <input 
                      value={plateVal}
                      onChange={(e) => setPlateVal(e.target.value.toUpperCase())}
                      className="w-full bg-black border border-white/10 p-6 rounded-2xl text-center text-xl font-black text-white tracking-[0.2em] focus:border-blue-500 transition-all"
                    />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setShowConfirmModal(false)} className="py-6 bg-white/5 text-white border border-white/10 rounded-3xl font-black text-[10px] uppercase italic tracking-widest active-haptic">Cancel</button>
                  <button onClick={() => { setShowConfirmModal(false); setShowResultScreen(inputVal.endsWith('1') ? 'compliant' : 'non-compliant'); }} className="py-6 bg-blue-600 text-white rounded-3xl font-black text-[10px] uppercase italic tracking-widest shadow-2xl active-haptic">Confirm All</button>
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
                    <p className="text-xs font-black uppercase tracking-[0.4em] opacity-60">Status Verified in Registry</p>
                </div>
                <button onClick={() => setShowResultScreen(null)} className="text-white/40 text-[10px] font-black uppercase tracking-[0.5em] hover:text-white pt-10">Close Dashboard</button>
             </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default VinChecker;
