
import React, { useState, useEffect, useMemo } from 'react';
import { getClientsFromCRM, triggerMakeAutomation, subscribeToInboundIntakes } from '../services/firebase';
import { CrmClient, IntakeSubmission } from '../types';
import { triggerHaptic } from '../services/haptics';

interface Props {
  onNavigateInvoice: () => void;
}

const AdminView: React.FC<Props> = ({ onNavigateInvoice }) => {
  const [passInput, setPassInput] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminCode, setAdminCode] = useState('1225');
  const [showSettings, setShowSettings] = useState(false);
  
  const [adminViewMode, setAdminViewMode] = useState<'COMMAND' | 'CRM' | 'CALENDAR' | 'INTAKES'>('COMMAND');

  const [loadingGoogle, setLoadingGoogle] = useState(true);
  const [apiStatus, setApiStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
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
  const [intakes, setIntakes] = useState<IntakeSubmission[]>([]);
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

        // Subscribe to real-time intakes from the field
        const unsubIntakes = subscribeToInboundIntakes((data) => {
            setIntakes(data);
        });

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
            setLoadingGoogle(false);
            setApiStatus('connected');
        }, 1800);

        loadCrmData();
        return () => unsubIntakes();
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

  const filteredClients = useMemo(() => {
    if (!crmSearch.trim()) return crmClients;
    const query = crmSearch.toLowerCase().trim();
    return crmClients.filter(client => 
      client.clientName.toLowerCase().includes(query) ||
      client.vin.toLowerCase().includes(query) ||
      (client.phone && client.phone.toLowerCase().includes(query))
    );
  }, [crmClients, crmSearch]);

  const MetallicStyle = "bg-gradient-to-b from-[#f3f4f6] via-[#d1d5db] to-[#9ca3af] shadow-[0_5px_15px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-white/20 relative overflow-hidden transition-all";
  const BrushedTexture = <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')] opacity-20 pointer-events-none"></div>;

  if (!isAuthorized) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 animate-in fade-in duration-500" role="form" aria-labelledby="admin-login-title">
        <div className="w-full max-w-sm glass-dark p-12 rounded-[4rem] border border-white/10 shadow-2xl space-y-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-blue-600/5 pointer-events-none" aria-hidden="true"></div>
            
            <div className="relative z-10">
                <div className="w-32 h-32 bg-blue-600/10 rounded-full mx-auto flex items-center justify-center border border-blue-500/30 shadow-[0_0_40px_rgba(37,99,235,0.3)] group">
                    <div className="text-4xl filter drop-shadow-[0_0_8px_rgba(37,99,235,0.8)]" aria-hidden="true">🔒</div>
                </div>
            </div>

            <div className="space-y-3 relative z-10">
              <h2 id="admin-login-title" className="text-4xl font-black italic uppercase text-white tracking-tighter">Command Center</h2>
              <p className="text-[10px] text-blue-500 font-black uppercase tracking-[0.5em] italic">Restricted Access Area</p>
            </div>

            <div className="space-y-6 relative z-10">
              <input 
                  type="password"
                  value={passInput}
                  onChange={(e) => setPassInput(e.target.value)}
                  placeholder="ENTER PIN"
                  className="w-full bg-black/60 border border-white/10 rounded-3xl py-6 text-center text-4xl font-black text-white outline-none focus:border-blue-500 tracking-[0.4em] placeholder:tracking-normal placeholder:text-gray-800 transition-all shadow-inner"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  aria-label="Admin PIN"
              />
              <button 
                onClick={handleLogin}
                className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl uppercase tracking-[0.3em] text-xs shadow-[0_15px_30px_rgba(37,99,235,0.4)] active-haptic hover:bg-blue-500 transition-all border border-blue-400/20"
              >
                Authenticate
              </button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24" role="region" aria-label="Admin Dashboard">
      <div className="flex justify-between items-center px-4">
          <div className="flex flex-col">
              <h2 className="text-3xl font-black italic uppercase text-white tracking-tighter">ADMIN OPS</h2>
              <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${apiStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} aria-hidden="true"></div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    {apiStatus === 'connected' ? 'Silverback Intelligence: Streaming' : 'Connecting to Norcal Cloud...'}
                  </p>
              </div>
          </div>
          <button 
            onClick={() => { triggerHaptic('light'); setShowSettings(!showSettings); }}
            className={`p-3 rounded-2xl border text-xl active-haptic transition-all ${showSettings ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10'}`}
            aria-label="Admin settings"
            aria-expanded={showSettings}
          >
            ⚙️
          </button>
      </div>

      <nav className="flex p-1 bg-white/5 rounded-2xl border border-white/10 mx-4 overflow-x-auto gap-1" aria-label="Dashboard sub-views">
          {['COMMAND', 'INTAKES', 'CALENDAR', 'CRM'].map(mode => (
            <button 
              key={mode}
              onClick={() => { triggerHaptic('light'); setAdminViewMode(mode as any); }}
              className={`flex-1 min-w-[80px] py-3 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${adminViewMode === mode ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500'}`}
              aria-current={adminViewMode === mode ? 'true' : 'false'}
            >
              {mode}
            </button>
          ))}
      </nav>

      {adminViewMode === 'COMMAND' && (
      <>
          <div className="px-4 animate-in slide-in-from-left-4">
              <div className="grid grid-cols-3 gap-3">
                  <a href="https://calendar.google.com/calendar/u/bgillis99@gmail.com/" target="_blank" rel="noopener noreferrer" className={`flex flex-col items-center justify-center py-5 rounded-2xl transition-all active-haptic ${MetallicStyle}`}>
                      {BrushedTexture}
                      <span className="text-2xl mb-1 relative z-10" aria-hidden="true">📅</span>
                      <span className="text-[7px] font-black uppercase tracking-widest text-[#020617] relative z-10">Calendar</span>
                  </a>
                  <a href="https://mail.google.com/mail/u/bgillis99@gmail.com/" target="_blank" rel="noopener noreferrer" className={`flex flex-col items-center justify-center py-5 rounded-2xl transition-all active-haptic ${MetallicStyle}`}>
                      {BrushedTexture}
                      <span className="text-2xl mb-1 relative z-10" aria-hidden="true">📧</span>
                      <span className="text-[7px] font-black uppercase tracking-widest text-[#020617] relative z-10">Mail</span>
                  </a>
                  <a href="https://drive.google.com/drive/u/bgillis99@gmail.com/" target="_blank" rel="noopener noreferrer" className={`flex flex-col items-center justify-center py-5 rounded-2xl transition-all active-haptic ${MetallicStyle}`}>
                      {BrushedTexture}
                      <span className="text-2xl mb-1 relative z-10" aria-hidden="true">📁</span>
                      <span className="text-[7px] font-black uppercase tracking-widest text-[#020617] relative z-10">Drive</span>
                  </a>
                  <a href="https://cleantruckcheck.arb.ca.gov" target="_blank" rel="noopener noreferrer" className={`flex flex-col items-center justify-center py-5 rounded-2xl transition-all active-haptic ${MetallicStyle}`}>
                      {BrushedTexture}
                      <span className="text-2xl mb-1 relative z-10" aria-hidden="true">🏢</span>
                      <span className="text-[7px] font-black uppercase tracking-widest text-[#020617] relative z-10">CARB Portal</span>
                  </a>
                  <a href="https://gemini.google.com" target="_blank" rel="noopener noreferrer" className={`flex flex-col items-center justify-center py-5 rounded-2xl transition-all active-haptic ${MetallicStyle}`}>
                      {BrushedTexture}
                      <span className="text-2xl mb-1 relative z-10" aria-hidden="true">✨</span>
                      <span className="text-[7px] font-black uppercase tracking-widest text-[#020617] relative z-10">Gemini AI</span>
                  </a>
                  <a href="https://claude.ai" target="_blank" rel="noopener noreferrer" className={`flex flex-col items-center justify-center py-5 rounded-2xl transition-all active-haptic ${MetallicStyle}`}>
                      {BrushedTexture}
                      <span className="text-2xl mb-1 relative z-10" aria-hidden="true">🧠</span>
                      <span className="text-[7px] font-black uppercase tracking-widest text-[#020617] relative z-10">Claude AI</span>
                  </a>
              </div>
          </div>

          <div className="px-4 animate-in slide-in-from-top-4">
              <section className="bg-white/5 border border-white/10 rounded-[3.5rem] p-8 space-y-6 shadow-2xl backdrop-blur-3xl relative overflow-hidden" aria-labelledby="intel-title">
                  <div className="absolute top-0 right-0 p-4">
                      <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest animate-pulse" aria-live="polite">Live Silverback Feed</span>
                  </div>
                  <h3 id="intel-title" className="text-xs font-black italic uppercase text-gray-400 tracking-[0.3em]">Operational Intelligence</h3>
                  
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
              </section>
          </div>

          <div className="px-4">
              <section className="bg-gradient-to-r from-blue-900/40 to-black/40 border border-blue-500/30 rounded-[3rem] p-8 space-y-6 shadow-2xl backdrop-blur-3xl" aria-labelledby="make-ai-title">
                  <div className="flex justify-between items-center">
                      <div className="space-y-1">
                          <h3 id="make-ai-title" className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Make.ai Automation</h3>
                          <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">NorCal Master Sync Active</p>
                      </div>
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20" aria-hidden="true">
                          <span className="text-xl">⚡</span>
                      </div>
                  </div>
                  <button 
                    onClick={handleTriggerAutomation}
                    disabled={automationSyncing}
                    className={`w-full py-4 rounded-2xl border transition-all text-[9px] font-black uppercase tracking-[0.3em] italic ${automationSyncing ? 'bg-blue-600 animate-pulse text-white border-blue-500' : 'bg-white/5 text-blue-400 border-blue-500/30 hover:bg-blue-500/10'}`}
                  >
                    {automationSyncing ? 'Pushing to Make.ai...' : 'Manual Sync Trigger'}
                  </button>
              </section>
          </div>
      </>
      )}

      {adminViewMode === 'INTAKES' && (
          <div className="px-4 space-y-6 animate-in slide-in-from-bottom-4">
              <div className="text-center">
                  <h3 className="text-xl font-black italic uppercase text-white tracking-tighter">Field Intelligence</h3>
                  <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.4em]">Correction Audit Enabled</p>
              </div>

              {intakes.length === 0 ? (
                  <div className="glass p-12 rounded-[3rem] text-center italic text-gray-500 text-xs" aria-live="polite">
                      No inbound field sessions detected.
                  </div>
              ) : (
                  <div className="space-y-4" role="list">
                      {intakes.map((intake) => {
                          const data = intake.extractedData as any;
                          const aiData = intake.originalAiData as any;
                          const corrections = aiData ? Object.keys(data).filter(k => data[k] !== aiData[k]) : [];
                          
                          return (
                              <div key={intake.id} className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 space-y-4 shadow-xl" role="listitem">
                                  <div className="flex justify-between items-start border-b border-white/5 pb-4">
                                      <div>
                                          <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest">{new Date(intake.timestamp).toLocaleString()}</p>
                                          <h4 className="text-lg font-black text-white italic uppercase tracking-tighter">{intake.clientName}</h4>
                                          <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[8px] font-black text-gray-600 uppercase">Session: {intake.sessionId}</span>
                                            {corrections.length > 0 && <span className="px-2 py-0.5 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded text-[7px] font-black uppercase italic">{corrections.length} CORRECTIONS</span>}
                                          </div>
                                      </div>
                                      <span className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-[8px] font-black uppercase tracking-widest italic">Archived</span>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                      {['vin', 'licensePlate', 'engineFamilyName', 'engineYear'].map(field => {
                                          const isCorrected = aiData && data[field] !== aiData[field];
                                          return (
                                              <div key={field} className="space-y-1">
                                                  <p className="text-[7px] font-black text-gray-500 uppercase tracking-widest">{field.replace(/([A-Z])/g, ' $1')}</p>
                                                  <div className="relative group">
                                                    <p className={`text-[10px] font-black italic truncate ${isCorrected ? 'text-orange-400' : 'text-gray-300'}`}>
                                                        {data?.[field] || 'N/A'}
                                                    </p>
                                                    {isCorrected && (
                                                        <div className="absolute bottom-full left-0 hidden group-hover:block bg-black border border-white/10 p-2 rounded text-[7px] font-black text-gray-500 z-50 whitespace-nowrap">
                                                            AI Was: {aiData[field] || 'None'}
                                                        </div>
                                                    )}
                                                  </div>
                                              </div>
                                          );
                                      })}
                                  </div>

                                  {intake.photos?.batch && intake.photos.batch.length > 0 && (
                                      <div className="flex gap-2 overflow-x-auto pt-2 no-scrollbar">
                                          {intake.photos.batch.map((p, idx) => (
                                              <div key={idx} className="w-12 h-12 rounded-lg border border-white/10 overflow-hidden flex-shrink-0">
                                                  <img src={p} className="w-full h-full object-cover grayscale opacity-50" alt="Field Doc" />
                                              </div>
                                          ))}
                                      </div>
                                  )}
                              </div>
                          );
                      })}
                  </div>
              )}
          </div>
      )}

      {adminViewMode === 'CALENDAR' && (
          <div className="px-4 space-y-6 animate-in slide-in-from-bottom-4">
              <section className="glass p-8 rounded-[3rem] border border-blue-500/20 space-y-8 bg-black/40 shadow-2xl" aria-labelledby="dispatch-title">
                  <div className="flex justify-between items-center">
                      <h3 id="dispatch-title" className="text-xl font-black italic uppercase text-white tracking-tighter">Dispatcher Dashboard</h3>
                      <button onClick={() => { triggerHaptic('light'); setRefreshKey(k => k + 1); }} className="text-blue-400 font-black text-[10px] uppercase italic" aria-label="Refresh calendar data">↻ Live Sync</button>
                  </div>
                  
                  <div className="space-y-6" role="list">
                      {calendarEvents.map((ev) => (
                          <div key={ev.id} className="relative pl-6 border-l-2 border-white/10 group" role="listitem">
                              <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.8)] group-hover:scale-150 transition-transform" aria-hidden="true"></div>
                              <div className="flex justify-between items-start">
                                  <div className="space-y-1">
                                      <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{ev.time} • {ev.type}</p>
                                      <p className="text-lg font-black text-white uppercase italic tracking-tighter leading-tight">{ev.title}</p>
                                      <p className="text-[10px] font-bold text-gray-500 uppercase">POC: {ev.contact}</p>
                                      <div className="flex items-center gap-2 text-[9px] text-gray-400 mt-1">
                                          <span aria-hidden="true">📍</span>
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
              </section>
          </div>
      )}

      {adminViewMode === 'CRM' && (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 px-4">
          <section className="bg-[#15803d]/10 border border-[#15803d]/20 rounded-[2.5rem] p-8 relative overflow-hidden shadow-xl" aria-labelledby="crm-title">
               <div className="flex justify-between items-center mb-6">
                  <div>
                      <h3 id="crm-title" className="text-xl font-black italic uppercase text-white tracking-tighter">CRM / OVI Records</h3>
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
                    aria-label="Search CRM records"
                  />
               </div>
               
               <div className="space-y-4" role="list">
                   {filteredClients.map(client => (
                       <div key={client.id} className="bg-black/20 p-5 rounded-3xl border border-white/5 space-y-4 hover:border-green-500/20 transition-all" role="listitem">
                           <div className="flex justify-between items-start">
                               <div className="space-y-1">
                                   <h4 className="font-black text-white text-lg uppercase italic leading-none">{client.clientName}</h4>
                                   <div className="flex gap-2 text-[8px] text-gray-500 font-bold uppercase tracking-widest">
                                      <span>{new Date(client.timestamp).toLocaleDateString()}</span>
                                      <span className="text-blue-400">{client.status}</span>
                                   </div>
                               </div>
                               <button onClick={() => { triggerHaptic('light'); onNavigateInvoice(); }} className="text-blue-500 text-xl active-haptic" aria-label={`View invoice for ${client.clientName}`}>📄</button>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-4 text-[9px] font-bold border-t border-white/5 pt-3">
                               <div className="space-y-1">
                                   <p className="text-gray-500 uppercase">Contact</p>
                                   <p className="text-gray-300 truncate">{client.phone || 'N/A'}</p>
                               </div>
                               <div className="space-y-1">
                                   <p className="text-gray-500 uppercase">Vehicle (VIN)</p>
                                   <p className="text-green-500 font-mono tracking-wider truncate">{client.vin || 'NO VIN'}</p>
                               </div>
                           </div>
                       </div>
                   ))}
               </div>
          </section>
      </div>
      )}

      <div className="grid grid-cols-2 gap-4 px-4">
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-1 text-center">
              <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Fleet Assets</p>
              <p className="text-4xl font-black italic text-white tracking-tighter">{crmClients.length}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-[2.5rem] space-y-1 shadow-2xl border border-blue-400/20 text-center">
              <p className="text-[8px] font-black text-white/80 uppercase tracking-widest">Lead Velocity</p>
              <p className="text-4xl font-black italic text-white tracking-tighter">{Math.floor(crmClients.length * 1.4)}</p>
          </div>
      </div>
    </div>
  );
};

export default AdminView;
