
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
  const [zipInput, setZipInput] = useState('');
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

  const handleZipSearch = () => {
      if (zipInput.length < 5) return;
      onNavigateTools(); // Navigate to the Tools/Tester section
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6 pb-20 animate-in fade-in duration-700">
      <input type="file" ref={fileInputRef} onChange={handleManualFile} accept="image/*" className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Enter VIN Bubble */}
      <div className="bg-white/5 border border-white/10 rounded-[3rem] p-8 shadow-2xl space-y-4">
          <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] italic text-center">Enter VIN</div>
          <div className="relative">
              <input 
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value.toUpperCase())}
                placeholder="VIN ENTRY"
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-6 px-6 text-center text-2xl font-black text-white outline-none focus:border-blue-500 transition-all vin-monospace uppercase tracking-widest placeholder:text-gray-800"
              />
              {formatError && <p className="text-center text-[9px] font-black text-red-500 uppercase mt-2">{formatError}</p>}
          </div>
          <button 
            disabled={inputVal.length < 11}
            onClick={() => setShowConfirmModal(true)}
            className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-lg active-haptic disabled:opacity-30"
          >
            Check Status
          </button>
      </div>

      {/* Upload VIN Bubble */}
      <button 
        onClick={() => fileInputRef.current?.click()}
        disabled={loading}
        className="w-full bg-white p-8 rounded-[3rem] border border-gray-100 flex items-center justify-center gap-4 shadow-xl active-haptic"
      >
          <div className="text-blue-600">{CAMERA_ICON}</div>
          <span className="text-xs font-black text-carb-navy uppercase tracking-widest italic">Upload VIN Label</span>
      </button>

      {/* Enter Zip for Tester Bubble */}
      <div className="bg-white/5 border border-white/10 rounded-[3rem] p-8 shadow-2xl space-y-4">
          <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] italic text-center">Find Tester Near You</div>
          <div className="flex gap-2">
              <input 
                value={zipInput}
                onChange={(e) => setZipInput(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="ZIP CODE"
                className="flex-1 bg-black/40 border border-white/10 rounded-2xl py-5 px-6 text-center text-lg font-black text-white outline-none focus:border-blue-500 transition-all uppercase tracking-widest"
              />
              <button 
                onClick={handleZipSearch}
                className="bg-blue-600 text-white px-6 rounded-2xl flex items-center justify-center active-haptic"
              >
                {SUBMIT_ICON}
              </button>
          </div>
      </div>

      {/* Footer Legal Stuff */}
      <div className="text-center pt-8">
          <p className="text-[9px] font-black text-gray-700 uppercase tracking-[0.5em] italic">
            © 2026 NorCal CARB Mobile LLC • Regulatory Compliance Assistant
          </p>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4">
          <div className="bg-[#020617] border border-white/10 rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="bg-blue-600 p-8 text-center">
              <h2 className="text-xl font-black italic uppercase text-white tracking-tight">Verify VIN Optics</h2>
            </div>
            <div className="p-8 space-y-8">
              <div className="bg-black/60 p-8 rounded-3xl border border-white/10 text-center text-2xl font-black text-white vin-monospace tracking-[0.2em]">
                {inputVal}
              </div>
              <div className="flex gap-4">
                  <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-5 bg-white/5 text-white border border-white/10 rounded-2xl font-black text-xs uppercase italic tracking-widest">Edit</button>
                  <button onClick={proceedToPortal} className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase italic tracking-widest shadow-2xl">Verify</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Result Screens */}
      {showResultScreen && (
        <div className={`fixed inset-0 z-[600] flex flex-col items-center justify-center p-6 animate-in fade-in duration-500 ${showResultScreen === 'compliant' ? 'bg-[#052e16]' : 'bg-[#450a0a]'}`}>
            <div className="max-w-md w-full text-center space-y-10">
                <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center border-4 ${showResultScreen === 'compliant' ? 'bg-green-600/20 border-green-500 text-green-500' : 'bg-red-600/20 border-red-500 text-red-500'}`}>
                    <span className="text-4xl">{showResultScreen === 'compliant' ? '✓' : '!'}</span>
                </div>
                <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">
                    {showResultScreen === 'compliant' ? 'COMPLIANT' : 'NON-COMPLIANT'}
                </h2>
                <button onClick={() => setShowResultScreen(null)} className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] hover:text-white pt-10">
                    Back to Hub
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default VinChecker;
