
import React, { useState, useEffect, Suspense } from 'react';
import VinChecker from './components/VinChecker';
import ComplianceGuide from './components/ComplianceGuide';
import ClientIntake from './components/ClientIntake';
import LandingView from './components/LandingView';
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
  const [currentView, setCurrentView] = useState<AppView>(AppView.LANDING); 
  const [user, setUser] = useState<User | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    initGA();
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'intake') setCurrentView(AppView.INTAKE);

    onAuthStateChanged(auth, async (firebaseUser: any) => {
        if (firebaseUser) {
            const cloudHistory = await getHistoryFromCloud(firebaseUser.uid);
            setUser({ email: firebaseUser.email || 'Operator', history: cloudHistory as HistoryItem[] });
            if (currentView === AppView.LANDING) setCurrentView(AppView.HOME);
        } else { 
            setUser(null); 
        }
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => { trackPageView(currentView); }, [currentView]);

  if (currentView === AppView.LANDING) {
    return <LandingView onLaunch={() => setCurrentView(AppView.HOME)} onNavigateTools={() => setCurrentView(AppView.ANALYZE)} />;
  }

  const navItems = [
    { id: AppView.HOME, label: 'HUB', icon: APPLE_ICON },
    { id: AppView.ADMIN, label: 'OPS', icon: ANDROID_ICON },
    { id: AppView.ASSISTANT, label: 'AI', icon: APPLE_ICON },
    { id: AppView.GARAGE, label: 'FLEET', icon: ANDROID_ICON },
  ];

  return (
    <div className="dark min-h-screen bg-carb-navy text-white overflow-x-hidden selection:bg-carb-accent">
        
        {!isOnline && (
          <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black text-[10px] font-black uppercase text-center py-1 z-[200] tracking-widest">
            Offline Mode
          </div>
        )}

        {currentView !== AppView.INTAKE && (
          <header className="pt-safe px-6 py-6 fixed top-0 left-0 right-0 glass-dark z-[100] flex flex-col gap-8">
              <div className="flex flex-col items-start">
                  <h1 className="text-2xl font-black tracking-tighter uppercase italic leading-none">CLEAR TRUCK CHECK</h1>
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mt-1">REGS V12.26.25</p>
              </div>
              
              <div className="flex justify-between items-center w-full max-w-sm mx-auto px-4">
                  {navItems.map(item => (
                    <button 
                      key={item.id} 
                      onClick={() => setCurrentView(item.id)} 
                      className={`flex flex-col items-center gap-1.5 transition-all flex-1 py-3 px-1 rounded-2xl relative ${currentView === item.id ? 'text-blue-500' : 'text-gray-500'}`}
                    >
                      {currentView === item.id && (
                        <div className="absolute inset-0 bg-white/5 rounded-2xl border border-white/10 -z-10 shadow-[0_0_20px_rgba(59,130,246,0.1)]"></div>
                      )}
                      <div className="scale-90">{item.icon}</div>
                      <span className="text-[9px] font-black tracking-widest uppercase leading-none">{item.label}</span>
                    </button>
                  ))}
              </div>
          </header>
        )}

        <main className={`flex-1 overflow-y-auto ${currentView === AppView.INTAKE ? 'pt-6' : 'pt-48'} pb-32`}>
            <div className="px-6">
                <Suspense fallback={<div className="flex justify-center py-20 animate-pulse text-gray-500 uppercase font-black text-[10px] tracking-widest">System Initializing...</div>}>
                    {currentView === AppView.HOME && (
                        <div className="animate-in fade-in duration-700">
                          <VinChecker 
                              onAddToHistory={() => {}} 
                              onNavigateChat={() => setCurrentView(AppView.ASSISTANT)}
                              onShareApp={() => {}}
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

        {currentView !== AppView.HOME && currentView !== AppView.INTAKE && (
             <button 
                onClick={() => setCurrentView(AppView.HOME)}
                className="fixed bottom-safe left-1/2 -translate-x-1/2 mb-8 px-12 py-4 glass rounded-full border border-white/10 text-[10px] font-black uppercase tracking-[0.3em] active-haptic z-[100] italic"
             >
                HUB
             </button>
        )}
    </div>
  );
};

export default App;
