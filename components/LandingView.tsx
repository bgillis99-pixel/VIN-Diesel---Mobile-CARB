
import React, { useState } from 'react';
import { triggerHaptic } from '../services/haptics';

interface Props {
  onLaunch: () => void;
  onNavigateTools: () => void;
  onNavigateIntake: () => void;
  onNavigateChat: () => void;
  onNavigateAdmin: () => void;
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

const ADMIN_ICON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const HELP_ICON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
  </svg>
);

const MSG_ICON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
  </svg>
);

// App Logo Component
const AppLogo = () => (
  <div className="flex flex-col items-center justify-center transform scale-90 sm:scale-100">
    <h1 className="text-4xl sm:text-5xl font-black tracking-[0.2em] text-[#002D40] drop-shadow-lg" style={{ fontFamily: 'Arial, sans-serif' }}>
      MOBILE
    </h1>
    <h1 className="text-5xl sm:text-6xl font-black tracking-[0.2em] text-[#39D353] -mt-2 drop-shadow-lg" style={{ fontFamily: 'Arial, sans-serif' }}>
      CARB
    </h1>
    <div className="flex items-center gap-4 mt-2">
      <div className="h-1 w-12 bg-[#39D353] rounded-full"></div>
      <span className="text-lg sm:text-xl font-black text-gray-400 tracking-[0.3em] italic">TESTING CA</span>
      <div className="h-1 w-12 bg-[#39D353] rounded-full"></div>
    </div>
  </div>
);

const LandingView: React.FC<Props> = ({ onLaunch, onNavigateTools, onNavigateIntake, onNavigateChat, onNavigateAdmin }) => {
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  React.useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    });
  }, []);

  const handleShare = async () => {
    const shareUrl = "https://carbcleantruckcheck.app";
    const shareTitle = "Mobile CARB Testing";
    const shareText = "Making CARB Suck Less (Hopefully). Check VINs, find testers, and get AI support.";

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
      } catch (err) {
        console.error("Share failed:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert("Link copied to clipboard!");
      } catch (e) {
        console.error("Clipboard failed");
      }
    }
  };

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
    } else {
      alert("To Install:\n\niOS: Tap 'Share' → 'Add to Home Screen'\n\nAndroid: Tap 'Menu' → 'Install App'");
    }
  };

  const handleSupport = () => {
    const userAgent = navigator.userAgent;
    const body = `\n\n----------------\nDevice: ${userAgent}\nProblem Description: `;
    window.location.href = `mailto:support@norcalcarb.com?subject=App Issue Report&body=${encodeURIComponent(body)}`;
  };

  const handleTextBryan = () => {
    triggerHaptic('light');
    window.location.href = "sms:19168904427&body=Hi Bryan, I have a question about the CARB app.";
  };

  const MetallicStyle = "bg-gradient-to-b from-[#f3f4f6] via-[#d1d5db] to-[#9ca3af] shadow-[0_10px_25px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.8)] border border-white/20 relative overflow-hidden transition-all";
  const BrushedTexture = <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')] opacity-20 pointer-events-none"></div>;

  const MainButton = ({ label, onClick }: { label: string, onClick: () => void }) => (
    <button 
        onClick={onClick}
        className={`w-full py-7 text-[#020617] font-black rounded-[2rem] uppercase tracking-[0.4em] italic text-xs hover:scale-[1.02] active:scale-[0.98] ${MetallicStyle}`}
    >
        {BrushedTexture}
        <span className="relative z-10 drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]">{label}</span>
    </button>
  );

  const ActionIcon = ({ icon, label, onClick, href, colorClass }: { icon: React.ReactNode, label: string, onClick?: () => void, href?: string, colorClass: string }) => {
    const Component = href ? 'a' : 'button';
    return (
      <Component 
        href={href} 
        onClick={onClick} 
        className="flex flex-col items-center gap-1 group transition-all active-haptic"
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass} group-hover:scale-105 ${MetallicStyle}`}>
          {BrushedTexture}
          <div className="relative z-10 scale-90">{icon}</div>
        </div>
        <span className="text-[6px] font-black uppercase tracking-[0.2em] text-gray-500 whitespace-nowrap">{label}</span>
      </Component>
    );
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center px-6 py-4 text-center animate-in fade-in duration-1000 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px]"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
      </div>

      <div className="relative z-10 max-w-2xl w-full space-y-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center w-full max-w-lg mx-auto px-2">
              <button onClick={onLaunch} className="text-[9px] font-black text-blue-500 uppercase tracking-widest italic">HUB</button>
              <button onClick={onNavigateAdmin} className="text-[9px] font-black text-gray-700 uppercase tracking-widest italic">ADMIN OPS 🔒</button>
          </div>
          <div className="mb-0">
             <AppLogo />
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-[3rem] p-5 backdrop-blur-3xl shadow-[0_40px_80px_rgba(0,0,0,0.8)] space-y-3">
            <MainButton label="Open VIN Checker" onClick={onLaunch} />
            <MainButton label="Upload Photo / Doc" onClick={onNavigateIntake} />
            <MainButton label="Find A Tester" onClick={onNavigateTools} />
            <MainButton label="AI Assistant Q&A" onClick={onNavigateChat} />
        </div>

        {/* Updated Footer - Brought icons into the main visual area, removed 'Call Expert' text */}
        <div className="space-y-6 max-w-md mx-auto">
            <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] space-y-6 backdrop-blur-3xl shadow-2xl relative">
                <div className="flex justify-between items-center gap-2">
                    <ActionIcon href="tel:9168904427" icon={PHONE_ICON} label="CALL" colorClass="text-green-800" />
                    <ActionIcon onClick={handleTextBryan} icon={MSG_ICON} label="TEXT" colorClass="text-blue-900" />
                    <ActionIcon onClick={handleInstall} icon={DOWNLOAD_ICON} label="INSTALL" colorClass="text-blue-800" />
                    <ActionIcon onClick={handleShare} icon={SHARE_ICON} label="SHARE" colorClass="text-purple-800" />
                    <ActionIcon onClick={handleSupport} icon={HELP_ICON} label="SUPPORT" colorClass="text-orange-800" />
                    <ActionIcon onClick={onNavigateAdmin} icon={ADMIN_ICON} label="ADMIN" colorClass="text-red-900" />
                </div>
            </div>

            <div className="space-y-4 p-5 rounded-3xl bg-black/40 border border-white/5">
              <p className="text-[7px] font-bold text-gray-600 uppercase tracking-[0.1em] leading-relaxed italic">
                Verified Compliance Assistant is an independent regulatory tool. We are not affiliated with, endorsed by, or part of the California Air Resources Board (CARB).
              </p>
            </div>

            <div className="flex flex-col items-center gap-1 opacity-20">
                <p className="text-[7px] font-black text-gray-600 uppercase tracking-[0.3em] italic">
                    Regulatory Assistant v12.26
                </p>
                <p className="text-[7px] font-black text-gray-700 uppercase tracking-widest">
                  © 2026 SILVERBACK GROUP LLC
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LandingView;
