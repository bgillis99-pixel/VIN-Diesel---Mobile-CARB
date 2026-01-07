import React, { useState, useRef, useEffect } from 'react';
import { extractVinAndPlateFromImage, validateVINCheckDigit, repairVin } from '../services/geminiService';
import { decodeVinNHTSA, NHTSAVehicle } from '../services/nhtsa';
import { trackEvent } from '../services/analytics';

const PHONE_ICON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

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

  const MetallicStyle = "bg-gradient-to-b from-[#f3f4f6] via-[#d1d5db] to-[#9ca3af] shadow-[0_10px_25px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.8)] border border-white/20 relative overflow-hidden transition-all";
  const BrushedTexture = <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')] opacity-20 pointer-events-none"></div>;

  useEffect(() => {
    if (!inputVal) {
      setErrorCorrection(null);
      return;
    }

    const raw = inputVal.toUpperCase();
    if (/[IOQ]/.test(raw)) {
      setErrorCorrection('RULE ALERT: VINs never contain I, O, or Q.');
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
    if (!validateVINCheckDigit(vin)) {
        setErrorCorrection('CRITICAL: Check-Digit Mismatch.');
        return;
    }
    setLoading(true);
    const data = await decodeVinNHTSA(vin);
    if (data && data.valid) {
        setVehicleDetails(data);
        setErrorCorrection(null);
    } else {
        setErrorCorrection('WARNING: VIN not in NHTSA.');
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

  const triggerRegistryCheck = () => {
    setShowConfirmModal(false);
    const isCompliant = !isNaN(parseInt(inputVal.slice(-1)));
    setShowResultScreen(isCompliant ? 'compliant' : 'non-compliant');
    trackEvent('registry_check', { result: isCompliant ? 'compliant' : 'non-compliant' });
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-8 pb-10 animate-in fade-in duration-700">
      <input type="file" ref={fileInputRef} onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
              setLoading(true);
              extractVinAndPlateFromImage(file).then(res => {
                  setInputVal(res.vin);
                  setPlateVal(res.plate);
                  setShowConfirmModal(true);
                  setLoading(false);
              });
          }
      }} accept="image/*" className="hidden" />
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="bg-white/5 border border-white/10 rounded-[3.5rem] p-10 shadow-2xl space-y-8 relative overflow-hidden backdrop-blur-3xl">
          <div className="absolute inset-0 bg-blue-600/5 pointer-events-none"></div>
          <h2 className="text-white font-black text-3xl uppercase tracking-tighter text-center italic relative z-10">
            ENTER VIN <span className="text-blue-500">›</span>
          </h2>
          <div className="space-y-4 relative z-10">
              <div className="bg-black/40 rounded-[2rem] border border-white/10 p-2 focus-within:border-blue-500/50 transition-all shadow-inner">
                <input 
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value.toUpperCase())}
                  placeholder="VIN NUMBER"
                  maxLength={17}
                  className="w-full bg-transparent py-5 px-6 text-center text-2xl font-black text-white outline-none vin-monospace placeholder:text-gray-800 tracking-widest uppercase"
                />
              </div>
              {errorCorrection && <p className="text-center text-[9px] font-black text-red-500 uppercase tracking-widest italic">{errorCorrection}</p>}
              {vehicleDetails && <p className="text-center text-[10px] font-black text-green-500 uppercase tracking-widest italic">{vehicleDetails.year} {vehicleDetails.make} {vehicleDetails.model}</p>}
          </div>
          <button 
            disabled={inputVal.length < 11 || loading}
            onClick={() => setShowConfirmModal(true)}
            className={`w-full py-6 text-[#020617] font-black rounded-[2rem] uppercase tracking-[0.4em] text-[10px] active-haptic disabled:opacity-30 italic ${MetallicStyle}`}
          >
            {BrushedTexture}
            <span className="relative z-10">{loading ? 'ANALYZING...' : 'CHECK STATUS'}</span>
          </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-3 relative overflow-hidden active-haptic cursor-pointer flex flex-col items-center justify-center group" onClick={startScanner}>
              <div className="text-blue-500 group-hover:scale-110 transition-transform">{CAMERA_ICON}</div>
              <h2 className="text-white font-black text-xs uppercase tracking-widest italic text-center">Scan Label</h2>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-3 relative overflow-hidden active-haptic cursor-pointer flex flex-col items-center justify-center group" onClick={() => fileInputRef.current?.click()}>
              <div className="text-blue-500 group-hover:scale-110 transition-transform">{UPLOAD_ICON}</div>
              <h2 className="text-white font-black text-xs uppercase tracking-widest italic text-center">Upload VIN</h2>
          </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-[3rem] p-8 shadow-2xl space-y-6">
          <h2 className="text-white font-black text-lg uppercase tracking-widest text-center italic">Find Local Tester</h2>
          <div className="flex gap-2">
              <div className="flex-1 bg-black/40 rounded-[1.5rem] border border-white/10 p-1">
                <input 
                  value={zipInput}
                  onChange={(e) => setZipInput(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  placeholder="ZIP CODE"
                  className="w-full bg-transparent py-4 px-6 text-center text-lg font-black text-white outline-none tracking-widest placeholder:text-gray-800"
                />
              </div>
              <button 
                onClick={() => zipInput.length === 5 && onNavigateTools()}
                className={`px-8 rounded-[1.5rem] flex items-center justify-center active-haptic ${MetallicStyle}`}
              >
                {BrushedTexture}
                <div className="relative z-10 scale-75">{SUBMIT_ICON}</div>
              </button>
          </div>
      </div>

      {isScannerOpen && (
        <div className="fixed inset-0 z-[1000] bg-black flex flex-col animate-in fade-in duration-300">
          <div className="flex-1 relative overflow-hidden">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <div className="absolute inset-0 border-[40px] border-black/80 flex items-center justify-center pointer-events-none">
              <div className="w-full h-32 border-2 border-white/30 rounded-2xl relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
              </div>
            </div>
          </div>
          <div className="bg-black p-12 flex justify-between items-center px-16">
            <button onClick={() => setIsScannerOpen(false)} className="text-white/40 text-[10px] font-black uppercase tracking-widest italic">EXIT</button>
            <button onClick={captureFrame} className="w-20 h-20 bg-white rounded-full border-[8px] border-white/20 active:scale-90 transition-transform">
                <div className="w-full h-full border-2 border-black rounded-full"></div>
            </button>
            <div className="w-10"></div>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 z-[1500] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6">
          <div className="bg-[#020617] border border-white/10 rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className={`p-8 text-center ${MetallicStyle} rounded-none border-none`}>
              {BrushedTexture}
              <h2 className="text-2xl font-black italic uppercase text-[#020617] tracking-tighter relative z-10">AI Confirmation</h2>
            </div>
            <div className="p-8 space-y-8">
              <div className="space-y-4">
                  <div className="space-y-1">
                      <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest italic text-center">VIN Chain</p>
                      <input 
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value.toUpperCase())}
                        className="w-full bg-black/40 rounded-2xl border border-white/10 py-4 px-6 text-center text-xl font-black text-white vin-monospace tracking-widest outline-none"
                      />
                  </div>
                  <div className="space-y-1">
                      <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest italic text-center">Plate ID</p>
                      <input 
                        value={plateVal}
                        onChange={(e) => setPlateVal(e.target.value.toUpperCase())}
                        className="w-full bg-black/40 rounded-2xl border border-white/10 py-4 px-6 text-center text-xl font-black text-white tracking-widest outline-none"
                      />
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setShowConfirmModal(false)} className="py-5 bg-white/5 text-white border border-white/10 rounded-2xl font-black text-[9px] uppercase italic tracking-widest active-haptic">EDIT</button>
                  <button 
                    disabled={inputVal.length !== 17}
                    onClick={triggerRegistryCheck} 
                    className={`py-5 text-[#020617] rounded-2xl font-black text-[9px] uppercase italic tracking-widest disabled:opacity-30 ${MetallicStyle}`}
                  >
                    {BrushedTexture}
                    <span className="relative z-10">VERIFY</span>
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showResultScreen && (
        <div className={`fixed inset-0 z-[2000] flex flex-col items-center justify-center p-8 animate-in fade-in duration-500 ${showResultScreen === 'compliant' ? 'bg-[#052e16]' : 'bg-[#450a0a]'}`}>
             <div className="text-center space-y-10 w-full max-w-sm">
                <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center border-[6px] ${showResultScreen === 'compliant' ? 'bg-green-600/20 border-green-500 text-green-500' : 'bg-red-600/20 border-red-500 text-red-500'}`}>
                    <span className="text-4xl">{showResultScreen === 'compliant' ? '✓' : '!'}</span>
                </div>
                <div className="space-y-3">
                    <h2 className="text-5xl font-black italic uppercase tracking-tighter text-white leading-none">
                        {showResultScreen === 'compliant' ? 'COMPLIANT' : 'ALERT'}
                    </h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60 italic">Status Verified Registry</p>
                </div>
                <button onClick={() => setShowResultScreen(null)} className="text-white/40 text-[10px] font-black uppercase tracking-[0.5em] hover:text-white transition-colors pt-8">Close Portal</button>
             </div>
        </div>
      )}
    </div>
  );
};

export default VinChecker;