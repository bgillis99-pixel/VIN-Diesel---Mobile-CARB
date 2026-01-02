import React, { useState, useEffect, Suspense } from 'react';
import VinChecker from './components/VinChecker';
import ComplianceGuide from './components/ComplianceGuide';
import ClientIntake from './components/ClientIntake';
import { AppView, User, HistoryItem } from './types';
import { initGA, trackPageView, trackEvent } from './services/analytics';
import { auth, getHistoryFromCloud, onAuthStateChanged } from './services/firebase'; 

const ChatAssistant = React.lazy(() => import('./components/ChatAssistant'));
const MediaTools = React.lazy(() => import('./components/MediaTools'));
const ProfileView = React.lazy(() => import('./components/ProfileView'));
const GarageView = React.lazy(() => import('./components/GarageView'));
const AdminView = React.lazy(() => import('./components/AdminView'));

const APPLE_ICON = (
  <svg className="w-5 h-5" viewBox="0 0 384 512" fill="currentColor">
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
  </svg>
);

const ANDROID_ICON = (
  <svg className="w-5 h-5" viewBox="0 0 576 512" fill="currentColor">
    <path d="M420.55 301.93a24 24 0 1 1 24-24 24 24 0 0 1-24 24zm-265.1 0a24 24 0 1 1 24-24 24 24 0 0 1-24 24zm378.7-151.1l33.8-58.5a11 11 0 0 0-3.9-15.1 11.2 11.2 0 0 0-15.2 4L515 139.75c-50.7-42.3-116.3-65.6-187-65.6s-136.3 23.3-187 65.6l-33.8-58.5a11.2 11.2 0 0 0-15.2-4 11 11 0 0 0-3.9 15.1l33.8 58.5C51.5 197.6 0 285.5 0 384h576c0-98.5-51.5-186.4-121.85-233.17z" />
  </svg>
);

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME); 
  const [user, setUser] = useState<User | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    initGA();
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'intake') setCurrentView(AppView.INTAKE);

    onAuthStateChanged(auth, async (firebaseUser: any) => {
        if (firebaseUser) {
            const cloudHistory = await getHistoryFromCloud(firebaseUser.uid);
            setUser({ email: firebaseUser.email || 'Operator', history: cloudHistory as HistoryItem[] });
        } else { setUser(null); }
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => { trackPageView(currentView); }, [currentView]);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        alert("To install: Tap the 'Share' icon and select 'Add to Home Screen'.");
      } else {
        alert("Launch the app menu and select 'Install' or 'Add to Home Screen'.");
      }
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      trackEvent('pwa_install_accepted');
    }
    setDeferredPrompt(null);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Clean Truck Check Compliant',
          text: 'Check your CARB compliance status instantly!',
          url: 'https://carbcleantruckcheck.app'
        });
      } catch (err) { console.error(err); }
    } else {
      navigator.clipboard.writeText('https://carbcleantruckcheck.app');
      alert('Link copied to clipboard!');
    }
  };

  const navItems = [
    { id: AppView.ANALYZE, label: 'HUB', icon: APPLE_ICON },
    { id: AppView.ADMIN, label: 'OPS', icon: ANDROID_ICON },
    { id: AppView.ASSISTANT, label: 'AI', icon: APPLE_ICON },
    { id: AppView.GARAGE, label: 'FLEET', icon: ANDROID_ICON },
  ];

  return (
    <div className="dark min-h-screen bg-carb-navy text-white overflow-x-hidden selection:bg-carb-accent">
        {!isOnline && (
          <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black text-[10px] font-black uppercase text-center py-1 z-[1000] tracking-widest">
            Offline Mode - Local Cache Active
          </div>
        )}
        
        {currentView !== AppView.INTAKE && (
          <header className="pt-safe px-4 py-3 fixed top-0 left-0 right-0 glass-dark z-[100] flex flex-col gap-3">
              <div className="flex justify-between items-center">
                  <div className="flex flex-col cursor-pointer" onClick={() => setCurrentView(AppView.HOME)}>
                      <h1 className="text-lg font-black tracking-tighter uppercase italic">CTC COMPLIANT</h1>
                      <p className="text-[8px] font-black text-blue-500 uppercase tracking-[0.25em] -mt-1">REGS v12.26.25</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleShare} className="w-10 h-10 rounded-full glass flex items-center justify-center border border-white/10 active-haptic">
                      📤
                    </button>
                    <button onClick={() => setCurrentView(AppView.PROFILE)} className="w-10 h-10 rounded-full glass flex items-center justify-center border border-white/10 active-haptic">
                        {user ? <span className="text-[10px] font-black">{user.email[0].toUpperCase()}</span> : '👤'}
                    </button>
                  </div>
              </div>
              <div className="flex justify-between px-2 gap-1">
                  {navItems.map(item => (
                    <button 
                      key={item.id} 
                      onClick={() => setCurrentView(item.id)} 
                      className={`flex flex-col items-center gap-1 transition-all flex-1 py-2 rounded-2xl ${currentView === item.id ? 'text-carb-accent bg-white/5 border border-white/5' : 'text-gray-500 border border-transparent'}`}
                    >
                      <div className="scale-75">{item.icon}</div>
                      <span className="text-[8px] font-black tracking-widest uppercase leading-none">{item.label}</span>
                    </button>
                  ))}
              </div>
          </header>
        )}

        <main className={`flex-1 overflow-y-auto ${currentView === AppView.INTAKE ? 'pt-6' : 'pt-36'} pb-24`}>
            <div className="px-6">
                <Suspense fallback={<div className="flex justify-center py-20 animate-pulse text-gray-500 uppercase font-black text-[10px] tracking-widest">Calibrating Optics...</div>}>
                    {currentView === AppView.HOME && (
                        <div className="animate-in fade-in duration-700">
                          <VinChecker 
                              onAddToHistory={() => {}} 
                              onNavigateChat={() => setCurrentView(AppView.ASSISTANT)}
                              onShareApp={handleInstall}
                              onNavigateTools={() => setCurrentView(AppView.ANALYZE)}
                          />
                          <ComplianceGuide />
                        </div>
                    )}
                    {currentView === AppView.INTAKE && <ClientIntake onComplete={() => setCurrentView(AppView.HOME)} />}
                    {currentView === AppView.ASSISTANT && <ChatAssistant />}
                    {currentView === AppView.GARAGE && <GarageView user={user} onNavigateLogin={() => setCurrentView(AppView.PROFILE)} />}
                    {currentView === AppView.ANALYZE && <MediaTools />}
                    {currentView === AppView.PROFILE && <ProfileView user={user} onLogout={() => setUser(null)} onAdminAccess={() => setCurrentView(AppView.ADMIN)} />}
                    {currentView === AppView.ADMIN && <AdminView />}
                </Suspense>
            </div>
        </main>

        {/* Floating AI Button */}
        {currentView !== AppView.INTAKE && currentView !== AppView.ASSISTANT && (
            <button 
                onClick={() => setCurrentView(AppView.ASSISTANT)}
                className="fixed bottom-24 right-6 w-16 h-16 bg-carb-accent text-white rounded-full shadow-[0_10px_40px_rgba(59,130,246,0.6)] flex items-center justify-center z-[150] active-haptic animate-pulse-slow border-2 border-white/30 group"
            >
                <span className="text-3xl group-hover:scale-110 transition-transform">🤖</span>
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border border-carb-navy uppercase">Live</span>
            </button>
        )}

        {/* Global Footer Navigation for Quick Home Access */}
        {currentView !== AppView.HOME && currentView !== AppView.INTAKE && (
             <button 
                onClick={() => setCurrentView(AppView.HOME)}
                className="fixed bottom-safe left-1/2 -translate-x-1/2 mb-6 px-10 py-3 glass rounded-full border border-white/10 text-[9px] font-black uppercase tracking-widest active-haptic z-[100] italic"
             >
                Home Hub
             </button>
        )}

    </div>
  );
};

export default App;