
import React, { useState, useRef, useEffect } from 'react';
import { extractVinFromImage, findTestersNearby } from '../services/geminiService';
import { decodeVinNHTSA } from '../services/nhtsa';
import { trackEvent } from '../services/analytics';

const APPLE_ICON = (
  <svg className="w-5 h-5" viewBox="0 0 384 512" fill="currentColor">
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
  </svg>
);

const ANDROID_ICON = (
  <svg className="w-5 h-5" viewBox="0 0 576 512" fill="currentColor">
    <path d="M420.55 301.93a24 24 0 1 1 24-24 24 24 0 0 1-24 24zm-265.1 0a24 24 0 1 1 24-24 24 24 0 0 1-24 24zm378.7-151.1l33.8-58.5a11 11 0 0 0-3.9-15.1 11.2 11.2 0 0 0-15.2 4L515 139.75c-50.7-42.3-116.3-65.6-187-65.6s-136.3 23.3-187 65.6l-33.8-58.5a11.2 11.2 0 0 0-15.2-4 11 11 0 0 0-3.9 15.1l33.8 58.5C51.5 197.6 0 285.5 0 384h576c0-98.5-51.5-186.4-121.85-233.17z" />
  </svg>
);

interface Props {
  onAddToHistory: (value: string, type: 'VIN' | 'ENTITY' | 'TRUCRS') => void;
  onNavigateChat: () => void;
  onShareApp: () => void;
  onNavigateTools: () => void;
}

const getCountyFromZip = (zip: string): string => {
  const z = parseInt(zip);
  if (z >= 90001 && z <= 90899) return "Los Angeles";
  if (z >= 94101 && z <= 94188) return "San Francisco";
  if (z >= 95811 && z <= 95899) return "Sacramento";
  if (z >= 92101 && z <= 92199) return "San Diego";
  if (z >= 95101 && z <= 95199) return "Santa Clara";
  if (z >= 93701 && z <= 93799) return "Fresno";
  if (z >= 92601 && z <= 92899) return "Orange";
  if (z >= 94501 && z <= 94899) return "Contra Costa / Alameda";
  if (z >= 95601 && z <= 95799) return "Placer / El Dorado";
  return "California Service Region";
};

