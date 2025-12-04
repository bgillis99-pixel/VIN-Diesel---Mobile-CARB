import React, { useState, useRef } from 'react';
import { extractVinFromImage } from '../services/geminiService';

interface Props {
  onAddToHistory: (value: string, type: 'VIN' | 'ENTITY' | 'TRUCRS') => void;
  onNavigateChat: () => void;
  onInstallApp: () => void;
}

const VinChecker: React.FC<Props> = ({ onAddToHistory, onNavigateChat, onInstallApp }) => {
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTesterSearch, setShowTesterSearch] = useState(false);
  const [zipCode, setZipCode] = useState('');
  const [coverageMessage, setCoverageMessage] = useState('Enter Zip for Local Dispatch');
  const [dispatchPhone, setDispatchPhone] = useState('617-359-6953');
  const [regionLabel, setRegionLabel] = useState('Statewide Network');
  const [locating, setLocating] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const vin = await extractVinFromImage(file);
      
      const cleaned = vin.replace(/[^A-Z0-9]/gi, '');
      setInputVal(cleaned);
      
      if (cleaned.includes('I') || cleaned.includes('O') || cleaned.includes('Q')) {
           if (navigator.vibrate) navigator.vibrate(200);
           alert("SCANNER WARNING: Illegal characters (I, O, Q) detected. Please verify VIN manually.");
      }

    } catch (err) {
      alert('Failed to scan. Please type manually.');
    } finally {
      setLoading(false);
    }
  };

  const updateCoverage = (val: string) => {
      setZipCode(val);
      if (val.length >= 3) {
          const prefix = parseInt(val.substring(0, 3));
          
          // LOGIC:
          // 1. Coastal / Bay Area -> 415-900-8563
          //    - 939 (Monterey)
          //    - 940-944 (Peninsula/SF)
          //    - 945-948 (East Bay/Richmond) -> "Inland to Richmond"
          //    - 949 (Marin)
          //    - 950-951 (South Bay/Santa Cruz)
          //    - 954 (Sonoma/Mendo)
          //    - 955 (Humboldt/North Coast)
          const isCoastal = prefix === 939 || (prefix >= 940 && prefix <= 951) || prefix === 954 || prefix === 955;

          // 2. Northern Inland / Fresno & North -> 916-890-4427
          //    - 936-938 (Fresno/Madera)
          //    - 952-953 (Stockton/Modesto) -> "East of Richmond"
          //    - 956-958 (Sacramento)
          //    - 959 (Butte/Yuba)
          //    - 960 (Redding/Shasta)
          //    - 961 (Tahoe/Plumas/Sierra)
          const isInland = (prefix >= 936 && prefix <= 938) || (prefix >= 952 && prefix <= 953) || (prefix >= 956 && prefix <= 961);

          if (isCoastal) {
              setDispatchPhone('415-900-8563');
              setCoverageMessage("✅ Local Coastal/Bay Area Dispatch");
              setRegionLabel("Monterey • Bay Area • North Coast");
          } else if (isInland) {
              setDispatchPhone('916-890-4427');
              setCoverageMessage("✅ Local Northern Inland Dispatch");
              setRegionLabel("Fresno • Sacramento • Redding");
          } else {
              // Default / SoCal / Catch-all -> 617-359-6953
              setDispatchPhone('617-359-6953');
              setCoverageMessage("✅ Dispatch Available (Statewide)");
              setRegionLabel("Southern California / Statewide");
          }
      } else {
          setDispatchPhone('617-359-6953');
          setCoverageMessage("Enter Zip for Local Dispatch");
          setRegionLabel("Statewide Network");
      }
  };

  const handleZipSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
      updateCoverage(e.target.value);
  };

  const handleUseLocation = () => {
      setLocating(true);
      
      const timeoutId = setTimeout(() => {
          setLocating(false);
          alert("Location request timed out. Please enter Zip Code manually.");
      }, 5000);

      navigator.geolocation.getCurrentPosition((pos) => {
          clearTimeout(timeoutId);
          const lat = pos.coords.latitude;
          let detectedZip = '';
          // Rough approximation for demo purposes to trigger regions
          if (lat > 39.0) detectedZip = '96001'; // Redding (Inland)
          else if (lat > 38.0) detectedZip = '95814'; // Sacramento (Inland)
          else if (lat > 37.5) detectedZip = '94103'; // SF (Coastal)
          else if (lat > 36.5) detectedZip = '93901'; // Monterey (Coastal)
          else if (lat > 36.0) detectedZip = '93721'; // Fresno (Inland)
          else detectedZip = '90012'; // LA (Default)

          updateCoverage(detectedZip);
          setLocating(false);
      }, (err) => {
          clearTimeout(timeoutId);
          setLocating(false);
      });
  };

  const checkCompliance = () => {
    const val = inputVal.trim().toUpperCase();
    
    if (!val) {
      alert('Enter or scan VIN/Entity/TRUCRS');
      return;
    }

    // 1. Check for illegal characters I, O, Q
    if (val.includes('O')) return alert("⚠️ Invalid character: Letter 'O' (Oh) is not allowed. Use Number '0' (Zero).");
    if (val.includes('I')) return alert("⚠️ Invalid character: Letter 'I' (Eye) is not allowed. Use Number '1' (One).");
    if (val.includes('Q')) return alert("⚠️ Invalid character: Letter 'Q' is not allowed in VINs.");

    // 2. VIN Length and Specific Rules
    if (val.length === 17) {
        // Enforce 8th character is numeric (CARB/Diesel specific check)
        const eighthChar = val.charAt(7);
        if (!/^\d$/.test(eighthChar)) {
             alert(`⚠️ CARB Validation Error:\nThe 8th character ('${eighthChar}') must be a number.\n\nThis is often the Engine Code for diesel compliance. Please verify your VIN.`);
             return;
        }
    } else if (val.length > 10 && val.length !== 17) {
         // If it's not a TRUCRS ID (usually 9 digits) and not 17 chars, warn user.
         alert(`⚠️ VIN Length Alert: Detected ${val.length} characters.\n\nA valid VIN must be exactly 17 characters.`);
         return;
    }

    const isVin = /^[A-HJ-NPR-Z0-9]{17}$/.test(val);
    const isEntity = /^\d+$/.test(val);
    
    if (!isVin && !isEntity) {
        alert("⚠️ Invalid Format.\n\n• VIN must be 17 characters (No I, O, Q).\n• Entity/TRUCRS ID must be numbers.");
        return;
    }
    
    onAddToHistory(val, isVin ? 'VIN' : isEntity ? 'ENTITY' : 'TRUCRS');
    
    const param = isVin ? 'vin' : isEntity ? 'entity' : 'trucrs';
    window.open(`https://cleantruckcheck.arb.ca.gov/Fleet/Vehicle/VehicleComplianceStatusLookup?${param}=${val}`, '_blank');
  };

  return (
    <div className="flex flex-col items-center w-full pb-10">
      
      <div className="w-full bg-gradient-to-b from-[#003366] to-[#f8f9fa] pb-12 pt-6 px-4 rounded-b-[3rem] shadow-sm mb-[-40px]">
        <div className="max-w-md mx-auto text-center text-white">
            <h2 className="text-xl font-light opacity-90 tracking-wide mb-1">CALIFORNIA STATEWIDE</h2>
            <p className="text-3xl font-black tracking-tight mb-6">Compliance Status & Mobile Testing</p>
            
            <button onClick={onInstallApp} className="bg-[#15803d] text-white px-6 py-2 rounded-full font-bold text-sm shadow-lg hover:bg-[#166534] active:scale-95 transition-all inline-flex items-center gap-2 mb-4">
                <span>⬇️ INSTALL APP</span>
            </button>
        </div>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-[0_20px_40px_rgba(0,51,102,0.15)] border border-gray-100 w-full max-w-md text-center relative overflow-hidden z-10">
        
        {loading && (
          <div className="absolute inset-0 bg-white/95 flex items-center justify-center z-20 backdrop-blur-sm">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-[#15803d] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <div className="text-[#003366] font-bold animate-pulse">Analyzing VIN...</div>
            </div>
          </div>
        )}

        <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full mb-6 py-5 bg-gradient-to-r from-[#003366] to-[#002244] text-white rounded-2xl font-bold text-xl shadow-lg shadow-blue-900/20 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all group"
        >
            <div className="bg-white/10 p-2 rounded-full group-hover:bg-white/20 transition-colors">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            SCAN VIN TAG
        </button>

        <div className="relative mb-2 group">
            <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value.toUpperCase())}
            placeholder="VIN • Entity • TRUCRS"
            maxLength={17}
            className="w-full p-4 text-2xl font-black text-center border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#15803d] focus:ring-4 focus:ring-green-50 transition-all font-mono uppercase tracking-widest text-[#003366] placeholder:text-gray-300 placeholder:text-lg placeholder:font-sans placeholder:font-normal"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
                ✎
            </div>
        </div>
        
        <p className="text-[10px] text-gray-400 mb-6 px-2 text-center leading-tight">
            <span className="font-bold">⚠️ Tip:</span> Wipe dirt off engine tag before scanning.
        </p>

        <div className="space-y-3">
          <button
            onClick={checkCompliance}
            className="w-full p-4 text-lg font-bold text-white bg-[#15803d] rounded-xl hover:bg-[#166534] transition-all shadow-md active:scale-[0.98] flex justify-center items-center gap-2"
          >
            CHECK STATUS
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
          </button>

          <button
            onClick={onNavigateChat}
            className="w-full p-4 text-lg font-bold text-[#003366] bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span>GET COMPLIANT</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </button>

          <div className="py-2">
             <p className="text-xs text-gray-400">
                Need help? <span className="font-bold text-[#15803d] cursor-pointer hover:underline" onClick={onNavigateChat}>Ask AI Assistant &rarr;</span>
             </p>
          </div>

          <div className="border-t border-gray-100 my-4"></div>

          {!showTesterSearch ? (
            <button
                onClick={() => { setShowTesterSearch(true); handleUseLocation(); }}
                className="w-full p-4 text-lg font-bold text-gray-600 bg-white border-2 border-dashed border-gray-300 rounded-xl hover:border-[#003366] hover:text-[#003366] transition-all active:scale-[0.98]"
            >
                📍 FIND A TESTER
            </button>
          ) : (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 animate-in fade-in slide-in-from-top-2 shadow-inner text-left">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-black text-lg text-[#003366] uppercase tracking-wide">Find Tester</h3>
                    <button onClick={() => setShowTesterSearch(false)} className="text-gray-400 hover:text-red-500 font-bold px-2 active:scale-90 transition-transform">✕</button>
                </div>
                
                <div className="relative mb-4">
                    <div className="flex shadow-sm rounded-xl overflow-hidden border border-gray-300 bg-white">
                        <input 
                            type="tel" 
                            placeholder="Zip Code"
                            value={zipCode}
                            onChange={handleZipSearch}
                            maxLength={5}
                            className="flex-1 p-4 text-center font-black text-2xl text-[#003366] placeholder:text-gray-300 focus:outline-none"
                        />
                        <button 
                            onClick={handleUseLocation}
                            disabled={locating}
                            className="px-6 bg-[#15803d] text-white font-bold flex items-center justify-center hover:bg-[#166534] transition-colors active:bg-[#14532d]"
                            title="Use My Location"
                        >
                            {locating ? (
                                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            )}
                        </button>
                    </div>
                </div>

                <div className="bg-white border-l-4 border-[#15803d] rounded-r-xl p-4 mb-3 shadow-sm text-left">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                             <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Recommended Partner</p>
                             <h4 className="font-black text-lg text-[#003366] leading-tight mb-1">NORCAL CARB MOBILE</h4>
                             <p className="text-xs font-bold text-[#15803d] mb-1 uppercase flex items-center gap-1">
                                {coverageMessage}
                             </p>
                        </div>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600 mb-4 bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <div className="flex items-start gap-2">
                            <span className="text-lg">📍</span>
                            <span><span className="font-bold text-[#003366]">Region:</span> {regionLabel}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-lg">📞</span>
                             <a href={`tel:${dispatchPhone.replace(/-/g, '')}`} className="hover:text-[#15803d] hover:underline"><span className="font-bold text-[#003366]">Phone:</span> {dispatchPhone}</a>
                        </div>
                         <div className="flex items-center gap-2">
                            <span className="text-lg">📧</span>
                             <a href="mailto:sales@norcalcarbmobile.com" className="hover:text-[#15803d] hover:underline"><span className="font-bold text-[#003366]">Email:</span> sales@norcalcarbmobile.com</a>
                        </div>
                    </div>

                    <a href={`tel:${dispatchPhone.replace(/-/g, '')}`} className="block w-full text-center bg-[#003366] text-white font-bold py-3 rounded-lg hover:bg-[#002244] mb-2 text-lg active:scale-[0.98] transition-transform shadow-md">
                        CALL NOW
                    </a>
                </div>
            </div>
          )}

        </div>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleScan}
        />
      </div>
      
      <div className="flex justify-center gap-6 mt-8 grayscale opacity-50">
           <div className="text-center">
                <div className="text-2xl">🛡️</div>
                <div className="text-[10px] font-bold mt-1">Secure</div>
           </div>
           <div className="text-center">
                <div className="text-2xl">⚡</div>
                <div className="text-[10px] font-bold mt-1">Instant</div>
           </div>
           <div className="text-center">
                <div className="text-2xl">🤝</div>
                <div className="text-[10px] font-bold mt-1">Trusted</div>
           </div>
      </div>

      <div className="mt-8 w-full max-w-md bg-white/50 border border-white p-6 rounded-xl mb-6 backdrop-blur-sm">
        <h3 className="font-bold text-[#003366] text-lg mb-4">Common Questions</h3>
        <div className="space-y-3 divide-y divide-gray-200/50">
             <details className="group pt-2">
                <summary className="cursor-pointer font-semibold text-[#003366] text-sm flex justify-between items-center">
                    Passed but Non-Compliant?
                    <span className="text-[#15803d] group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="mt-2 text-xs text-gray-600">
                    <p className="mb-1">Common causes: Entity setup, unpaid fees, missing vehicle upload, or OVI data entry errors (bad digit).</p>
                    <p className="font-bold text-[#003366] mt-2">Ask an Expert:</p>
                    <div className="flex flex-col gap-1 mt-1">
                        <a href="tel:6173596953" className="text-[#15803d] hover:underline font-bold">617-359-6953</a>
                        <a href="mailto:sales@norcalcarbmobile.com" className="text-[#15803d] hover:underline">sales@norcalcarbmobile.com</a>
                    </div>
                </div>
            </details>
            <details className="group pt-2">
                <summary className="cursor-pointer font-semibold text-[#003366] text-sm flex justify-between items-center">
                    Results Missing?
                    <span className="text-[#15803d] group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-2 text-xs text-gray-600">Takes 48 hours. If longer, call 617-359-6953.</p>
            </details>
             <details className="group pt-2">
                <summary className="cursor-pointer font-semibold text-[#003366] text-sm flex justify-between items-center">
                    Next Test Due?
                    <span className="text-[#15803d] group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-2 text-xs text-gray-600">Linked to DMV registration. 2025 is 2x/year. 2027 is 4x/year.</p>
            </details>
             <details className="group pt-2">
                <summary className="cursor-pointer font-semibold text-[#003366] text-sm flex justify-between items-center">
                    Lost Password?
                    <span className="text-[#15803d] group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-2 text-xs text-gray-600">Reset at <a href="https://cleantruckcheck.arb.ca.gov" target="_blank" className="underline text-[#003366]">cleantruckcheck.arb.ca.gov</a>.</p>
            </details>
            <details className="group pt-2">
                <summary className="cursor-pointer font-semibold text-[#003366] text-sm flex justify-between items-center">
                    Scan didn't work?
                    <span className="text-[#15803d] group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-2 text-xs text-gray-600">Try wiping the engine tag clean. If still failing, type the 17 characters manually.</p>
            </details>
             <details className="group pt-2">
                <summary className="cursor-pointer font-semibold text-[#003366] text-sm flex justify-between items-center">
                    What vehicles?
                    <span className="text-[#15803d] group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-2 text-xs text-gray-600">Heavy Duty Diesel (&gt;14,000 lbs), Motorhomes, and Ag Equipment. NO GASOLINE CARS.</p>
            </details>
        </div>
      </div>
    </div>
  );
};

export default VinChecker;