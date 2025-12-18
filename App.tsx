import React, { useState, useEffect, Suspense } from 'react';
import VinChecker from './components/VinChecker';
import { AppView, User, HistoryItem } from './types';
import { initGA, trackPageView, trackEvent } from './services/analytics';
import { auth, getHistoryFromCloud } from './services/firebase'; 
import { onAuthStateChanged } from 'firebase/auth';

// Lazy load heavy components
const ChatAssistant = React.lazy(() => import('./components/ChatAssistant'));
const MediaTools = React.lazy(() => import('./components/MediaTools'));
const ProfileView = React.lazy(() => import('./components/ProfileView'));
const GarageView = React.lazy(() => import('./components/GarageView'));
const AdminView = React.lazy(() => import('./components/AdminView'));

const AppLogo = ({ customLogoUrl }: { customLogoUrl?: string | null }) => (
  <div className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-lg text-2xl shadow-sm">
      {customLogoUrl ? <img src={customLogoUrl} alt="Logo" className="w-full h-full object-contain" /> : '🚛'}
  </div>
);

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME); 
  const [user, setUser] = useState<User | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [darkMode, setDarkMode] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [brandingName, setBrandingName] = useState<string | null>(null);
  const [brandingLogo, setBrandingLogo] = useState<string | null>(null);

  const shareUrl = 'https://carbcleantruckcheck.app';

  useEffect(() => {
    initGA();
    setCurrentView(AppView.HOME);
    
    if (auth) {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const cloudHistory = await getHistoryFromCloud(firebaseUser.uid);
                setUser({ 
                    email: firebaseUser.email || 'User', 
                    history: cloudHistory as HistoryItem[] 
                });
            } else {
                setUser(null);
            }
        });
        return () => unsubscribe();
    }
  }, []);

  useEffect(() => {
      trackPageView(currentView);
  }, [currentView]);

  const toggleTheme = () => {
      const newMode = !darkMode;
      setDarkMode(newMode);
      localStorage.setItem('vin_diesel_theme', newMode ? 'dark' : 'light');
      trackEvent('toggle_theme', { mode: newMode ? 'dark' : 'light' });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Mobile CARB Check',
          text: 'Check your VIN compliance instantly for free.',
          url: shareUrl
        });
        trackEvent('share_app_success');
      } catch (err) { console.log(err); }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    }
  };

  const handleAddToHistory = (value: string, type: 'VIN' | 'ENTITY' | 'TRUCRS') => {
    if (!user) return;
    const newItem: HistoryItem = {
        id: Date.now().toString(),
        value,
        type,
        timestamp: Date.now()
    };
    setUser({ ...user, history: [newItem, ...user.history] });
  };

  // Apple/Tesla Style Persistent Utility Bar
  const StickyUtilityBar = () => (
    <div className="flex gap-2 p-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-100 dark:border-gray-800">
        <button 
          onClick={() => {
            trackEvent('top_tester_click');
            // We need to trigger the tester search in VinChecker. 
            // For persistence, we'll use a simple session storage or state lift if needed.
            // Simplified: Navigate home first
            setCurrentView(AppView.HOME);
            setTimeout(() => {
                const btn = document.getElementById('find-tester-trigger');
                btn?.click();
            }, 50);
          }}
          className="flex-1 bg-white dark:bg-gray-800 border-2 border-navy dark:border-blue-400 text-navy dark:text-blue-400 py-2.5 rounded-xl font-black text-[10px] tracking-widest uppercase shadow-sm active:scale-95 transition-all"
        >
            📍 FIND TESTER
        </button>
        <button 
          onClick={() => setShowInstall(true)}
          className="flex-1 bg-white dark:bg-gray-800 border-2 border-navy dark:border-blue-400 text-navy dark:text-blue-400 py-2.5 rounded-xl font-black text-[10px] tracking-widest uppercase shadow-sm active:scale-95 transition-all"
        >
            📲 DOWNLOAD APP
        </button>
    </div>
  );

  return (
    <div className={darkMode ? 'dark' : ''}>
    <div className="min-h-screen flex flex-col bg-[#f8f9fa] dark:bg-gray-900 font-sans text-navy dark:text-gray-100 transition-colors duration-200">
      
      {/* PERSISTENT TOP UTILITY BAR (Apple/Tesla Style) */}
      <StickyUtilityBar />

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 py-3 px-4 text-center shadow-sm z-30 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center transition-colors">
        <div className="flex items-center gap-2">
            <AppLogo customLogoUrl={brandingLogo} />
            <div className="text-left leading-none">
                <h1 className="text-base font-black tracking-tighter text-navy dark:text-white uppercase truncate max-w-[180px]">
                    {brandingName || "MOBILE CARB"}
                </h1>
                <p className="text-green text-[9px] font-bold tracking-widest uppercase">
                    {brandingName ? "FLEET COMPLIANCE" : "CHECK APP"}
                </p>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
            <button onClick={() => setCurrentView(AppView.PROFILE)} className="text-navy dark:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 pt-4 pb-32 max-w-lg mx-auto w-full overflow-y-auto">
        <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-navy border-t-transparent rounded-full animate-spin"></div></div>}>
          {currentView === AppView.HOME && (
              <VinChecker 
                  onAddToHistory={handleAddToHistory} 
                  onNavigateChat={() => setCurrentView(AppView.ASSISTANT)}
                  onShareApp={() => setShowInstall(true)}
              />
          )}
          {currentView === AppView.ASSISTANT && <ChatAssistant />}
          {currentView === AppView.GARAGE && <GarageView user={user} onNavigateLogin={() => setCurrentView(AppView.PROFILE)} />}
          {currentView === AppView.ANALYZE && <MediaTools />}
          {currentView === AppView.PROFILE && (
              <ProfileView 
                  user={user} 
                  onLogin={() => {}} 
                  onRegister={() => {}} 
                  onLogout={() => setUser(null)}
                  onAdminAccess={() => setCurrentView(AppView.ADMIN)}
                  isOnline={isOnline}
                  isDarkMode={darkMode}
                  toggleTheme={toggleTheme}
              />
          )}
          {currentView === AppView.ADMIN && <AdminView />}
        </Suspense>

        {/* 3x2 ACTION HUB (Tesla Style) */}
        <div className="mt-12 mb-10 space-y-4">
            <h3 className="text-[10px] font-black text-navy/40 dark:text-white/40 uppercase tracking-[0.2em] text-center">Quick Action Hub</h3>
            <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "PHONE", icon: "📞", action: () => window.location.href = 'tel:6173596953' },
                  { label: "EMAIL", icon: "✉️", action: () => window.location.href = 'mailto:bryan@norcalcarbmobile.com?subject=Compliance Inquiry' },
                  { label: "BLOG", icon: "🌐", action: () => window.open('https://norcalcarbmobile.com', '_blank') },
                  { label: "SHARE", icon: "📤", action: handleShare },
                  { label: "SAVE", icon: "📲", action: () => setShowInstall(true) },
                  { label: "PRIVACY", icon: "⚖️", action: () => setShowPrivacy(true) }
                ].map((btn, i) => (
                  <button 
                    key={i} 
                    onClick={btn.action}
                    className="flex flex-col items-center justify-center bg-navy dark:bg-gray-800 p-4 rounded-2xl shadow-lg border border-white/5 active:scale-95 transition-all"
                  >
                    <span className="text-xl mb-1">{btn.icon}</span>
                    <span className="text-[10px] font-black text-white tracking-widest">{btn.label}</span>
                  </button>
                ))}
            </div>
            
            {/* Repeated Persistent Bar at bottom for convenience */}
            <div className="pt-8">
                <StickyUtilityBar />
            </div>

            {/* Government Disclaimer (Clean Text) */}
            <div className="text-center px-4 mt-8">
                <p className="text-[8px] text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-relaxed">
                    © 2026 SILVERBACK GROUP AND MLB MARKETING LLC<br/>
                    NOT A GOVERNMENT AGENCY • PUBLIC RECORD DATA ONLY
                </p>
            </div>
        </div>
      </main>

      {/* Install Instruction Modal */}
      {showInstall && (
          <div className="fixed inset-0 z-[150] bg-navy/90 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-in fade-in slide-in-from-bottom-20 duration-300" onClick={() => setShowInstall(false)}>
              <div className="bg-white dark:bg-gray-800 p-8 rounded-t-[3rem] sm:rounded-[3rem] max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-6"></div>
                  <div className="text-center space-y-4">
                      <div className="w-20 h-20 bg-green rounded-3xl mx-auto flex items-center justify-center text-4xl text-white shadow-xl shadow-green/20">🚛</div>
                      <h2 className="text-2xl font-black text-navy dark:text-white leading-tight">Install Mobile CARB</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium px-4">Add this app to your home screen for instant compliance checks and offline access.</p>
                      
                      <div className="bg-gray-50 dark:bg-gray-700 p-5 rounded-3xl text-left space-y-4 border border-gray-100 dark:border-gray-600">
                          <div className="flex gap-4 items-start">
                              <span className="bg-navy text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                              <p className="text-xs font-bold text-gray-700 dark:text-gray-200">Tap the 'Share' or 'Menu' icon in your browser.</p>
                          </div>
                          <div className="flex gap-4 items-start">
                              <span className="bg-navy text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                              <p className="text-xs font-bold text-gray-700 dark:text-gray-200">Select 'Add to Home Screen' or 'Install App'.</p>
                          </div>
                      </div>

                      <button onClick={() => setShowInstall(false)} className="w-full bg-navy text-white py-4 rounded-2xl font-black tracking-widest uppercase shadow-lg shadow-navy/20">
                          GOT IT
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Privacy Modal */}
      {showPrivacy && (
          <div className="fixed inset-0 z-[160] bg-navy/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowPrivacy(false)}>
              <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] max-w-md w-full border border-white/10 shadow-2xl">
                  <h2 className="font-black text-2xl text-navy dark:text-white mb-4">Legal Disclaimer</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                      Mobile CARB Check is a <strong>private 3rd-party service</strong> developed by NorCal CARB Mobile LLC. We are <strong>not</strong> a government agency. All data is pulled via public record API requests.
                  </p>
                  <button onClick={() => setShowPrivacy(false)} className="w-full bg-navy text-white py-4 rounded-2xl font-black">CLOSE</button>
              </div>
          </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-t border-gray-200 dark:border-gray-700 pb-safe pt-1 px-2 flex justify-around items-end z-30 h-[85px] transition-colors">
        {[
            { id: AppView.HOME, icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", label: "CHECK" },
            { id: AppView.ASSISTANT, icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z", label: "CHAT" },
            { id: AppView.GARAGE, icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z", label: "GARAGE" },
            { id: AppView.ANALYZE, icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z", label: "TOOLS" },
            { id: AppView.PROFILE, icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", label: "PROFILE" }
        ].map(btn => (
            <button 
                key={btn.id}
                onClick={() => setCurrentView(btn.id as AppView)}
                className={`flex flex-col items-center justify-center w-16 h-full pb-4 transition-all duration-300 active:scale-90 ${currentView === btn.id ? '-translate-y-2' : ''}`}
            >
                <div className={`p-2 rounded-2xl mb-1 transition-colors ${currentView === btn.id ? 'bg-green text-white shadow-xl shadow-green/20' : 'text-gray-700 dark:text-gray-300'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={btn.icon} /></svg>
                </div>
                <span className={`text-[9px] font-black tracking-widest uppercase ${currentView === btn.id ? 'text-navy dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>{btn.label}</span>
            </button>
        ))}
      </nav>
    </div>
    </div>
  );
};

export default App;