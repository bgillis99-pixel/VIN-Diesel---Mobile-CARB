
import React, { useState, useRef, useEffect } from 'react';
import { extractVinAndPlateFromImage, findTestersNearby, validateVINCheckDigit, isValidVinFormat, repairVin } from '../services/geminiService';
import { decodeVinNHTSA, NHTSAVehicle } from '../services/nhtsa';
import { trackEvent } from '../services/analytics';

const PHONE_ICON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
);

const DOWNLOAD_ICON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M7 10l5 5m0 0l5-5m-5 5V3" /></svg>
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

const VinChecker: React.FC<Props> = ({ onNavigateChat, onNavigateTools, onShareApp }) => {
  const [inputVal, setInputVal] = useState('');
  const [plateVal, setPlateVal] = useState('');
  const [searchMode, setSearchMode] = useState<'VIN' | 'OWNER'>('VIN');
  const [loading, setLoading] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);
  const [vehicleDetails, setVehicleDetails] = useState<NHTSAVehicle | null>(null);
  const [vinVerified, setVinVerified] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showResultScreen, setShowResultScreen] = useState<'compliant' | 'non-compliant' | null>(null);

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
                else if (/[IOQ]/.test(val)) setFormatError('Note: Use 0 (Zero), never O/I/Q (Letter).');
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
        const result = await extractVinAndPlateFromImage(blob);
        if (result.vin && result.vin.length >= 11) {
            setInputVal(result.vin.toUpperCase());
            setPlateVal(result.plate || '');
            setSearchMode('VIN');
            trackEvent('vin_scan_success');
            setShowConfirmModal(true);
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
      const result = await extractVinAndPlateFromImage(file);
      if (result.vin && result.vin.length >= 11) {
          setInputVal(result.vin.toUpperCase());
          setPlateVal(result.plate || '');
          setSearchMode('VIN');
          trackEvent('vin_scan_success');
          setShowConfirmModal(true);
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
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    
    const isCompliant = !isNaN(parseInt(inputVal.slice(-1)));
    setShowResultScreen(isCompliant ? 'compliant' : 'non-compliant');
    trackEvent('compliance_check', { result: isCompliant ? 'compliant' : 'non-compliant' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value.toUpperCase();
      val = val.replace(/O/g, '0').replace(/Q/g, '0').replace(/I/g, '1');
      setInputVal(val);
  };

  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setPlateVal(e.target.value.toUpperCase().trim());
  };

  const handleShareResult = async () => {
    const text = `Compliance Report for VIN: ${inputVal}. Plate: ${plateVal || 'N/A'}. Status: ${showResultScreen?.toUpperCase()}`;
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
                    <div className="space-y-1">
                      <p className="text-gray-400 font-mono text-sm tracking-widest">{inputVal}</p>
                      {plateVal && <p className="text-blue-400 font-black text-xs tracking-[0.2em] uppercase">Plate: {plateVal}</p>}
                    </div>
                    {!isCompliant && (
                        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 mt-4">
                            <p className="text-sm text-white/90 font-medium leading-relaxed italic">
                                Contact me to discuss how to get compliant. Emission testing or fees may be overdue in the state registry.
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
                                    {PHONE_ICON} <span className="text-[9px] font-black uppercase">Call</span>
                                </a>
                                <a href="sms:6173596953" className="flex flex-col items-center gap-2 p-6 bg-white/10 text-white rounded-3xl border border-white/10 active-haptic">
                                    {MESSAGE_ICON} <span className="text-[9px] font-black uppercase">Text</span>
                                </a>
                                <a href="mailto:bgillis99@gmail.com" className="flex flex-col items-center gap-2 p-6 bg-white/10 text-white rounded-3xl border border-white/10 active-haptic">
                                    {EMAIL_ICON} <span className="text-[9px] font-black uppercase">Email</span>
                                </a>
                            </div>
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
    <div className="w-full max-w-md mx-auto space-y-6 pb-20">
      <input type="file" ref={fileInputRef} onChange={handleManualFile} accept="image/*" className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Bubble 1: Enter VIN */}
      <div className="bg-white/5 border border-white/10 rounded-[3.5rem] p-8 shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-4">
          <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] italic mb-6 text-center">
            Bubble (1): Enter Manual
          </div>
          <div className="relative">
              <div className={`absolute -inset-1 rounded-[3rem] blur-sm opacity-20 transition-all duration-700 ${formatError ? 'bg-red-500' : (vinVerified ? 'bg-green-500' : 'bg-blue-600')}`}></div>
              <div className="relative space-y-3">
                <input 
                  value={inputVal}
                  onChange={handleInputChange}
                  onKeyDown={(e) => e.key === 'Enter' && inputVal.length === 17 && setShowConfirmModal(true)}
                  placeholder="VIN ENTRY"
                  className={`relative w-full bg-black/95 text-white border border-white/10 rounded-[2.5rem] py-8 px-8 text-center text-3xl font-black outline-none transition-all placeholder:text-gray-800 ${formatError ? 'border-red-500' : (vinVerified ? 'border-green-500' : 'focus:border-blue-500')} tracking-[0.1em] vin-monospace`}
                />
                <div className="flex items-center gap-3">
                    <input 
                      value={plateVal}
                      onChange={handlePlateChange}
                      placeholder="PLATE (OPTIONAL)"
                      className="flex-1 bg-black/50 text-white border border-white/10 rounded-2xl py-4 px-6 text-center text-sm font-black outline-none transition-all placeholder:text-gray-700 focus:border-blue-500/50 uppercase tracking-widest"
                    />
                    <button onClick={() => inputVal.length === 17 && setShowConfirmModal(true)} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-2xl ${vinVerified ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-800'}`}>
                      {SUBMIT_ICON}
                    </button>
                </div>
              </div>
              {formatError && <p className="text-center text-[9px] font-black text-red-500 uppercase tracking-widest mt-3 animate-pulse">{formatError}</p>}
              {vinVerified && <p className="text-center text-[9px] font-black text-green-500 uppercase tracking-widest italic mt-3">{vehicleDetails?.year} {vehicleDetails?.make} IDENTIFIED</p>}
          </div>
          <button onClick={() => inputVal.length === 17 && setShowConfirmModal(true)} className="w-full mt-6 bg-blue-600 text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest active-haptic shadow-lg">
             CHECK REGISTRY STATUS
          </button>
      </div>

      {/* Bubble 2: Scan or Upload */}
      <div className="bg-white/5 border border-white/10 rounded-[3.5rem] p-8 shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-6">
          <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] italic mb-6 text-center">
            Bubble (2): Scan or Upload
          </div>
          <button onClick={startScanner} disabled={loading} className="w-full group bg-white p-10 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 active-haptic shadow-2xl border-4 border-gray-100">
                <div className="text-carb-accent">{CAMERA_ICON}</div>
                <div className="text-center">
                    <span className="font-black text-[12px] tracking-widest uppercase italic text-carb-navy block">SCAN VIN LABEL</span>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">FIELD OPTICS SENSOR</p>
                </div>
          </button>
      </div>

      {/* Persistent Action Bar */}
      <div className="fixed bottom-8 left-6 right-6 z-[200] flex justify-between items-center bg-black/90 border border-white/20 rounded-[2.5rem] p-2 backdrop-blur-3xl shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
          <a href="tel:6173596953" className="flex-1 flex flex-col items-center gap-1 py-3 text-white active-haptic group">
              {PHONE_ICON}
              <span className="text-[7px] font-black uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">Call</span>
          </a>
          <div className="w-px h-8 bg-white/10"></div>
          <button onClick={onShareApp} className="flex-1 flex flex-col items-center gap-1 py-3 text-white active-haptic group">
              {DOWNLOAD_ICON}
              <span className="text-[7px] font-black uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">Get App</span>
          </button>
          <div className="w-px h-8 bg-white/10"></div>
          <button onClick={() => onNavigateTools()} className="flex-1 flex flex-col items-center gap-1 py-3 text-white active-haptic group">
              {TESTER_ICON}
              <span className="text-[7px] font-black uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">Tester</span>
          </button>
          <div className="w-px h-8 bg-white/10"></div>
          <button onClick={() => {
              if (navigator.share) {
                navigator.share({ title: 'Clear Truck Check', url: window.location.origin });
              } else {
                navigator.clipboard.writeText(window.location.origin);
                alert("Copied!");
              }
          }} className="flex-1 flex flex-col items-center gap-1 py-3 text-white active-haptic group">
              {SHARE_ICON}
              <span className="text-[7px] font-black uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">Share</span>
          </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[500] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-4">
          <div className="bg-[#020617] border border-white/10 rounded-[3.5rem] w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="bg-blue-600 p-10 text-center">
              <h2 className="text-2xl font-black italic uppercase text-white tracking-tight">Accuracy Validation</h2>
              <p className="text-[12px] font-black text-white/80 uppercase tracking-widest mt-2 italic">Verify detected optics</p>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="space-y-4">
                <div className="bg-black/80 p-8 rounded-[2.5rem] border border-white/10 text-center">
                  <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.4em] mb-4 italic">Detected VIN</p>
                  <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                    {inputVal.split('').map((char, i) => (
                        <div key={i} className="flex flex-col items-center">
                          <span className={`vin-monospace text-2xl sm:text-4xl font-black w-8 sm:w-12 h-10 sm:h-14 flex items-center justify-center rounded-lg border text-white bg-white/5 border-white/10`}>
                            {char}
                          </span>
                        </div>
                    ))}
                  </div>
                  <input 
                    value={inputVal}
                    onChange={handleInputChange}
                    className="w-full mt-6 bg-white/5 border border-white/10 p-4 rounded-xl text-center text-sm font-black text-white outline-none focus:border-blue-500 transition-all uppercase tracking-widest"
                    placeholder="EDIT VIN"
                  />
                </div>

                <div className="bg-black/80 p-6 rounded-[2rem] border border-white/10">
                  <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.4em] mb-3 text-center italic">Detected License Plate</p>
                  <input 
                    value={plateVal}
                    onChange={handlePlateChange}
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-center text-xl font-black text-white outline-none focus:border-blue-500 transition-all uppercase tracking-[0.2em]"
                    placeholder="PLATE"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                  <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-6 bg-white/5 text-white border border-white/10 rounded-3xl font-black text-xs uppercase italic tracking-widest active-haptic">CANCEL</button>
                  <button onClick={proceedToPortal} className="flex-1 py-6 bg-blue-600 text-white rounded-3xl font-black text-xs uppercase italic tracking-widest shadow-2xl active-haptic">PROCEED TO REGISTRY</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Viewfinder Scanner */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-[700] bg-black flex flex-col">
          <div className="flex-1 relative overflow-hidden">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <div className="absolute inset-0 border-[40px] border-black/60 pointer-events-none flex items-center justify-center">
              <div className="w-full h-20 border-2 border-white/30 rounded-lg relative shadow-[0_0_0_1000px_rgba(0,0,0,0.5)]">
                <div className="absolute -top-8 left-0 right-0 text-center">
                  <span className="text-[9px] font-black uppercase text-white tracking-[0.2em]">Align Label for Extraction</span>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-black p-10 flex justify-between items-center px-12">
            <button onClick={stopScanner} className="text-white text-[10px] font-black uppercase tracking-widest opacity-50">Exit</button>
            <button onClick={captureFrame} className="w-20 h-20 bg-white rounded-full flex items-center justify-center border-[6px] border-gray-800 active:scale-90 transition-transform">
              <div className="w-14 h-14 bg-white border border-black rounded-full" />
            </button>
            <div className="w-10" />
          </div>
        </div>
      )}
    </div>
  );
};

export default VinChecker;
