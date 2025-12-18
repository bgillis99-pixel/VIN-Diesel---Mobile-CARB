import React, { useState, useEffect, Suspense } from 'react';
import VinChecker from './components/VinChecker';
import { AppView, User, HistoryItem } from './types';
import { initGA, trackPageView, trackEvent } from './services/analytics';
import { auth, getHistoryFromCloud } from './services/firebase'; 
import { onAuthStateChanged } from 'firebase/auth';

const ChatAssistant = React.lazy(() => import('./components/ChatAssistant'));
const MediaTools = React.lazy(() => import('./components/MediaTools'));
const ProfileView = React.lazy(() => import('./components/ProfileView'));
const GarageView = React.lazy(() => import('./components/GarageView'));
const AdminView = React.lazy(() => import('./components/AdminView'));

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME); 
  const [user, setUser] = useState<User | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [isOnline] = useState(navigator.onLine);
  const [darkMode, setDarkMode] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const shareUrl = 'https://carbcleantruckcheck.app';

  useEffect(() => {
    initGA();
    if (auth) {
        onAuthStateChanged(auth, async (firebaseUser) => {
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
    }
  }, []);

  useEffect(() => {
      trackPageView(currentView);
  }, [currentView]);

  const toggleTheme = () => {
      setDarkMode(!darkMode);
      trackEvent('toggle_theme', { mode: !darkMode ? 'dark' : 'light' });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Mobile CARB Check',
          text: 'Check your VIN compliance instantly for free.',
          url: shareUrl
        });
      } catch (err) { console.log(err); }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied!');
    }
  };

  const handleAddToHistory = (value: string, type: 'VIN' | 'ENTITY' | 'TRUCRS') => {
    if (!user) return;
    const newItem: HistoryItem = { id: Date.now().toString(), value, type, timestamp: Date.now() };
    setUser({ ...user, history: [newItem, ...user.history] });
  };

  // Apple/Tesla Style Persistent Utility Bar (White with Blue Outline/Bold Font)
  const StickyUtilityBar = () => (
    <div className="flex gap-3 px-4 py-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800">
        <button 
          onClick={() => {
            setCurrentView(AppView.HOME);
            setTimeout(() => document.getElementById('find-tester-trigger')?.click(), 50);
          }}
          className="flex-1 bg-white border-[3px] border-navy text-navy py-3 rounded-2xl font-black text-[11px] tracking-widest uppercase shadow-md active:scale-95 transition-all"
        >
            📍 FIND TESTER
        </button>
        <button 
          onClick={() => setShowInstall(true)}
          className="flex-1 bg-white border-[3px] border-navy text-navy py-3 rounded-2xl font-black text-[11px] tracking-widest uppercase shadow-md active:scale-95 transition-all"
        >
            📲 DOWNLOAD APP
        </button>
    </div>
  );

  return (
    <div className={darkMode ? 'dark' : ''}>
    <div className="min-h-screen flex flex-col bg-slate-200 dark:bg-slate-950 font-sans transition-colors duration-300">
      
      {/* PERSISTENT TOP UTILITY BAR */}
      <StickyUtilityBar />

      {/* ZERO DEAD SPACE HEADER */}
      <header className="bg-navy py-4 px-6 text-white shadow-xl z-30 flex justify-between items-center transition-colors">
        <button onClick={() => window.location.href = 'tel:6173596953'} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
            <span className="text-2xl">📞</span>
            <span className="text-[10px] font-black uppercase tracking-tighter">DISPATCH</span>
        </button>
        
        <button onClick={() => setCurrentView(AppView.ASSISTANT)} className="flex items-center gap-3 bg-white/10 px-6 py-2.5 rounded-full border border-white/20 active:scale-95 transition-all shadow-inner">
            <span className="text-xl">🤖</span>
            <span className="font-black text-sm uppercase tracking-[0.15em]">VIN DIESEL AI</span>
        </button>
        
        <button onClick={handleShare} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
            <span className="text-2xl">📤</span>
            <span className="text-[10px] font-black uppercase tracking-tighter">SHARE</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-4 pt-8 pb-40 max-w-lg mx-auto w-full overflow-y-auto scroll-smooth">
        {/* App Container Card - High Contrast Standing Out */}
        <div className="bg-[#f8f9fa] dark:bg-gray-900 rounded-[3.5rem] shadow-[0_25px_60px_-15px_rgba(0,51,102,0.4)] border-2 border-white/60 dark:border-gray-800 overflow-hidden min-h-[600px] transition-all">
            <Suspense fallback={<div className="flex flex-col justify-center items-center h-[500px]"><div className="w-12 h-12 border-[6px] border-navy border-t-transparent rounded-full animate-spin"></div><p className="mt-4 font-black text-navy uppercase text-xs tracking-widest">Warming Engine...</p></div>}>
              {currentView === AppView.HOME && (
                  <VinChecker 
                      onAddToHistory={handleAddToHistory} 
                      onNavigateChat={() => setCurrentView(AppView.ASSISTANT)}
                      onShareApp={() => setShowInstall(true)}
                      onNavigateTools={() => setCurrentView(AppView.ANALYZE)}
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
        </div>

        {/* 3x2 ACTION HUB (Tesla Style) */}
        <div className="mt-16 mb-12 space-y-6">
            <div className="flex items-center gap-3 px-4">
                <div className="flex-1 h-px bg-navy/10"></div>
                <h3 className="text-[11px] font-black text-navy dark:text-white/60 uppercase tracking-[0.3em]">Quick Hub</h3>
                <div className="flex-1 h-px bg-navy/10"></div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
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
                    className="flex flex-col items-center justify-center bg-navy dark:bg-gray-800 p-5 rounded-3xl shadow-xl border border-white/5 active:scale-95 transition-all"
                  >
                    <span className="text-2xl mb-1">{btn.icon}</span>
                    <span className="text-[10px] font-black text-white tracking-widest leading-none">{btn.label}</span>
                  </button>
                ))}
            </div>
            
            <div className="pt-10">
                <StickyUtilityBar />
            </div>

            <div className="text-center px-8 mt-12 pb-20">
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.15em] leading-relaxed">
                    © 2026 SILVERBACK GROUP & MLB MARKETING LLC<br/>
                    <span className="opacity-60 italic text-[8px]">NOT A GOVERNMENT ENTITY • PUBLIC RECORD DATA SOURCE</span>
                </p>
            </div>
        </div>
      </main>

      {/* Install Instruction Modal */}
      {showInstall && (
          <div className="fixed inset-0 z-[150] bg-navy/95 backdrop-blur-xl flex items-end sm:items-center justify-center p-4 animate-in fade-in slide-in-from-bottom-20 duration-500" onClick={() => setShowInstall(false)}>
              <div className="bg-white dark:bg-gray-800 p-10 rounded-t-[4rem] sm:rounded-[3.5rem] max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-8"></div>
                  <div className="text-center space-y-6">
                      <div className="w-28 h-28 bg-green rounded-[2.5rem] mx-auto flex items-center justify-center text-5xl text-white shadow-2xl shadow-green/20">🚛</div>
                      <h2 className="text-3xl font-black text-navy dark:text-white leading-tight uppercase tracking-tighter">Install App</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-bold px-6 leading-relaxed">Add to your home screen for instant compliance checks and offline tools.</p>
                      
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-[2.5rem] text-left space-y-5 border border-gray-100 dark:border-gray-600">
                          <div className="flex gap-4 items-center">
                              <span className="bg-navy text-white w-8 h-8 rounded-full flex items-center justify-center text-xs font-black">1</span>
                              <p className="text-xs font-black text-navy dark:text-white uppercase tracking-widest">Tap Share Icon</p>
                          </div>
                          <div className="flex gap-4 items-center">
                              <span className="bg-navy text-white w-8 h-8 rounded-full flex items-center justify-center text-xs font-black">2</span>
                              <p className="text-xs font-black text-navy dark:text-white uppercase tracking-widest">Add to Home Screen</p>
                          </div>
                      </div>

                      <button onClick={() => setShowInstall(false)} className="w-full bg-navy text-white py-6 rounded-3xl font-black tracking-widest uppercase shadow-2xl active:scale-95 transition-all">
                          UNDERSTOOD
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-2xl border-t border-gray-200 dark:border-gray-700 pb-safe pt-2 px-3 flex justify-around items-end z-30 h-[95px] transition-colors">
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
                className={`flex flex-col items-center justify-center w-16 h-full pb-5 transition-all duration-300 active:scale-90 ${currentView === btn.id ? '-translate-y-2' : ''}`}
            >
                <div className={`p-2.5 rounded-2xl mb-1.5 transition-all ${currentView === btn.id ? 'bg-green text-white shadow-2xl shadow-green/40' : 'text-navy dark:text-gray-300'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={btn.icon} /></svg>
                </div>
                <span className={`text-[10px] font-black tracking-widest uppercase ${currentView === btn.id ? 'text-navy dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>{btn.label}</span>
            </button>
        ))}
      </nav>
    </div>
    </div>
  );
};

export default App;