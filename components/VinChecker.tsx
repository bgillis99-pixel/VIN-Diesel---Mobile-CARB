
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
}

const VinChecker: React.FC<Props> = ({ onAddToHistory, onNavigateChat, onShareApp }) => {
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
          <div className="fixed inset-0 z-[100] bg-[#f8f9fa] dark:bg-gray-900 overflow-y-auto animate-in fade-in slide-in-from-right duration-300">
              <div className="bg-navy dark:bg-black text-white p-6 shadow-md sticky top-0 z-20">
                  <div className="max-w-md mx-auto">
                      <button onClick={() => setShowTesterSearch(false)} className="mb-4 flex items-center gap-2 font-black text-xs tracking-widest uppercase">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                          BACK
                      </button>
                      <h2 className="text-3xl font-black uppercase tracking-tighter">Certified Tester</h2>
                  </div>
              </div>
              <div className="p-4 space-y-6 max-w-md mx-auto pb-24">
                  <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-200 dark:border-gray-700">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 text-center">Enter Service Zip Code</label>
                      <input 
                          type="tel" 
                          placeholder="ZIP CODE" 
                          value={zipCode} 
                          onChange={(e) => setZipCode(e.target.value)}
                          className="w-full p-6 text-4xl font-black border-4 border-navy text-black rounded-3xl focus:border-green outline-none dark:bg-gray-700 dark:text-white text-center"
                          maxLength={5}
                      />
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl border-4 border-green p-8 text-center space-y-8">
                      <div>
                          <h3 className="text-2xl font-black text-navy dark:text-white leading-tight">{testerName}</h3>
                          <p className="text-sm font-bold text-green mt-1">{regionLabel}</p>
                      </div>
                      <div className="flex flex-col gap-4">
                        <a href={`tel:${dispatchPhone.replace(/-/g, '')}`} className="w-full py-6 bg-navy text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-transform">
                           📞 CALL DISPATCH
                        </a>
                        <a href={`sms:${dispatchPhone.replace(/-/g, '')}?body=${encodeURIComponent(smsBody)}`} className="w-full py-5 bg-white border-4 border-navy text-navy dark:text-blue-400 font-black rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform">
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

      <div className="p-8 space-y-8">
            {/* Tesla-style Scan Button */}
            <button 
                onClick={() => cameraInputRef.current?.click()}
                disabled={loading}
                className="w-full bg-navy text-white py-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform border border-white/20"
            >
                <span className="text-4xl">📸</span> 
                <span className="font-black text-xl tracking-[0.1em] uppercase leading-none">{loading ? statusMessage : 'SCAN VEHICLE LABEL'}</span>
            </button>
            <input type="file" ref={cameraInputRef} onChange={handleScan} accept="image/*" capture="environment" className="hidden" />

            <div className="space-y-6">
                <div className="flex gap-2 p-1.5 bg-gray-200 dark:bg-gray-800 rounded-[2rem] border border-gray-300 dark:border-gray-700">
                    <button onClick={() => setSearchMode('VIN')} className={`flex-1 py-3.5 text-[11px] font-black tracking-widest rounded-2xl transition-all ${searchMode === 'VIN' ? 'bg-white shadow-md text-navy dark:bg-gray-700 dark:text-white' : 'text-gray-500'}`}>VEHICLE (VIN)</button>
                    <button onClick={() => setSearchMode('OWNER')} className={`flex-1 py-3.5 text-[11px] font-black tracking-widest rounded-2xl transition-all ${searchMode === 'OWNER' ? 'bg-white shadow-md text-navy dark:bg-gray-700 dark:text-white' : 'text-gray-500'}`}>OWNER ID</button>
                </div>

                <div className="relative group">
                    <label className="block text-[10px] font-black text-navy/40 dark:text-white/40 uppercase tracking-widest mb-2 px-4">Manual Entry Field</label>
                    {/* HEAVY OUTLINE & DARKER FONT AS REQUESTED */}
                    <input
                        type="text"
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value.toUpperCase())}
                        placeholder={searchMode === 'VIN' ? "VIN (17 CHARS)" : "FLEET / TRUCRS ID"}
                        className="w-full p-6 bg-white dark:bg-gray-950 text-black dark:text-white border-[6px] border-navy dark:border-blue-500 rounded-[2.5rem] text-center font-black text-2xl placeholder:font-black placeholder:text-gray-200 focus:border-green outline-none transition-all shadow-xl"
                        maxLength={searchMode === 'VIN' ? 17 : 20}
                    />
                </div>
                
                {vehicleDetails && (
                    <div className="bg-green/5 border-2 border-green/30 rounded-[2rem] p-5 animate-in zoom-in-95 duration-300">
                        <p className="font-black text-navy dark:text-white text-xl uppercase tracking-tighter">
                            {vehicleDetails.ModelYear} {vehicleDetails.Make}
                        </p>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">{vehicleDetails.Model} • {vehicleDetails.BodyClass}</p>
                    </div>
                )}

                <button 
                    onClick={checkCompliance}
                    className="w-full bg-green text-white py-6 rounded-[2.5rem] font-black tracking-[0.1em] text-xl shadow-xl active:scale-95 transition-transform"
                >
                    CHECK COMPLIANCE
                </button>
            </div>
        </div>

      {/* Confirmation Modal */}
      {scanResult && (
          <div className="fixed inset-0 z-[200] bg-navy/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setScanResult(null)}>
              <div className="bg-white dark:bg-gray-800 rounded-[3rem] p-8 w-full max-w-sm shadow-2xl space-y-8" onClick={e => e.stopPropagation()}>
                  <div className="text-center">
                    <div className="w-20 h-20 bg-green rounded-full mx-auto flex items-center justify-center text-3xl text-white mb-6 shadow-xl">✓</div>
                    <h3 className="font-black text-2xl text-navy dark:text-white uppercase tracking-tighter leading-none">Scan Success</h3>
                    <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase mt-3">{scanResult.details}</p>
                  </div>
                  
                  <input 
                      type="text" 
                      value={editedVin}
                      onChange={(e) => setEditedVin(e.target.value.toUpperCase())}
                      className="w-full p-5 text-center text-2xl font-black bg-gray-50 dark:bg-gray-700 border-4 border-navy rounded-2xl focus:outline-none dark:text-white"
                  />

                  <div className="flex gap-3">
                      <button onClick={() => setScanResult(null)} className="flex-1 py-5 bg-gray-100 dark:bg-gray-700 text-gray-500 font-black rounded-2xl uppercase tracking-widest text-xs">Cancel</button>
                      <button onClick={() => { setInputVal(editedVin); setScanResult(null); checkCompliance(); }} className="flex-[2] py-5 bg-green text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl">Verify</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );

  function handleAskQuestion(q: string) {
      sessionStorage.setItem('pending_chat_query', q);
      onNavigateChat();
  }
};

export default VinChecker;
