
import React, { useState, useMemo } from 'react';
import { trackEvent } from '../services/analytics';

interface Tester {
  id: string;
  name: string;
  phone: string;
  email: string;
  rating: number;
  isCredentialed: boolean;
  locationLabel: string;
}

const MediaTools: React.FC = () => {
  const [zipInput, setZipInput] = useState('');
  const [showResults, setShowResults] = useState(false);

  const getTesterForZip = (zip: string): Tester => {
    let location = "CALIFORNIA REGION";
    if (zip === '90210') location = "LOS ANGELES TESTER";
    if (zip === '95819') location = "SACRAMENTO TESTER";
    
    return {
      id: 'priority-1',
      name: 'NorCal Smoke Pros',
      phone: '617-359-6953',
      email: 'test@norcalcarb.com',
      rating: 5,
      isCredentialed: true,
      locationLabel: location
    };
  };

  const tester = useMemo(() => getTesterForZip(zipInput), [zipInput]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <span key={i} className={i < rating ? 'text-yellow-500' : 'text-gray-800'}>★</span>
    ));
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-10 pb-16 animate-in fade-in duration-500">
      <div className="bg-[#0f172a]/40 border border-white/5 rounded-[4rem] p-12 shadow-2xl space-y-10">
          <div className="text-center space-y-4">
              <h2 className="text-4xl font-black italic uppercase text-white tracking-tighter">Tester Results</h2>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.6em] italic">Credentialed Fleet Inspectors</p>
          </div>

          <div className="space-y-6">
              <div className="bg-[#1A3A52]/40 rounded-[2.5rem] border border-white/5 p-2 focus-within:border-blue-500/50 transition-all">
                <input 
                    value={zipInput}
                    onChange={(e) => setZipInput(e.target.value.replace(/\D/g, '').slice(0, 5))}
                    placeholder="Enter Zip for Local Tester"
                    className="w-full bg-transparent p-6 outline-none text-base font-black text-white uppercase italic text-center placeholder:text-gray-700 tracking-widest"
                />
              </div>
              
              <button 
                onClick={() => zipInput.length === 5 && setShowResults(true)}
                className="w-full py-8 bg-blue-600 text-white font-black rounded-[2.5rem] uppercase tracking-[0.3em] text-xs italic shadow-[0_20px_40px_rgba(37,99,235,0.25)] active-haptic disabled:opacity-20 transition-all"
                disabled={zipInput.length !== 5}
              >
                Find Testers Near You
              </button>
          </div>
      </div>

      {showResults && (
        <div className="space-y-8 animate-in slide-in-from-bottom-12 duration-700">
            <div className="px-6 flex items-center gap-4">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] italic whitespace-nowrap">Inspector Protocol</h3>
                <div className="h-px w-full bg-white/5"></div>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-[3.5rem] p-10 shadow-2xl space-y-8 relative overflow-hidden group backdrop-blur-3xl">
                <div className="absolute top-0 right-0 bg-blue-600/20 text-blue-400 px-6 py-2 rounded-bl-3xl text-[9px] font-black uppercase tracking-widest italic border-l border-b border-white/5">
                    {tester.locationLabel}
                </div>
                
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)] animate-pulse"></div>
                        <h4 className="text-2xl font-black text-white italic uppercase tracking-tighter">{tester.name}</h4>
                    </div>
                    <div className="flex gap-1.5 text-base">{renderStars(tester.rating)}</div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] italic">CARB Verified Inspector #1125</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                    <a href={`tel:${tester.phone}`} className="flex-1 py-6 bg-white text-carb-navy rounded-[2rem] font-black text-[11px] text-center uppercase tracking-widest active-haptic italic shadow-xl">Voice / SMS</a>
                    <a href={`mailto:${tester.email}`} className="flex-1 py-6 bg-white/5 text-white rounded-[2rem] font-black text-[11px] text-center uppercase tracking-widest border border-white/10 active-haptic italic hover:bg-white/10 transition-colors">Email</a>
                </div>
            </div>

            <div className="px-10 text-center">
                <p className="text-[9px] font-black text-gray-700 uppercase tracking-[0.5em] italic leading-relaxed">System Note: Testing slots for 12/26 window are critically low.</p>
            </div>
        </div>
      )}
    </div>
  );
};

export default MediaTools;
