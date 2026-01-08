
import React, { useState, useEffect, useMemo } from 'react';
import { getClientsFromCRM, triggerMakeAutomation } from '../services/firebase';
import { CrmClient } from '../types';
import { triggerHaptic } from '../services/haptics';

interface Props {
  onNavigateInvoice: () => void;
}

const AdminView: React.FC<Props> = ({ onNavigateInvoice }) => {
  const [passInput, setPassInput] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminCode, setAdminCode] = useState('1225');
  const [showSettings, setShowSettings] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  
  const [adminViewMode, setAdminViewMode] = useState<'COMMAND' | 'CRM' | 'CALENDAR'>('COMMAND');

  const [loadingGoogle, setLoadingGoogle] = useState(true);
  const [apiStatus, setApiStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [gmailInquiries, setGmailInquiries] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [automationSyncing, setAutomationSyncing] = useState(false);

  const [kpis, setKpis] = useState({
    revenue: '$14,250',
    passRate: '92%',
    intakeSpeed: '3.8m',
    fleetCompliance: '74%',
    revenueVelocity: '+18%'
  });

  const [crmClients, setCrmClients] = useState<CrmClient[]>([]);
  const [loadingCrm, setLoadingCrm] = useState(false);
  const [crmSearch, setCrmSearch] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('carb_admin_code');
    if (stored) {
      setAdminCode(stored);
    }
  }, []);

  useEffect(() => {
    if (isAuthorized) {
        setLoadingGoogle(true);
        setApiStatus('connecting');

        setTimeout(() => {
            setKpis({
                revenue: '$' + (12000 + Math.floor(Math.random() * 5000)).toLocaleString(),
                passRate: (88 + Math.floor(Math.random() * 10)) + '%',
                intakeSpeed: (3 + (Math.random() * 2)).toFixed(1) + 'm',
                fleetCompliance: (70 + Math.floor(Math.random() * 15)) + '%',
                revenueVelocity: '+' + (10 + Math.floor(Math.random() * 15)) + '%'
            });

            setCalendarEvents([
                { id: 1, time: '09:00 AM', title: 'Sac Logistics - 5 Units', status: 'confirmed', location: 'Sacramento, CA', type: 'OBD', contact: 'Mike Miller' },
                { id: 2, time: '11:30 AM', title: 'Clean Roofing OBD - Unit 1', status: 'confirmed', location: 'Mobile', type: 'OBD', contact: 'Sarah Smith' },
                { id: 3, time: '01:30 PM', title: 'West Coast Heavy - PSIP', status: 'pending', location: 'Roseville, CA', type: 'SMOKE', contact: 'Jim Beam' },
                { id: 4, time: '04:00 PM', title: 'Zoom: CARB Compliance Audit', status: 'confirmed', location: 'Remote', type: 'CONSULT', contact: 'State Auditor' }
            ]);
            setGmailInquiries([
                { id: 1, from: 'Mike @ ABC Trucking', subject: 'Urgent: PSIP Renewal Quote', time: '10m ago', unread: true },
                { id: 2, from: 'CARB Notification', subject: 'Clean Truck Check: Deadline Approaching', time: '45m ago', unread: true },
                { id: 3, from: 'Dispatch', subject: 'Route Change for Tomorrow', time: '2h ago', unread: false }
            ]);
            setLoadingGoogle(false);
            setApiStatus('connected');
        }, 1800);

        loadCrmData();
    }
  }, [isAuthorized, refreshKey]);

  const loadCrmData = async () => {
      setLoadingCrm(true);
      const data = await getClientsFromCRM();
      setCrmClients(data);
      setLoadingCrm(false);
  };

  const handleLogin = () => {
    triggerHaptic('medium');
    if (passInput === adminCode) {
      setIsAuthorized(true);
      triggerHaptic('success');
    } else {
      triggerHaptic('error');
      alert("Invalid Access Code");
    }
  };

  const handleTriggerAutomation = async () => {
    setAutomationSyncing(true);
    triggerHaptic('light');
    await triggerMakeAutomation('MANUAL_SYNC', { timestamp: Date.now(), operator: 'Bryan' });
    setTimeout(() => {
        setAutomationSyncing(false);
        triggerHaptic('success');
    }, 2000);
  };

  const handlePasswordChange = () => {
    if (!newPassword.trim()) return;
    localStorage.setItem('carb_admin_code', newPassword.trim());
    setAdminCode(newPassword.trim());
    setNewPassword('');
    setShowSettings(false);
    triggerHaptic('success');
    alert("Admin Credentials Updated");
  };

  const filteredClients = useMemo(() => {
    if (!crmSearch.trim()) return crmClients;
    const query = crmSearch.toLowerCase().trim();
    return crmClients.filter(client => 
      client.clientName.toLowerCase().includes(query) ||
      client.vin.toLowerCase().includes(query) ||
      (client.phone && client.phone.toLowerCase().includes(query))
    );
  }, [crmClients, crmSearch]);

  if (!isAuthorized) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
        <div className="w-full max-sm glass p-10 rounded-[3rem] border border-white/10 shadow-2xl space-y-8 text-center bg-black/40 backdrop-blur-xl">
            <div className="w-24 h-24 bg-blue-600/10 rounded-full mx-auto flex items-center justify-center text-3xl border border-blue-500/20 shadow-[0_0_30px_rgba(37,99,235,0.2)]">
              🔒
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter">Command Center</h2>
              <p className="text-[9px] text-blue-400 font-black uppercase tracking-[0.3em]">Restricted Access Area</p>
            </div>
            <div className="space-y-4">
              <input 
                  type="password"
                  value={passInput}
                  onChange={(e) => setPassInput(e.target.value)}
                  placeholder="ENTER PIN"
                  className="w-full bg-black/60 border border-white/10 rounded-2xl py-5 text-center text-3xl font-black text-white outline-none focus:border-blue-500 tracking-[0.5em] placeholder:tracking-normal placeholder:text-gray-700 transition-all shadow-inner"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
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
                    {apiStatus === 'connected' ? 'Silverback Intelligence: Streaming' : 'Connecting to Norcal Cloud...'}
                  </p>
              </div>
          </div>
          <button 
            onClick={() => { triggerHaptic('light'); setShowSettings(!showSettings); }}
            className={`p-3 rounded-2xl border text-xl active-haptic transition-all ${showSettings ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10'}`}
          >
            ⚙️
          </button>
      </div>

      <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10 mx-4">
          {['COMMAND', 'CALENDAR', 'CRM'].map(mode => (
            <button 
              key={mode}
              onClick={() => { triggerHaptic('light'); setAdminViewMode(mode as any); }}
              className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${adminViewMode === mode ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500'}`}
            >
              {mode}
            </button>
          ))}
      </div>

      {adminViewMode === 'COMMAND' && (
      <>
          <div className="px-4 animate-in slide-in-from-top-4">
              <div className="bg-white/5 border border-white/10 rounded-[3rem] p-8 space-y-6 shadow-2xl backdrop-blur-3xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4">
                      <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest animate-pulse">Live Silverback Feed</span>
                  </div>
                  <h3 className="text-xs font-black italic uppercase text-gray-500 tracking-[0.3em]">Operational Intelligence</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black/40 rounded-3xl p-6 border border-white/5 space-y-1 relative group overflow-hidden">
                          <div className="absolute top-2 right-2 text-green-500 text-[8px] font-black italic">{kpis.revenueVelocity}</div>
                          <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">MTD Billed</p>
                          <p className="text-3xl font-black italic text-white tracking-tighter">{kpis.revenue}</p>
                      </div>
                      
                      <div className="bg-black/40 rounded-3xl p-6 border border-white/5 space-y-1 relative group overflow-hidden">
                          <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Compliance Yield</p>
                          <p className="text-3xl font-black italic text-blue-400 tracking-tighter">{kpis.passRate}</p>
                      </div>

                      <div className="bg-black/40 rounded-3xl p-6 border border-white/5 space-y-1 relative group overflow-hidden">
                          <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Intake Velocity</p>
                          <p className="text-3xl font-black italic text-white tracking-tighter">{kpis.intakeSpeed}</p>
                      </div>

                      <div className="bg-black/40 rounded-3xl p-6 border border-white/5 space-y-1 relative group overflow-hidden">
                          <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Fleet Health</p>
                          <p className="text-3xl font-black italic text-green-500 tracking-tighter">{kpis.fleetCompliance}</p>
                      </div>
                  </div>
              </div>
          </div>

          {/* MAKE.AI AUTOMATION CONTROL PANEL */}
          <div className="px-4">
              <div className="bg-gradient-to-r from-blue-900/40 to-black/40 border border-blue-500/30 rounded-[3rem] p-8 space-y-6 shadow-2xl backdrop-blur-3xl">
                  <div className="flex justify-between items-center">
                      <div className="space-y-1">
                          <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Make.ai Automation</h3>
                          <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">NorCal Master Sync Active</p>
                      </div>
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
                          <span className="text-xl">⚡</span>
                      </div>
                  </div>

                  <div className="space-y-3">
                      <div className="flex justify-between items-center text-[9px] font-black uppercase text-gray-500 border-b border-white/5 pb-2">
                          <span>Workflow Status</span>
                          <span className="text-green-500">Operational</span>
                      </div>
                      <div className="flex justify-between items-center text-[9px] font-black uppercase text-gray-500 border-b border-white/5 pb-2">
                          <span>Last Sync</span>
                          <span className="text-white">14m ago</span>
                      </div>
                  </div>

                  <button 
                    onClick={handleTriggerAutomation}
                    disabled={automationSyncing}
                    className={`w-full py-4 rounded-2xl border transition-all text-[9px] font-black uppercase tracking-[0.3em] italic ${automationSyncing ? 'bg-blue-600 animate-pulse text-white border-blue-500' : 'bg-white/5 text-blue-400 border-blue-500/30 hover:bg-blue-500/10'}`}
                  >
                    {automationSyncing ? 'Pushing to Make.ai...' : 'Manual Sync Trigger'}
                  </button>
              </div>
          </div>

          <div className="bg-[#4285F4]/10 border border-[#4285F4]/20 rounded-[2.5rem] p-8 mx-4 shadow-xl space-y-6">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" /></svg>
                    </div>
                    <div>
                        <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Google Workspace Live</h3>
                        <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">bgillis99@gmail.com</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-black/40 rounded-3xl p-6 space-y-4 border border-white/5">
                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Priority Inquiries</span>
                        </div>
                        {gmailInquiries.map(mail => (
                            <div key={mail.id} className={`flex justify-between items-center p-3 rounded-2xl ${mail.unread ? 'bg-white/10' : ''}`}>
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={`w-1.5 h-1.5 rounded-full ${mail.unread ? 'bg-blue-500' : 'bg-gray-700'}`}></div>
                                    <div className="flex flex-col overflow-hidden">
                                        <span className={`text-[9px] font-black truncate uppercase tracking-widest ${mail.unread ? 'text-white' : 'text-gray-500'}`}>{mail.from}</span>
                                        <span className="text-[8px] text-gray-500 truncate">{mail.subject}</span>
                                    </div>
                                </div>
                                <span className="text-[8px] font-mono text-gray-600 ml-2">{mail.time}</span>
                            </div>
                        ))}
                    </div>
                </div>
          </div>
      </>
      )}

      {adminViewMode === 'CALENDAR' && (
          <div className="px-4 space-y-6 animate-in slide-in-from-bottom-4">
              <div className="glass p-8 rounded-[3rem] border border-blue-500/20 space-y-8 bg-black/40 shadow-2xl">
                  <div className="flex justify-between items-center">
                      <h3 className="text-xl font-black italic uppercase text-white tracking-tighter">Dispatcher Dashboard</h3>
                      <button onClick={() => { triggerHaptic('light'); setRefreshKey(k => k + 1); }} className="text-blue-400 font-black text-[10px] uppercase italic">↻ Live Sync</button>
                  </div>
                  
                  <div className="space-y-6">
                      {calendarEvents.map((ev) => (
                          <div key={ev.id} className="relative pl-6 border-l-2 border-white/10 group">
                              <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.8)] group-hover:scale-150 transition-transform"></div>
                              <div className="flex justify-between items-start">
                                  <div className="space-y-1">
                                      <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{ev.time} • {ev.type}</p>
                                      <p className="text-lg font-black text-white uppercase italic tracking-tighter leading-tight">{ev.title}</p>
                                      <p className="text-[10px] font-bold text-gray-400 uppercase">POC: {ev.contact}</p>
                                      <div className="flex items-center gap-2 text-[9px] text-gray-500 mt-1">
                                          <span>📍</span>
                                          <span className="underline">{ev.location}</span>
                                      </div>
                                  </div>
                                  <div className="text-right space-y-3">
                                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${ev.status === 'confirmed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                          {ev.status}
                                      </span>
                                      <button onClick={() => { triggerHaptic('light'); onNavigateInvoice(); }} className="block w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[8px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-colors">Dispatch</button>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {adminViewMode === 'CRM' && (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 px-4">
          <div className="bg-[#15803d]/10 border border-[#15803d]/20 rounded-[2.5rem] p-8 relative overflow-hidden shadow-xl">
               <div className="flex justify-between items-center mb-6">
                  <div>
                      <h3 className="text-xl font-black italic uppercase text-white tracking-tighter">CRM / OVI Records</h3>
                      <p className="text-[9px] font-bold text-green-500 uppercase tracking-widest">Real-time Database</p>
                  </div>
               </div>

               <div className="mb-8 relative z-10">
                  <input 
                    type="text"
                    value={crmSearch}
                    onChange={(e) => setCrmSearch(e.target.value)}
                    placeholder="Search Name, VIN, or Phone..."
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-[10px] font-black text-white placeholder:text-gray-700 outline-none focus:border-green-500/50 transition-all uppercase tracking-widest italic"
                  />
               </div>
               
               <div className="space-y-4">
                   {filteredClients.map(client => (
                       <div key={client.id} className="bg-black/20 p-5 rounded-3xl border border-white/5 space-y-4 hover:border-green-500/20 transition-all">
                           <div className="flex justify-between items-start">
                               <div className="space-y-1">
                                   <h4 className="font-black text-white text-lg uppercase italic leading-none">{client.clientName}</h4>
                                   <div className="flex gap-2 text-[8px] text-gray-500 font-bold uppercase tracking-widest">
                                      <span>{new Date(client.timestamp).toLocaleDateString()}</span>
                                      <span className="text-blue-400">{client.status}</span>
                                   </div>
                               </div>
                               <button onClick={() => { triggerHaptic('light'); onNavigateInvoice(); }} className="text-blue-500 text-xl active-haptic">📄</button>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-4 text-[9px] font-bold border-t border-white/5 pt-3">
                               <div className="space-y-1">
                                   <p className="text-gray-600 uppercase">Contact</p>
                                   <p className="text-gray-300 truncate">{client.phone || 'N/A'}</p>
                               </div>
                               <div className="space-y-1">
                                   <p className="text-gray-600 uppercase">Vehicle (VIN)</p>
                                   <p className="text-green-500 font-mono tracking-wider truncate">{client.vin || 'NO VIN'}</p>
                               </div>
                           </div>
                       </div>
                   ))}
               </div>
          </div>
      </div>
      )}

      <div className="grid grid-cols-2 gap-4 px-4">
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-1 text-center">
              <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Fleet Assets</p>
              <p className="text-4xl font-black italic text-white tracking-tighter">{crmClients.length}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-[2.5rem] space-y-1 shadow-2xl border border-blue-400/20 text-center">
              <p className="text-[8px] font-black text-white/60 uppercase tracking-widest">Lead Velocity</p>
              <p className="text-4xl font-black italic text-white tracking-tighter">{Math.floor(crmClients.length * 1.4)}</p>
          </div>
      </div>
    </div>
  );
};

export default AdminView;
