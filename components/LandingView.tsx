
import React from 'react';

interface Props {
  onLaunch: () => void;
  onNavigateTools: () => void;
  onNavigateIntake: () => void;
  onNavigateChat: () => void;
  onNavigateInvoice: () => void;
}

const PHONE_ICON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const MINI_PHONE_ICON = (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
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

const TESTER_ICON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const LandingView: React.FC<Props> = ({ onLaunch, onNavigateTools, onNavigateIntake, onNavigateChat, onNavigateInvoice }) => {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Clear Truck Check',
          text: 'Verified Compliance Checker for California.',
          url: window.location.origin
        });
      } catch (err) {
        console.error("Share failed:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.origin);
        alert("Link copied to clipboard!");
      } catch (e) {
        console.error("Clipboard failed");
      }
    }
  };

  const MetallicStyle = "bg-gradient-to-b from-[#f3f4f6] via-[#d1d5db] to-[#9ca3af] shadow-[0_10px_25px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.8)] border border-white/20 relative overflow-hidden transition-all";
  const BrushedTexture = <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')] opacity-20 pointer-events-none"></div>;

  const MainButton = ({ label, onClick }: { label: string, onClick: () => void }) => (
    <button 
        onClick={onClick}
        className={`w-full py-8 sm:py-10 text-[#020617] font-black rounded-[2.5rem] uppercase tracking-[0.4em] italic text-xs sm:text-sm hover:scale-[1.02] active:scale-[0.98] ${MetallicStyle}`}
    >
        {BrushedTexture}
        <span className="relative z-10 drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]">{label}</span>
    </button>
  );

  const TopButton = ({ icon, label, onClick, href }: { icon: React.ReactNode, label: string, onClick?: () => void, href?: string }) => {
    const Component = href ? 'a' : 'button';
    return (
      <Component 
        href={href} 
        onClick={onClick} 
        className="flex-1 flex flex-col items-center gap-2 group transition-all active-haptic"
      >
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-[#020617] group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] ${MetallicStyle}`}>
          {BrushedTexture}
          <div className="relative z-10">{icon}</div>
        </div>
        <span className="text-[8px] font-black uppercase tracking-widest text-gray-600 transition-colors group-hover:text-gray-400">{label}</span>
      </Component>
    );
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center px-6 py-12 text-center animate-in fade-in duration-1000 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px]"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
      </div>

      <div className="relative z-10 max-w-2xl w-full space-y-14">
        <div className="space-y-8">
          <div className={`inline-flex items-center gap-4 px-10 py-4 rounded-full mx-auto ${MetallicStyle} shadow-[0_20px_40px_rgba(0,0,0,0.6)] border-white/30`}>
            {BrushedTexture}
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse relative z-10"></span>
            <span className="text-[11px] sm:text-[12px] font-black uppercase tracking-[0.5em] text-[#020617] italic relative z-10 drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]">
              Verified Compliance Checker for California
            </span>
          </div>

          <div className="flex justify-between items-end gap-3 w-full max-w-lg mx-auto">
              <TopButton href="tel:6173596953" icon={PHONE_ICON} label="617-359-6953" />
              <TopButton onClick={onLaunch} icon={DOWNLOAD_ICON} label="Download App" />
              <TopButton onClick={handleShare} icon={SHARE_ICON} label="Share App" />
              <TopButton onClick={onNavigateTools} icon={TESTER_ICON} label="Find Tester" />
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-[4rem] p-8 sm:p-12 backdrop-blur-3xl shadow-[0_50px_100px_rgba(0,0,0,0.8)] space-y-6 sm:space-y-8">
            <MainButton 
              label="Open VIN Checker" 
              onClick={onLaunch} 
            />
            <MainButton 
              label="Upload Photo / Doc" 
              onClick={onNavigateIntake} 
            />
            <MainButton 
              label="Find A Tester" 
              onClick={onNavigateTools} 
            />
            <MainButton 
              label="AI CTC Q&A" 
              onClick={onNavigateChat} 
            />
            <MainButton 
              label="Create Invoice" 
              onClick={onNavigateInvoice} 
            />
        </div>

        <div className="space-y-6 max-w-md mx-auto">
            <div className="flex flex-col items-center gap-2">
                <a href="tel:9168904427" className="flex items-center gap-2 text-gray-700 hover:text-gray-400 transition-colors active:scale-95 group">
                   <span className="opacity-40">{MINI_PHONE_ICON}</span>
                   <span className="text-[10px] font-black uppercase tracking-[0.4em] italic">CALL 916-890-4427</span>
                </a>
            </div>

            <div className="space-y-4 p-6 rounded-3xl bg-black/60 border border-white/5">
              <p className="text-[7px] font-bold text-gray-950 uppercase tracking-[0.2em] leading-relaxed opacity-60">
                Clear Truck Check is an independent regulatory compliance assistant. We are not affiliated with, endorsed by, or part of the California Air Resources Board (CARB).
              </p>
              <p className="text-[7px] font-bold text-gray-950 uppercase tracking-[0.2em] leading-relaxed opacity-60">
                By continuing to use these functions, you agree to the Terms of Service and Privacy Policy of NorCal CARB Mobile and carbcleantruckcheck.app.
              </p>
            </div>

            <div className="flex flex-col items-center gap-1">
                <p className="text-[8px] font-black text-gray-800 uppercase tracking-[0.3em] italic">
                    Regulatory Assistant v12.26
                </p>
                <p className="text-[8px] font-black text-gray-900 uppercase tracking-[0.4em] opacity-40">
                  © 2026 SILVERBACK GROUP LLC
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LandingView;
