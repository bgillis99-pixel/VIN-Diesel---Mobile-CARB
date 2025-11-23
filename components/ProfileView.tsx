import React, { useState, useMemo } from 'react';
import { User, HistoryItem } from '../types';

interface Props {
  user: User | null;
  onLogin: (email: string) => void;
  onRegister: (email: string) => void;
  onLogout: () => void;
  onAdminAccess?: () => void;
  isOnline?: boolean;
}

const ProfileView: React.FC<Props> = ({ user, onLogin, onRegister, onLogout, onAdminAccess, isOnline = true }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'value'>('newest');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (isRegistering) {
      onRegister(email);
    } else {
      onLogin(email);
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

  const createCalendarLink = (itemValue: string) => {
      const title = encodeURIComponent(`CARB Compliance Check: ${itemValue}`);
      const details = encodeURIComponent(`Time to re-check compliance for ${itemValue}. Open Clean Truck Check App.`);
      const now = new Date();
      now.setMonth(now.getMonth() + 6);
      const start = now.toISOString().replace(/-|:|\.\d\d\d/g, "");
      now.setHours(now.getHours() + 1);
      const end = now.toISOString().replace(/-|:|\.\d\d\d/g, "");
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}`;
  };

  const filteredHistory = useMemo(() => {
    if (!user) return [];
    let items = [...user.history];
    if (search) items = items.filter(i => i.value.includes(search.toUpperCase()));
    items.sort((a, b) => {
      if (sort === 'newest') return b.timestamp - a.timestamp;
      if (sort === 'oldest') return a.timestamp - b.timestamp;
      if (sort === 'value') return a.value.localeCompare(b.value);
      return 0;
    });
    return items;
  }, [user, search, sort]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-lg border border-gray-200">
        <h2 className="text-2xl font-bold text-[#003366] mb-6 text-center">{isRegistering ? 'Create Account' : 'Welcome Back'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:border-[#003366] outline-none" placeholder="trucker@example.com" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:border-[#003366] outline-none" placeholder="••••••••" />
          </div>
          <button type="submit" className="w-full bg-[#003366] text-white font-bold py-3 rounded-lg hover:bg-[#002244] transition-colors">{isRegistering ? 'Sign Up' : 'Log In'}</button>
        </form>
        <div className="mt-4 text-center">
          <button onClick={() => setIsRegistering(!isRegistering)} className="text-[#00C853] text-sm font-bold hover:underline">{isRegistering ? 'Already have an account? Log In' : 'Need an account? Sign Up'}</button>
        </div>
        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
             <button onClick={handlePartnerAccess} className="text-xs text-gray-300 hover:text-gray-500">Partner Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6 flex justify-between items-center">
        <div>
            <h2 className="text-xl font-bold text-[#003366]">{user.email}</h2>
            <div className="mt-2 inline-block bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-1 rounded border border-gray-300">PLAN: FREE TIER</div>
        </div>
        <button onClick={onLogout} className="text-red-500 text-sm font-bold border border-red-100 px-3 py-1 rounded hover:bg-red-50">Sign Out</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-bold text-[#003366]">History ({user.history.length})</h3>
            <div className="flex gap-2">
                <input type="text" placeholder="Search VIN..." value={search} onChange={(e) => setSearch(e.target.value)} className="p-1 px-2 text-sm border rounded" />
                <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="p-1 px-2 text-sm border rounded">
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="value">A-Z</option>
                </select>
            </div>
        </div>
        
        <div className="divide-y divide-gray-100">
            {filteredHistory.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No history found.</div>
            ) : (
                filteredHistory.map((item: HistoryItem) => (
                    <div key={item.id} className="p-4 hover:bg-gray-50 flex justify-between items-center">
                        <div>
                            <div className="font-mono font-bold text-[#003366] text-lg tracking-wider">{item.value}</div>
                            <div className="text-xs text-gray-400 flex gap-2 items-center mb-2">
                                <span className={`px-1.5 rounded text-[10px] font-bold ${item.type === 'VIN' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{item.type}</span>
                                {new Date(item.timestamp).toLocaleDateString()}
                            </div>
                            <a href={createCalendarLink(item.value)} target="_blank" rel="noreferrer" className="text-[10px] flex items-center gap-1 text-gray-500 hover:text-[#00C853] font-bold">🔔 Set Reminder</a>
                        </div>
                        {isOnline ? (
                            <a href={`https://cleantruckcheck.arb.ca.gov/Fleet/Vehicle/VehicleComplianceStatusLookup?${item.type === 'VIN' ? 'vin' : 'entity'}=${item.value}`} target="_blank" rel="noreferrer" className="text-[#00C853] font-bold text-sm border border-[#00C853] px-3 py-1 rounded hover:bg-[#00C853] hover:text-white transition-colors">CHECK</a>
                        ) : (
                             <span className="text-gray-400 text-xs font-bold border border-gray-200 px-3 py-1 rounded bg-gray-50">OFFLINE</span>
                        )}
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
};

export default ProfileView;