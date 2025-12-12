import React, { useState, useEffect, Suspense } from 'react';
import VinChecker from './components/VinChecker';
import { AppView, User, HistoryItem } from './types';

// Lazy load heavy components to improve initial load performance
const ChatAssistant = React.lazy(() => import('./components/ChatAssistant'));
const MediaTools = React.lazy(() => import('./components/MediaTools'));
const ProfileView = React.lazy(() => import('./components/ProfileView'));
const AdminView = React.lazy(() => import('./components/AdminView'));

const USERS_KEY = 'vin_diesel_users';
const CURRENT_USER_KEY = 'vin_diesel_current_user';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Custom Logo Component that accepts a branding URL override
const AppLogo = ({ customLogoUrl }: { customLogoUrl?: string | null }) => (
  <img 
    src={customLogoUrl || "/logo.svg"} 
    alt="Mobile Carb Logo" 
    className="w-10 h-10 drop-shadow-sm rounded-lg object-contain bg-white/10" 
  />
);

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.ASSISTANT); 
  const [user, setUser] = useState<User | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPwaBanner, setShowPwaBanner] = useState(false);
  
  // Theme State
  const [darkMode, setDarkMode] = useState(false);

  // iOS Detection
  const [showIosInstall, setShowIosInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // Full Screen QR for Field Sharing
  const [fullScreenQR, setFullScreenQR] = useState(false);

  // Privacy Policy Modal
  const [showPrivacy, setShowPrivacy] = useState(false);

  // --- WHITE LABEL / BRANDING STATE ---
  const [brandingName, setBrandingName] = useState<string | null>(null);
  const [brandingLogo, setBrandingLogo] = useState<string | null>(null);

  const shareUrl = 'https://carbcleantruckcheck.app';
  const shareTitle = "Mobile Carb Check";
  const shareText = "Keep your fleet compliant. Have VIN DIESEL check your compliance instantly.";
  const shareBody = `${shareText} Download: ${shareUrl}`;

  useEffect(() => {
    // Default to Home view on first load if not set
    setCurrentView(AppView.HOME);
    
    // Check for Custom Branding (White Labeling) via URL Params
    // Example: ?fleet=FedEx&logo=https://...
    const params = new URLSearchParams(window.location.search);
    const fleetName = params.get('fleet');
    const logoUrl = params.get('logo');
    if (fleetName) setBrandingName(fleetName);
    if (logoUrl) setBrandingLogo(logoUrl);
    
    const savedTheme = localStorage.getItem('vin_diesel_theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
    } else if (savedTheme === 'light') {
      setDarkMode(false);
    } else {
       if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
           setDarkMode(true);
       }
    }
  }, []);

  const toggleTheme = () => {
      const newMode = !darkMode;
      setDarkMode(newMode);
      localStorage.setItem('vin_diesel_theme', newMode ? 'dark' : 'light');
  };

  useEffect(() => {
    const checkIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(checkIOS);
  }, []);

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPwaBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    const currentEmail = localStorage.getItem(CURRENT_USER_KEY);
    if (currentEmail) {
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
      if (users[currentEmail]) {
        setUser({ email: currentEmail, history: users[currentEmail].history || [] });
      }
    }
  }, []);

  const handleLogin = (email: string) => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
    if (users[email]) {
      localStorage.setItem(CURRENT_USER_KEY, email);
      setUser({ email, history: users[email].history || [] });
    } else {
        alert('User not found. Please register.');
    }
  };

  const handleRegister = (email: string) => {
     const users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
     if (users[email]) {
         alert('User already exists.');
         return;
     }
     users[email] = { history: [] };
     localStorage.setItem(USERS_KEY, JSON.stringify(users));
     handleLogin(email);
  };

  const handleLogout = () => {
    localStorage.removeItem(CURRENT_USER_KEY);
    setUser(null);
    setCurrentView(AppView.HOME);
  };

  const handleAddToHistory = (value: string, type: 'VIN' | 'ENTITY' | 'TRUCRS') => {
    if (!user) return;
    
    const newItem: HistoryItem = {
        id: Date.now().toString(),
        value,
        type,
        timestamp: Date.now()
    };

    const updatedHistory = [newItem, ...user.history];
    const updatedUser = { ...user, history: updatedHistory };
    
    setUser(updatedUser);
    
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
    if (users[user.email]) {
        users[user.email].history = updatedHistory;
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
  };

  const handleCopyLink = async () => {
      try {
          await navigator.clipboard.writeText(shareUrl);
          alert('Link copied!');
      } catch (e) {
          const textArea = document.createElement("textarea");
          textArea.value = shareUrl;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          alert('Link copied!');
      }
  };

  // Improved Native Share with fallback
  const handleShare = async () => {
    const shareData = {
        title: shareTitle,
        text: shareText,
        url: shareUrl,
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            // If user cancelled, do nothing. If error, fall back.
            if ((err as Error).name !== 'AbortError') {
                setShowInstall(true);
            }
        }
    } else {
        setShowInstall(true);
    }
  };

  const handleInstallClick = async () => {
    if (isIOS) {
        setShowIosInstall(true);
    } else if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setShowPwaBanner(false);
        }
    } else {
        alert("Tap browser menu (⋮) -> 'Add to Home Screen'.");
    }
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
    <div className="min-h-screen flex flex-col bg-[#f8f9fa] dark:bg-gray-900 font-sans text-[#003366] dark:text-gray-100 transition-colors duration-200">
      
      {/* Top Banner - Fixed */}
      <a href="tel:6173596953" className="bg-[#003366] dark:bg-black text-white text-[10px] text-center py-2 font-bold tracking-wide px-2 block hover:bg-[#002244] active:bg-[#004488] transition-colors z-30 pt-safe">
        NEED IMMEDIATE TESTING? <span className="text-[#4ade80] underline">617-359-6953</span> • SERVING CA STATEWIDE
      </a>

      {/* Header - Sticky */}
      <header className="bg-white dark:bg-gray-800 py-2 px-4 text-center shadow-sm sticky top-0 z-20 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center transition-colors">
        <div className="flex items-center gap-2">
            <AppLogo customLogoUrl={brandingLogo} />
            <div className="text-left leading-none">
                {/* Dynamic Title based on Branding */}
                <h1 className="text-base font-black tracking-tighter text-[#003366] dark:text-white uppercase truncate max-w-[180px]">
                    {brandingName || "MOBILE CARB"}
                </h1>
                <p className="text-[#15803d] text-[9px] font-bold tracking-widest uppercase">
                    {brandingName ? "FLEET COMPLIANCE" : "CHECK APP"}
                </p>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
            <button onClick={() => setCurrentView(AppView.PROFILE)} className="text-[#003366] dark:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </button>
            <button onClick={handleShare} className="text-[#003366] dark:text-green-400 font-bold text-xs border border-[#003366] dark:border-green-400 px-3 py-1.5 rounded-full hover:bg-gray-50 dark:hover:bg-green-900/30 transition-colors">
                SHARE APP
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 pt-4 pb-32 max-w-lg mx-auto w-full overflow-y-auto">
        <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-[#003366] border-t-transparent rounded-full animate-spin"></div></div>}>
          {currentView === AppView.HOME && (
              <VinChecker 
                  onAddToHistory={handleAddToHistory} 
                  onNavigateChat={() => setCurrentView(AppView.ASSISTANT)}
                  onShareApp={handleShare}
              />
          )}
          {currentView === AppView.ASSISTANT && <ChatAssistant />}
          {currentView === AppView.ANALYZE && <MediaTools />}
          {currentView === AppView.PROFILE && (
              <ProfileView 
                  user={user} 
                  onLogin={handleLogin} 
                  onRegister={handleRegister} 
                  onLogout={handleLogout}
                  onAdminAccess={() => setCurrentView(AppView.ADMIN)}
                  isOnline={isOnline}
                  isDarkMode={darkMode}
                  toggleTheme={toggleTheme}
              />
          )}
          {currentView === AppView.ADMIN && <AdminView />}
        </Suspense>

        <div className="mt-8 mb-8 text-center text-[10px] text-gray-700 dark:text-gray-400 space-y-3 pb-8">
            <p className="uppercase tracking-widest text-[#003366] dark:text-blue-200 font-bold text-[10px] px-4 opacity-80">2026 COPYRIGHT SILVERBACK GROUP AND MLB MARKETING LLC</p>
            <p><a href="mailto:bryan@norcalcarbmobile.com" className="hover:underline font-medium">bryan@norcalcarbmobile.com</a></p>
            <button onClick={() => setShowPrivacy(true)} className="text-gray-500 hover:text-[#003366] underline">Privacy Policy</button>
        </div>
      </main>

      {/* Share Modal */}
      {showInstall && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowInstall(false)}>
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-[#003366] dark:text-white">Share App</h3>
                      <button onClick={() => setShowInstall(false)} className="text-gray-400 hover:text-gray-600 p-2 text-2xl leading-none">&times;</button>
                  </div>
                  
                  {/* BRANDING LOGO ADDED HERE */}
                  <div className="flex justify-center mb-4 transform scale-150">
                     <AppLogo customLogoUrl={brandingLogo} />
                  </div>

                  <div className="relative group cursor-pointer" onClick={() => setFullScreenQR(true)}>
                      <div className="bg-white p-2 inline-block mb-4 border border-gray-100 rounded-2xl shadow-inner">
                         <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(shareUrl)}&color=003366`} alt="QR Code" className="w-24 h-24" />
                      </div>
                  </div>
                  
                  <button onClick={handleShare} className="w-full mb-3 py-3 bg-[#15803d] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg hover:bg-green-700">
                      <span>📤 Share via...</span>
                  </button>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                     <a href={`sms:?body=${encodeURIComponent(shareBody)}`} className="w-full py-2 bg-gray-100 text-gray-800 font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-gray-200">Text</a>
                     <a href={`mailto:?subject=Mobile Carb Check App&body=${encodeURIComponent(shareBody)}`} className="w-full py-2 bg-gray-100 text-gray-800 font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-gray-200">Email</a>
                  </div>
                  <button onClick={handleCopyLink} className="w-full py-2 bg-gray-100 dark:bg-gray-700 dark:text-white text-gray-700 font-bold rounded-xl text-sm">Copy Link</button>
              </div>
          </div>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacy && (
          <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowPrivacy(false)}>
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4 sticky top-0 bg-white dark:bg-gray-800 py-2 border-b border-gray-100 dark:border-gray-700">
                      <h2 className="text-xl font-black text-[#003366] dark:text-white">Privacy Policy</h2>
                      <button onClick={() => setShowPrivacy(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                  </div>
                  <div className="prose dark:prose-invert text-xs text-gray-600 dark:text-gray-300 space-y-4">
                      <p className="font-bold">Last Updated: January 1, 2026</p>
                      
                      <section>
                          <h3 className="font-bold text-[#003366] dark:text-white text-sm mb-1">1. Information We Collect</h3>
                          <ul className="list-disc pl-4 space-y-1">
                              <li><strong>Camera & Images:</strong> Used solely for scanning VIN barcodes and vehicle tags. Images are processed locally or sent to our AI provider (Google Gemini) for extraction. We do not permanently store these images on our servers.</li>
                              <li><strong>Location Data:</strong> Used to find certified smoke testers near you. Location data is processed in real-time and not tracked historically.</li>
                              <li><strong>Usage Data:</strong> We store your scan history locally on your device (LocalStorage).</li>
                          </ul>
                      </section>
                      <section>
                          <h3 className="font-bold text-[#003366] dark:text-white text-sm mb-1">2. How We Use Your Information</h3>
                          <p>We use your data to:</p>
                          <ul className="list-disc pl-4 space-y-1">
                              <li>Provide instant CARB compliance status checks.</li>
                              <li>Connect you with local heavy-duty diesel testers.</li>
                              <li>Generate AI-powered answers to regulatory questions.</li>
                          </ul>
                      </section>
                      <section>
                          <h3 className="font-bold text-[#003366] dark:text-white text-sm mb-1">3. Data Sharing</h3>
                          <p>We do not sell your personal data. We share data only with:</p>
                          <ul className="list-disc pl-4 space-y-1">
                              <li><strong>Google (Gemini API):</strong> For image analysis and chat functionality.</li>
                              <li><strong>Service Providers:</strong> If you explicitly request a tester dispatch, we share your provided contact details with the tester.</li>
                          </ul>
                      </section>
                      <section>
                          <h3 className="font-bold text-[#003366] dark:text-white text-sm mb-1">4. Your Rights</h3>
                          <p>You can clear your local history at any time in the Profile tab. You may also deny camera or location permissions in your browser settings.</p>
                      </section>
                      <section>
                          <h3 className="font-bold text-[#003366] dark:text-white text-sm mb-1">5. Contact Us</h3>
                          <p>For privacy concerns, contact: <a href="mailto:bryan@norcalcarbmobile.com" className="underline text-blue-600">bryan@norcalcarbmobile.com</a></p>
                      </section>
                  </div>
                  <button onClick={() => setShowPrivacy(false)} className="w-full mt-6 py-3 bg-[#003366] text-white font-bold rounded-xl shadow-lg hover:bg-[#002244]">I Understand</button>
              </div>
          </div>
      )}

      {/* Full Screen QR */}
      {fullScreenQR && (
          <div className="fixed inset-0 z-[150] bg-[#003366] flex flex-col items-center justify-center p-4" onClick={() => setFullScreenQR(false)}>
              <div className="bg-white p-4 rounded-3xl shadow-2xl">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}&color=003366`} alt="Full Screen QR" className="w-64 h-64" />
              </div>
              <button onClick={() => setFullScreenQR(false)} className="mt-8 text-white font-bold border border-white/30 px-6 py-2 rounded-full">CLOSE</button>
          </div>
      )}

      {/* iOS Install Prompt */}
      {showIosInstall && (
          <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex flex-col justify-end pb-8" onClick={() => setShowIosInstall(false)}>
               <div className="bg-white dark:bg-gray-800 mx-4 rounded-2xl p-6 text-center animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
                   <h3 className="text-lg font-black text-[#003366] dark:text-white mb-2">Install for iPhone</h3>
                   <div className="text-left space-y-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-xl text-sm text-gray-700 dark:text-gray-300">
                       <p>1. Tap the <strong>Share</strong> button</p>
                       <p>2. Scroll down & tap <strong>"Add to Home Screen"</strong></p>
                   </div>
                   <button onClick={() => setShowIosInstall(false)} className="mt-4 w-full py-3 bg-[#003366] text-white font-bold rounded-xl">Got it</button>
               </div>
          </div>
      )}

      {/* PWA Banner (Android/Chrome) */}
      {showPwaBanner && deferredPrompt && !isIOS && (
        <div className="fixed bottom-[85px] left-4 right-4 bg-[#003366] text-white p-3 rounded-xl z-40 flex justify-between items-center shadow-lg animate-in slide-in-from-bottom">
            <div>
                <p className="font-bold text-sm">Install App</p>
                <p className="text-[10px] text-gray-300">Add to home screen</p>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => setShowPwaBanner(false)} className="text-gray-400 p-1">✕</button>
                <button onClick={handleInstallClick} className="bg-[#15803d] text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-md">INSTALL</button>
            </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 pb-safe pt-1 px-2 flex justify-around items-end z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] h-[80px] transition-colors">
        {[
            { id: AppView.HOME, icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", label: "CHECK" },
            { id: AppView.ASSISTANT, icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z", label: "CHAT" },
            { id: AppView.ANALYZE, icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z", label: "TOOLS" },
            { id: AppView.ADMIN, icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", label: "ADMIN" }
        ].map(btn => (
            <button 
                key={btn.id}
                onClick={() => setCurrentView(btn.id as AppView)}
                className={`flex flex-col items-center justify-center w-16 h-full pb-4 transition-all duration-200 active:scale-90 ${currentView === btn.id ? '-translate-y-2' : ''}`}
            >
                <div className={`p-2 rounded-2xl mb-1 transition-colors ${currentView === btn.id ? 'bg-[#15803d] text-white shadow-lg shadow-green-900/20' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={btn.icon} /></svg>
                </div>
                <span className={`text-[9px] font-bold tracking-widest ${currentView === btn.id ? 'text-[#003366] dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>{btn.label}</span>
            </button>
        ))}
      </nav>
    </div>
    </div>
  );
};

export default App;