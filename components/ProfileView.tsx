
import React, { useState, useMemo } from 'react';
import { User, HistoryItem } from '../types';
import { signInWithGoogle, logoutUser } from '../services/firebase';

interface Props {
  user: User | null;
  onLogin?: (email: string) => void;
  onRegister?: (email: string) => void;
  onLogout: () => void;
  onAdminAccess?: () => void;
  isOnline?: boolean;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
}

const ProfileView: React.FC<Props> = ({ user, onLogout, onAdminAccess, isOnline = true, isDarkMode, toggleTheme }) => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [notifPermission, setNotifPermission] = useState(Notification.permission);

  const handleAuth = async () => {
    try {
        await signInWithGoogle();
    } catch (e) {
        alert("Authentication failed. Please try again.");
    }
  };

  const requestNotifications = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
  };

  const handlePartnerAccess = () => {
      onAdminAccess?.();
  };

  const filteredHistory = useMemo(() => {
    if (!user) return [];
    let items = [...user.history];
    if (search) items = items.filter(i => i.value.includes(search.toUpperCase()));
    items.sort((a, b) => sort === 'newest' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp);
    return items;
  }, [user, search, sort]);

  // If user is null, we show the login screen.
  // Note: In App.tsx we now set a "Guest Operator" user if not logged in to show local history.
  if (!user || user.email === 'Guest Operator') {
    return (
      <div className="max-w-md mx-auto space-y-10 py-12 px-4 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="text-center space-y-4">
            <h2 className="text-5xl font-light tracking-tighter text-white">Command Link</h2>
            <p className="text-[10px] text-carb-accent font-black uppercase tracking-[0.4em] italic">Access Fleet Intelligence</p>
        </div>

        <div className="glass-card p-12 rounded-[3.5rem] border border-white/5 space-y-10 shadow-2xl">
            <div className="space-y-4 text-center">
                <div className="w-20 h-20 bg-carb-accent/10 rounded-full mx-auto flex items-center justify-center text-4xl border border-carb-accent/20">📡</div>
                <p className="text-xs text-gray-500 font-medium px-6 leading-relaxed">
                    Connect your identity to sync truck data, history, and real-time compliance alerts across all mobile stations.
                </p>
            </div>
            
            <button 
                onClick={handleAuth} 
                className="w-full bg-white text-carb-navy py-6 rounded-3xl font-black uppercase tracking-[0.3em] text-[11px] active-haptic shadow-xl transition-all hover:bg-gray-200 italic"
            >
                Initialize Link
            </button>

            <div className="text-center pt-4">
                <button onClick={handlePartnerAccess} className="text-[9px] text-gray-700 font-black uppercase tracking-[0.4em] hover:text-white transition-colors italic">Partner Portal 🔒</button>
            </div>
        </div>

        {/* Show activity log even for guests if they have local history */}
        {user && user.history.length > 0 && (
           <div className="glass-card rounded-[3.5rem] border border-white/5 overflow-hidden shadow-2xl mt-8">
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                  <h4 className="text-[10px] font-black text-white uppercase tracking-[0.4em] italic">Local Activity Log</h4>
                  <div className="bg-carb-accent/10 text-carb-accent px-3 py-1 rounded-full text-[9px] font-black uppercase border border-carb-accent/20 italic">{user.history.length} Logs</div>
              </div>
              <div className="divide-y divide-white/5">
                  {filteredHistory.map((item: HistoryItem) => (
                      <div key={item.id} className="p-6 hover:bg-white/5 transition-colors flex justify-between items-center">
                          <div className="space-y-1">
                              <p className="font-mono text-xs font-black text-white tracking-widest">{item.value}</p>
                              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{new Date(item.timestamp).toLocaleDateString()}</p>
                          </div>
                      </div>
                  ))}
              </div>
           </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-10 pb-32 animate-in fade-in duration-700">
      <div className="glass-card p-8 rounded-[3.5rem] border border-white/10 flex justify-between items-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-carb-accent/20 text-carb-accent px-4 py-1 rounded-bl-2xl text-[8px] font-black uppercase tracking-widest italic border-b border-l border-white/5">Authenticated</div>
        <div className="space-y-1">
            <h3 className="text-xl font-black tracking-tighter text-white italic truncate max-w-[180px] uppercase">{user.email.split('@')[0]}</h3>
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Active Fleet Operator</p>
        </div>
        <button onClick={() => { logoutUser(); onLogout(); }} className="px-6 py-3 border border-red-500/30 text-red-500 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500/10 active-haptic transition-all italic">Disconnect</button>
      </div>

      {/* SETTINGS CARD */}
      <div className="glass-card p-8 rounded-[3.5rem] border border-white/5 space-y-8">
        <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] italic mb-2">Protocol Settings</h4>
        
        <div className="flex items-center justify-between p-4 rounded-3xl bg-white/5 border border-white/5">
            <div className="space-y-1">
                <p className="text-[10px] font-black text-white uppercase tracking-tight">System Alerts</p>
                <p className="text-[9px] text-gray-500 font-bold uppercase">Deadline Reminders</p>
            </div>
            {notifPermission === 'granted' ? (
                <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">Enabled</span>
            ) : (
                <button onClick={requestNotifications} className="bg-blue-500/10 text-blue-400 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-blue-500/20 active-haptic italic">Enable</button>
            )}
        </div>

        <div className="flex items-center justify-between p-4 rounded-3xl bg-white/5 border border-white/5">
            <div className="space-y-1">
                <p className="text-[10px] font-black text-white uppercase tracking-tight">Dark Mode</p>
                <p className="text-[9px] text-gray-500 font-bold uppercase">Night Op UI</p>
            </div>
            <div className="w-12 h-6 bg-carb-accent rounded-full p-1 relative flex items-center shadow-inner">
                <div className="w-4 h-4 bg-white rounded-full translate-x-6 shadow-md"></div>
            </div>
        </div>
      </div>

      {/* CLOUD HISTORY CARD */}
      <div className="glass-card rounded-[3.5rem] border border-white/5 overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
            <h4 className="text-[10px] font-black text-white uppercase tracking-[0.4em] italic">Activity Log</h4>
            <div className="bg-carb-accent/10 text-carb-accent px-3 py-1 rounded-full text-[9px] font-black uppercase border border-carb-accent/20 italic">{user.history.length} Logs</div>
        </div>

        {/* Search Bar */}
        <div className="px-8 py-4 bg-white/5 border-b border-white/5">
            <div className="relative">
                <input 
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter by VIN or Entity..."
                    className="w-full bg-black/20 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-[10px] font-black text-white placeholder:text-gray-700 outline-none focus:border-carb-accent/50 transition-all uppercase tracking-widest italic"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none">🔍</span>
                {search && (
                    <button 
                        onClick={() => setSearch('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                )}
            </div>
        </div>
        
        <div className="divide-y divide-white/5">
            {filteredHistory.length === 0 ? (
                <div className="p-16 text-center text-[10px] font-black text-gray-700 uppercase tracking-widest italic">
                    {search ? 'No matches found' : 'No Data Cached'}
                </div>
            ) : (
                filteredHistory.map((item: HistoryItem) => (
                    <div key={item.id} className="p-6 hover:bg-white/5 transition-colors flex justify-between items-center">
                        <div className="space-y-1">
                            <p className="font-mono text-xs font-black text-white tracking-widest">{item.value}</p>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{new Date(item.timestamp).toLocaleDateString()}</p>
                        </div>
                        <a 
                            href={`https://cleantruckcheck.arb.ca.gov/Fleet/Vehicle/VehicleComplianceStatusLookup?${item.type === 'VIN' ? 'vin' : 'entity'}=${item.value}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="bg-blue-500/10 text-blue-500 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-blue-500/20 active-haptic italic"
                        >
                            Verify
                        </a>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
