import React, { useState, useMemo, useEffect } from 'react';
import { User, HistoryItem } from '../types';
import { signInWithGoogle, logoutUser, auth } from '../services/firebase'; // Firebase

interface Props {
  user: User | null;
  onLogin: (email: string) => void;
  onRegister: (email: string) => void;
  onLogout: () => void;
  onAdminAccess?: () => void;
  isOnline?: boolean;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
}

const ProfileView: React.FC<Props> = ({ user, onLogout, onAdminAccess, isOnline = true, isDarkMode, toggleTheme }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'value'>('newest');
  const [notifPermission, setNotifPermission] = useState(Notification.permission);

  // Firebase Google Login Handler
  const handleGoogleLogin = async () => {
    try {
        await signInWithGoogle();
        // The parent App component should listen to auth state changes and update the 'user' prop
    } catch (e) {
        alert("Google Sign-In failed. Please try again.");
    }
  };

  const requestNotifications = async () => {
    if (!('Notification' in window)) {
        alert("This browser does not support notifications.");
        return;
    }
    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
    if (permission === 'granted') {
        new Notification('Alerts Enabled', {
            body: 'You will now receive CARB deadline reminders.',
        });
    }
  };

  const handlePartnerAccess = () => {
      const code = prompt("Enter Partner Access Code:");
      if (code === '1225') {
          onAdminAccess?.();
      } else if (code) {
          alert("Access Denied");
      }
  };

  const filteredHistory = useMemo(() => {
    if (!user) return [];
    let items = [...user.history];
    if (search) items = items.filter(i => i.value.includes(search.toUpperCase()));
    items.sort((a, b) => {
      if (sort === 'newest') return b.timestamp - a.timestamp;
      if (sort === 'oldest') return a.timestamp - b.timestamp;
      return 0;
    });
    return items;
  }, [user, search, sort]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-[#003366] dark:text-white mb-2 text-center">Driver Login</h2>
        <p className="text-center text-sm text-gray-500 mb-6">Sync your trucks and history across devices.</p>
        
        <button onClick={handleGoogleLogin} className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 shadow-sm mb-4">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" />
            Continue with Google
        </button>

        <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300 dark:border-gray-600"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Or use email (Legacy)</span></div>
        </div>

        <form className="space-y-4 opacity-50 pointer-events-none">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input type="email" disabled value={email} className="w-full p-3 border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <input type="password" disabled value={password} className="w-full p-3 border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-white" />
          </div>
          <button type="button" disabled className="w-full bg-[#003366] text-white font-bold py-3 rounded-lg">Log In</button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 text-center">
             <button onClick={handlePartnerAccess} className="text-xs text-gray-300 hover:text-gray-500 font-bold uppercase tracking-wider">🔒 Admin Access (Partner Login)</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 flex justify-between items-center transition-colors">
        <div>
            <h2 className="text-xl font-bold text-[#003366] dark:text-white">{user.email}</h2>
            <div className="mt-2 inline-block bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-[10px] font-bold px-2 py-1 rounded border border-green-200 dark:border-green-800">CLOUD SYNC ACTIVE</div>
        </div>
        <button onClick={() => { logoutUser(); onLogout(); }} className="text-red-500 text-sm font-bold border border-red-100 dark:border-red-900/30 px-3 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20">Sign Out</button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 transition-colors">
        <div className="flex items-center justify-between mb-4">
             <h3 className="font-bold text-[#003366] dark:text-white text-lg">Settings</h3>
        </div>
        
        <div className="space-y-4">
             <div className="flex items-center justify-between">
                <div>
                    <h4 className="font-bold text-sm text-gray-700 dark:text-gray-200">Alerts & Notifications</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Get notified about 2025 deadlines.</p>
                </div>
                {notifPermission === 'granted' ? (
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200">ACTIVE</span>
                ) : (
                    <button onClick={requestNotifications} className="bg-[#003366] text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#002244] transition-colors">🔔 ENABLE</button>
                )}
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                <div>
                    <h4 className="font-bold text-sm text-gray-700 dark:text-gray-200">Dark Mode</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Reduce eye strain at night.</p>
                </div>
                <button 
                    onClick={toggleTheme} 
                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${isDarkMode ? 'bg-[#15803d]' : 'bg-gray-300'}`}
                >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
            </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-bold text-[#003366] dark:text-white">Cloud History ({user.history.length})</h3>
            <div className="flex gap-2">
                <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="p-1 px-2 text-sm border rounded dark:bg-gray-600 dark:text-white" />
            </div>
        </div>
        
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredHistory.length === 0 ? (
                <div className="p-8 text-center text-gray-600 dark:text-gray-400">No history found.</div>
            ) : (
                filteredHistory.map((item: HistoryItem) => (
                    <div key={item.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 flex justify-between items-center transition-colors">
                        <div>
                            <div className="font-mono font-bold text-[#003366] dark:text-white text-lg tracking-wider">{item.value}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 flex gap-2 items-center mb-2">
                                <span className={`px-1.5 rounded text-[10px] font-bold ${item.type === 'VIN' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{item.type}</span>
                                {new Date(item.timestamp).toLocaleDateString()}
                            </div>
                        </div>
                        <a href={`https://cleantruckcheck.arb.ca.gov/Fleet/Vehicle/VehicleComplianceStatusLookup?${item.type === 'VIN' ? 'vin' : 'entity'}=${item.value}`} target="_blank" rel="noreferrer" className="text-[#15803d] font-bold text-sm border border-[#15803d] px-3 py-1 rounded hover:bg-[#15803d] hover:text-white transition-colors">CHECK</a>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
};

export default ProfileView;