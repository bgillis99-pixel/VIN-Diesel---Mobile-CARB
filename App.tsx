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

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.ASSISTANT);
  const [user, setUser] = useState<User | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPwaBanner, setShowPwaBanner] = useState(false);
  
  // iOS Detection
  const [showIosInstall, setShowIosInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // Full Screen QR for Field Sharing
  const [fullScreenQR, setFullScreenQR] = useState(false);

  // HARDCODED PRODUCTION URL FOR PROFESSIONAL SHARING
  const shareUrl = 'https://carbcleantruckcheck.app';
  
  const shareTitle = "Mobile Carb Check";
  const shareText = "Keep your fleet compliant. Check heavy-duty diesel compliance instantly and find certified smoke testers without the hotline wait.";
  const shareBody = `${shareText} Download the app here: ${shareUrl}`;

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
      alert("System sharing is not available. Please use the Text or Email buttons below.");
    }
  };

  const handleCopyLink = async () => {
      try {
          await navigator.clipboard.writeText(shareUrl);
          alert('Link copied to clipboard!');
      } catch (e) {
          const textArea = document.createElement("textarea");
          textArea.value = shareUrl;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          alert('Link copied to clipboard!');
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
        alert("To install: Tap your browser menu (⋮) and select 'Add to Home Screen'.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa] font-sans text-[#003366]">
      {!isOnline && (
        <div className="bg-gray-800 text-white text-xs text-center py-1 font-bold tracking-wider">
          OFFLINE MODE: VIEWING HISTORY ONLY
        </div>
      )}
      
      <a href="tel:8446858922" className="bg-[#003366] text-white text-xs text-center py-2 font-bold tracking-wide px-2 block hover:bg-[#002244] active:bg-[#004488] transition-colors">
        NEED IMMEDIATE TESTING? CALL <span className="text-[#15803d] underline">844-685-8922</span> • SERVING CA STATEWIDE
      </a>

      <header className="bg-white pt-3 pb-3 px-4 text-center shadow-sm sticky top-0 z-20 border-b-2 border-[#15803d] flex justify-between items-center">
        
        <div className="flex items-center gap-3">
            <img 
              src="/logo.svg" 
              onError={(e) => {
                // Fallback if svg fails for some reason
                e.currentTarget.onerror = null; 
                e.currentTarget.style.display = 'none';
              }}
              alt="Mobile Carb Check Logo" 
              className="w-12 h-12 object-contain drop-shadow-md rounded-xl" 
            />
            <div className="text-left leading-tight">
                <h1 className="text-lg font-black tracking-tighter text-[#003366] leading-none">MOBILE CARB</h1>
                <p className="text-[#15803d] text-[11px] font-bold tracking-widest uppercase">CHECK APP</p>
            </div>
        </div>

        <button 
            onClick={() => setShowInstall(true)} 
            className="bg-[#15803d] text-white px-4 py-2 rounded-full font-bold text-sm shadow-md hover:bg-[#166534] active:scale-95 active:bg-[#14532d] transition-all flex items-center gap-2"
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            SHARE APP
        </button>
      </header>

      {showInstall && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowInstall(false)}>
              <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-[#003366]">Share & Install</h3>
                      <button onClick={() => setShowInstall(false)} className="text-gray-400 hover:text-gray-600 p-2 text-2xl leading-none active:scale-90 transition-transform">&times;</button>
                  </div>
                  
                  <p className="text-sm text-gray-500 mb-6">Help friends keep their trucks compliant.</p>
                  
                  <div className="relative group cursor-pointer" onClick={() => setFullScreenQR(true)}>
                      <div className="bg-white p-2 inline-block mb-4 border-2 border-gray-100 rounded-2xl shadow-inner transition-transform hover:scale-105">
                         <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shareUrl)}&color=003366`} alt="QR Code" className="w-32 h-32" />
                      </div>
                      <p className="text-xs text-[#15803d] font-bold uppercase tracking-wide mb-4 animate-pulse">Tap to Enlarge</p>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                      <button 
                          onClick={handleSystemShare}
                          className="w-full py-3 bg-[#003366] text-white font-bold rounded-xl shadow-lg hover:bg-[#002244] flex items-center justify-center gap-2 active:scale-95 transition-transform"
                      >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                          Share to Social
                      </button>

                      <div className="grid grid-cols-2 gap-3">
                         <a 
                            href={`sms:?body=${encodeURIComponent(shareBody)}`}
                            className="w-full py-3 bg-green-100 text-green-800 font-bold rounded-xl border border-green-200 flex items-center justify-center gap-2 hover:bg-green-200 active:scale-95 transition-transform no-underline"
                         >
                             💬 Text
                         </a>
                         <a 
                            href={`mailto:?subject=Mobile Carb Check App&body=${encodeURIComponent(shareBody)}`}
                            className="w-full py-3 bg-blue-100 text-blue-800 font-bold rounded-xl border border-blue-200 flex items-center justify-center gap-2 hover:bg-blue-200 active:scale-95 transition-transform no-underline"
                         >
                             📧 Email
                         </a>
                      </div>

                      <button 
                         onClick={handleCopyLink}
                         className="w-full py-3 bg-gray-100 text-gray-600 font-bold rounded-xl border border-gray-200 flex items-center justify-center gap-2 hover:bg-gray-200 active:scale-95 transition-transform"
                      >
                          🔗 Copy Link
                      </button>
                  </div>
              </div>
          </div>
      )}

      {fullScreenQR && (
          <div className="fixed inset-0 z-[150] bg-[#003366] flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in duration-200" onClick={() => setFullScreenQR(false)}>
              <div className="text-white text-center mb-8">
                  <h2 className="text-3xl font-black mb-2">SCAN TO INSTALL</h2>
                  <p className="text-gray-300">Point customer camera here</p>
              </div>
              <div className="bg-white p-4 rounded-3xl shadow-2xl">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}&color=003366`} alt="Full Screen QR" className="w-64 h-64 sm:w-80 sm:h-80" />
              </div>
              <button onClick={() => setFullScreenQR(false)} className="mt-12 bg-white/10 text-white px-8 py-3 rounded-full font-bold border border-white/20 hover:bg-white/20">
                  CLOSE
              </button>
          </div>
      )}

      {showIosInstall && (
          <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex flex-col justify-end pb-8 animate-in fade-in duration-300" onClick={() => setShowIosInstall(false)}>
               <div className="bg-white mx-4 rounded-2xl p-6 text-center relative animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
                   <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white p-2 rounded-full shadow-lg">
                        <svg className="w-8 h-8 text-[#003366]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                   </div>
                   
                   <h3 className="mt-4 text-xl font-black text-[#003366] mb-2">Install for iPhone</h3>
                   <p className="text-gray-500 mb-6">Install this app to your home screen for instant access.</p>
                   
                   <div className="text-left space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                       <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-[#003366]">
                               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                           </div>
                           <span className="font-bold text-sm text-gray-700">1. Tap the Share button below</span>
                       </div>
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-[#003366]">
                               <span className="text-xl leading-none">+</span>
                           </div>
                           <span className="font-bold text-sm text-gray-700">2. Scroll down & tap "Add to Home Screen"</span>
                       </div>
                   </div>

                   <button onClick={() => setShowIosInstall(false)} className="mt-6 w-full py-3 bg-[#003366] text-white font-bold rounded-xl active:scale-95 transition-transform">
                       Got it
                   </button>
                   
                   <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-white text-4xl animate-bounce">
                       ↓
                   </div>
               </div>
          </div>
      )}

      <main className="flex-1 p-4 overflow-y-auto pb-32">
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
            />
        )}
        {currentView === AppView.ADMIN && <AdminView />}
      </main>

      <div className="pb-24 text-center text-xs text-gray-400 space-y-1">
         <p>Copyright 2026 Mobile Carb Check</p>
         <a href="mailto:info@carbcleantruckcheck.app" className="text-[#15803d] hover:underline font-bold">info@carbcleantruckcheck.app</a>
         <p className="text-[10px] font-bold">
             <a href="tel:8446858922">844-685-8922</a>
         </p>
      </div>

      {showPwaBanner && deferredPrompt && !isIOS && (
        <div className="fixed bottom-[80px] left-0 right-0 bg-[#003366] text-white p-4 z-40 flex justify-between items-center shadow-lg animate-in slide-in-from-bottom border-t-4 border-[#15803d]">
            <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-lg">
                     <svg className="w-6 h-6 text-[#003366]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                </div>
                <div>
                    <p className="font-bold text-sm">Install App</p>
                    <p className="text-xs text-gray-300">Add to home screen</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => setShowPwaBanner(false)} className="text-gray-400 hover:text-white p-2">✕</button>
                <button onClick={handleInstallClick} className="bg-[#15803d] text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md hover:bg-[#166534] active:scale-95 transition-transform">
                    INSTALL
                </button>
            </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[#003366] pb-safe pt-2 px-6 flex justify-between items-end z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] h-[80px]">
        <button 
          onClick={() => setCurrentView(AppView.HOME)}
          className={`flex flex-col items-center pb-4 w-16 transition-transform active:scale-90 duration-150 ${currentView === AppView.HOME ? '-translate-y-2' : ''}`}
        >
          <div className={`p-2 rounded-full mb-1 transition-colors ${currentView === AppView.HOME ? 'bg-[#15803d] text-white' : 'text-[#003366]'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <span className={`text-[10px] font-bold tracking-widest ${currentView === AppView.HOME ? 'text-[#15803d]' : 'text-gray-400'}`}>CHECK</span>
        </button>

        <button 
          onClick={() => setCurrentView(AppView.ASSISTANT)}
          className={`flex flex-col items-center pb-4 w-16 transition-transform active:scale-90 duration-150 ${currentView === AppView.ASSISTANT ? '-translate-y-2' : ''}`}
        >
           <div className={`p-2 rounded-full mb-1 transition-colors ${currentView === AppView.ASSISTANT ? 'bg-[#15803d] text-white' : 'text-[#003366]'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          </div>
          <span className={`text-[10px] font-bold tracking-widest ${currentView === AppView.ASSISTANT ? 'text-[#15803d]' : 'text-gray-400'}`}>CHAT</span>
        </button>

        <button 
          onClick={() => setCurrentView(AppView.ANALYZE)}
          className={`flex flex-col items-center pb-4 w-16 transition-transform active:scale-90 duration-150 ${currentView === AppView.ANALYZE ? '-translate-y-2' : ''}`}
        >
           <div className={`p-2 rounded-full mb-1 transition-colors ${currentView === AppView.ANALYZE ? 'bg-[#15803d] text-white' : 'text-[#003366]'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
          </div>
          <span className={`text-[10px] font-bold tracking-widest ${currentView === AppView.ANALYZE ? 'text-[#15803d]' : 'text-gray-400'}`}>TOOLS</span>
        </button>

        <button 
          onClick={() => setCurrentView(AppView.PROFILE)}
          className={`flex flex-col items-center pb-4 w-16 transition-transform active:scale-90 duration-150 ${currentView === AppView.PROFILE ? '-translate-y-2' : ''}`}
        >
           <div className={`p-2 rounded-full mb-1 transition-colors ${currentView === AppView.PROFILE ? 'bg-[#15803d] text-white' : 'text-[#003366]'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <span className={`text-[10px] font-bold tracking-widest ${currentView === AppView.PROFILE ? 'text-[#15803d]' : 'text-gray-400'}`}>PROFILE</span>
        </button>
      </nav>
    </div>
  );
};

export default App;