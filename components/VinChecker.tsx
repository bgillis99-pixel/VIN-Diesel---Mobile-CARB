import React, { useState, useRef, useEffect } from 'react';
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
  
  const [recentQuestions, setRecentQuestions] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      try {
          const stored = localStorage.getItem('vin_diesel_recent_questions');
          if (stored) {
              setRecentQuestions(JSON.parse(stored));
          }
      } catch (e) {
          console.warn("Could not load recent questions");
      }
  }, []);

  const handleAskQuestion = (question: string) => {
      sessionStorage.setItem('pending_chat_query', question);
      onNavigateChat();
  };

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
          // Simplified logic for demo
          const isCentralValley = (prefix >= 936 && prefix <= 938) || (prefix >= 952 && prefix <= 953);
          const isSacramentoNorth = (prefix >= 956 && prefix <= 961);
          const isCoastal = prefix === 939 || (prefix >= 940 && prefix <= 951) || prefix === 954 || prefix === 955;

          if (isCentralValley) {
              setDispatchPhone('209-818-1371');
              setCoverageMessage("✅ Local Central Valley Dispatch");
              setRegionLabel("Stockton • Fresno • Modesto");
          } else if (isSacramentoNorth) {
              setDispatchPhone('916-890-4427');
              setCoverageMessage("✅ Local Northern Inland Dispatch");
              setRegionLabel("Sacramento • Redding • Tahoe");
          } else if (isCoastal) {
              setDispatchPhone('415-900-8563');
              setCoverageMessage("✅ Local Coastal/Bay Area Dispatch");
              setRegionLabel("Monterey • Bay Area • North Coast");
          } else {
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
          let detectedZip = '90012'; // Default
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
      });
  };

  const checkCompliance = () => {
    const val = inputVal.trim().toUpperCase();
    if (!val) {
      alert('Enter or scan VIN/Entity/TRUCRS');
      return;
    }
    if (val.includes('O')) return alert("⚠️ Invalid character: Letter 'O' is not allowed. Use Number '0'.");
    if (val.includes('I')) return alert("⚠️ Invalid character: Letter 'I' is not allowed. Use Number '1'.");
    if (val.includes('Q')) return alert("⚠️ Invalid character: Letter 'Q' is not allowed.");

    if (val.length === 17) {
        const eighthChar = val.charAt(7);
        if (!/^\d$/.test(eighthChar)) {
             alert(`⚠️ CARB Validation Error:\nThe 8th character ('${eighthChar}') must be a number.`);
             return;
        }
    } else if (val.length > 10 && val.length !== 17) {
         alert(`⚠️ VIN Length Alert: Detected ${val.length} characters.\nA valid VIN must be 17 characters.`);
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
    <div className="flex flex-col items-center w-full">
      
      {/* Compact Header for minimal dead space */}
      <div className="w-full bg-[#003366] dark:bg-gray-900 pb-8 pt-4 px-4 rounded-b-3xl shadow-md mb-[-25px] transition-colors">
        <div className="max-w-md mx-auto flex justify-between items-center text-white">
            <div>
                <h2 className="text-xl font-black tracking-tight leading-none">Compliance Status</h2>
                <p className="text-xs opacity-80 mt-1">Scan VIN or Enter ID</p>
            </div>
            <button onClick={onInstallApp} className="bg-[#15803d] text-white px-3 py-1.5 rounded-full font-bold text-xs shadow-lg hover:bg-[#166534] active:scale-95 transition-all flex items-center gap-1">
                <span>⬇️ APP</span>
            </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 w-full max-w-md text-center relative overflow-hidden z-10">
        
        {loading && (
          <div className="absolute inset-0 bg-white/95 dark:bg-gray-800/95 flex items-center justify-center z-20 backdrop-blur-sm">
            <div className="text-center">
                <div className="w-10 h-10 border-4 border-[#15803d] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <div className="text-[#003366] dark:text-white font-bold animate-pulse text-sm">Analyzing...</div>
            </div>
          </div>
        )}

        <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full mb-4 py-4 bg-gradient-to-r from-[#003366] to-[#002244] text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-[0.98] transition-all group"
        >
            <div className="bg-white/10 p-1.5 rounded-full group-hover:bg-white/20 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
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
            className="w-full p-3 text-xl font-black text-center border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:border-[#15803d] focus:ring-2 focus:ring-green-100 transition-all font-mono uppercase tracking-widest text-[#003366] placeholder:text-gray-300 placeholder:font-sans placeholder:font-normal"
            />
        </div>
        
        <p className="text-[10px] text-gray-400 mb-4 text-center">
            <span className="font-bold">Tip:</span> Wipe engine tag clean before scanning.
        </p>

        <div className="space-y-2">
          <button
            onClick={checkCompliance}
            className="w-full p-3 text-base font-bold text-white bg-[#15803d] rounded-xl hover:bg-[#166534] transition-all shadow-md active:scale-[0.98] flex justify-center items-center gap-2"
          >
            CHECK STATUS
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
          </button>

          {!showTesterSearch ? (
            <button
                onClick={() => { setShowTesterSearch(true); handleUseLocation(); }}
                className="w-full p-3 text-base font-bold text-[#003366] dark:text-white bg-blue-50 dark:bg-gray-700 border border-blue-100 dark:border-gray-600 rounded-xl hover:bg-blue-100 dark:hover:bg-gray-600 transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2"
            >
                <span>📍 FIND TESTER</span>
            </button>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-xl border border-gray-200 dark:border-gray-600 animate-in fade-in slide-in-from-top-2 shadow-inner text-left">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-black text-sm text-[#003366] dark:text-white uppercase">Find Mobile Tester</h3>
                    <button onClick={() => setShowTesterSearch(false)} className="text-gray-400 hover:text-red-500 font-bold px-2">✕</button>
                </div>
                
                <div className="flex shadow-sm rounded-lg overflow-hidden border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-800 mb-3">
                    <input 
                        type="tel" 
                        placeholder="Zip"
                        value={zipCode}
                        onChange={handleZipSearch}
                        maxLength={5}
                        className="flex-1 p-2 text-center font-bold text-lg text-[#003366] dark:text-white bg-transparent outline-none w-16"
                    />
                    <button 
                        onClick={handleUseLocation}
                        disabled={locating}
                        className="px-4 bg-[#15803d] text-white flex items-center justify-center"
                    >
                        {locating ? <span className="animate-spin">⌛</span> : <span>📍</span>}
                    </button>
                </div>

                <div className="bg-white dark:bg-gray-800 border-l-4 border-[#15803d] rounded-r-lg p-3 shadow-sm">
                    <h4 className="font-black text-sm text-[#003366] dark:text-white mb-1">NORCAL CARB MOBILE</h4>
                    <p className="text-[10px] font-bold text-[#15803d] uppercase mb-2">{coverageMessage}</p>
                    <a href={`tel:${dispatchPhone.replace(/-/g, '')}`} className="block w-full text-center bg-[#003366] text-white font-bold py-2 rounded-lg text-sm shadow-md">
                        CALL {dispatchPhone}
                    </a>
                </div>
            </div>
          )}

          <div className="py-1 text-center">
             <p className="text-[10px] text-gray-400">
                Questions? <span className="font-bold text-[#15803d] cursor-pointer hover:underline" onClick={onNavigateChat}>Ask AI &rarr;</span>
             </p>
          </div>
        </div>

        <input type="file" ref={fileInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleScan} />
      </div>
      
      <div className="mt-6 w-full max-w-md">
        <h3 className="font-bold text-[#003366] dark:text-white text-sm mb-2 ml-1">Common Questions</h3>
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl border border-white dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
             {recentQuestions.map((q, idx) => (
                 <button key={idx} onClick={() => handleAskQuestion(q)} className="w-full text-left p-3 text-xs font-semibold text-[#15803d] flex justify-between items-center hover:bg-white dark:hover:bg-gray-700 first:rounded-t-xl last:rounded-b-xl">
                    <span>💬 {q}</span>
                    <span className="opacity-50">→</span>
                 </button>
             ))}
             <button onClick={() => handleAskQuestion('Why is my registration blocked?')} className="w-full text-left p-3 text-xs font-semibold text-[#003366] dark:text-white flex justify-between items-center hover:bg-white dark:hover:bg-gray-700 rounded-t-xl">
                <span>🚫 Registration Blocked?</span>
                <span className="text-gray-400">+</span>
             </button>
             <button onClick={() => handleAskQuestion('When is my next test due?')} className="w-full text-left p-3 text-xs font-semibold text-[#003366] dark:text-white flex justify-between items-center hover:bg-white dark:hover:bg-gray-700">
                <span>📅 Next Test Deadline?</span>
                <span className="text-gray-400">+</span>
             </button>
             <button onClick={() => handleAskQuestion('I lost my password')} className="w-full text-left p-3 text-xs font-semibold text-[#003366] dark:text-white flex justify-between items-center hover:bg-white dark:hover:bg-gray-700 rounded-b-xl">
                <span>🔑 Lost Password?</span>
                <span className="text-gray-400">+</span>
             </button>
        </div>
      </div>
    </div>
  );
};

export default VinChecker;