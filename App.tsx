import React, { useState, useEffect } from 'react';
import VinChecker from './components/VinChecker';
import ChatAssistant from './components/ChatAssistant';
import MediaTools from './components/MediaTools';
import ProfileView from './components/ProfileView';
import AdminView from './components/AdminView';
import { AppView, User, HistoryItem } from './types';

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

const AppLogo = () => (
  <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 drop-shadow-sm rounded-lg">
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{stopColor:'#4ade80', stopOpacity:1}} />
        <stop offset="100%" style={{stopColor:'#15803d', stopOpacity:1}} />
      </linearGradient>
    </defs>
    <path d="M256 460c-28 0-50-16-84-16-36 0-70 18-106 18-54 0-104-126-104-198 0-66 38-152 110-152 42 0 66 22 96 22 30 0 52-22 96-22 22 0 58 6 86 28 -74 38 -64 126 10 160 -16 52 -52 112 -86 142 -20 18 -42 18 -74 18z" fill="url(#grad1)" />
    <path d="M340 50c0 48-52 82-90 82 -6-62 48-100 90-82z" fill="#4ade80" stroke="#003366" strokeWidth="2"/>
    <text x="50%" y="60%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="160" fill="#f0fdf4" stroke="#003366" strokeWidth="2">arb</text>
  </svg>
);

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.ASSISTANT); // Default to Assistant for chat prominence? Or HOME?
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

  const shareUrl = 'https://carbcleantruckcheck.app';
  const shareTitle = "Mobile Carb Check";
  const shareText = "Keep your fleet compliant. Check heavy-duty diesel compliance instantly.";
  const shareBody = `${shareText} Download: ${shareUrl}`;

  useEffect(() => {
    // Default to Home view on first load if not set
    setCurrentView(AppView.HOME);
    
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

  const handleSystemShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
         title: shareTitle,
         text: shareText,
         url: shareUrl,
        });
      } catch (err) {
        console.log('Share cancelled or failed');
      }
    } else {
      alert("System sharing not available.");
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
            <AppLogo />
            <div className="text-left leading-none">
                <h1 className="text-base font-black tracking-tighter text-[#003366] dark:text-white">MOBILE CARB</h1>
                <p className="text-[#15803d] text-[9px] font-bold tracking-widest uppercase">CHECK APP</p>
            </div>
        </div>
        <button onClick={() => setShowInstall(true)} className="text-[#003366] dark:text-green-400 font-bold text-xs border border-[#003366] dark:border-green-400 px-3 py-1.5 rounded-full hover:bg-gray-50 dark:hover:bg-green-900/30 transition-colors">
            SHARE APP
        </button>
      </header>

      {/* Main Content - Padded bottom specifically for safe areas and nav */}
      <main className="flex-1 px-4 pt-4 pb-28 max-w-lg mx-auto w-full overflow-y-auto">
        {currentView === AppView.HOME && (
            <VinChecker 
                onAddToHistory={handleAddToHistory} 
                onNavigateChat={() => setCurrentView(AppView.ASSISTANT)}
                onInstallApp={handleInstallClick}
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
        
        {/* Footer Info inside scrollable area to save fixed space */}
        <div className="mt-8 mb-4 text-center text-[10px] text-gray-600 dark:text-gray-500 space-y-1">
            <p>&copy; 2026 Mobile Carb Check</p>
            <p><a href="mailto:bryan@norcalcarbmobile.com" className="hover:underline">bryan@norcalcarbmobile.com</a></p>
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
                  <div className="relative group cursor-pointer" onClick={() => setFullScreenQR(true)}>
                      <div className="bg-white p-2 inline-block mb-4 border border-gray-100 rounded-2xl shadow-inner">
                         <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(shareUrl)}&color=003366`} alt="QR Code" className="w-24 h-24" />
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                     <a href={`sms:?body=${encodeURIComponent(shareBody)}`} className="w-full py-2 bg-green-100 text-green-800 font-bold rounded-xl text-sm flex items-center justify-center gap-2">Text</a>
                     <a href={`mailto:?subject=Mobile Carb Check App&body=${encodeURIComponent(shareBody)}`} className="w-full py-2 bg-blue-100 text-blue-800 font-bold rounded-xl text-sm flex items-center justify-center gap-2">Email</a>
                  </div>
                  <button onClick={handleCopyLink} className="w-full py-2 bg-gray-100 dark:bg-gray-700 dark:text-white text-gray-600 font-bold rounded-xl text-sm">Copy Link</button>
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
            { id: AppView.PROFILE, icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", label: "PROFILE" }
        ].map(btn => (
            <button 
                key={btn.id}
                onClick={() => setCurrentView(btn.id as AppView)}
                className={`flex flex-col items-center justify-center w-16 h-full pb-4 transition-all duration-200 active:scale-90 ${currentView === btn.id ? '-translate-y-2' : ''}`}
            >
                <div className={`p-2 rounded-2xl mb-1 transition-colors ${currentView === btn.id ? 'bg-[#15803d] text-white shadow-lg shadow-green-900/20' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={btn.icon} /></svg>
                </div>
                <span className={`text-[9px] font-bold tracking-widest ${currentView === btn.id ? 'text-[#003366] dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>{btn.label}</span>
            </button>
        ))}
      </nav>
    </div>
    </div>
  );
};

export default App;