const VinChecker: React.FC<Props> = ({ onAddToHistory, onNavigateChat, onShareApp, onNavigateTools }) => {
  const [inputVal, setInputVal] = useState('');
  const [searchMode, setSearchMode] = useState<'VIN' | 'OWNER'>('VIN');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('DIAGNOSING...');
  const [showTesterSearch, setShowTesterSearch] = useState(false);
  const [testerResult, setTesterResult] = useState<{ county: string, text?: string, locations?: any[] } | null>(null);
  const [searchingTesters, setSearchingTesters] = useState(false);
  
  const [scanResult, setScanResult] = useState<{vin: string, details: string} | null>(null);
  const [editedVin, setEditedVin] = useState('');
  const [vehicleDetails, setVehicleDetails] = useState<any>(null); 
  
  const [showQuestions, setShowQuestions] = useState(false);
  const [showSuccessReceipt, setShowSuccessReceipt] = useState(false);
  const [answers, setAnswers] = useState({ smoke: false, engine: false, visual: false });

  const [zipCode, setZipCode] = useState('');
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkNHTSA = async () => {
        if (searchMode === 'VIN' && inputVal.length === 17) {
            const data = await decodeVinNHTSA(inputVal);
            if (data && data.Make !== 'Unknown') {
                setVehicleDetails(data);
                trackEvent('nhtsa_lookup_success', { make: data.Make, year: data.ModelYear });
            }
        } else {
            setVehicleDetails(null);
        }
    };
    const timer = setTimeout(checkNHTSA, 800);
    return () => clearTimeout(timer);
  }, [inputVal, searchMode]);

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setStatusMessage('READING OPTICS...');
    try {
      const result = await extractVinFromImage(file);
      if (result.vin && result.vin.length >= 11) {
          setScanResult({ vin: result.vin, details: result.description });
          setEditedVin(result.vin);
          setSearchMode('VIN'); 
      } else {
          alert("Optical sensor couldn't identify a valid VIN.");
      }
    } catch (err) {
      alert("Intelligence Link Interrupted.");
    } finally {
      setLoading(false);
      if(cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleTesterSearch = async () => {
    if (zipCode.length < 5) return;
    setSearchingTesters(true);
    const county = getCountyFromZip(zipCode);
    try {
      const mapResult = await findTestersNearby(zipCode);
      setTesterResult({ county, text: mapResult.text, locations: mapResult.locations });
    } catch (error) {
      setTesterResult({ county });
    } finally {
      setSearchingTesters(false);
    }
  };

  const checkCompliance = () => {
    const val = inputVal.trim().toUpperCase();
    if (!val) return;
    onAddToHistory(val, searchMode === 'OWNER' ? 'ENTITY' : 'VIN');
    setShowQuestions(true);
  };

  const finishProtocol = () => {
    if (!answers.smoke || !answers.engine || !answers.visual) {
        alert("All protocol steps must be confirmed for certification.");
        return;
    }
    setShowQuestions(false);
    setShowSuccessReceipt(true);
    trackEvent('compliance_receipt_view');
  };

  if (showQuestions) {
      return (
          <div className="fixed inset-0 z-[200] bg-carb-navy overflow-y-auto p-6 animate-in slide-in-from-bottom duration-500">
              <div className="max-w-md mx-auto py-12 space-y-10">
                  <header className="text-center space-y-2">
                      <h2 className="text-3xl font-black italic tracking-tighter uppercase">Compliance Protocol</h2>
                      <p className="text-[10px] font-black text-carb-accent tracking-[0.4em] uppercase">OVI Field Verification</p>
                  </header>
                  <div className="glass p-8 rounded-[3rem] space-y-6 border border-white/5">
                      {[
                          { key: 'smoke', label: 'Opacity Smoke Test Conducted', icon: '💨' },
                          { key: 'engine', label: 'Engine Control Label Verified', icon: '🏷️' },
                          { key: 'visual', label: 'Visual Component Inspection Passed', icon: '🔍' }
                      ].map((q) => (
                          <button 
                            key={q.key}
                            onClick={() => setAnswers({...answers, [q.key]: !answers[q.key as keyof typeof answers]})}
                            className={`w-full p-6 rounded-3xl border flex items-center justify-between transition-all active-haptic ${answers[q.key as keyof typeof answers] ? 'bg-green-500/10 border-green-500/40' : 'bg-white/5 border-white/10'}`}
                          >
                            <div className="flex items-center gap-4">
                                <span className="text-2xl">{q.icon}</span>
                                <span className="text-[11px] font-black uppercase tracking-tight text-white text-left">{q.label}</span>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${answers[q.key as keyof typeof answers] ? 'bg-green-500 border-green-500' : 'border-white/20'}`}>
                                {answers[q.key as keyof typeof answers] && <span className="text-white text-[10px]">✓</span>}
                            </div>
                          </button>
                      ))}
                  </div>
                  <div className="space-y-4">
                      <button 
                        onClick={finishProtocol}
                        className="w-full py-6 bg-white text-carb-navy rounded-[2.5rem] font-black tracking-widest text-xs uppercase shadow-2xl active-haptic italic"
                      >
                        Generate Official Record
                      </button>
                      <button onClick={() => setShowQuestions(false)} className="w-full py-4 text-gray-500 font-black uppercase tracking-widest text-[9px] italic">Abort Protocol</button>
                  </div>
              </div>
          </div>
      );
  }

  if (showSuccessReceipt) {
    return (
        <div className="fixed inset-0 z-[200] bg-black/98 backdrop-blur-2xl flex items-center justify-center p-6 animate-in zoom-in duration-500 overflow-y-auto">
            <div className="bg-white rounded-[3.5rem] w-full max-w-sm shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative overflow-hidden border border-white/20 my-auto">
                <div className="h-44 bg-carb-navy flex flex-col items-center justify-center text-center px-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-carb-accent/20 to-transparent"></div>
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white mb-4 shadow-xl border-4 border-white/10">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h2 className="text-xl font-black text-white italic tracking-tighter uppercase">Protocol Recorded</h2>
                    <p className="text-[9px] font-black text-carb-accent tracking-[0.4em] uppercase mt-1">Certified Compliance</p>
                </div>
                <div className="p-10 space-y-8">
                    <div className="text-center">
                        <p className="text-sm font-black text-carb-navy leading-tight italic">
                            Congratulations! Your vehicle has been recorded.
                        </p>
                    </div>
                    <div className="space-y-4 pt-2">
                        <div className="flex justify-between border-b border-gray-100 pb-3">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic">Test Type</span>
                            <span className="text-[11px] font-black text-carb-navy uppercase">OVI (Opacity & Visual Inspection)</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-100 pb-3">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic">Test Date</span>
                            <span className="text-[11px] font-black text-carb-navy">12/23/2025</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-100 pb-3">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic">Test ID</span>
                            <span className="text-[11px] font-black text-carb-navy font-mono">1562835</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-100 pb-3">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic">VIN</span>
                            <span className="text-[11px] font-black text-carb-navy font-mono">1M2AN07Y4DM015340</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic">License Plate</span>
                            <span className="text-[11px] font-black text-carb-navy font-mono uppercase">11117B3</span>
                        </div>
                    </div>
                    <div className="pt-4 space-y-3">
                        <button 
                            onClick={() => window.print()}
                            className="w-full py-5 bg-carb-navy text-white font-black rounded-3xl text-[10px] tracking-widest uppercase active-haptic shadow-xl flex items-center justify-center gap-3 italic"
                        >
                            💾 Save Digital PDF
                        </button>
                        <button 
                            onClick={() => {
                                setShowSuccessReceipt(false);
                                setInputVal('');
                                setAnswers({ smoke: false, engine: false, visual: false });
                            }}
                            className="w-full py-4 border-2 border-carb-navy text-carb-navy font-black rounded-3xl text-[9px] tracking-widest uppercase active-haptic italic"
                        >
                            Dismiss Protocol
                        </button>
                    </div>
                </div>
                <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest italic">Official CARB HD I/M Certified Record</p>
                </div>
            </div>
        </div>
    );
  }

  if (showTesterSearch) {
      return (
          <div className="fixed inset-0 z-[200] bg-carb-navy overflow-y-auto animate-in fade-in slide-in-from-right duration-500">
              <header className="pt-safe px-6 py-6 flex justify-between items-center sticky top-0 glass-dark z-20">
                  <button onClick={() => { setShowTesterSearch(false); setTesterResult(null); }} className="text-gray-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                      <span className="text-xl">‹</span> BACK
                  </button>
                  <h2 className="text-lg font-black tracking-tighter">TESTER DISPATCH</h2>
                  <div className="w-12"></div>
              </header>
              <div className="p-8 space-y-10 max-w-md mx-auto">
                  <div className="glass p-10 rounded-[3rem] text-center">
                      <label className="block text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-6 italic">Service Zone (Zip)</label>
                      <input 
                          type="tel" 
                          placeholder="00000" 
                          value={zipCode} 
                          onChange={(e) => setZipCode(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-transparent p-4 text-7xl font-light text-white outline-none text-center tracking-tighter"
                          maxLength={5}
                      />
                      {!testerResult && (
                        <button 
                          onClick={handleTesterSearch}
                          disabled={searchingTesters}
                          className="mt-8 text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 bg-blue-400/10 px-6 py-2 rounded-full border border-blue-400/20 active-haptic disabled:opacity-50"
                        >
                          {searchingTesters ? 'SCANNING...' : 'Verify Zone'}
                        </button>
                      )}
                  </div>
                  {testerResult && (
                    <div className="space-y-6 animate-in zoom-in duration-300">
                      <div className="bg-white text-carb-navy rounded-[3.5rem] p-10 text-center space-y-8 shadow-2xl">
                          <h3 className="text-3xl font-black tracking-tighter uppercase italic">{testerResult.county} County</h3>
                          <div className="flex flex-col gap-3">
                            <a href="tel:6173596953" className="block w-full py-6 bg-carb-navy text-white font-black rounded-3xl text-sm tracking-widest uppercase active-haptic shadow-xl flex items-center justify-center gap-3 italic">
                               <div className="text-white">{APPLE_ICON}</div> TEXT/CALL TESTER
                            </a>
                          </div>
                      </div>
                    </div>
                  )}
              </div>
          </div>
      );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-12 pt-6">
      <button id="find-tester-trigger" onClick={() => setShowTesterSearch(true)} className="hidden"></button>
      <div className="text-center space-y-2">
          <h2 className="text-4xl font-light tracking-tighter text-white">Quick Check</h2>
          <button 
            onClick={onShareApp}
            className="text-[10px] text-carb-accent font-black uppercase tracking-[0.3em] italic hover:underline decoration-carb-accent underline-offset-4"
          >
            Download Instant Compliance Check App
          </button>
      </div>
      <div className="space-y-6">
            <button 
                onClick={() => cameraInputRef.current?.click()}
                disabled={loading}
                className="w-full group glass py-12 rounded-[3.5rem] flex flex-col items-center justify-center gap-4 active-haptic transition-all hover:bg-white/5 border border-white/5"
            >
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-carb-accent group-hover:bg-carb-accent/10 transition-all border border-transparent group-hover:border-carb-accent/20">
                    <div className="scale-150">{APPLE_ICON}</div>
                </div>
                <span className="font-black text-[10px] tracking-[0.4em] uppercase text-gray-500 group-hover:text-carb-accent transition-colors italic">
                    {loading ? statusMessage : 'Optical Scanner'}
                </span>
            </button>
            <input type="file" ref={cameraInputRef} onChange={handleScan} accept="image/*" capture="environment" className="hidden" />
            <div className="space-y-6">
                <div className="flex gap-10 justify-center">
                    <button onClick={() => setSearchMode('VIN')} className={`py-1 text-[10px] font-black tracking-[0.3em] transition-all border-b-2 uppercase italic flex items-center gap-2 ${searchMode === 'VIN' ? 'border-carb-accent text-white' : 'border-transparent text-gray-700'}`}>
                      {APPLE_ICON} Vehicle
                    </button>
                    <button onClick={() => setSearchMode('OWNER')} className={`py-1 text-[10px] font-black tracking-[0.3em] transition-all border-b-2 uppercase italic flex items-center gap-2 ${searchMode === 'OWNER' ? 'border-carb-accent text-white' : 'border-transparent text-gray-700'}`}>
                      {ANDROID_ICON} Fleet ID
                    </button>
                </div>
                <div className="relative">
                    <input
                        type="text"
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value.toUpperCase())}
                        placeholder={searchMode === 'VIN' ? "ENTER VIN HERE" : "ENTITY ID"}
                        className="w-full bg-transparent text-white border-2 border-white/10 rounded-[2.5rem] py-8 px-8 text-center font-black text-2xl placeholder:font-black placeholder:text-white/20 focus:border-carb-accent outline-none transition-all"
                        maxLength={searchMode === 'VIN' ? 17 : 20}
                    />
                </div>
                {vehicleDetails && (
                    <div className="glass rounded-[2.5rem] p-8 animate-in slide-in-from-bottom-4 border-carb-accent/20">
                        <p className="font-black text-white text-2xl uppercase tracking-tighter italic">
                            {vehicleDetails.ModelYear} {vehicleDetails.Make}
                        </p>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-2">{vehicleDetails.Model} • {vehicleDetails.BodyClass}</p>
                    </div>
                )}
                <button 
                    onClick={checkCompliance}
                    className="w-full bg-white text-carb-navy py-6 rounded-[2.5rem] font-black tracking-[0.3em] text-[11px] uppercase shadow-2xl active-haptic hover:bg-gray-200 transition-all italic flex items-center justify-center gap-4"
                >
                    {APPLE_ICON} Run Protocol
                </button>
            </div>
        </div>
      {scanResult && (
          <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-8 animate-in fade-in duration-300" onClick={() => setScanResult(null)}>
              <div className="glass-dark rounded-[3.5rem] p-12 w-full max-w-sm border border-white/10 shadow-2xl space-y-12" onClick={e => e.stopPropagation()}>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-carb-accent/20 rounded-full mx-auto flex items-center justify-center text-carb-accent mb-8 shadow-inner border border-carb-accent/30">{ANDROID_ICON}</div>
                    <h3 className="font-black text-3xl tracking-tighter leading-none italic uppercase">Scanner Result</h3>
                  </div>
                  <input 
                      type="text" 
                      value={editedVin}
                      onChange={(e) => setEditedVin(e.target.value.toUpperCase())}
                      className="w-full p-4 text-center text-3xl font-black bg-transparent border-b-2 border-white/10 focus:border-carb-accent outline-none uppercase italic"
                  />
                  <div className="flex gap-4">
                      <button onClick={() => setScanResult(null)} className="flex-1 py-5 glass text-gray-500 font-black rounded-2xl uppercase tracking-widest text-[10px] active-haptic">RETRY</button>
                      <button onClick={() => { setInputVal(editedVin); setScanResult(null); checkCompliance(); }} className="flex-[2] py-5 bg-white text-carb-navy font-black rounded-2xl uppercase tracking-widest text-[10px] active-haptic">CONFIRM</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default VinChecker;
