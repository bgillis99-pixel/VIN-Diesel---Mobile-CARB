import React, { useState, useRef, useEffect } from 'react';
import { extractVinFromImage } from '../services/geminiService';
import { decodeVinNHTSA } from '../services/nhtsa';
import { saveScanToCloud, auth } from '../services/firebase'; 
import { Submission } from '../types';
import { trackEvent } from '../services/analytics';

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
  const [statusMessage, setStatusMessage] = useState('ANALYZING...');
  const [showTesterSearch, setShowTesterSearch] = useState(false);
  
  const [scanResult, setScanResult] = useState<{vin: string, details: string} | null>(null);
  const [editedVin, setEditedVin] = useState('');
  const [vehicleDetails, setVehicleDetails] = useState<any>(null); 

  const [zipCode, setZipCode] = useState('');
  const [testerName] = useState('Mobile CARB Check');
  const [dispatchPhone] = useState('617-359-6953');
  const [regionLabel] = useState('Statewide Network');
  
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

  const saveToAdminDb = async (type: 'VIN_CHECK' | 'ENGINE_TAG' | 'REGISTRATION', summary: string, details: any) => {
      const submission: Submission = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          dateStr: new Date().toLocaleString(),
          type,
          summary,
          details,
          coordinates: null,
          status: 'NEW'
      };
      if (auth?.currentUser) {
          saveScanToCloud(auth.currentUser.uid, submission);
      }
      return submission;
  };

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size === 0) return;
    setLoading(true);
    setStatusMessage('READING TAG...');
    try {
      const result = await extractVinFromImage(file);
      if (result.vin && result.vin.length >= 11) {
          setScanResult({ vin: result.vin, details: result.description });
          setEditedVin(result.vin);
          setSearchMode('VIN'); 
          saveToAdminDb('VIN_CHECK', `Scanned VIN: ${result.vin}`, result);
      } else {
          alert("Scan unclear. Please try manual entry.");
      }
    } catch (err) {
      alert("Analysis failed.");
    } finally {
      setLoading(false);
      if(cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const checkCompliance = () => {
    const val = inputVal.trim().toUpperCase();
    if (!val) return;
    onAddToHistory(val, searchMode);
    if (searchMode === 'OWNER') {
        window.open(`https://cleantruckcheck.arb.ca.gov/Entity/EntityManagement/EntityComplianceStatusLookup`, '_blank');
    } else {
        window.open(`https://cleantruckcheck.arb.ca.gov/Fleet/Vehicle/VehicleComplianceStatusLookup?vin=${val}`, '_blank');
    }
  };

  if (showTesterSearch) {
      const smsBody = `I am in Zip ${zipCode || '[ZIP]'}. Do I need an OBD or Smoke (OVI) test?`;
      return (
          <div className="fixed inset-0 z-[100] bg-slate-100 dark:bg-slate-900 overflow-y-auto animate-in fade-in slide-in-from-right duration-400">
              <div className="bg-navy dark:bg-black text-white p-8 shadow-2xl sticky top-0 z-20">
                  <div className="max-w-md mx-auto flex justify-between items-center">
                      <button onClick={() => setShowTesterSearch(false)} className="flex items-center gap-2 font-black text-xs tracking-widest uppercase bg-white/10 px-4 py-2 rounded-xl">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                          BACK
                      </button>
                      <h2 className="text-xl font-black uppercase tracking-widest">Certified Tester</h2>
                      <div className="w-16"></div>
                  </div>
              </div>
              <div className="p-6 space-y-8 max-w-md mx-auto pb-32">
                  <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-2xl border-4 border-navy/5">
                      <label className="block text-[11px] font-black text-navy/40 uppercase tracking-[0.25em] mb-6 text-center">Service Zip Code</label>
                      <input 
                          type="tel" 
                          placeholder="ZIP CODE" 
                          value={zipCode} 
                          onChange={(e) => setZipCode(e.target.value)}
                          className="w-full p-8 text-5xl font-black border-[6px] border-navy text-black rounded-[2.5rem] focus:border-green outline-none dark:bg-gray-700 dark:text-white text-center shadow-inner"
                          maxLength={5}
                      />
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-[3.5rem] shadow-[0_30px_70px_-20px_rgba(21,128,61,0.3)] border-[6px] border-green p-10 text-center space-y-10">
                      <div>
                          <h3 className="text-3xl font-black text-navy dark:text-white leading-tight uppercase tracking-tighter">{testerName}</h3>
                          <p className="text-sm font-black text-green mt-2 tracking-widest uppercase">{regionLabel}</p>
                      </div>
                      <div className="flex flex-col gap-5">
                        <a href={`tel:${dispatchPhone.replace(/-/g, '')}`} className="w-full py-7 bg-navy text-white font-black rounded-3xl shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-transform text-lg">
                           📞 CALL DISPATCH
                        </a>
                        <a href={`sms:${dispatchPhone.replace(/-/g, '')}?body=${encodeURIComponent(smsBody)}`} className="w-full py-6 bg-white border-[4px] border-navy text-navy dark:text-blue-400 font-black rounded-3xl flex items-center justify-center gap-3 active:scale-95 transition-transform">
                           💬 TEXT REQUEST
                        </a>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      
      {/* HIDDEN TRIGGER FOR PERSISTENT BAR NAVIGATION */}
      <button id="find-tester-trigger" onClick={() => setShowTesterSearch(true)} className="hidden"></button>

      <div className="p-10 space-y-10">
            {/* Tesla-style Scan Button */}
            <button 
                onClick={() => cameraInputRef.current?.click()}
                disabled={loading}
                className="w-full bg-navy text-white py-10 rounded-[3rem] shadow-2xl flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform border border-white/20"
            >
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center text-4xl mb-1 shadow-inner">📸</div>
                <span className="font-black text-xl tracking-[0.15em] uppercase leading-none">{loading ? statusMessage : 'SCAN VEHICLE LABEL'}</span>
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Gemini 3 Pro Vision Powered</p>
            </button>
            <input type="file" ref={cameraInputRef} onChange={handleScan} accept="image/*" capture="environment" className="hidden" />

            <div className="space-y-8">
                <div className="flex gap-2 p-2 bg-gray-200 dark:bg-gray-800 rounded-[2.5rem] border-2 border-gray-300 dark:border-gray-700 shadow-inner">
                    <button onClick={() => setSearchMode('VIN')} className={`flex-1 py-4 text-[12px] font-black tracking-widest rounded-3xl transition-all ${searchMode === 'VIN' ? 'bg-white shadow-xl text-navy dark:bg-gray-700 dark:text-white' : 'text-gray-500'}`}>VEHICLE (VIN)</button>
                    <button onClick={() => setSearchMode('OWNER')} className={`flex-1 py-4 text-[12px] font-black tracking-widest rounded-3xl transition-all ${searchMode === 'OWNER' ? 'bg-white shadow-xl text-navy dark:bg-gray-700 dark:text-white' : 'text-gray-500'}`}>OWNER ID</button>
                </div>

                <div className="relative group">
                    <label className="block text-[11px] font-black text-navy uppercase tracking-[0.2em] mb-3 px-6 opacity-40">Compliance Input</label>
                    {/* ULTRA HEAVY OUTLINE & DARK FONT */}
                    <input
                        type="text"
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value.toUpperCase())}
                        placeholder={searchMode === 'VIN' ? "VIN (17 CHARS)" : "FLEET / TRUCRS ID"}
                        className="w-full p-8 bg-white dark:bg-gray-950 text-black dark:text-white border-[8px] border-navy dark:border-blue-500 rounded-[3rem] text-center font-black text-3xl placeholder:font-black placeholder:text-gray-200 focus:border-green outline-none transition-all shadow-2xl"
                        maxLength={searchMode === 'VIN' ? 17 : 20}
                    />
                </div>
                
                {vehicleDetails && (
                    <div className="bg-green/5 border-[3px] border-green/30 rounded-[2.5rem] p-6 animate-in zoom-in-95 duration-400 shadow-inner">
                        <p className="font-black text-navy dark:text-white text-2xl uppercase tracking-tighter">
                            {vehicleDetails.ModelYear} {vehicleDetails.Make}
                        </p>
                        <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mt-2">{vehicleDetails.Model} • {vehicleDetails.BodyClass} • {vehicleDetails.GVWR}</p>
                    </div>
                )}

                <button 
                    onClick={checkCompliance}
                    className="w-full bg-green text-white py-8 rounded-[3rem] font-black tracking-[0.15em] text-2xl shadow-[0_20px_50px_rgba(21,128,61,0.4)] active:scale-95 transition-transform uppercase"
                >
                    CHECK STATUS
                </button>
            </div>

            {/* NEW FLEET UTILITY SECTION */}
            <div className="pt-6 space-y-4">
                <div className="flex items-center gap-3 px-2">
                    <h3 className="text-[10px] font-black text-navy/30 uppercase tracking-[0.2em]">Fleet Utilities</h3>
                    <div className="flex-1 h-px bg-navy/10"></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={onNavigateTools}
                        className="bg-white border-4 border-navy/10 p-5 rounded-3xl flex flex-col items-center gap-1 active:scale-95 transition-all group"
                    >
                        <span className="text-2xl group-hover:scale-110 transition-transform">📄</span>
                        <span className="text-[9px] font-black text-navy uppercase tracking-widest text-center leading-tight">UPLOAD ENGINE<br/>TAG / REG</span>
                    </button>
                    <button 
                        onClick={() => window.open('https://cleantruckcheck.arb.ca.gov/Fleet/FiveDayPass', '_blank')}
                        className="bg-white border-4 border-navy/10 p-5 rounded-3xl flex flex-col items-center gap-1 active:scale-95 transition-all group"
                    >
                        <span className="text-2xl group-hover:scale-110 transition-transform">🎟️</span>
                        <span className="text-[9px] font-black text-navy uppercase tracking-widest text-center leading-tight">APPLY FOR<br/>5 DAY PASS</span>
                    </button>
                </div>
            </div>
        </div>

      {/* Confirmation Modal */}
      {scanResult && (
          <div className="fixed inset-0 z-[200] bg-navy/95 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-500" onClick={() => setScanResult(null)}>
              <div className="bg-white dark:bg-gray-800 rounded-[4rem] p-10 w-full max-w-sm shadow-2xl space-y-10" onClick={e => e.stopPropagation()}>
                  <div className="text-center">
                    <div className="w-24 h-24 bg-green rounded-full mx-auto flex items-center justify-center text-4xl text-white mb-8 shadow-2xl">✓</div>
                    <h3 className="font-black text-3xl text-navy dark:text-white uppercase tracking-tighter leading-none">Scanned!</h3>
                    <p className="text-[11px] font-black text-gray-400 tracking-widest uppercase mt-4">{scanResult.details}</p>
                  </div>
                  
                  <input 
                      type="text" 
                      value={editedVin}
                      onChange={(e) => setEditedVin(e.target.value.toUpperCase())}
                      className="w-full p-6 text-center text-3xl font-black bg-gray-50 dark:bg-gray-700 border-[6px] border-navy rounded-[2rem] focus:outline-none dark:text-white shadow-inner"
                  />

                  <div className="flex gap-4">
                      <button onClick={() => setScanResult(null)} className="flex-1 py-6 bg-gray-100 dark:bg-gray-700 text-gray-500 font-black rounded-3xl uppercase tracking-widest text-xs">RETRY</button>
                      <button onClick={() => { setInputVal(editedVin); setScanResult(null); checkCompliance(); }} className="flex-[2] py-6 bg-green text-white font-black rounded-3xl uppercase tracking-widest text-xs shadow-2xl">VERIFY</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default VinChecker;