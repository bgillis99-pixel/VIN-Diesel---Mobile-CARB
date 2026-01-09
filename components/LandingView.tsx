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

const AppLogo = () => (
  <div className="flex flex-col items-center justify-center transform scale-90 sm:scale-100">
    <h1 className="text-4xl sm:text-5xl font-black tracking-[0.2em] text-slate-100 drop-shadow-lg" style={{ fontFamily: 'Arial, sans-serif' }}>
      MOBILE
    </h1>
    <h1 className="text-5xl sm:text-6xl font-black tracking-[0.2em] text-carb-green -mt-2 drop-shadow-lg" style={{ fontFamily: 'Arial, sans-serif' }}>
      CARB
    </h1>
    <div className="flex items-center gap-4 mt-2">
      <div className="h-1 w-12 bg-carb-green/60 rounded-full"></div>
      <span className="text-lg sm:text-xl font-black text-slate-400 tracking-[0.3em] italic">TESTING CA</span>
      <div className="h-1 w-12 bg-carb-green/60 rounded-full"></div>
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
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Mobile CARB Testing",
          text: "Compliance Made Clear. Check VINs and find testers instantly.",
          url: shareUrl
        });
      } catch (err) { console.error(err); }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert("Link copied to clipboard!");
    }
  };

  const handleInstall = async () => {
    if (installPrompt) { installPrompt.prompt(); } 
    else { alert("To Install:\n\niOS: Tap 'Share' → 'Add to Home Screen'\n\nAndroid: Tap 'Menu' → 'Install App'"); }
  };

  const handleTextBryan = () => {
    triggerHaptic('light');
    window.location.href = "sms:19168904427&body=Hi Bryan, I have a question about the CARB app.";
  };

  const MetallicStyle = "bg-gradient-to-b from-slate-100 via-slate-300 to-slate-400 shadow-[0_10px_25px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-slate-200 relative overflow-hidden transition-all";
  const BrushedTexture = <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')] opacity-10 pointer-events-none"></div>;

  const MainButton = ({ label, onClick, accent = false }: { label: string, onClick: () => void, accent?: boolean }) => (
    <button 
        onClick={onClick}
        className={`w-full py-6 text-slate-900 font-black rounded-3xl uppercase tracking-[0.3em] italic text-xs hover:scale-[1.01] active:scale-[0.99] transition-transform ${accent ? 'ring-2 ring-carb-accent/50 ring-offset-4 ring-offset-slate-900' : ''} ${MetallicStyle}`}
    >
        {BrushedTexture}
        <span className="relative z-10">{label}</span>
    </button>
  );

  return (
    <main className="min-h-screen bg-carb-navy flex flex-col items-center justify-center px-6 py-8 text-center animate-in fade-in duration-1000 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px]"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]"></div>
      </div>

      <div className="relative z-10 max-w-lg w-full space-y-8">
        <div className="space-y-4">
          <div className="flex justify-between items-center w-full px-2 mb-2">
              <button onClick={onLaunch} className="text-[10px] font-black text-carb-accent uppercase tracking-widest italic opacity-70 hover:opacity-100 transition-opacity">HUB</button>
              <button onClick={onNavigateAdmin} className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic opacity-60 hover:opacity-100 transition-opacity">ADMIN OPS 🔒</button>
          </div>
          <AppLogo />
        </div>

        <div className="bg-slate-800/30 border border-white/5 rounded-[3rem] p-6 backdrop-blur-2xl shadow-2xl space-y-4">
            <MainButton label="Open VIN Checker" onClick={onLaunch} accent />
            <MainButton label="Upload Photo / Doc" onClick={onNavigateIntake} />
            <MainButton label="Find A Tester" onClick={onNavigateTools} />
            <MainButton label="AI Assistant Q&A" onClick={onNavigateChat} />
        </div>

        <div className="space-y-6">
            <div className="bg-slate-800/40 border border-white/5 p-6 rounded-[2.5rem] backdrop-blur-3xl shadow-xl">
                <div className="grid grid-cols-3 gap-y-6 gap-x-2">
                    <ActionIcon href="tel:9168904427" icon={PHONE_ICON} label="CALL" colorClass="text-slate-700" />
                    <ActionIcon onClick={handleTextBryan} icon={MSG_ICON} label="TEXT" colorClass="text-slate-700" />
                    <ActionIcon onClick={handleInstall} icon={DOWNLOAD_ICON} label="INSTALL" colorClass="text-slate-700" />
                    <ActionIcon onClick={handleShare} icon={SHARE_ICON} label="SHARE" colorClass="text-slate-700" />
                    <ActionIcon onClick={() => window.open('mailto:support@norcalcarb.com')} icon={HELP_ICON} label="SUPPORT" colorClass="text-slate-700" />
                    <ActionIcon onClick={onNavigateAdmin} icon={ADMIN_ICON} label="ADMIN" colorClass="text-slate-700" />
                </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/40 border border-white/5">
              <p className="text-[8px] font-medium text-slate-500 uppercase tracking-wider leading-relaxed italic">
                Independent regulatory tool. Not affiliated with or endorsed by the California Air Resources Board (CARB).
              </p>
            </div>

            <div className="flex flex-col items-center gap-1 opacity-30">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] italic">
                    Regulatory Assistant v12.26
                </p>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                  © 2026 SILVERBACK GROUP LLC
                </p>
            </div>
        </div>
      </div>
    </main>
  );
};

const ActionIcon = ({ icon, label, onClick, href, colorClass }: { icon: React.ReactNode, label: string, onClick?: () => void, href?: string, colorClass: string }) => {
  const Component = href ? 'a' : 'button';
  const MetallicStyle = "bg-gradient-to-b from-slate-100 via-slate-200 to-slate-300 shadow-sm border border-slate-200 relative overflow-hidden transition-all";
  const BrushedTexture = <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')] opacity-10 pointer-events-none"></div>;

  return (
    <Component 
      href={href} 
      onClick={onClick} 
      className="flex flex-col items-center gap-1.5 group transition-all active-haptic"
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colorClass} group-hover:scale-105 ${MetallicStyle}`}>
        {BrushedTexture}
        <div className="relative z-10 scale-90">{icon}</div>
      </div>
      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">{label}</span>
    </Component>
  );
};

export default LandingView;