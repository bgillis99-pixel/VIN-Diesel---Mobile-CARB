import React, { useState, useRef, useEffect } from 'react';
import { extractVinFromImage, extractEngineTagInfo } from '../services/geminiService';
import { Submission } from '../types';

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
  
  // VIN Confirmation State
  const [scanResult, setScanResult] = useState<{vin: string, details: string} | null>(null);
  const [editedVin, setEditedVin] = useState('');

  // Tester Search State
  const [zipCode, setZipCode] = useState('');
  const [coverageMessage, setCoverageMessage] = useState('Enter Zip for Local Dispatch');
  const [dispatchPhone, setDispatchPhone] = useState('617-359-6953');
  const [regionLabel, setRegionLabel] = useState('Statewide Network');
  const [estimatedPrice, setEstimatedPrice] = useState('Enter Zip for Estimate');
  const [reviewSnippet, setReviewSnippet] = useState('“Reliable and fast service.”');
  const [locating, setLocating] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('https://norcalcarbmobile.com');
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // GEOLOCATION HELPER
  const getCurrentLocation = (): Promise<{lat: number, lng: number} | null> => {
      return new Promise((resolve) => {
          if (!navigator.geolocation) resolve(null);
          navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              (err) => resolve(null),
              { timeout: 5000 }
          );
      });
  };

  // DATABASE SAVER (Local Logging for Analytics)
  const saveToAdminDb = async (type: 'VIN_CHECK' | 'ENGINE_TAG' | 'REGISTRATION', summary: string, details: any) => {
      const coords = await getCurrentLocation();
      const submission: Submission = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          dateStr: new Date().toLocaleString(),
          type,
          summary,
          details,
          coordinates: coords,
          status: 'NEW'
      };

      const existing = JSON.parse(localStorage.getItem('vin_diesel_submissions') || '[]');
      localStorage.setItem('vin_diesel_submissions', JSON.stringify([submission, ...existing]));
      return submission;
  };

  const handleAskQuestion = (question: string) => {
      sessionStorage.setItem('pending_chat_query', question);
      onNavigateChat();
  };

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatusMessage('SCANNING...');
    setScanResult(null);
    try {
      const result = await extractVinFromImage(file);
      
      if (result.vin && result.vin.length > 10) {
          setScanResult({ vin: result.vin, details: result.description });
          setEditedVin(result.vin);
          setSearchMode('VIN'); // Force VIN mode on scan
          
          // Log to DB
          saveToAdminDb('VIN_CHECK', `Scanned VIN: ${result.vin}`, result);
          
          if (navigator.vibrate) navigator.vibrate(50);
      } else {
          alert('Scan unclear. Please wipe lens and try again, or type manually.');
      }
    } catch (err) {
      alert('Failed to extract VIN. Please ensure label is clean and lit, or type manually.');
    } finally {
      setLoading(false);
      setStatusMessage('ANALYZING...');
      if(cameraInputRef.current) cameraInputRef.current.value = '';
      if(galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const confirmVin = () => {
      const cleaned = editedVin.trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
      setInputVal(cleaned);
      setScanResult(null);
  };

  const updateCoverage = (val: string) => {
      setZipCode(val);
      
      // Default / Fallback
      let phone = '617-359-6953';
      let msg = '100% Mobile Statewide';
      let region = 'California Statewide';
      let price = 'Enter Zip for Estimate';
      let review = '“Saved us from a DMV registration block last minute.” — Mike T., Owner-Operator';

      if (val.length >= 3) {
          const prefix = parseInt(val.substring(0, 3));
          
          // NorCal Logic
          // Central Valley: 936-938, 952-953
          // Sac/North: 956-961, 959-960
          // Bay/Coastal: 939, 940-951, 954-955
          const isCentralValley = (prefix >= 936 && prefix <= 938) || (prefix >= 952 && prefix <= 953);
          const isSacramentoNorth = (prefix >= 956 && prefix <= 961) || (prefix >= 959 && prefix <= 960);
          const isCoastal = prefix === 939 || (prefix >= 940 && prefix <= 951) || prefix === 954 || prefix === 955;
          const isNorCal = isCentralValley || isSacramentoNorth || isCoastal;
          
          // SoCal Logic (900-935)
          const isSocal = (prefix >= 900 && prefix <= 935);

          if (isNorCal) {
              // Unified NorCal Pricing
              price = "OBD $75-150 • OVI $199-250 • RV $250-300";
              
              if (isCentralValley) {
                  phone = '209-818-1371';
                  msg = "✅ Local Central Valley Dispatch";
                  region = "Stockton • Fresno • Modesto";
                  review = "“Showed up in 45 mins to our yard in Stockton. Super pro service.” — J.R. Logistics";
              } else if (isSacramentoNorth) {
                  phone = '916-890-4427';
                  msg = "✅ Local Northern Inland Dispatch";
                  region = "Sacramento • Redding • Tahoe";
                  review = "“Helped us clear a citation in Sacramento. Knows the rules better than CARB.” — Big Rigs Inc.";
              } else {
                  phone = '415-900-8563';
                  msg = "✅ Local Coastal/Bay Area Dispatch";
                  region = "Monterey • Bay Area • North Coast";
                  review = "“Expensive toll fees included in price, but worth it for the convenience.” — Bay Area Transport";
              }
          } else if (isSocal) {
              phone = '617-359-6953';
              msg = "✅ 100% Mobile Statewide";
              region = "LA • San Diego • Inland Empire";
              price = "OBD $125 • OVI $250 • RV $300";
              review = "“They coordinate multiple trucks to lower the travel cost. Call them.” — SoCal Fleet Services";
          } else {
              // Other CA or Unknown
              msg = "Statewide Dispatch Available";
              price = "Contact for Quote";
          }
      }

      setDispatchPhone(phone);
      setCoverageMessage(msg);
      setRegionLabel(region);
      setEstimatedPrice(price);
      setReviewSnippet(review);
  };

  const handleZipSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
      updateCoverage(e.target.value);
  };

  const handleUseLocation = () => {
      setLocating(true);
      const timeoutId = setTimeout(() => {
          setLocating(false);
      }, 5000);

      navigator.geolocation.getCurrentPosition((pos) => {
          clearTimeout(timeoutId);
          const lat = pos.coords.latitude;
          let detectedZip = '90012'; // Default fallback
          if (lat > 39.0) detectedZip = '96001';
          else if (lat > 38.0) detectedZip = '95814';
          else if (lat > 37.5) detectedZip = '94103';
          else if (lat > 36.5) detectedZip = '93901';
          else if (lat > 36.0) detectedZip = '93721';

          updateCoverage(detectedZip);
          setLocating(false);
      }, (err) => {
          clearTimeout(timeoutId);
          setLocating(false);
          alert("Could not detect location. Please enter Zip manually.");
      });
  };

  const checkCompliance = () => {
    const val = inputVal.trim().toUpperCase();
    if (!val) {
      alert('Enter or scan VIN/Entity/TRUCRS');
      return;
    }
    
    // STRICT VALIDATION
    // 1. Check for illegal characters I, O, Q
    if (/[IOQ]/.test(val)) {
        alert("⚠️ INVALID VIN CHARACTER\n\nLetters 'I', 'O', and 'Q' are ILLEGAL in VINs.\n\nUse Numbers '1' or '0' instead.");
        return;
    }

    // 2. VIN Length Check
    if (searchMode === 'VIN') {
        if (val.length !== 17) {
            alert(`⚠️ INVALID LENGTH\n\nA standard VIN must be exactly 17 characters.\nYou entered ${val.length}.`);
            return;
        }

        // 3. 8th Digit Protocol Check (Engine Code)
        // Note: VIN is 0-indexed, so 8th char is index 7
        const eighthChar = val.charAt(7);
        if (!/^\d$/.test(eighthChar)) {
             alert(`⚠️ CARB PROTOCOL ERROR\n\nThe 8th character ('${eighthChar}') MUST be a number for Heavy-Duty Diesel vehicles.\n\nPlease check your input.`);
             return;
        }
    }

    const isVin = /^[A-HJ-NPR-Z0-9]{17}$/.test(val);
    const isEntity = /^\d+$/.test(val);
    
    // Fallback logic for manual override
    const finalType = isVin ? 'VIN' : (isEntity ? 'ENTITY' : 'VIN');
    
    // Log manual entry too
    saveToAdminDb('VIN_CHECK', `Check: ${val}`, { value: val, type: finalType });

    onAddToHistory(val, finalType === 'VIN' ? 'VIN' : 'ENTITY');
    const param = finalType === 'VIN' ? 'vin' : 'entity';
    window.open(`https://cleantruckcheck.arb.ca.gov/Fleet/Vehicle/VehicleComplianceStatusLookup?${param}=${val}`, '_blank');
  };

  // --- FULL PAGE TESTER SEARCH VIEW ---
  if (showTesterSearch) {
      const smsBody = `I am in Zip ${zipCode || '[ZIP]'}. Do I need an OBD or Smoke (OVI) test?`;
      
      return (
          <div className="fixed inset-0 z-50 bg-[#f8f9fa] dark:bg-gray-900 overflow-y-auto animate-in fade-in slide-in-from-right duration-300">
              {/* Header */}
              <div className="bg-[#003366] dark:bg-gray-900 text-white p-4 shadow-md sticky top-0 z-20">
                  <div className="max-w-md mx-auto flex flex-col">
                      <button onClick={() => setShowTesterSearch(false)} className="self-start flex items-center gap-2 font-bold text-sm hover:text-green-400 transition-colors mb-4">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                          BACK TO HOME
                      </button>
                      <h2 className="text-3xl font-black">Find Certified Tester</h2>
                      <p className="text-sm opacity-80 mt-1">Locate Mobile Opacity & OBD Testers</p>
                  </div>
              </div>

              <div className="p-4 space-y-6 max-w-md mx-auto pb-24">
                  {/* Search Bar */}
                  <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-3">Search by Location</label>
                      <div className="flex gap-3">
                          <input 
                              type="tel" 
                              placeholder="Enter Zip Code" 
                              value={zipCode} 
                              onChange={handleZipSearch}
                              className="flex-1 p-4 text-xl font-bold border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-[#003366] outline-none dark:bg-gray-700 dark:text-white"
                              maxLength={5}
                          />
                          <button 
                              onClick={handleUseLocation}
                              disabled={locating}
                              className="bg-[#003366] text-white px-6 rounded-xl font-bold flex items-center justify-center disabled:opacity-50"
                          >
                              {locating ? <span className="animate-spin text-xl">⌛</span> : <span className="text-xl">📍</span>}
                          </button>
                      </div>
                  </div>

                  {/* Results Card */}
                  <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border-2 border-[#15803d] overflow-hidden relative transform transition-all">
                      <div className="bg-[#15803d] text-white text-xs font-bold px-4 py-2 absolute top-0 right-0 rounded-bl-2xl">
                          RECOMMENDED
                      </div>
                      
                      <div className="p-6">
                          <div className="flex items-start justify-between mb-6">
                              <div>
                                  <h3 className="text-2xl font-black text-[#003366] dark:text-white leading-tight">NorCal CARB Mobile</h3>
                                  <p className="text-sm font-bold text-gray-700 dark:text-gray-400 mt-1">{regionLabel}</p>
                                  <div className="flex items-center gap-1 mt-2">
                                      <span className="text-yellow-400 text-lg">★★★★★</span>
                                      <span className="text-xs text-blue-600 font-bold underline cursor-pointer">4.9 (124 Google Reviews)</span>
                                  </div>
                              </div>
                              <img src="https://api.qrserver.com/v1/create-qr-code/?size=64x64&data=Norcal&color=003366" className="w-16 h-16 rounded-xl opacity-90" alt="Logo" />
                          </div>

                          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-2xl mb-6 border border-gray-100 dark:border-gray-600">
                              <p className="text-[10px] font-bold text-gray-700 uppercase mb-1">Estimated Pricing</p>
                              <p className="text-lg font-black text-[#15803d] dark:text-green-400 leading-tight">{estimatedPrice}</p>
                              <p className="text-[10px] text-gray-700 italic mt-1">*Includes travel & certificate fees</p>
                          </div>

                          <div className="mb-6 relative">
                              <span className="absolute -top-3 -left-1 text-4xl text-gray-200">“</span>
                              <p className="text-sm italic text-gray-700 dark:text-gray-300 pl-6 relative z-10 leading-relaxed">
                                  {reviewSnippet}
                              </p>
                          </div>

                          <div className="flex flex-col gap-3">
                              <a href={`tel:${dispatchPhone.replace(/-/g, '')}`} className="w-full py-4 bg-[#003366] text-white font-black rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-[#002244] transition-colors">
                                  <span>📞 CALL DISPATCH</span>
                              </a>
                              <div className="flex gap-3">
                                  <a href={`sms:${dispatchPhone.replace(/-/g, '')}?body=${encodeURIComponent(smsBody)}`} className="flex-1 py-3 bg-white border-2 border-[#003366] text-[#003366] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50">
                                      <span>💬 TEXT</span>
                                  </a>
                                  <a href={`mailto:bryan@norcalcarbmobile.com?subject=Smoke Test Request&body=${encodeURIComponent(smsBody)}`} className="flex-1 py-3 bg-white border-2 border-[#003366] text-[#003366] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50">
                                      <span>✉️ EMAIL</span>
                                  </a>
                              </div>
                              <a href={websiteUrl} target="_blank" className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-[#003366] dark:text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors mt-1">
                                  <span>🌐 VISIT WEBSITE</span>
                              </a>
                          </div>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-900/50 p-4 border-t border-gray-100 dark:border-gray-700">
                          <p className="text-[10px] font-bold text-gray-700 uppercase mb-2">Services Provided</p>
                          <div className="flex flex-wrap gap-2">
                              {['SAE J1667 Smoke', 'OBD Testing', 'PSIP Annual', 'Opacity Test', '100% Mobile Statewide'].map(tag => (
                                  <span key={tag} className="text-[10px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 px-2 py-1 rounded text-gray-700 dark:text-gray-300 font-bold">
                                      {tag}
                                  </span>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // --- MAIN SCANNER VIEW ---
  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      
      {/* Scanner Card */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700 relative">
        <div className="bg-[#003366] p-2 text-center">
            <p className="text-[10px] text-white font-bold tracking-widest opacity-80">CALIFORNIA CLEAN TRUCK CHECK</p>
        </div>
        
        <div className="p-6">
            <button 
                onClick={() => cameraInputRef.current?.click()}
                disabled={loading}
                className="w-full bg-[#003366] text-white py-5 rounded-2xl shadow-lg hover:bg-[#002244] active:scale-95 transition-all group relative overflow-hidden mb-3"
            >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <div className="flex flex-col items-center justify-center gap-1">
                    <span className="text-2xl">📸</span> 
                    <span className="font-black text-lg tracking-wide">{loading ? statusMessage : 'SCAN VIN TAG / BARCODE'}</span>
                </div>
            </button>
            <input 
                type="file" 
                ref={cameraInputRef} 
                onChange={handleScan} 
                accept="image/*" 
                capture="environment"
                className="hidden" 
            />

            {/* Rename Upload Option as Button */}
            <button 
                onClick={() => galleryInputRef.current?.click()}
                disabled={loading}
                className="w-full bg-white border-2 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 py-3 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all mb-6 flex items-center justify-center gap-2"
            >
                <span>📂</span> Upload (VIN / Registration)
            </button>
            <input 
                type="file" 
                ref={galleryInputRef} 
                onChange={handleScan} 
                accept="image/*" 
                className="hidden" 
            />

            <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-400 font-bold">OR ENTER MANUALLY</span>
                </div>
            </div>

            <div className="space-y-4">
                {/* Search Type Tabs */}
                <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-xl">
                    <button 
                        onClick={() => setSearchMode('VIN')} 
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${searchMode === 'VIN' ? 'bg-white dark:bg-gray-600 shadow text-[#003366] dark:text-white' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        VEHICLE (VIN)
                    </button>
                    <button 
                        onClick={() => setSearchMode('OWNER')} 
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${searchMode === 'OWNER' ? 'bg-white dark:bg-gray-600 shadow text-[#003366] dark:text-white' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        FLEET OWNER
                    </button>
                </div>

                <input
                    type="text"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value.toUpperCase())}
                    placeholder={searchMode === 'VIN' ? "VIN or Entity ID" : "Fleet ID / TRUCRS ID"}
                    className="w-full p-4 bg-gray-50 dark:bg-gray-700 dark:text-white border-2 border-gray-200 dark:border-gray-600 rounded-xl text-center font-mono text-lg font-bold placeholder:font-sans placeholder:text-sm focus:border-[#003366] outline-none"
                    maxLength={searchMode === 'VIN' ? 17 : 20}
                />
                <p className="text-[10px] text-gray-700 text-center">
                   Tip: If scan fails, type manually or wipe label clean.
                </p>

                <button 
                    onClick={checkCompliance}
                    className="w-full bg-[#15803d] text-white py-4 rounded-xl font-bold shadow-md hover:bg-[#166534] active:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                    CHECK STATUS <span className="text-xl">›</span>
                </button>
                
                <button 
                    onClick={() => setShowTesterSearch(true)}
                    className="w-full bg-gray-100 dark:bg-gray-700 text-[#003366] dark:text-white py-3 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                >
                    <span>📍</span> FIND TESTER
                </button>
                
                <div className="text-center">
                    <button onClick={() => handleAskQuestion('How do I fix a DMV Hold?')} className="text-xs font-bold text-gray-600 hover:text-[#003366] flex items-center justify-center gap-1 mx-auto">
                        Questions? <span className="text-[#15803d]">Ask AI ➜</span>
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* Common Questions Section */}
      <div className="px-2">
          <h3 className="text-[#003366] dark:text-white font-bold text-sm mb-3 ml-2">Common Questions</h3>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
              <button onClick={() => handleAskQuestion('Why is my registration on DMV Hold?')} className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 group transition-colors">
                  <div className="flex items-center gap-3">
                      <span className="text-lg bg-red-50 text-red-500 p-1.5 rounded-lg">🚫</span>
                      <span className="font-bold text-sm text-gray-700 dark:text-gray-200">DMV Hold?</span>
                  </div>
                  <span className="text-gray-300 group-hover:text-[#003366] font-bold">+</span>
              </button>
              
              <button onClick={() => handleAskQuestion('When is my next test due?')} className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 group transition-colors">
                  <div className="flex items-center gap-3">
                      <span className="text-lg bg-blue-50 text-blue-500 p-1.5 rounded-lg">📅</span>
                      <span className="font-bold text-sm text-gray-700 dark:text-gray-200">Next Test Deadline?</span>
                  </div>
                  <span className="text-gray-300 group-hover:text-[#003366] font-bold">+</span>
              </button>
              
              <button onClick={() => handleAskQuestion('I lost my password')} className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 group transition-colors">
                  <div className="flex items-center gap-3">
                      <span className="text-lg bg-yellow-50 text-yellow-500 p-1.5 rounded-lg">🔑</span>
                      <span className="font-bold text-sm text-gray-700 dark:text-gray-200">Lost Password?</span>
                  </div>
                  <span className="text-gray-300 group-hover:text-[#003366] font-bold">+</span>
              </button>
          </div>
      </div>

      {/* Share & Support Section (Updated Style) */}
      <div className="px-2 pb-8">
        <div className="mt-6 bg-[#003366] rounded-2xl p-6 text-white text-center shadow-lg relative overflow-hidden">
             
             <h3 className="text-lg font-black italic relative z-10 mb-1 text-white">HELP A TRUCKER OUT</h3>
             <p className="text-xs text-blue-100 mb-4 relative z-10 max-w-xs mx-auto">
                 Share this app with your fleet. Referrals help us keep the app free.
             </p>

             <div className="grid grid-cols-3 gap-3 relative z-10">
                 <a href="tel:6173596953" className="flex flex-col items-center justify-center bg-white border border-white p-3 rounded-xl hover:bg-gray-100 transition-colors text-[#003366]">
                     <span className="text-2xl mb-1">📞</span>
                     <span className="text-[10px] font-black tracking-widest">CALL</span>
                 </a>
                 <button onClick={onShareApp} className="flex flex-col items-center justify-center bg-white border border-white p-3 rounded-xl hover:bg-gray-100 transition-colors text-[#003366]">
                     <span className="text-2xl mb-1">🚀</span>
                     <span className="text-[10px] font-black tracking-widest">SHARE</span>
                 </button>
                 <a href="sms:6173596953?body=I need help with CARB Compliance" className="flex flex-col items-center justify-center bg-white border border-white p-3 rounded-xl hover:bg-gray-100 transition-colors text-[#003366]">
                     <span className="text-2xl mb-1">💬</span>
                     <span className="text-[10px] font-black tracking-widest">TEXT</span>
                 </a>
             </div>
             
             <div className="mt-4 pt-4 border-t border-white/10 relative z-10">
                 <p className="text-[10px] text-blue-200">
                     Questions? Email <a href="mailto:bryan@norcalcarbmobile.com" className="text-white font-bold hover:underline">bryan@norcalcarbmobile.com</a>
                 </p>
             </div>
        </div>
      </div>

      {/* SCAN CONFIRMATION MODAL */}
      {scanResult && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200" onClick={() => setScanResult(null)}>
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl transform transition-all scale-100 space-y-4" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 pb-4">
                      <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full">
                          <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <div>
                          <h3 className="font-black text-xl text-[#003366] dark:text-white">Scan Complete</h3>
                          <p className="text-xs text-gray-700 dark:text-gray-400">{scanResult.details}</p>
                      </div>
                  </div>
                  
                  <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Detected VIN</label>
                      <input 
                          type="text" 
                          value={editedVin}
                          onChange={(e) => setEditedVin(e.target.value.toUpperCase())}
                          className="w-full p-4 text-center text-xl font-mono font-bold bg-gray-50 dark:bg-gray-700 border-2 border-green-500 rounded-xl focus:outline-none dark:text-white"
                      />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                      <button onClick={() => setScanResult(null)} className="py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200">
                          Rescan
                      </button>
                      <button onClick={confirmVin} className="py-3 bg-[#15803d] text-white font-bold rounded-xl shadow-lg hover:bg-[#166534]">
                          Confirm & Check
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default VinChecker;