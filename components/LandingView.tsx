
import React, { useState, useEffect } from 'react';
import { triggerHaptic } from '../services/haptics';

interface Props {
  onLaunch: () => void;
  onNavigateTools: () => void;
  onNavigateIntake: () => void;
  onNavigateChat: () => void;
  onNavigateAdmin: () => void;
}

const PHONE_ICON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
);
const MSG_ICON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
);
const INFO_ICON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);

const AppLogo = () => (
  <div className="flex flex-col items-center justify-center transform scale-90 sm:scale-100">
    <h1 className="text-4xl sm:text-5xl font-black tracking-[0.2em] text-slate-100 drop-shadow-lg" style={{ fontFamily: 'Arial, sans-serif' }}>MOBILE</h1>
    <h1 className="text-5xl sm:text-6xl font-black tracking-[0.2em] text-carb-green -mt-2 drop-shadow-lg" style={{ fontFamily: 'Arial, sans-serif' }}>CARB</h1>
    <div className="flex items-center gap-4 mt-2">
      <div className="h-1 w-12 bg-carb-green/60 rounded-full"></div>
      <span className="text-lg sm:text-xl font-black text-slate-400 tracking-[0.3em] italic">COMPLIANCE HUB</span>
      <div className="h-1 w-12 bg-carb-green/60 rounded-full"></div>
    </div>
  </div>
);

const COMPLIANCE_TICKER = [
  "⚠️ JAN 1 DEADLINE: Annual reporting fee due for all registered entities.",
  "🚛 PRO-TIP: The state won't tell you, but missing your PSIP test by 1 day triggers a lock.",
  "📍 NEW: Grounding tools added for finding local credentialed OBD testers.",
  "📋 SMART SYNC: Use Intake to archive your engine family tags proactively.",
  "✨ AI ADVICE: Ask our assistant about hidden TRUCRS registry fees."
];

const LandingView: React.FC<Props> = ({ onLaunch, onNavigateTools, onNavigateIntake, onNavigateChat, onNavigateAdmin }) => {
  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % COMPLIANCE_TICKER.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const MetallicStyle = "bg-gradient-to-b from-slate-100 via-slate-300 to-slate-400 shadow-[0_10px_25px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-slate-200 relative overflow-hidden transition-all";
  const BrushedTexture = <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')] opacity-10 pointer-events-none"></div>;

  const MainButton = ({ label, onClick, accent = false }: { label: string, onClick: () => void, accent?: boolean }) => (
    <button 
        onClick={onClick}
        className={`w-full py-6 text-slate-900 font-black rounded-3xl uppercase tracking-[0.2em] italic text-xs hover:scale-[1.01] active:scale-[0.99] transition-transform ${accent ? 'ring-2 ring-carb-accent/50 ring-offset-4 ring-offset-slate-900' : ''} ${MetallicStyle}`}
    >
        {BrushedTexture}
        <span className="relative z-10">{label}</span>
    </button>
  );

  return (
    <main className="min-h-screen bg-carb-navy flex flex-col items-center justify-center px-6 py-8 text-center animate-in fade-in duration-1000 relative overflow-hidden">
      {/* Background FX */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]"></div>
      </div>

      <div className="relative z-10 max-w-lg w-full space-y-10">
        <div className="space-y-4">
          <div className="flex justify-between items-center w-full px-2 mb-2">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-carb-green animate-pulse"></div>
                 <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Live Compliance Data</span>
              </div>
              <button onClick={onNavigateAdmin} className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic opacity-60 hover:opacity-100 transition-opacity">OPERATOR LOGIN 🔒</button>
          </div>
          <AppLogo />
        </div>

        {/* Proactive Ticker Section */}
        <div className="bg-carb-accent/10 border border-carb-accent/20 rounded-2xl p-4 min-h-[60px] flex items-center justify-center overflow-hidden">
           <p className="text-[10px] font-black text-carb-accent uppercase tracking-widest italic animate-in slide-in-from-right-10 duration-500 key={tickerIndex}">
              {COMPLIANCE_TICKER[tickerIndex]}
           </p>
        </div>

        <div className="bg-slate-800/30 border border-white/5 rounded-[3.5rem] p-8 backdrop-blur-3xl shadow-2xl space-y-5">
            <MainButton label="Instant VIN Lookup" onClick={onLaunch} accent />
            <MainButton label="Document Intake (Smart Sync)" onClick={onNavigateIntake} />
            <MainButton label="Find Credentialed Tester" onClick={onNavigateTools} />
            <MainButton label="AI Regulatory Assistant" onClick={onNavigateChat} />
        </div>

        <div className="space-y-6">
            <div className="bg-slate-800/40 border border-white/5 p-6 rounded-[2.5rem] backdrop-blur-3xl shadow-xl flex justify-around">
                <ActionBtn icon={PHONE_ICON} label="CALL" onClick={() => window.open('tel:9168904427')} />
                <ActionBtn icon={MSG_ICON} label="SMS" onClick={() => window.location.href="sms:19168904427&body=Help with CARB Compliance"} />
                <ActionBtn icon={INFO_ICON} label="101 INFO" onClick={onNavigateChat} />
            </div>

            <div className="px-8 text-center space-y-2">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] italic">
                A private proactive initiative to fill the state's education gap.
              </p>
              <p className="text-[8px] font-bold text-slate-700 uppercase tracking-widest">
                © 2026 SILVERBACK GROUP LLC • EST. CALIFORNIA
              </p>
            </div>
        </div>
      </div>
    </main>
  );
};

const ActionBtn = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => {
  const MetallicStyle = "bg-gradient-to-b from-slate-100 via-slate-200 to-slate-300 shadow-sm border border-slate-200 relative overflow-hidden";
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 active-haptic group">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-slate-700 ${MetallicStyle}`}>
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')] opacity-10"></div>
         <div className="relative z-10 group-hover:scale-110 transition-transform">{icon}</div>
      </div>
      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
    </button>
  );
};

export default LandingView;
