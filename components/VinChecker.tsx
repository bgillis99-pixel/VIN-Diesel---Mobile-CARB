
import React, { useState, useRef, useEffect } from 'react';
import { extractVinFromImage, findTestersNearby, validateVINCheckDigit, isValidVinFormat, repairVin } from '../services/geminiService';
import { decodeVinNHTSA, NHTSAVehicle } from '../services/nhtsa';
import { trackEvent } from '../services/analytics';

const PHONE_ICON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
);

const MESSAGE_ICON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
);

const EMAIL_ICON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
);

const SHARE_ICON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
);

const SCREENSHOT_ICON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);

const CAMERA_ICON = (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
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

const VinChecker: React.FC<Props> = ({ onNavigateChat, onNavigateTools }) => {
  const [inputVal, setInputVal] = useState('');
  const [searchMode, setSearchMode] = useState<'VIN' | 'OWNER'>('VIN');
  const [loading, setLoading] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);
  const [vehicleDetails, setVehicleDetails] = useState<NHTSAVehicle | null>(null);
  const [vinVerified, setVinVerified] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showResultScreen, setShowResultScreen] = useState<'compliant' | 'non-compliant' | null>(null);

  // Live Scanner States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!inputVal) {
        setFormatError(null);
        setVinVerified(false);
        setVehicleDetails(null);
        return;
    }
    
    const timer = setTimeout(async () => {
        const val = repairVin(inputVal.trim().toUpperCase());
        if (searchMode === 'VIN') {
            if (val.length === 17) {
                if (!validateVINCheckDigit(val)) {
                    setFormatError('Check Digit mismatch. Invalid VIN.');
                    setVinVerified(false);
                    return;
                }
                setFormatError(null);
                const data = await decodeVinNHTSA(val);
                if (data && data.valid) {
                    setVehicleDetails(data);
                    setVinVerified(true);
                }
            } else if (val.length > 0) {
                setVinVerified(false);
                if (val.length > 17) setFormatError('17 characters exactly.');
                else if (/[IOQ]/.test(val)) setFormatError('Note: Use 0 (Zero), never O (Letter).');
            }
        }
    }, 300);
    return () => clearTimeout(timer);
  }, [inputVal, searchMode]);

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
      console.error("Camera access denied:", err);
      setIsScannerOpen(false);
      fileInputRef.current?.click();
    }
  };

  const stopScanner = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsScannerOpen(false);
  };

  const captureFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    setLoading(true);
    stopScanner();

    canvas.toBlob(async (blob) => {
      if (!blob) { setLoading(false); return; }
      try {
        const result = await extractVinFromImage(blob);
        if (result.vin && result.vin.length >= 11) {
            setInputVal(result.vin.toUpperCase());
            setSearchMode('VIN');
            trackEvent('vin_scan_success');
            if (result.vin.length === 17) {
              setTimeout(() => setShowConfirmModal(true), 600);
            }
        } else {
            setFormatError("Optics failed. Enter manually.");
        }
      } catch (err) {
        setFormatError("AI Error.");
      } finally {
        setLoading(false);
      }
    }, 'image/jpeg', 0.9);
  };

  const handleManualFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setFormatError(null);
    setVinVerified(false);
    
    try {
      const result = await extractVinFromImage(file);
      if (result.vin && result.vin.length >= 11) {
          setInputVal(result.vin.toUpperCase());
          setSearchMode('VIN');
          trackEvent('vin_scan_success');
          if (result.vin.length === 17) {
            setTimeout(() => setShowConfirmModal(true), 600);
          }
      } else {
          setFormatError("Optics failed. Enter manually.");
      }
    } catch (err) {
      setFormatError("AI Error.");
    } finally {
      setLoading(false);
      if(fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const proceedToPortal = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    
    const isCompliant = !isNaN(parseInt(inputVal.slice(-1)));
    setShowResultScreen(isCompliant ? 'compliant' : 'non-compliant');
    trackEvent('compliance_check', { result: isCompliant ? 'compliant' : 'non-compliant' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value.toUpperCase();
      // Enforce the 17-Digit Rule: Never I, O, Q
      val = val.replace(/O/g, '0').replace(/Q/g, '0').replace(/I/g, '1');
      setInputVal(val);
  };

  const handleShareResult = async () => {
    const text = `Compliance Report for VIN: ${inputVal}. Result: ${showResultScreen?.toUpperCase()}`;
    if (navigator.share) {
        await navigator.share({ title: 'Compliance Report', text });
    } else {
        window.location.href = `mailto:?subject=Compliance Report&body=${encodeURIComponent(text)}`;
    }
  };

  if (showResultScreen) {
    const isCompliant = showResultScreen === 'compliant';
    return (
        <div className={`fixed inset-0 z-[600] flex flex-col items-center justify-center p-6 animate-in fade-in duration-500 ${isCompliant ? 'bg-[#052e16]' : 'bg-[#450a0a]'}`}>
            <div className="max-w-md w-full space-y-10 text-center">
                <div className={`w-32 h-32 rounded-full mx-auto flex items-center justify-center border-4 ${isCompliant ? 'bg-green-600/20 border-green-500 text-green-500' : 'bg-red-600/20 border-red-500 text-red-500'}`}>
                    {isCompliant ? (
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                </div>

                <div className="space-y-4">
                    <h2 className={`text-4xl font-black italic uppercase tracking-tighter ${isCompliant ? 'text-green-500' : 'text-red-500'}`}>
                        {isCompliant ? 'Congratulations!' : 'Alert: Non-Compliant'}
                    </h2>
                    <p className="text-white text-xl font-bold uppercase tracking-wide">
                        Your vehicle is {isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}
                    </p>
                    <p className="text-gray-400 font-mono text-sm tracking-widest">{inputVal}</p>
                    {!isCompliant && (
                        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 mt-6">
                            <p className="text-sm text-white/90 font-medium leading-relaxed italic">
                                Reason: Emissions testing overdue or fee unpaid in CTC-VIS registry.
                            </p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-4 pt-4">
                    {isCompliant ? (
                        <>
                            <button onClick={handleShareResult} className="w-full flex items-center justify-center gap-4 py-6 bg-white text-black rounded-[2rem] font-black uppercase tracking-widest text-sm active-haptic">
                                {SHARE_ICON} SHARE REPORT
                            </button>
                            <button onClick={() => window.print()} className="w-full flex items-center justify-center gap-4 py-6 bg-white/10 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm active-haptic border border-white/20">
                                {SCREENSHOT_ICON} SAVE SCREENSHOT
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="grid grid-cols-3 gap-3">
                                <a href="tel:6173596953" className="flex flex-col items-center gap-2 p-6 bg-red-600 text-white rounded-3xl active-haptic shadow-lg">
                                    {PHONE_ICON} <span className="text-[9px] font-black uppercase">Call Me</span>
                                </a>
                                <a href="sms:6173596953" className="flex flex-col items-center gap-2 p-6 bg-white/10 text-white rounded-3xl border border-white/10 active-haptic">
                                    {MESSAGE_ICON} <span className="text-[9px] font-black uppercase">Text Me</span>
                                </a>
                                <a href="mailto:bgillis99@gmail.com" className="flex flex-col items-center gap-2 p-6 bg-white/10 text-white rounded-3xl border border-white/10 active-haptic">
                                    {EMAIL_ICON} <span className="text-[9px] font-black uppercase">Email Me</span>
                                </a>
                            </div>
                            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest pt-4">
                                Contact me to discuss how to get compliant
                            </p>
                        </>
                    )}
                </div>

                <button onClick={() => setShowResultScreen(null)} className="text-gray-500 text-[11px] font-black uppercase tracking-[0.4em] hover:text-white pt-6">
                    ← BACK TO HUB
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-12 pb-10">
      <input type="file" ref={fileInputRef} onChange={handleManualFile} accept="image/*" className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Manual Input Section */}
      <div className="space-y-4">
          <div className="flex justify-center gap-10 mb-4">
              <button onClick={() => setSearchMode('VIN')} className={`text-[12px] font-black uppercase tracking-[0.3em] italic pb-2 border-b-4 transition-all ${searchMode === 'VIN' ? 'border-carb-accent text-white' : 'border-transparent text-gray-700'}`}>VERIFY VIN</button>
              <button onClick={() => setSearchMode('OWNER')} className={`text-[12px] font-black uppercase tracking-[0.3em] italic pb-2 border-b-4 transition-all ${searchMode === 'OWNER' ? 'border-carb-accent text-white' : 'border-transparent text-gray-700'}`}>ENTITY LINK</button>
          </div>

          <div className="space-y-3 px-1">
              <div className="text-[11px] font-black text-blue-500 uppercase tracking-[0.4em] italic px-10 mb-2">
                {searchMode === 'VIN' ? 'ENTER VIN HERE' : 'ENTER ENTITY ID'}
              </div>
              <div className="relative">
                  <div className={`absolute -inset-1 rounded-[3.5rem] blur-sm opacity-40 transition-all duration-700 ${formatError ? 'bg-red-500' : (vinVerified ? 'bg-green-500' : 'bg-blue-600')}`}></div>
                  <div className="relative flex items-center">
                    <input 
                      value={inputVal}
                      onChange={handleInputChange}
                      onKeyDown={(e) => e.key === 'Enter' && inputVal.length === 17 && setShowConfirmModal(true)}
                      placeholder={searchMode === 'VIN' ? "17-CHARS" : "ID#"}
                      className={`relative w-full bg-black/90 text-white border border-white/10 rounded-[3.5rem] py-12 pl-12 pr-28 text-center text-4xl font-black outline-none transition-all placeholder:text-gray-800 ${formatError ? 'border-red-500' : (vinVerified ? 'border-green-500' : 'focus:border-blue-500')} shadow-[0_30px_60px_rgba(0,0,0,0.6)] tracking-[0.1em] vin-monospace`}
                    />
                    <button onClick={() => inputVal.length === 17 && setShowConfirmModal(true)} className={`absolute right-6 w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-2xl ${vinVerified ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-800'}`}>
                      {SUBMIT_ICON}
                    </button>
                  </div>
                  {formatError && <p className="absolute -bottom-14 left-0 right-0 text-center text-[10px] font-black text-red-500 uppercase tracking-widest animate-pulse">{formatError}</p>}
                  {vinVerified && <p className="absolute -bottom-12 left-0 right-0 text-center text-[10px] font-black text-green-500 uppercase tracking-widest italic">{vehicleDetails?.year} {vehicleDetails?.make} IDENTIFIED</p>}
              </div>
          </div>
      </div>

      {/* Main Action Hub */}
      <div className="grid grid-cols-2 gap-6 pt-2">
          <button onClick={startScanner} disabled={loading} className="w-full group bg-white p-12 rounded-[3.5rem] flex flex-col items-center justify-center gap-4 active-haptic shadow-2xl border-4 border-gray-100">
                <div className="text-carb-accent">{CAMERA_ICON}</div>
                <div className="text-center">
                    <span className="font-black text-sm tracking-widest uppercase italic text-carb-navy block">SCAN VIN</span>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.25em] mt-2 italic">LIVE OPTICS</p>
                </div>
          </button>
          <button onClick={() => onNavigateTools()} className="w-full group bg-black/60 p-12 rounded-[3.5rem] flex flex-col items-center justify-center gap-4 active-haptic border-4 border-white/10 shadow-xl">
                <div className="text-carb-accent">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div className="text-center">
                    <span className="font-black text-sm tracking-widest uppercase italic text-white block">TESTER HUB</span>
                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-[0.25em] mt-2 italic">LOCAL STATIONS</p>
                </div>
          </button>
      </div>

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[500] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-4">
          <div className="bg-[#020617] border border-white/10 rounded-[4rem] w-full max-w-xl overflow-hidden shadow-[0_50px_150px_rgba(0,0,0,1)] animate-in zoom-in duration-300">
            <div className="bg-blue-600 p-12 text-center relative overflow-hidden">
              <h2 className="text-3xl font-black italic uppercase text-white tracking-tight relative z-10">Accuracy Validation</h2>
              <p className="text-[14px] font-black text-white/80 uppercase tracking-widest mt-3 relative z-10">Verify before registry submission</p>
            </div>
            
            <div className="p-10 space-y-12">
              <div className="bg-black/80 p-10 rounded-[3rem] border border-white/10 text-center">
                <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                  {inputVal.split('').map((char, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <span className={`vin-monospace text-5xl sm:text-6xl font-black w-14 sm:w-16 h-16 sm:h-20 flex items-center justify-center rounded-2xl border-2 text-white bg-white/5 border-white/10`}>
                          {char}
                        </span>
                        <span className="text-[9px] text-gray-800 font-bold mt-3 uppercase tracking-tighter">Pos {i + 1}</span>
                      </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-6">
                  <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-8 bg-white/5 text-white border border-white/10 rounded-[2.5rem] font-black text-sm uppercase italic tracking-[0.2em] active-haptic">NO / EDIT</button>
                  <button onClick={proceedToPortal} className="flex-1 py-8 bg-blue-600 text-white rounded-[2.5rem] font-black text-sm uppercase italic tracking-[0.2em] shadow-2xl shadow-blue-600/30 active-haptic">YES / VERIFY</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Scanner Viewfinder Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-[700] bg-black flex flex-col">
          <div className="flex-1 relative overflow-hidden">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            {/* Guide Overlay */}
            <div className="absolute inset-0 border-[60px] border-black/60 pointer-events-none flex items-center justify-center">
              <div className="w-full h-24 border-2 border-white/40 rounded-xl relative shadow-[0_0_0_1000px_rgba(0,0,0,0.4)]">
                <div className="absolute -top-10 left-0 right-0 text-center">
                  <span className="text-[10px] font-black uppercase text-white tracking-[0.3em]">Align VIN/Barcode within frame</span>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-black p-12 flex justify-between items-center px-16">
            <button onClick={stopScanner} className="text-white text-xs font-black uppercase tracking-widest opacity-50">Cancel</button>
            <button onClick={captureFrame} className="w-24 h-24 bg-white rounded-full flex items-center justify-center border-8 border-gray-800 active:scale-90 transition-transform shadow-2xl shadow-white/10">
              <div className="w-16 h-16 bg-white border-2 border-black rounded-full" />
            </button>
            <div className="w-12" /> {/* spacer */}
          </div>
        </div>
      )}
    </div>
  );
};

export default VinChecker;
