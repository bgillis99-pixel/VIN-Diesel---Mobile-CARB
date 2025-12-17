import React, { useState, useEffect, Suspense } from 'react';
import VinChecker from './components/VinChecker';
import { AppView, User, HistoryItem } from './types';
import { initGA, trackPageView, trackEvent } from './services/analytics';
import { auth, getHistoryFromCloud } from './services/firebase'; // Firebase
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
  const [currentView, setCurrentView] = useState<AppView>(AppView.ASSISTANT); 
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
    
    // Auth Listener
    if (auth) {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Fetch Cloud History
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

  // Track View Changes
  useEffect(() => {
      trackPageView(currentView);
  }, [currentView]);

  const toggleTheme = () => {
      const newMode = !darkMode;
      setDarkMode(newMode);
      localStorage.setItem('vin_diesel_theme', newMode ? 'dark' : 'light');
      trackEvent('toggle_theme', { mode: newMode ? 'dark' : 'light' });
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView(AppView.HOME);
  };

  const handleAddToHistory = (value: string, type: 'VIN' | 'ENTITY' | 'TRUCRS') => {
    // Optimistic UI update, actual save happens in VinChecker via saveToCloud
    if (!user) return;
    const newItem: HistoryItem = {
        id: Date.now().toString(),
        value,
        type,
        timestamp: Date.now()
    };
    setUser({ ...user, history: [newItem, ...user.history] });
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
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 pt-4 pb-32 max-w-lg mx-auto w-full overflow-y-auto">
        <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-[#003366] border-t-transparent rounded-full animate-spin"></div></div>}>
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
            <p className="text-[9px] text-gray-400 mt-2 px-6">Not a government agency. Data sourced from public records.</p>
        </div>
      </main>

      {/* Share Modal & Privacy Modal code remains similar, abbreviated for brevity */}
      {showPrivacy && (
          <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowPrivacy(false)}>
              <div className="bg-white p-6 rounded-3xl max-w-md w-full">
                  <h2 className="font-bold text-xl mb-4">Government Disclaimer</h2>
                  <p className="text-sm mb-4">This application is a private third-party service developed by NorCal CARB Mobile LLC. It is <strong>NOT</strong> affiliated with, endorsed by, or connected to the California Air Resources Board (CARB) or any government agency. All compliance data is sourced from public records pursuant to the California Public Records Act.</p>
                  <button onClick={() => setShowPrivacy(false)} className="w-full bg-[#003366] text-white py-3 rounded-xl font-bold">I Understand</button>
              </div>
          </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 pb-safe pt-1 px-2 flex justify-around items-end z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] h-[80px] transition-colors">
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