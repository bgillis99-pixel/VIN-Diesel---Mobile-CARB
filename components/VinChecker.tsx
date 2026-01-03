
import React, { useState, useRef, useEffect } from 'react';
import { extractVinFromImage, findTestersNearby, validateVINCheckDigit, isValidVinFormat } from '../services/geminiService';
import { decodeVinNHTSA, NHTSAVehicle } from '../services/nhtsa';
import { trackEvent } from '../services/analytics';

const APPLE_ICON = (
  <svg className="w-6 h-6" viewBox="0 0 384 512" fill="currentColor">
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
  </svg>
);

const CAMERA_ICON = (
  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);

interface Props {
  onAddToHistory: (value: string, type: 'VIN' | 'ENTITY' | 'TRUCRS') => void;
  onNavigateChat: () => void;
  onShareApp: () => void;
  onNavigateTools: () => void;
}

const VinChecker: React.FC<Props> = ({ onAddToHistory, onNavigateChat, onShareApp, onNavigateTools }) => {
  const [inputVal, setInputVal] = useState('');
  const [searchMode, setSearchMode] = useState<'VIN' | 'OWNER'>('VIN');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('DIAGNOSING...');
  const [formatError, setFormatError] = useState<string | null>(null);
  const [vehicleDetails, setVehicleDetails] = useState<NHTSAVehicle | null>(null);
  
  const [zipCode, setZipCode] = useState('');
  const [showTesterSearch, setShowTesterSearch] = useState(false);
  const [testerResult, setTesterResult] = useState<any>(null);
  const [searchingTesters, setSearchingTesters] = useState(false);

  const [showQuestions, setShowQuestions] = useState(false);
  const [showSuccessReceipt, setShowSuccessReceipt] = useState(false);
  const [answers, setAnswers] = useState({ smoke: false, engine: false, visual: false });

  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
        const val = inputVal.trim().toUpperCase();
        if (searchMode === 'VIN' && isValidVinFormat(val)) {
            setFormatError(null);
            // Verify MOD 11 Check Digit
            if (!validateVINCheckDigit(val)) {
                setFormatError('VIN Check Digit Failed (Typo likely)');
                setVehicleDetails(null);
                return;
            }
            const data = await decodeVinNHTSA(val);
            if (data && data.valid) setVehicleDetails(data);
        } else if (searchMode === 'VIN' && inputVal.length > 0) {
            setVehicleDetails(null);
            if (inputVal.length < 17) setFormatError('Incomplete VIN (17 chars required)');
            else if (/[IOQ]/.test(val)) setFormatError('VIN cannot contain I, O, or Q');
            else setFormatError('Invalid VIN format');
        } else {
            setFormatError(null);
        }
    }, 600);
    return () => clearTimeout(timer);
  }, [inputVal, searchMode]);

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setStatusMessage('ANALYZING...');
    try {
      const result = await extractVinFromImage(file);
      if (result.vin && result.vin.length >= 11) {
          setInputVal(result.vin.toUpperCase());
          setSearchMode('VIN');
          trackEvent('vin_scan_success');
      } else {
          alert("Sensor couldn't lock VIN. TIP: Scan the BARCODE on the door jam sticker. Metal plates are often too reflective for mobile HDR sensors.");
      }
    } catch (err) {
      alert("AI Processing Link Interrupted.");
    } finally {
      setLoading(false);
      if(cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleTesterSearch = async () => {
      if (zipCode.length < 5) return;
      setSearchingTesters(true);
      try {
          const res = await findTestersNearby(zipCode);
          setTesterResult(res);
      } catch (e) { alert("Map search failed."); } finally { setSearchingTesters(false); }
  };

  const checkCompliance = () => {
    const val = inputVal.trim().toUpperCase();
    if (!val) return;
    if (searchMode === 'VIN') {
        if (!isValidVinFormat(val)) return alert("Invalid VIN format. 17 chars, no I, O, Q.");
        if (!validateVINCheckDigit(val)) {
            if (!confirm("VIN Check Digit failed. TYPO DETECTED in digit 9. This truck might not exist in the state registry. Proceed anyway?")) return;
        }
    }
    onAddToHistory(val, searchMode === 'OWNER' ? 'ENTITY' : 'VIN');
    setShowQuestions(true);
  };

  const finishProtocol = () => {
    if (!answers.smoke || !answers.engine || !answers.visual) return alert("Verify all compliance steps!");
    setShowQuestions(false);
    setShowSuccessReceipt(true);
    trackEvent('compliance_receipt_view');
  };

  if (showQuestions) {
      return (
          <div className="fixed inset-0 z-[300] bg-carb-navy p-6 flex flex-col pt-20">
              <header className="text-center mb-10">
                  <h2 className="text-2xl font-black italic uppercase italic">OVI Verification</h2>
                  <p className="text-[10px] font-black text-carb-accent tracking-[0.4em] uppercase">Compliance Protocol</p>
              </header>
              <div className="flex-1 space-y-4">
                  {[
                      { k: 'smoke', l: 'Smoke Opacity Passed', e: '💨' },
                      { k: 'engine', l: 'ECL Label Present', e: '🏷️' },
                      { k: 'visual', l: 'Visual Inspection OK', e: '🔍' }
                  ].map(q => (
                      <button 
                        key={q.k}
                        onClick={() => setAnswers({...answers, [q.k]: !answers[q.k as keyof typeof answers]})}
                        className={`w-full p-6 rounded-3xl border flex items-center justify-between ${answers[q.k as keyof typeof answers] ? 'bg-green-500/10 border-green-500' : 'bg-white/5 border-white/10'}`}
                      >
                          <span className="text-[11px] font-black uppercase italic">{q.e} {q.l}</span>
                          <div className={`w-5 h-5 rounded-full border-2 ${answers[q.k as keyof typeof answers] ? 'bg-green-500 border-green-500' : 'border-white/20'}`}></div>
                      </button>
                  ))}
              </div>
              <button onClick={finishProtocol} className="w-full py-6 bg-white text-carb-navy rounded-[2rem] font-black uppercase text-xs tracking-widest mt-8 italic shadow-2xl">Confirm Record</button>
              <button onClick={() => setShowQuestions(false)} className="w-full py-4 text-gray-500 text-[10px] font-bold uppercase mt-2">Cancel</button>
          </div>
      );
  }

  if (showSuccessReceipt) {
      return (
          <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-6 backdrop-blur-xl">
              <div className="bg-white rounded-[3rem] w-full max-w-sm overflow-hidden text-carb-navy">
                  <div className="h-32 bg-carb-navy flex items-center justify-center">
                      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white text-3xl shadow-xl">✓</div>
                  </div>
                  <div className="p-8 space-y-6">
                      <div className="text-center">
                          <h2 className="text-xl font-black uppercase italic">Protocol Certified</h2>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">OVI Inspection Summary</p>
                      </div>
                      <div className="space-y-3 pt-4 border-t border-gray-100">
                          <div className="flex justify-between text-[10px] font-bold uppercase"><span>VIN</span><span className="font-mono">{inputVal}</span></div>
                          <div className="flex justify-between text-[10px] font-bold uppercase"><span>Status</span><span className="text-green-600">Compliant</span></div>
                          <div className="flex justify-between text-[10px] font-bold uppercase"><span>Date</span><span>{new Date().toLocaleDateString()}</span></div>
                      </div>
                      <button onClick={() => window.print()} className="w-full py-4 bg-carb-navy text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl italic">Print PDF</button>
                      <button onClick={() => {setShowSuccessReceipt(false); setInputVal('');}} className="w-full py-4 border-2 border-carb-navy rounded-2xl font-black uppercase text-[10px] tracking-widest italic">Dismiss</button>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-10">
      <input type="file" ref={cameraInputRef} onChange={handleScan} accept="image/*" capture="environment" className="hidden" />

      {/* PRIMARY SCAN BUTTON - ENHANCED PROMINENCE */}
      <div className="space-y-4">
          <button 
            onClick={() => cameraInputRef.current?.click()}
            disabled={loading}
            className="w-full group relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800 py-10 rounded-[3.5rem] flex flex-col items-center justify-center gap-4 active-haptic border border-white/20 shadow-[0_20px_50px_rgba(37,99,235,0.3)] transition-all hover:scale-[1.02]"
          >
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
              <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-inner">
                  {CAMERA_ICON}
              </div>
              <div className="text-center relative z-10">
                  <span className="font-black text-2xl tracking-[0.05em] uppercase italic text-white drop-shadow-md">
                      {loading ? statusMessage : 'Scan VIN Barcode'}
                  </span>
                  <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mt-2 px-8 leading-tight">
                      DOOR JAM BARCODE IS HIGHLY RECOMMENDED
                  </p>
              </div>
          </button>
      </div>

      {/* FIND A TESTER - PROMINENT SECTION */}
      <div className="glass p-8 rounded-[3rem] border border-carb-accent/30 shadow-xl bg-gradient-to-b from-white/5 to-transparent">
          <div className="flex items-center gap-4 mb-6">
              <span className="text-4xl">📍</span>
              <div className="flex-1">
                  <h3 className="text-lg font-black italic uppercase text-white">Find a Tester</h3>
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-none">Nearby Mobile Stations</p>
              </div>
              <button 
                onClick={() => setShowTesterSearch(true)}
                className="bg-carb-accent px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest italic shadow-lg shadow-carb-accent/20 active-haptic"
              >
                  Search Now
              </button>
          </div>
      </div>

      <div className="space-y-8">
          <div className="flex justify-center gap-10">
              <button onClick={() => setSearchMode('VIN')} className={`text-[10px] font-black uppercase tracking-widest italic pb-1 border-b-2 transition-all ${searchMode === 'VIN' ? 'border-carb-accent text-white' : 'border-transparent text-gray-700'}`}>Manual VIN</button>
              <button onClick={() => setSearchMode('OWNER')} className={`text-[10px] font-black uppercase tracking-widest italic pb-1 border-b-2 transition-all ${searchMode === 'OWNER' ? 'border-carb-accent text-white' : 'border-transparent text-gray-700'}`}>Entity Search</button>
          </div>

          <div className="space-y-4">
              <div className="relative">
                  <input 
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value.toUpperCase())}
                    placeholder={searchMode === 'VIN' ? "ENTER 17 CHAR VIN" : "ENTER ENTITY ID"}
                    className={`w-full bg-transparent text-white border-2 rounded-[2.5rem] py-8 text-center text-2xl font-black outline-none transition-all placeholder:text-white/10 ${formatError ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'border-white/5'}`}
                  />
                  {formatError && <p className="absolute -bottom-6 left-0 right-0 text-center text-[8px] font-black text-red-500 uppercase tracking-widest">{formatError}</p>}
              </div>
              <button 
                onClick={checkCompliance} 
                disabled={loading || !inputVal} 
                className="w-full py-6 bg-white/5 border border-white/10 text-white font-black rounded-[2.5rem] uppercase tracking-widest text-xs active-haptic shadow-xl disabled:opacity-30 italic"
              >
                Verify Protocol
              </button>
          </div>
      </div>

      {vehicleDetails && (
          <div className="glass p-8 rounded-[3rem] border border-green-500/20 animate-in zoom-in duration-500">
              <div className="flex justify-between items-center mb-4">
                  <span className="text-[9px] font-black text-green-400 uppercase tracking-widest italic">NHTSA Verified</span>
                  <span className="text-[9px] font-black text-gray-500 uppercase">GVWR: {vehicleDetails.gvwr}</span>
              </div>
              <h4 className="text-xl font-black text-white italic uppercase">{vehicleDetails.year} {vehicleDetails.make}</h4>
              <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">{vehicleDetails.model} • Engine: {vehicleDetails.engineMfr}</p>
          </div>
      )}

      {/* QUICK LINKS GRID */}
      <div className="grid grid-cols-2 gap-4">
          <button onClick={onNavigateChat} className="glass p-6 rounded-[2.5rem] flex flex-col items-center gap-2 border border-white/5 active-haptic">
              <span className="text-2xl">🤖</span>
              <span className="text-[8px] font-black uppercase tracking-widest italic text-gray-400">Ask Diesel AI</span>
          </button>
          <button onClick={onNavigateTools} className="glass p-6 rounded-[2.5rem] flex flex-col items-center gap-2 border border-white/5 active-haptic">
              <span className="text-2xl">🏗️</span>
              <span className="text-[8px] font-black uppercase tracking-widest italic text-gray-400">Inspector Hub</span>
          </button>
      </div>

      {showTesterSearch && (
          <div className="fixed inset-0 z-[400] bg-carb-navy p-8 pt-safe flex flex-col animate-in slide-in-from-right duration-500">
              <button onClick={() => {setShowTesterSearch(false); setTesterResult(null);}} className="text-gray-500 text-[10px] font-black uppercase mb-10 flex items-center gap-2">‹ BACK TO FIELD HUB</button>
              <div className="glass p-10 rounded-[3rem] text-center mb-10">
                  <h3 className="text-2xl font-black italic uppercase italic mb-6">Dispatch Station</h3>
                  <input 
                    type="tel"
                    value={zipCode}
                    onChange={e => setZipCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="ZIP CODE"
                    className="w-full bg-transparent text-7xl font-light text-white outline-none text-center"
                    maxLength={5}
                  />
                  <button onClick={handleTesterSearch} disabled={searchingTesters || zipCode.length < 5} className="mt-8 px-8 py-3 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20 text-[10px] font-black uppercase tracking-widest italic">
                      {searchingTesters ? 'PINGING...' : 'Verify Zone'}
                  </button>
              </div>
              {testerResult && (
                  <div className="flex-1 overflow-y-auto space-y-6">
                      <div className="bg-white rounded-[3rem] p-10 text-carb-navy space-y-8 shadow-2xl">
                          <h4 className="text-xl font-black italic uppercase italic">Verified Stations</h4>
                          <div className="space-y-4">
                              {testerResult.locations.map((loc: any, i: number) => (
                                  <a key={i} href={loc.uri} target="_blank" className="block p-5 bg-gray-50 rounded-2xl border border-gray-100 group">
                                      <p className="text-[11px] font-black uppercase italic group-hover:text-blue-600 transition-colors">{loc.title}</p>
                                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Certified Clean Truck Tester</p>
                                  </a>
                              ))}
                          </div>
                          <a href="tel:6173596953" className="block w-full py-6 bg-carb-navy text-white text-center rounded-[2rem] font-black uppercase text-xs tracking-widest italic shadow-xl">Contact Regional Hub</a>
                      </div>
                  </div>
              )}
          </div>
      )}
    </div>
  );
};

export default VinChecker;
