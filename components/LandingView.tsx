
import React from 'react';

interface Props {
  onLaunch: () => void;
}

const PHONE_ICON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const DOWNLOAD_ICON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M7 10l5 5m0 0l5-5m-5 5V3" />
  </svg>
);

const SHARE_ICON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);

const LandingView: React.FC<Props> = ({ onLaunch }) => {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Clean Truck Check App',
          text: 'Verified Compliance Checker for California HD I/M.',
          url: window.location.origin
        });
      } catch (err) {
        console.error("Share failed:", err);
      }
    } else {
      navigator.clipboard.writeText(window.location.origin);
      alert("Link copied to clipboard!");
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center px-6 text-center animate-in fade-in duration-1000 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-green-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
      </div>

      <div className="relative z-10 max-w-2xl w-full space-y-8 sm:space-y-12">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-blue-600/10 border border-blue-500/30 backdrop-blur-md mx-auto">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span className="text-[11px] font-black uppercase tracking-[0.4em] text-blue-400 italic">
              Verified Compliance Hub
            </span>
          </div>

          <div className="flex justify-center items-end gap-4 sm:gap-10 pb-4">
              <a href="tel:6173596953" className="flex flex-col items-center gap-2 group transition-all active-haptic">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:bg-blue-600/20 group-hover:border-blue-500/40 transition-colors">
                    {PHONE_ICON}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-white leading-none">617-359-6953</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-500 group-hover:text-white transition-colors mt-1">Contact</span>
                  </div>
              </a>
              <button onClick={onLaunch} className="flex flex-col items-center gap-2 group transition-all active-haptic">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:bg-blue-600/20 group-hover:border-blue-500/40 transition-colors">
                    {DOWNLOAD_ICON}
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-gray-500 group-hover:text-white transition-colors">Download App</span>
              </button>
              <button onClick={handleShare} className="flex flex-col items-center gap-2 group transition-all active-haptic">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:bg-blue-600/20 group-hover:border-blue-500/40 transition-colors">
                    {SHARE_ICON}
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-gray-500 group-hover:text-white transition-colors">Share App</span>
              </button>
          </div>
          
          <h1 className="text-7xl sm:text-9xl font-black italic tracking-tighter text-white uppercase leading-[0.82] text-shadow-2xl">
            Clean <br />
            Truck <br />
            <span className="text-blue-500">Check</span>
          </h1>
          
          <p className="text-xl text-gray-500 font-medium max-w-lg mx-auto leading-relaxed pt-2">
            The definitive <span className="text-white">Verified Compliance Checker</span> for California HD I/M. 
            Direct credentialed connection to state registries and mobile support.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-[4rem] p-10 sm:p-14 backdrop-blur-3xl shadow-[0_50px_100px_rgba(0,0,0,0.8)] space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            
            <div className="flex items-center justify-center gap-4 text-amber-500/80">
                <span className="text-sm font-black uppercase tracking-[0.3em] italic">Credentialed Compliance Coach</span>
            </div>
            
            <div className="space-y-3">
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">The 17-Digit Rule</h2>
                <p className="text-sm text-gray-400 leading-relaxed px-6 max-w-md mx-auto">
                    VINs <span className="text-white font-black underline decoration-red-500 decoration-2 underline-offset-4">NEVER</span> contain the letter "O". 
                    If you see a circle, it is <span className="text-white font-black underline decoration-blue-500 decoration-2 underline-offset-4">ALWAYS</span> a zero (0).
                </p>
            </div>
            
            <button 
                onClick={onLaunch}
                className="w-full group relative overflow-hidden py-10 bg-blue-600 text-white font-black rounded-[2.5rem] uppercase tracking-[0.4em] italic text-sm shadow-[0_20px_50px_rgba(37,99,235,0.4)] transition-all hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98]"
            >
                <span className="relative z-10">OPEN CHECKER HUB</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
            </button>
        </div>

        <div className="pt-8 space-y-4">
            <p className="text-[10px] font-black text-gray-700 uppercase tracking-[0.5em] italic">
                Regulatory Assistant v12.26
            </p>
            <div className="flex justify-center gap-8 text-[9px] font-black text-gray-800 uppercase tracking-[0.2em] italic">
                <span className="hover:text-blue-500 transition-colors cursor-default">NO HOTLINE WAIT</span>
                <span className="hover:text-blue-500 transition-colors cursor-default">INSTANT SCAN</span>
                <span className="hover:text-blue-500 transition-colors cursor-default">MOBILE TESTERS</span>
            </div>
        </div>
      </div>

      <div className="fixed bottom-12 left-12 text-[9px] font-black text-white/5 uppercase tracking-[1.2em] vertical-text hidden sm:block">
        NORCAL CARB MOBILE LLC
      </div>
    </div>
  );
};

export default LandingView;
