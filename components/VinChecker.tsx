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
  const [showScanHelp, setShowScanHelp] = useState(false);
  const [scanErrorMsg, setScanErrorMsg] = useState('Scan unclear.'); 
  const [vehicleDetails, setVehicleDetails] = useState<any>(null); 

  const [zipCode, setZipCode] = useState('');
  const [testerName, setTesterName] = useState('Mobile CARB Check');
  const [dispatchPhone, setDispatchPhone] = useState('617-359-6953');
  const [regionLabel, setRegionLabel] = useState('Statewide Network');
  const [estimatedPrice, setEstimatedPrice] = useState('Enter Zip for Estimate');
  const [reviewSnippet, setReviewSnippet] = useState('“Reliable and fast service.”');
  
  const [locating, setLocating] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('https://norcalcarbmobile.com');
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

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

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>, isUpload: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file || file.size === 0) return;

    setLoading(true);
    setStatusMessage(isUpload ? 'READING FILE...' : 'SCANNING...');
    
    try {
      const result = await extractVinFromImage(file);
      if (result.vin && result.vin.length >= 11) {
          setScanResult({ vin: result.vin, details: result.description });
          setEditedVin(result.vin);
          setSearchMode('VIN'); 
          saveToAdminDb('VIN_CHECK', `Scanned VIN: ${result.vin}`, result);
          trackEvent('scan_success', { vin: result.vin });
      } else {
          setShowScanHelp(true);
      }
    } catch (err) {
      setShowScanHelp(true);
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
          <div className="fixed inset-0 z-50 bg-[#f8f9fa] dark:bg-gray-900 overflow-y-auto animate-in fade-in slide-in-from-right duration-300">
              <div className="bg-navy dark:bg-black text-white p-6 shadow-md sticky top-0 z-20">
                  <div className="max-w-md mx-auto">
                      <button onClick={() => setShowTesterSearch(false)} className="mb-4 flex items-center gap-2 font-black text-xs tracking-widest uppercase">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                          BACK
                      </button>
                      <h2 className="text-3xl font-black">FIND TESTER</h2>
                  </div>
              </div>
              <div className="p-4 space-y-6 max-w-md mx-auto pb-24">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border border-gray-200">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Service Location</label>
                      <input 
                          type="tel" 
                          placeholder="ZIP CODE" 
                          value={zipCode} 
                          onChange={(e) => setZipCode(e.target.value)}
                          className="w-full p-4 text-2xl font-black border-2 border-navy/10 rounded-2xl focus:border-navy outline-none dark:bg-gray-700 dark:text-white text-center"
                          maxLength={5}
                      />
                  </div>
                  {/* Results Display logic abbreviated here for clarity - focusing on the UX updates requested */}
                  <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-xl border-2 border-green p-6 text-center space-y-6">
                      <h3 className="text-2xl font-black text-navy dark:text-white leading-tight">{testerName}</h3>
                      <p className="text-sm font-bold text-green">{regionLabel}</p>
                      <div className="flex flex-col gap-3">
                        <a href={`tel:${dispatchPhone.replace(/-/g, '')}`} className="w-full py-5 bg-navy text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-2">
                           📞 CALL DISPATCH
                        </a>
                        <a href={`sms:${dispatchPhone.replace(/-/g, '')}?body=${encodeURIComponent(smsBody)}`} className="w-full py-4 bg-white border-2 border-navy text-navy font-black rounded-2xl flex items-center justify-center gap-2">
                           💬 TEXT REQUEST
                        </a>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      
      {/* FIND TESTER TOP SHORTCUT (Requested for visibility) */}
      <button 
          onClick={() => setShowTesterSearch(true)}
          className="w-full bg-green text-white py-4 rounded-3xl font-black tracking-widest uppercase shadow-xl shadow-green/20 flex items-center justify-center gap-2 transition-transform active:scale-95"
      >
          <span>📍</span> FIND A CERTIFIED TESTER
      </button>

      {/* Main Container */}
      <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="bg-navy p-3 text-center">
            <p className="text-[9px] text-white font-black tracking-[0.2em] uppercase">Status Verification System</p>
        </div>
        
        <div className="p-8 space-y-6">
            <button 
                onClick={() => cameraInputRef.current?.click()}
                disabled={loading}
                className="w-full bg-navy text-white py-6 rounded-3xl shadow-xl shadow-navy/20 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
            >
                <span className="text-3xl">📸</span> 
                <span className="font-black text-lg tracking-widest uppercase">{loading ? statusMessage : 'SCAN VEHICLE TAG'}</span>
            </button>
            <input type="file" ref={cameraInputRef} onChange={(e) => handleScan(e, false)} accept="image/*" capture="environment" className="hidden" />

            <div className="space-y-4">
                <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-2xl">
                    <button onClick={() => setSearchMode('VIN')} className={`flex-1 py-3 text-[10px] font-black tracking-widest rounded-xl ${searchMode === 'VIN' ? 'bg-white shadow-sm text-navy' : 'text-gray-400'}`}>VEHICLE (VIN)</button>
                    <button onClick={() => setSearchMode('OWNER')} className={`flex-1 py-3 text-[10px] font-black tracking-widest rounded-xl ${searchMode === 'OWNER' ? 'bg-white shadow-sm text-navy' : 'text-gray-400'}`}>OWNER ID</button>
                </div>

                <div className="relative">
                    <input
                        type="text"
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value.toUpperCase())}
                        placeholder={searchMode === 'VIN' ? "VIN (17 CHARS)" : "FLEET / TRUCRS ID"}
                        className="w-full p-5 bg-gray-50 dark:bg-gray-700 text-navy dark:text-white border-2 border-navy/30 dark:border-gray-600 rounded-3xl text-center font-black text-xl placeholder:font-black placeholder:text-gray-300 focus:border-navy outline-none transition-all shadow-inner"
                        maxLength={searchMode === 'VIN' ? 17 : 20}
                    />
                </div>
                
                {vehicleDetails && (
                    <div className="bg-green/5 border border-green/20 rounded-[1.5rem] p-4 animate-in fade-in">
                        <p className="font-black text-navy dark:text-white text-lg">
                            {vehicleDetails.ModelYear} {vehicleDetails.Make}
                        </p>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{vehicleDetails.Model} • {vehicleDetails.BodyClass}</p>
                    </div>
                )}

                <button 
                    onClick={checkCompliance}
                    className="w-full bg-green text-white py-5 rounded-3xl font-black tracking-[0.1em] text-lg shadow-xl shadow-green/20 active:scale-95 transition-transform"
                >
                    CHECK COMPLIANCE
                </button>
            </div>
        </div>
      </div>

      {/* Common Questions */}
      <div className="px-4">
          <button onClick={() => handleAskQuestion('How do I fix a DMV registration hold?')} className="w-full py-4 px-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 flex justify-between items-center text-left active:scale-95 transition-all">
              <span className="text-xs font-black text-navy/60 uppercase tracking-widest">DMV Hold Instructions?</span>
              <span className="text-green font-black">→</span>
          </button>
      </div>

      {/* Confirmation Modal */}
      {scanResult && (
          <div className="fixed inset-0 z-[200] bg-navy/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setScanResult(null)}>
              <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl space-y-6" onClick={e => e.stopPropagation()}>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green rounded-full mx-auto flex items-center justify-center text-2xl text-white mb-4 shadow-lg">✓</div>
                    <h3 className="font-black text-2xl text-navy dark:text-white uppercase tracking-tighter leading-none">Scan Success</h3>
                    <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase mt-2">{scanResult.details}</p>
                  </div>
                  
                  <input 
                      type="text" 
                      value={editedVin}
                      onChange={(e) => setEditedVin(e.target.value.toUpperCase())}
                      className="w-full p-4 text-center text-xl font-black bg-gray-50 dark:bg-gray-700 border-2 border-green rounded-2xl focus:outline-none dark:text-white"
                  />

                  <div className="flex gap-2">
                      <button onClick={() => setScanResult(null)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-500 font-black rounded-2xl uppercase tracking-widest text-xs">Cancel</button>
                      <button onClick={() => { setInputVal(editedVin); setScanResult(null); checkCompliance(); }} className="flex-[2] py-4 bg-green text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-lg">Confirm</button>
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