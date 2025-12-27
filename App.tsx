
import React, { useState, useEffect, Suspense } from 'react';
import VinChecker from './components/VinChecker';
import ComplianceGuide from './components/ComplianceGuide';
import ClientIntake from './components/ClientIntake';
import { AppView, User, HistoryItem } from './types';
import { initGA, trackPageView } from './services/analytics';
import { auth, getHistoryFromCloud, onAuthStateChanged } from './services/firebase'; 

const ChatAssistant = React.lazy(() => import('./components/ChatAssistant'));
const MediaTools = React.lazy(() => import('./components/MediaTools'));
const ProfileView = React.lazy(() => import('./components/ProfileView'));
const GarageView = React.lazy(() => import('./components/GarageView'));
const AdminView = React.lazy(() => import('./components/AdminView'));

const APPLE_ICON = (
  <svg className="w-6 h-6" viewBox="0 0 384 512" fill="currentColor">
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
  </svg>
);

const ANDROID_ICON = (
  <svg className="w-6 h-6" viewBox="0 0 576 512" fill="currentColor">
    <path d="M420.55 301.93a24 24 0 1 1 24-24 24 24 0 0 1-24 24zm-265.1 0a24 24 0 1 1 24-24 24 24 0 0 1-24 24zm378.7-151.1l33.8-58.5a11 11 0 0 0-3.9-15.1 11.2 11.2 0 0 0-15.2 4L515 139.75c-50.7-42.3-116.3-65.6-187-65.6s-136.3 23.3-187 65.6l-33.8-58.5a11.2 11.2 0 0 0-15.2-4 11 11 0 0 0-3.9 15.1l33.8 58.5C51.5 197.6 0 285.5 0 384h576c0-98.5-51.5-186.4-121.85-233.17z" />
  </svg>
);

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME); 
  const [user, setUser] = useState<User | null>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    initGA();
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'intake') setCurrentView(AppView.INTAKE);

    if (auth) {
        onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const cloudHistory = await getHistoryFromCloud(firebaseUser.uid);
                setUser({ email: firebaseUser.email || 'User', history: cloudHistory as HistoryItem[] });
            } else { setUser(null); }
        });
    }
  }, []);

  useEffect(() => { trackPageView(currentView); }, [currentView]);

  const handleShare = () => {
    const url = window.location.origin;
    if (navigator.share) {
      navigator.share({ title: 'CTC Compliant', text: 'Fast CARB VIN checks & OVI protocol.', url });
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied!');
    }
  };

  const navItems = [
    { id: AppView.ANALYZE, label: 'FIELD', icon: APPLE_ICON },
    { id: AppView.ADMIN, label: 'CRM', icon: ANDROID_ICON },
    { id: AppView.ASSISTANT, label: 'AI', icon: APPLE_ICON },
    { id: AppView.GARAGE, label: 'FLEET', icon: ANDROID_ICON },
  ];

  return (
    <div className="dark">
      <div className="min-h-screen flex flex-col bg-carb-navy text-white font-sans">
        
        {currentView !== AppView.INTAKE && (
          <header className="pt-safe px-4 py-3 fixed top-0 left-0 right-0 glass-dark z-[100] flex flex-col gap-3">
              <div className="flex justify-between items-center">
                  <div className="flex flex-col" onClick={() => setCurrentView(AppView.HOME)} role="button">
                      <h1 className="text-lg font-black tracking-tighter text-white uppercase italic">CTC COMPLIANT</h1>
                      <p className="text-[8px] font-black text-blue-500 uppercase tracking-[0.25em] -mt-1">V12.26.25</p>
                  </div>
                  <div className="flex gap-1.5">
                      <button onClick={handleShare} className="w-8 h-8 rounded-full glass border border-white/10 flex items-center justify-center text-xs active-haptic">
                        {ANDROID_ICON}
                      </button>
                  </div>
              </div>
              <div className="flex justify-between px-2">
                  {navItems.map(item => (
                    <button key={item.id} onClick={() => setCurrentView(item.id)} className={`flex flex-col items-center gap-1 transition-all ${currentView === item.id ? 'text-carb-accent' : 'text-gray-500'}`}>
                      <div className="scale-75">{item.icon}</div>
                      <span className="text-[8px] font-black tracking-widest">{item.label}</span>
                    </button>
                  ))}
              </div>
          </header>
        )}

        <main className={`flex-1 overflow-y-auto ${currentView === AppView.INTAKE ? 'pt-6' : 'pt-32'} pb-12`}>
            <div className="px-6">
                <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-carb-accent border-t-transparent rounded-full animate-spin"></div></div>}>
                    {currentView === AppView.HOME && (
                        <>
                          <VinChecker 
                              onAddToHistory={() => {}} 
                              onNavigateChat={() => setCurrentView(AppView.ASSISTANT)}
                              onShareApp={() => setShowInstall(true)}
                              onNavigateTools={() => setCurrentView(AppView.ANALYZE)}
                          />
                          <ComplianceGuide />
                        </>
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
      </div>
    </div>
  );
};

export default App;
