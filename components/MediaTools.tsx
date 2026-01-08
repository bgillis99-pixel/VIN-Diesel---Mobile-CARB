
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
  const [dateInput, setDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [showResults, setShowResults] = useState(false);

  const MetallicStyle = "bg-gradient-to-b from-[#f3f4f6] via-[#d1d5db] to-[#9ca3af] shadow-[0_10px_25px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.8)] border border-white/20 relative overflow-hidden transition-all";
  const BrushedTexture = <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')] opacity-20 pointer-events-none"></div>;

  const getTesterForZip = (zip: string, date: string): Tester => {
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

  const tester = useMemo(() => getTesterForZip(zipInput, dateInput), [zipInput, dateInput]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <span key={i} className={i < rating ? 'text-yellow-500' : 'text-gray-800'}>★</span>
    ));
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-8 -mt-8 pb-16 animate-in fade-in duration-500">
      <div className="bg-[#0f172a]/40 border border-white/5 rounded-[4rem] p-10 shadow-2xl space-y-8 backdrop-blur-3xl">
          <div className="text-center space-y-2">
              <h2 className="text-4xl font-black italic uppercase text-white tracking-tighter">Tester Results</h2>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] italic">Credentialed Fleet Inspectors</p>
          </div>

          <div className="space-y-4">
              <div className="flex flex-col gap-4">
                  <div className={`rounded-[2.5rem] p-1 ${MetallicStyle}`}>
                    {BrushedTexture}
                    <input 
                        value={zipInput}
                        onChange={(e) => setZipInput(e.target.value.replace(/\D/g, '').slice(0, 5))}
                        placeholder="Zip Code"
                        className="w-full bg-transparent p-5 outline-none text-xl font-black text-[#020617] uppercase italic text-center placeholder:text-[#020617]/40 tracking-widest relative z-10"
                    />
                  </div>
                  <div className={`rounded-[2.5rem] p-1 ${MetallicStyle}`}>
                    {BrushedTexture}
                    <input 
                        type="date"
                        value={dateInput}
                        onChange={(e) => setDateInput(e.target.value)}
                        className="w-full bg-transparent p-5 outline-none text-xl font-black text-[#020617] uppercase italic text-center placeholder:text-[#020617]/40 tracking-widest relative z-10"
                    />
                  </div>
              </div>
              
              <button 
                onClick={() => zipInput.length === 5 && setShowResults(true)}
                className={`w-full py-6 text-[#020617] font-black rounded-[2.5rem] uppercase tracking-[0.3em] text-[10px] italic shadow-2xl active-haptic disabled:opacity-20 transition-all ${MetallicStyle}`}
                disabled={zipInput.length !== 5}
              >
                {BrushedTexture}
                <span className="relative z-10">Find Testers Near You</span>
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
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] italic">Available on {new Date(dateInput).toLocaleDateString()}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                    <a href={`tel:${tester.phone}`} className={`flex-1 py-6 rounded-[2rem] font-black text-[11px] text-center uppercase tracking-widest active-haptic italic shadow-xl text-[#020617] ${MetallicStyle}`}>
                      {BrushedTexture}
                      <span className="relative z-10">Voice / SMS</span>
                    </a>
                    <a href={`mailto:${tester.email}`} className="flex-1 py-6 bg-white/5 text-white rounded-[2rem] font-black text-[11px] text-center uppercase tracking-widest border border-white/10 active-haptic italic hover:bg-white/10 transition-colors">Email</a>
                </div>
            </div>

            <div className="px-10 text-center">
                <p className="text-[9px] font-black text-gray-700 uppercase tracking-[0.5em] italic leading-relaxed">System Note: Testing slots for requested window are critically low.</p>
            </div>
        </div>
      )}
    </div>
  );
};

export default MediaTools;
