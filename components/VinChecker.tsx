
import React, { useState, useRef, useEffect } from 'react';
import { extractVinFromImage, findTestersNearby } from '../services/geminiService';
import { decodeVinNHTSA } from '../services/nhtsa';
import { Submission } from '../types';
import { trackEvent } from '../services/analytics';

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
          alert("Optical sensor couldn't identify a valid VIN.\n\nTips for a better scan:\n• Ensure the label is clean and dry\n• Avoid direct glare or shadows\n• Hold the camera steady and close\n\nAlternatively, please use the Manual Entry field below.");
      }
    } catch (err) {
      console.error("Diagnostic error during scan:", err);
      alert("Intelligence Link Interrupted: Image analysis failed. This can happen due to extremely low lighting, motion blur, or temporary connectivity issues. Please try again with a clearer photo or use Manual Entry.");
    } finally {
      setLoading(false);
      if(cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleTesterSearch = async () => {
    if (zipCode.length < 5) {
      alert("Please enter a valid 5-digit Zip Code.");
      return;
    }
    
    setSearchingTesters(true);
    const county = getCountyFromZip(zipCode);
    
    try {
      let userLocation;
      if (navigator.geolocation) {
        userLocation = await new Promise<{lat: number, lng: number} | undefined>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve(undefined),
            { timeout: 5000 }
          );
        });
      }

      const mapResult = await findTestersNearby(zipCode, userLocation);
      setTesterResult({ 
        county, 
        text: mapResult.text, 
        locations: mapResult.locations 
      });
      trackEvent('tester_search', { zip: zipCode, county });
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
    if (searchMode === 'OWNER') {
        window.open(`https://cleantruckcheck.arb.ca.gov/Entity/EntityManagement/EntityComplianceStatusLookup`, '_blank');
    } else {
        window.open(`https://cleantruckcheck.arb.ca.gov/Fleet/Vehicle/VehicleComplianceStatusLookup?vin=${val}`, '_blank');
    }
  };

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
                          onChange={(e) => {
                            setZipCode(e.target.value.replace(/\D/g, ''));
                            if (testerResult) setTesterResult(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleTesterSearch();
                          }}
                          className="w-full bg-transparent p-4 text-7xl font-light text-white outline-none text-center tracking-tighter"
                          maxLength={5}
                      />
                      <div className="w-24 h-1 bg-carb-accent mx-auto mt-4 rounded-full shadow-[0_0_10px_#3b82f6]"></div>
                      
                      {!testerResult && (
                        <button 
                          onClick={handleTesterSearch}
                          disabled={searchingTesters}
                          className="mt-8 text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 bg-blue-400/10 px-6 py-2 rounded-full border border-blue-400/20 active-haptic disabled:opacity-50"
                        >
                          {searchingTesters ? 'SCANNING SATELLITE...' : 'Verify Zone'}
                        </button>
                      )}
                  </div>
                  
                  {testerResult && (
                    <div className="space-y-6 animate-in zoom-in duration-300">
                      {/* County Info Card */}
                      <div className="bg-white text-carb-navy rounded-[3.5rem] p-10 text-center space-y-8 shadow-2xl">
                          <div className="space-y-1">
                              <p className="text-[10px] font-black text-carb-accent uppercase tracking-widest italic">Compliance Answer</p>
                              <h3 className="text-3xl font-black tracking-tighter uppercase italic">{testerResult.county} County</h3>
                              <div className="bg-green-500/10 text-green-700 px-4 py-1 inline-block rounded-full text-[10px] font-black uppercase tracking-widest mt-2 border border-green-500/20">
                                  Mobile Unit Active
                              </div>
                          </div>

                          <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 text-left space-y-3">
                              <p className="text-xs font-bold text-gray-800 uppercase tracking-tight">Deployment Details:</p>
                              <ul className="text-[11px] text-gray-500 font-medium space-y-2">
                                  <li>• Mobile Smoke Testing & OBD Downloads</li>
                                  <li>• Bi-Annual CTC-VIS Uploads</li>
                                  <li>• 5-Day Pass Verification</li>
                              </ul>
                          </div>

                          <div className="flex flex-col gap-3">
                            <a href="tel:6173596953" className="block w-full py-6 bg-carb-navy text-white font-black rounded-3xl text-sm tracking-widest uppercase active-haptic transition-all shadow-xl flex items-center justify-center gap-3">
                               <span>📞</span> TEXT/CALL TESTER
                            </a>
                            <a href="mailto:bgillis99@gmail.com" className="block w-full py-5 border-2 border-carb-navy text-carb-navy font-black rounded-3xl text-[10px] tracking-widest uppercase active-haptic transition-all flex items-center justify-center gap-2">
                               <span>✉️</span> EMAIL DISPATCH
                            </a>
                          </div>
                      </div>

                      {/* Map View / Grounding Results */}
                      {testerResult.locations && testerResult.locations.length > 0 && (
                        <div className="glass p-8 rounded-[3rem] space-y-6">
                          <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 italic">Nearby Facilities</h4>
                            <span className="text-[9px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">LIVE MAP DATA</span>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-3">
                            {testerResult.locations.map((loc, idx) => (
                              <a 
                                key={idx}
                                href={loc.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active-haptic group"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-xl grayscale group-hover:grayscale-0 transition-all">📍</div>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-black text-white uppercase tracking-tight truncate max-w-[150px]">{loc.title}</span>
                                    <span className="text-[9px] text-gray-500 font-bold uppercase">View on Map</span>
                                  </div>
                                </div>
                                <span className="text-blue-500 text-lg font-thin">›</span>
                              </a>
                            ))}
                          </div>
                          
                          {testerResult.text && (
                            <p className="text-[10px] text-gray-500 leading-relaxed font-medium italic opacity-60 px-2">
                              {testerResult.text}
                            </p>
                          )}
                        </div>
                      )}
                      
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest px-8 text-center">Dispatch available 24/7 for fleet scheduling in {testerResult.county} zone.</p>
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
          <h2 className="text-5xl font-light tracking-tighter text-white">Quick Check</h2>
          <p className="text-[10px] text-carb-accent font-black uppercase tracking-[0.4em] italic">Instant Regulation Lookup</p>
      </div>

      <div className="space-y-6">
            {/* OPTICAL SCANNER */}
            <button 
                onClick={() => cameraInputRef.current?.click()}
                disabled={loading}
                className="w-full group glass py-12 rounded-[3.5rem] flex flex-col items-center justify-center gap-4 active-haptic transition-all hover:bg-white/5 border border-white/5"
            >
                <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center text-5xl group-hover:bg-carb-accent/10 transition-all border border-transparent group-hover:border-carb-accent/20">
                    <span className="grayscale opacity-30 group-hover:grayscale-0 group-hover:opacity-100 transition-all">📸</span>
                </div>
                <span className="font-black text-[10px] tracking-[0.4em] uppercase text-gray-500 group-hover:text-carb-accent transition-colors italic">
                    {loading ? statusMessage : 'Optical Scanner'}
                </span>
            </button>
            <input type="file" ref={cameraInputRef} onChange={handleScan} accept="image/*" capture="environment" className="hidden" />

            {/* MANUAL ENTRY */}
            <div className="space-y-6">
                <div className="flex gap-10 justify-center">
                    <button onClick={() => setSearchMode('VIN')} className={`py-1 text-[10px] font-black tracking-[0.3em] transition-all border-b-2 uppercase italic ${searchMode === 'VIN' ? 'border-carb-accent text-white' : 'border-transparent text-gray-700'}`}>Vehicle</button>
                    <button onClick={() => setSearchMode('OWNER')} className={`py-1 text-[10px] font-black tracking-[0.3em] transition-all border-b-2 uppercase italic ${searchMode === 'OWNER' ? 'border-carb-accent text-white' : 'border-transparent text-gray-700'}`}>Fleet ID</button>
                </div>

                <div className="relative">
                    <input
                        type="text"
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value.toUpperCase())}
                        placeholder={searchMode === 'VIN' ? "ENTER VIN HERE" : "ENTITY ID"}
                        className="w-full bg-transparent text-white border-2 border-white/10 rounded-[2.5rem] py-10 px-8 text-center font-black text-3xl placeholder:font-black placeholder:text-white focus:border-carb-accent outline-none transition-all"
                        maxLength={searchMode === 'VIN' ? 17 : 20}
                    />
                </div>
                
                {vehicleDetails && (
                    <div className="glass rounded-[2.5rem] p-8 animate-in slide-in-from-bottom-4 border-carb-accent/20">
                        <p className="font-black text-white text-2xl uppercase tracking-tighter italic">
                            {vehicleDetails.ModelYear} {vehicleDetails.Make}
                        </p>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-2">{vehicleDetails.Model} • {vehicleDetails.BodyClass}</p>
                        <div className="mt-4 flex gap-2">
                            <span className="bg-carb-accent/10 text-carb-accent text-[9px] font-black px-3 py-1 rounded-full border border-carb-accent/20 uppercase italic">Signature Verified</span>
                        </div>
                    </div>
                )}

                <button 
                    onClick={checkCompliance}
                    className="w-full bg-white text-carb-navy py-8 rounded-[2.5rem] font-black tracking-[0.3em] text-[11px] uppercase shadow-2xl active-haptic hover:bg-gray-200 transition-all italic"
                >
                    Run Protocol
                </button>
            </div>
        </div>

      {scanResult && (
          <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-8 animate-in fade-in duration-300" onClick={() => setScanResult(null)}>
              <div className="glass-dark rounded-[3.5rem] p-12 w-full max-w-sm border border-white/10 shadow-2xl space-y-12" onClick={e => e.stopPropagation()}>
                  <div className="text-center">
                    <div className="w-20 h-20 bg-carb-accent/20 rounded-full mx-auto flex items-center justify-center text-4xl text-carb-accent mb-8 shadow-inner border border-carb-accent/30">✓</div>
                    <h3 className="font-black text-3xl tracking-tighter leading-none italic uppercase">Scanner Result</h3>
                    <p className="text-[10px] font-black text-gray-500 tracking-[0.3em] uppercase mt-4 italic">{scanResult.details}</p>
                  </div>
                  
                  <input 
                      type="text" 
                      value={editedVin}
                      onChange={(e) => setEditedVin(e.target.value.toUpperCase())}
                      className="w-full p-4 text-center text-3xl font-black bg-transparent border-b-2 border-white/10 focus:border-carb-accent outline-none uppercase italic"
                  />

                  <div className="flex gap-4">
                      <button onClick={() => setScanResult(null)} className="flex-1 py-6 glass text-gray-500 font-black rounded-2xl uppercase tracking-widest text-[10px] active-haptic">RETRY</button>
                      <button onClick={() => { setInputVal(editedVin); setScanResult(null); checkCompliance(); }} className="flex-[2] py-6 bg-white text-carb-navy font-black rounded-2xl uppercase tracking-widest text-[10px] active-haptic">CONFIRM</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default VinChecker;
