
import React, { useState, useEffect } from 'react';

interface Props {
  onNavigateInvoice: () => void;
}

const AdminView: React.FC<Props> = ({ onNavigateInvoice }) => {
  const [passInput, setPassInput] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminCode, setAdminCode] = useState('1225');
  const [showSettings, setShowSettings] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  
  // Silverback API / Google Integration State
  const [loadingGoogle, setLoadingGoogle] = useState(true);
  const [apiStatus, setApiStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [gmailInquiries, setGmailInquiries] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem('carb_admin_code');
    if (stored) {
      setAdminCode(stored);
    }
  }, []);

  useEffect(() => {
    if (isAuthorized) {
        // Simulate pulling data from "B Gillis 99" via Silverback API Proxy
        setLoadingGoogle(true);
        setApiStatus('connecting');

        setTimeout(() => {
            setCalendarEvents([
                { id: 1, time: '09:00 AM', title: 'Fleet Inspection - Sac Logistics', status: 'confirmed', location: 'Sacramento, CA' },
                { id: 2, time: '01:30 PM', title: 'Smoke Test - Unit 58 (Big Red)', status: 'pending', location: 'Mobile' },
                { id: 3, time: '04:00 PM', title: 'Zoom: CARB Compliance Review', status: 'confirmed', location: 'Remote' }
            ]);
            setGmailInquiries([
                { id: 1, from: 'Mike @ ABC Trucking', subject: 'Urgent: PSIP Renewal Quote', time: '10m ago', unread: true },
                { id: 2, from: 'CARB Notification', subject: 'Clean Truck Check: Deadline Approaching', time: '45m ago', unread: true },
                { id: 3, from: 'Dispatch', subject: 'Route Change for Tomorrow', time: '2h ago', unread: false }
            ]);
            setLoadingGoogle(false);
            setApiStatus('connected');
        }, 1800);
    }
  }, [isAuthorized, refreshKey]);

  const handleLogin = () => {
    if (passInput === adminCode) {
      setIsAuthorized(true);
    } else {
      alert("Invalid Access Code");
    }
  };

  const handlePasswordChange = () => {
    if (!newPassword.trim()) return;
    localStorage.setItem('carb_admin_code', newPassword.trim());
    setAdminCode(newPassword.trim());
    setNewPassword('');
    setShowSettings(false);
    alert("Admin Credentials Updated");
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
        <div className="w-full max-w-sm glass p-10 rounded-[3rem] border border-white/10 shadow-2xl space-y-8 text-center bg-black/40 backdrop-blur-xl">
            <div className="w-24 h-24 bg-blue-600/10 rounded-full mx-auto flex items-center justify-center text-3xl border border-blue-500/20 shadow-[0_0_30px_rgba(37,99,235,0.2)]">
              🔒
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter">Command Center</h2>
              <p className="text-[9px] text-blue-400 font-black uppercase tracking-[0.3em]">Restricted Access Area</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1 text-left relative">
                <input 
                    type="password"
                    value={passInput}
                    onChange={(e) => setPassInput(e.target.value)}
                    placeholder="ENTER PIN"
                    className="w-full bg-black/60 border border-white/10 rounded-2xl py-5 text-center text-3xl font-black text-white outline-none focus:border-blue-500 tracking-[0.5em] placeholder:tracking-normal placeholder:text-gray-700 placeholder:text-sm transition-all shadow-inner"
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
              <button 
                onClick={handleLogin}
                className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-[0.2em] text-xs shadow-lg active-haptic hover:bg-blue-500 transition-colors"
              >
                Authenticate
              </button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex justify-between items-center px-4">
          <div className="flex flex-col">
              <h2 className="text-3xl font-black italic uppercase text-white tracking-tighter">ADMIN OPS</h2>
              <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${apiStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    {apiStatus === 'connected' ? 'Silverback API: Online' : 'Connecting...'}
                  </p>
              </div>
          </div>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-3 rounded-2xl border text-xl active-haptic transition-all ${showSettings ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10'}`}
          >
            ⚙️
          </button>
      </div>

      {showSettings && (
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6 animate-in slide-in-from-top-4">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] italic">Security Protocol</h3>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest ml-2">Update Access PIN</label>
              <input 
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New 4-Digit PIN"
                maxLength={8}
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 text-center text-lg font-black text-white outline-none focus:border-blue-500 tracking-[0.3em] placeholder:text-gray-700"
              />
            </div>
            <button 
              onClick={handlePasswordChange}
              className="w-full py-3 bg-red-500/10 text-red-400 border border-red-500/20 font-black rounded-2xl uppercase tracking-widest text-[9px] hover:bg-red-500/20 active-haptic transition-all"
            >
              Save Credentials
            </button>
          </div>
        </div>
      )}

      {/* GOOGLE WORKSPACE INTEGRATION CARD */}
      <div className="bg-[#4285F4]/10 border border-[#4285F4]/20 rounded-[2.5rem] p-1 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4">
             <button onClick={() => setRefreshKey(k => k + 1)} className="text-[10px] text-blue-400 font-black uppercase tracking-widest hover:text-white">↻ Refresh Stream</button>
          </div>
          
          <div className="p-8 space-y-6">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" /></svg>
                </div>
                <div>
                    <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Workspace Sync</h3>
                    <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">Account: bgillis99</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {/* Calendar Feed */}
                <div className="bg-black/40 rounded-3xl p-6 space-y-4 border border-white/5">
                    <div className="flex justify-between items-center border-b border-white/10 pb-3">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Calendar • {new Date().toLocaleDateString()}</span>
                        {loadingGoogle && <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></span>}
                    </div>
                    {loadingGoogle ? (
                        <div className="space-y-3 animate-pulse">
                            <div className="h-10 bg-white/5 rounded-xl"></div>
                            <div className="h-10 bg-white/5 rounded-xl"></div>
                        </div>
                    ) : (
                        calendarEvents.map(ev => (
                            <div key={ev.id} className="flex gap-4 items-start group">
                                <span className="text-[10px] font-mono text-blue-400 pt-1 w-14 shrink-0">{ev.time}</span>
                                <div className="space-y-0.5">
                                    <span className="text-[11px] font-bold text-white block leading-tight">{ev.title}</span>
                                    <span className="text-[9px] text-gray-600 uppercase tracking-wider flex items-center gap-1">
                                        📍 {ev.location}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Gmail Feed */}
                <div className="bg-black/40 rounded-3xl p-6 space-y-4 border border-white/5">
                    <div className="flex justify-between items-center border-b border-white/10 pb-3">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Priority Inbox</span>
                        <span className="text-[9px] text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">{gmailInquiries.filter(m => m.unread).length} Unread</span>
                    </div>
                    {loadingGoogle ? (
                         <div className="space-y-3 animate-pulse">
                            <div className="h-12 bg-white/5 rounded-xl"></div>
                            <div className="h-12 bg-white/5 rounded-xl"></div>
                         </div>
                    ) : (
                        gmailInquiries.map(mail => (
                            <div key={mail.id} className={`flex justify-between items-center p-3 rounded-2xl transition-colors ${mail.unread ? 'bg-white/10 border border-white/10' : 'bg-transparent border border-transparent hover:bg-white/5'}`}>
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${mail.unread ? 'bg-blue-500' : 'bg-gray-700'}`}></div>
                                    <div className="flex flex-col overflow-hidden">
                                        <span className={`text-[10px] font-black truncate ${mail.unread ? 'text-white' : 'text-gray-500'}`}>{mail.from}</span>
                                        <span className="text-[9px] text-gray-500 truncate">{mail.subject}</span>
                                    </div>
                                </div>
                                <span className="text-[8px] font-mono text-gray-600 shrink-0 ml-2">{mail.time}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
          </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-1">
              <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Daily Leads</p>
              <p className="text-5xl font-black italic text-white tracking-tighter">24</p>
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-[2.5rem] space-y-1 shadow-2xl border border-blue-400/20">
              <p className="text-[8px] font-black text-white/60 uppercase tracking-widest">Conversions</p>
              <p className="text-5xl font-black italic text-white tracking-tighter">3</p>
          </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-[3rem] p-8 space-y-6">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] italic">Operator Tools</h3>
          <div className="grid grid-cols-2 gap-4">
              <button className="p-6 bg-white/5 rounded-3xl border border-white/10 text-center space-y-2 active-haptic hover:bg-white/10 transition-colors group">
                  <span className="text-2xl block group-hover:scale-110 transition-transform">📧</span>
                  <span className="text-[8px] font-black uppercase text-white tracking-widest">EMAIL</span>
              </button>
              <button className="p-6 bg-white/5 rounded-3xl border border-white/10 text-center space-y-2 active-haptic hover:bg-white/10 transition-colors group">
                  <span className="text-2xl block group-hover:scale-110 transition-transform">📸</span>
                  <span className="text-[8px] font-black uppercase text-white tracking-widest">PHOTOS</span>
              </button>
              <button 
                  onClick={onNavigateInvoice}
                  className="p-6 bg-[#3d4d7a]/20 rounded-3xl border border-[#3d4d7a]/50 text-center space-y-2 active-haptic shadow-lg hover:bg-[#3d4d7a]/30 transition-colors group"
              >
                  <span className="text-2xl block group-hover:scale-110 transition-transform">📄</span>
                  <span className="text-[8px] font-black uppercase text-white tracking-widest">INVOICES</span>
              </button>
              <button className="p-6 bg-green-600/10 rounded-3xl border border-green-500/20 text-center space-y-2 active-haptic hover:bg-green-600/20 transition-colors group">
                  <span className="text-2xl block group-hover:scale-110 transition-transform">💳</span>
                  <span className="text-[8px] font-black uppercase text-green-500 tracking-widest">PAYMENTS</span>
              </button>
          </div>
      </div>
    </div>
  );
};

export default AdminView;
