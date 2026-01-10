
import React, { useState, useEffect, Suspense, useRef } from 'react';
import VinChecker from './components/VinChecker';
import ComplianceGuide from './components/ComplianceGuide';
import ClientIntake from './components/ClientIntake';
import LandingView from './components/LandingView';
import { AppView, User, HistoryItem, CrmClient, IntakeSubmission } from './types';
import { initGA, trackPageView, trackEvent } from './services/analytics';
import { auth, getHistoryFromCloud, onAuthStateChanged, saveScanToCloud } from './services/firebase'; 
import { triggerHaptic } from './services/haptics';
import Greeting from './components/Greeting';
import InstallPrompt from './components/InstallPrompt';

const ChatAssistant = React.lazy(() => import('./components/ChatAssistant'));
const LiveAssistant = React.lazy(() => import('./components/LiveAssistant'));
const MediaTools = React.lazy(() => import('./components/MediaTools'));
const ProfileView = React.lazy(() => import('./components/ProfileView'));
const GarageView = React.lazy(() => import('./components/GarageView'));
const AdminView = React.lazy(() => import('./components/AdminView'));
const InvoiceApp = React.lazy(() => import('./components/InvoiceApp'));
const CalendarView = React.lazy(() => import('./components/CalendarView'));

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LANDING); 
  const [user, setUser] = useState<User | null>(null);
  const [localHistory, setLocalHistory] = useState<HistoryItem[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activeInvoiceData, setActiveInvoiceData] = useState<any>(null);
  const [showGreeting, setShowGreeting] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const lastHiddenTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('carb_vin_history');
    if (saved) {
      try { setLocalHistory(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    initGA();
    onAuthStateChanged(auth, async (firebaseUser: any) => {
        if (firebaseUser) {
            const cloudHistory = await getHistoryFromCloud(firebaseUser.uid);
            setUser({ email: firebaseUser.email || 'Operator', history: [...cloudHistory as HistoryItem[]] });
            if (currentView === AppView.LANDING) setCurrentView(AppView.HOME);
        } else { 
            setUser({ email: 'Guest Operator', history: localHistory });
        }
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        lastHiddenTimeRef.current = Date.now();
      } else if (lastHiddenTimeRef.current) {
        const timeHidden = Date.now() - lastHiddenTimeRef.current;
        if (timeHidden > 60000) {
          setShowGreeting(true);
          triggerHaptic('success');
        }
        lastHiddenTimeRef.current = null;
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setInstallPromptEvent(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [localHistory]);

  useEffect(() => { trackPageView(currentView); }, [currentView]);

  const handleAddToHistory = (value: string, type: 'VIN' | 'ENTITY' | 'TRUCRS') => {
    const newItem: HistoryItem = { id: Date.now().toString(), value: value.toUpperCase(), type, timestamp: Date.now() };
    const updatedLocal = [newItem, ...localHistory].slice(0, 50);
    setLocalHistory(updatedLocal);
    localStorage.setItem('carb_vin_history', JSON.stringify(updatedLocal));
    if (auth?.currentUser) saveScanToCloud(auth.currentUser.uid, newItem);
  };

  const startInvoiceForClient = (data: any) => {
    setActiveInvoiceData(data);
    setCurrentView(AppView.INVOICE);
    triggerHaptic('medium');
  };

  const handleInstall = () => {
    if (!installPromptEvent) return;
    installPromptEvent.prompt();
    installPromptEvent.userChoice.then(() => {
        setInstallPromptEvent(null);
    });
  };

  if (currentView === AppView.LANDING) {
    return (
      <LandingView 
        onLaunch={() => setCurrentView(AppView.HOME)} 
        onNavigateTools={() => setCurrentView(AppView.ANALYZE)} 
        onNavigateIntake={() => setCurrentView(AppView.INTAKE)}
        onNavigateChat={() => setCurrentView(AppView.ASSISTANT)}
        onNavigateAdmin={() => setCurrentView(AppView.ADMIN)}
      />
    );
  }

  const MetallicStyle = "bg-gradient-to-b from-[#f3f4f6] via-[#d1d5db] to-[#9ca3af] shadow-md border border-white/20 relative overflow-hidden transition-all";
  
  const isSpecialView = currentView === AppView.INTAKE || currentView === AppView.INVOICE;

  return (
    <div className="dark min-h-screen bg-carb-navy text-white overflow-x-hidden selection:bg-carb-accent">
        {showGreeting && <Greeting onClose={() => setShowGreeting(false)} />}
        {installPromptEvent && <InstallPrompt onInstall={handleInstall} onDismiss={() => setInstallPromptEvent(null)} />}

        {!isOnline && <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black text-[10px] font-black uppercase text-center py-1 z-[200]">Offline Mode</div>}

        <header className={`pt-safe px-6 py-4 fixed top-0 left-0 right-0 glass-dark z-[100] border-b border-white/5 transition-all duration-300 ${isSpecialView ? 'h-16' : 'h-auto'}`}>
          <div className="flex justify-between items-center w-full max-w-md mx-auto">
            <button onClick={() => setCurrentView(AppView.HOME)} className="h-10 px-4 rounded-xl metallic-silver transition-all active:scale-95 border-white/40 shadow-md flex items-center justify-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#020617] italic leading-none">{isSpecialView ? 'BACK' : 'HOME'}</span>
            </button>
            
            {!isSpecialView && (
              <nav className="flex items-center gap-2">
                  {[
                    { id: AppView.HOME, label: 'HUB' },
                    { id: AppView.ASSISTANT, label: 'MILA' },
                    { id: AppView.ANALYZE, label: 'AI' },
                    { id: AppView.CALENDAR, label: 'SCHED' },
                    { id: AppView.GARAGE, label: 'FLEET' },
                  ].map(item => (
                    <button 
                      key={item.id} 
                      onClick={() => { triggerHaptic('light'); setCurrentView(item.id); }} 
                      className={`h-10 px-3 flex items-center justify-center rounded-xl transition-all ${currentView === item.id ? 'bg-carb-accent text-white scale-105' : 'opacity-60'} ${MetallicStyle}`}
                    >
                      <span className={`text-[10px] font-black tracking-widest uppercase relative z-10 ${currentView === item.id ? 'text-white' : 'text-[#020617]'}`}>{item.label}</span>
                    </button>
                  ))}
              </nav>
            )}

            {isSpecialView && (
              <div className="flex-1 text-center">
                 <h2 className="text-[10px] font-black text-carb-accent uppercase tracking-[0.4em] italic leading-none">{currentView === AppView.INTAKE ? 'Intake Portal' : 'Invoice Center'}</h2>
              </div>
            )}
          </div>
        </header>

        <main className={`flex-1 overflow-y-auto ${isSpecialView ? 'pt-20' : 'pt-28'} pb-32`}>
            <div className="px-6">
                <Suspense fallback={<div className="flex justify-center py-20 animate-pulse text-gray-400 uppercase font-black text-[10px] tracking-widest">Syncing Hub...</div>}>
                    {currentView === AppView.HOME && (
                        <div className="animate-in fade-in duration-700">
                          <VinChecker onAddToHistory={handleAddToHistory} onNavigateChat={() => setCurrentView(AppView.ASSISTANT)} onShareApp={() => {}} onNavigateTools={() => setCurrentView(AppView.ANALYZE)} />
                          <ComplianceGuide />
                        </div>
                    )}
                    {currentView === AppView.INTAKE && <ClientIntake onComplete={() => setCurrentView(AppView.HOME)} />}
                    {currentView === AppView.INVOICE && <InvoiceApp initialData={activeInvoiceData} onComplete={() => { setActiveInvoiceData(null); setCurrentView(AppView.HOME); }} />}
                    {currentView === AppView.ASSISTANT && <ChatAssistant />}
                    {currentView === AppView.LIVE_ASSISTANT && <LiveAssistant onClose={() => setCurrentView(AppView.HOME)} />}
                    {currentView === AppView.GARAGE && <GarageView user={user} onNavigateLogin={() => setCurrentView(AppView.PROFILE)} />}
                    {currentView === AppView.ANALYZE && <MediaTools />}
                    {currentView === AppView.PROFILE && <ProfileView user={user} onLogout={() => setUser(null)} onAdminAccess={() => setCurrentView(AppView.ADMIN)} />}
                    {currentView === AppView.ADMIN && <AdminView onNavigateInvoice={(data) => startInvoiceForClient(data)} />}
                    {currentView === AppView.CALENDAR && <CalendarView />}
                </Suspense>
            </div>
        </main>

        <button onClick={() => { triggerHaptic('medium'); setCurrentView(AppView.LANDING); }} className="fixed bottom-safe left-1/2 -translate-x-1/2 mb-8 px-10 py-4 metallic-silver rounded-full text-[10px] font-black uppercase tracking-[0.4em] z-[100] italic shadow-2xl border border-white/20">
          <span className="relative z-10 text-slate-900">EXIT TO HUB</span>
        </button>
    </div>
  );
};

export default App;
