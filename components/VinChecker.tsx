import React, { useState, useRef, useEffect } from 'react';
import { extractVinFromImage, extractEngineTagInfo } from '../services/geminiService';
import { decodeVinNHTSA } from '../services/nhtsa'; // NHTSA Integration
import { saveScanToCloud, auth } from '../services/firebase'; // Firebase Integration
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
  
  // VIN Confirmation State
  const [scanResult, setScanResult] = useState<{vin: string, details: string} | null>(null);
  const [editedVin, setEditedVin] = useState('');
  const [showScanHelp, setShowScanHelp] = useState(false);
  const [scanErrorMsg, setScanErrorMsg] = useState('Scan unclear.'); 
  const [vehicleDetails, setVehicleDetails] = useState<any>(null); // NHTSA Data

  // Tester Search State
  const [zipCode, setZipCode] = useState('');
  const [coverageMessage, setCoverageMessage] = useState('Enter Zip for Local Dispatch');
  
  // Dynamic Branding State
  const [testerName, setTesterName] = useState('Mobile CARB Check');
  const [dispatchPhone, setDispatchPhone] = useState('617-359-6953');
  const [regionLabel, setRegionLabel] = useState('Statewide Network');
  const [estimatedPrice, setEstimatedPrice] = useState('Enter Zip for Estimate');
  const [reviewSnippet, setReviewSnippet] = useState('“Reliable and fast service.”');
  
  const [locating, setLocating] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('https://norcalcarbmobile.com');
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Debounce check for VIN to call NHTSA
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

  // DATABASE SAVER (Cloud First, Local Fallback)
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

      // 1. Cloud Save (Firebase)
      if (auth?.currentUser) {
          saveScanToCloud(auth.currentUser.uid, submission);
      }

      // 2. Local Save (Backup)
      const existing = JSON.parse(localStorage.getItem('vin_diesel_submissions') || '[]');
      localStorage.setItem('vin_diesel_submissions', JSON.stringify([submission, ...existing]));
      return submission;
  };

  const handleAskQuestion = (question: string) => {
      sessionStorage.setItem('pending_chat_query', question);
      trackEvent('ask_common_question', { question });
      onNavigateChat();
  };

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>, isUpload: boolean = false) => {
    const file = e.target.files?.[0];
    
    // TRIPLE CHECK: Ensure file exists and is valid
    if (!file || file.size === 0) {
        setScanErrorMsg("Upload failed: No valid file selected.");
        setShowScanHelp(true);
        return;
    }

    setLoading(true);
    setStatusMessage(isUpload ? 'PROCESSING IMAGE...' : 'SCANNING...');
    setScanResult(null);
    setShowScanHelp(false);
    trackEvent('scan_attempt', { type: isUpload ? 'upload' : 'camera' });
    
    try {
      // Using the working logic from yesterday
      const result = await extractVinFromImage(file);
      
      if (result.vin && result.vin.length >= 11) {
          setScanResult({ vin: result.vin, details: result.description });
          setEditedVin(result.vin);
          setSearchMode('VIN'); 
          
          saveToAdminDb('VIN_CHECK', `Scanned VIN: ${result.vin}`, result);
          trackEvent('scan_success', { vin: result.vin });
          
          if (navigator.vibrate) navigator.vibrate(50);
      } else {
          if (isUpload) {
              setScanErrorMsg("Could not detect VIN in this image.\nIt might be an engine tag or too blurry.\nPlease type manually.");
          } else {
              setScanErrorMsg("Scan unclear. Try to avoid glare and keep phone steady.");
          }
          setShowScanHelp(true);
          trackEvent('scan_failed', { reason: 'low_confidence' });
      }
    } catch (err) {
      console.error(err);
      setScanErrorMsg("Error processing image. Please type manually.");
      setShowScanHelp(true);
      trackEvent('scan_error');
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
      trackEvent('scan_confirm', { vin: cleaned });
  };

  const updateCoverage = (val: string) => {
      setZipCode(val);
      
      // Defaults
      let name = 'Mobile CARB Check';
      let phone = '617-359-6953';
      let msg = 'Statewide Dispatch';
      let region = 'California Statewide';
      let price = 'Enter Zip for Estimate';
      let review = '“Saved us from a DMV registration block last minute.”';

      if (val.length >= 3) {
          const prefix = parseInt(val.substring(0, 3));
          
          // --- REGION 1: SOCAL (900-931, 934-935) ---
          if ((prefix >= 900 && prefix <= 931) || prefix === 934 || prefix === 935) {
              name = "SoCal CARB Mobile";
              phone = "617-359-6953"; // Central Dispatch
              price = "OBD $125 • Smoke $250 • RV $300";
              
              if (prefix >= 900 && prefix <= 908) { region = "Los Angeles County"; msg = "✅ Local LA Dispatch"; }
              else if (prefix >= 919 && prefix <= 921) { region = "San Diego County"; msg = "✅ Local SD Dispatch"; }
              else if (prefix >= 922 && prefix <= 925) { region = "Inland Empire / Riverside"; msg = "✅ Local IE Dispatch"; }
              else if (prefix >= 926 && prefix <= 928) { region = "Orange County"; msg = "✅ Local OC Dispatch"; }
              else if (prefix === 934) { region = "Santa Barbara / SLO"; msg = "✅ Central Coast Dispatch"; }
              else { region = "Southern California"; msg = "✅ SoCal Regional Dispatch"; }
          }
          
          // --- REGION 2: VALLEY (932-933, 936-938, 952-953) ---
          // Bakersfield (932, 933) to Turlock (953)
          else if ((prefix >= 932 && prefix <= 933) || (prefix >= 936 && prefix <= 938) || (prefix >= 952 && prefix <= 953)) {
              name = "Valley Clean Truck Check Mobile";
              phone = "209-818-1371"; // Valley Direct Line
              price = "OBD $99 • Smoke $199 • RV $250";
              
              if (prefix === 932 || prefix === 933) { region = "Kern County (Bakersfield)"; msg = "✅ Local Kern Dispatch"; }
              else if (prefix >= 936 && prefix <= 938) { region = "Fresno / Madera / Tulare"; msg = "✅ Local Central Valley Dispatch"; }
              else if (prefix >= 952 && prefix <= 953) { region = "Stanislaus / Merced (Turlock)"; msg = "✅ Local Modesto/Turlock Dispatch"; }
              else { region = "Central Valley"; }
          }
          
          // --- REGION 3: NORCAL (939, 940-951, 954-961) ---
          // North of Turlock to Oregon
          else if (prefix === 939 || (prefix >= 940 && prefix <= 951) || (prefix >= 954 && prefix <= 961)) {
              name = "NorCal CARB Mobile";
              phone = "916-890-4427"; // Sac/North Line
              price = "OBD $150 • Smoke $250 • RV $300";
              
              if (prefix >= 956 && prefix <= 958) { region = "Sacramento County"; msg = "✅ Local Sac Dispatch"; }
              else if (prefix === 960) { region = "Shasta / Redding (North)"; msg = "✅ Local Redding Dispatch"; }
              else if (prefix >= 940 && prefix <= 951) { region = "Bay Area / Silicon Valley"; msg = "✅ Bay Area Dispatch (Tolls Apply)"; phone = "415-900-8563"; }
              else if (prefix >= 954 && prefix <= 955) { region = "North Coast (Sonoma/Mendo)"; msg = "✅ North Coast Dispatch"; }
              else { region = "Northern California"; msg = "✅ NorCal Regional Dispatch"; }
          }
      }

      setTesterName(name);
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
      trackEvent('locate_tester_gps');
      const timeoutId = setTimeout(() => {
          setLocating(false);
      }, 5000);

      navigator.geolocation.getCurrentPosition((pos) => {
          clearTimeout(timeoutId);
          // Simple rough conversion of Latitude to Zip Prefix for Demo
          const lat = pos.coords.latitude;
          let detectedZip = '90012'; 
          
          if (lat > 39.0) detectedZip = '96001'; // Redding
          else if (lat > 38.5) detectedZip = '95814'; // Sac
          else if (lat > 37.8) detectedZip = '95380'; // Turlock
          else if (lat > 36.5) detectedZip = '93721'; // Fresno
          else if (lat > 35.3) detectedZip = '93301'; // Bakersfield
          else if (lat < 34.5) detectedZip = '90012'; // LA

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
    
    const isEntityFormat = /^E\d+$/i.test(val) || /^\d+$/.test(val); 

    if (!isEntityFormat && searchMode === 'VIN') {
        if (/[IOQ]/.test(val)) {
            alert("⚠️ INVALID VIN CHARACTER\n\nLetters 'I', 'O', and 'Q' are ILLEGAL in VINs.");
            return;
        }
        if (val.length !== 17) {
            alert(`⚠️ INVALID LENGTH\n\nA standard VIN must be exactly 17 characters.`);
            return;
        }
    }

    const isVin = /^[A-HJ-NPR-Z0-9]{17}$/.test(val);
    const finalType = isVin ? 'VIN' : (isEntityFormat ? 'ENTITY' : 'VIN');
    
    saveToAdminDb('VIN_CHECK', `Check: ${val}`, { value: val, type: finalType, nhtsa: vehicleDetails });
    onAddToHistory(val, finalType === 'VIN' ? 'VIN' : 'ENTITY');
    trackEvent('check_compliance', { value: val, type: finalType });

    if (finalType === 'ENTITY') {
        window.open(`https://cleantruckcheck.arb.ca.gov/Entity/EntityManagement/EntityComplianceStatusLookup`, '_blank');
    } else {
        window.open(`https://cleantruckcheck.arb.ca.gov/Fleet/Vehicle/VehicleComplianceStatusLookup?vin=${val}`, '_blank');
    }
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
                                  {/* DYNAMIC TESTER NAME */}
                                  <h3 className="text-2xl font-black text-[#003366] dark:text-white leading-tight">{testerName}</h3>
                                  <p className="text-sm font-bold text-gray-700 dark:text-gray-400 mt-1">{regionLabel}</p>
                                  <div className="flex items-center gap-1 mt-2">
                                      <span className="text-yellow-400 text-lg">★★★★★</span>
                                      <span className="text-xs text-blue-600 font-bold underline cursor-pointer">4.9 (Google Reviews)</span>
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
                              <a href={`tel:${dispatchPhone.replace(/-/g, '')}`} className="w-full py-4 bg-[#003366] text-white font-black rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-[#002244] transition-colors" onClick={() => trackEvent('call_dispatch', { phone: dispatchPhone })}>
                                  <span>📞 CALL DISPATCH</span>
                              </a>
                              <div className="flex gap-3">
                                  <a href={`sms:${dispatchPhone.replace(/-/g, '')}?body=${encodeURIComponent(smsBody)}`} className="flex-1 py-3 bg-white border-2 border-[#003366] text-[#003366] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50" onClick={() => trackEvent('text_dispatch', { phone: dispatchPhone })}>
                                      <span>💬 TEXT</span>
                                  </a>
                                  <a href={`mailto:bryan@norcalcarbmobile.com?subject=Smoke Test Request&body=${encodeURIComponent(smsBody)}`} className="flex-1 py-3 bg-white border-2 border-[#003366] text-[#003366] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50" onClick={() => trackEvent('email_dispatch')}>
                                      <span>✉️ EMAIL</span>
                                  </a>
                              </div>
                              <a href={websiteUrl} target="_blank" className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-[#003366] dark:text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors mt-1" onClick={() => trackEvent('visit_website')}>
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
                <div className="flex flex-col items-center justify-center gap-1">
                    <span className="text-2xl">📸</span> 
                    <span className="font-black text-lg tracking-wide">{loading ? statusMessage : 'SCAN VIN TAG / BARCODE'}</span>
                </div>
            </button>
            <input 
                type="file" 
                ref={cameraInputRef} 
                onChange={(e) => handleScan(e, false)} 
                accept="image/*" 
                capture="environment"
                className="hidden" 
            />

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
                onChange={(e) => handleScan(e, true)} 
                accept="image/*" 
                className="hidden" 
            />

            <div className="space-y-4">
                <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-xl">
                    <button onClick={() => setSearchMode('VIN')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${searchMode === 'VIN' ? 'bg-white shadow text-[#003366]' : 'text-gray-400'}`}>VEHICLE (VIN)</button>
                    <button onClick={() => setSearchMode('OWNER')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${searchMode === 'OWNER' ? 'bg-white shadow text-[#003366]' : 'text-gray-400'}`}>FLEET OWNER</button>
                </div>

                <input
                    type="text"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value.toUpperCase())}
                    placeholder={searchMode === 'VIN' ? "VIN or Entity ID (E123...)" : "Fleet ID / TRUCRS ID"}
                    className="w-full p-4 bg-gray-50 dark:bg-gray-700 dark:text-white border-2 border-gray-200 dark:border-gray-600 rounded-xl text-center font-mono text-lg font-bold placeholder:font-sans placeholder:text-sm focus:border-[#003366] outline-none"
                    maxLength={searchMode === 'VIN' ? 17 : 20}
                />
                
                {/* NHTSA VEHICLE PREVIEW (New Feature) */}
                {vehicleDetails && (
                    <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-3 animate-in fade-in">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-green-600 dark:text-green-400 text-xs font-bold">✓ FEDERAL VIN VERIFIED</span>
                        </div>
                        <p className="font-black text-[#003366] dark:text-white text-lg leading-none">
                            {vehicleDetails.ModelYear} {vehicleDetails.Make}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{vehicleDetails.Model} • {vehicleDetails.BodyClass}</p>
                    </div>
                )}

                <button 
                    onClick={checkCompliance}
                    className="w-full bg-[#15803d] text-white py-4 rounded-xl font-bold shadow-md hover:bg-[#166534] active:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                    CHECK STATUS <span className="text-xl">›</span>
                </button>
                
                <button 
                    onClick={() => { setShowTesterSearch(true); trackEvent('open_tester_search'); }}
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
          {/* ... Keep existing questions ... */}
      </div>

      {/* Share & Support Section (Updated Style) */}
      <div className="px-2 pb-8">
        {/* ... Keep existing support section ... */}
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
                      <button onClick={() => { setScanResult(null); trackEvent('scan_rescan'); }} className="py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200">
                          Rescan
                      </button>
                      <button onClick={confirmVin} className="py-3 bg-[#15803d] text-white font-bold rounded-xl shadow-lg hover:bg-[#166534]">
                          Confirm & Check
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* EDUCATION MODAL: SCAN FAILED */}
      {showScanHelp && (
          <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowScanHelp(false)}>
             {/* ... Keep existing scan help ... */}
          </div>
      )}

    </div>
  );
};

export default VinChecker;