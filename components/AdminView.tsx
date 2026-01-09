
import React, { useState, useEffect, useMemo } from 'react';
import { getClientsFromCRM, subscribeToInboundIntakes } from '../services/firebase';
import { CrmClient, IntakeSubmission } from '../types';
import { triggerHaptic } from '../services/haptics';

interface Props {
  onNavigateInvoice: (data?: any) => void;
}

const COMMAND_ICONS = {
  STATS: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  CALENDAR: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002-2z" /></svg>,
  INTAKES: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  CRM: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
};

const AdminView: React.FC<Props> = ({ onNavigateInvoice }) => {
  const [passInput, setPassInput] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminCode, setAdminCode] = useState('1225');
  const [adminViewMode, setAdminViewMode] = useState<'COMMAND' | 'CALENDAR' | 'INTAKES' | 'CRM'>('COMMAND');
  const [intakes, setIntakes] = useState<IntakeSubmission[]>([]);
  const [crmClients, setCrmClients] = useState<CrmClient[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (isAuthorized) {
        const unsub = subscribeToInboundIntakes((data) => setIntakes(data));
        getClientsFromCRM().then(data => setCrmClients(data));
        return () => unsub();
    }
  }, [isAuthorized]);

  const handleLogin = () => {
    triggerHaptic('medium');
    if (passInput === adminCode) { setIsAuthorized(true); triggerHaptic('success'); }
    else { triggerHaptic('error'); alert("Access Denied."); }
  };

  const DashboardStat = ({ label, value, colorClass }: { label: string, value: string, colorClass: string }) => (
    <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-bl-[2.5rem] -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
      <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] italic mb-1">{label}</p>
      <p className={`text-3xl font-black italic tracking-tighter ${colorClass}`}>{value}</p>
    </div>
  );

  const CalendarGrid = () => {
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
    const days = [];
    for(let i=0; i<firstDay; i++) days.push(null);
    for(let i=1; i<=daysInMonth; i++) days.push(i);
    return (
      <div className="bg-slate-900/40 rounded-[3rem] p-8 border border-white/5 backdrop-blur-3xl animate-in zoom-in-95 duration-500">
        <div className="flex justify-between items-center mb-8">
           <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth()-1)))} className="text-slate-500 hover:text-white transition-colors p-2">◀</button>
           <h3 className="text-xl font-black text-white uppercase italic tracking-widest">{currentMonth.toLocaleString('default', { month: 'long' })} {currentMonth.getFullYear()}</h3>
           <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth()+1)))} className="text-slate-500 hover:text-white transition-colors p-2">▶</button>
        </div>
        <div className="grid grid-cols-7 gap-2 mb-4">{['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-center text-[8px] font-black text-carb-accent uppercase tracking-widest">{d}</div>)}</div>
        <div className="grid grid-cols-7 gap-2">
           {days.map((d, i) => (
             <div key={i} className={`aspect-square rounded-2xl flex flex-col items-center justify-center border border-white/5 transition-all relative ${d ? 'bg-white/5 hover:bg-carb-accent/20 cursor-pointer active:scale-95' : 'opacity-0'}`}>
                {d && (
                  <>
                    <span className="text-xs font-black text-slate-400">{d}</span>
                    {d % 7 === 0 && <div className="absolute bottom-2 w-1.5 h-1.5 bg-carb-orange rounded-full animate-pulse"></div>}
                    {d % 5 === 0 && <div className="absolute bottom-2 w-1.5 h-1.5 bg-carb-green rounded-full"></div>}
                  </>
                )}
             </div>
           ))}
        </div>
      </div>
    );
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 animate-in fade-in duration-500">
        <div className="w-full max-w-sm glass-card p-12 rounded-[4rem] border border-white/5 shadow-2xl space-y-10 text-center relative overflow-hidden backdrop-blur-2xl">
            <div className="space-y-3 relative z-10">
              <div className="w-16 h-16 bg-carb-accent/10 rounded-full mx-auto flex items-center justify-center text-3xl border border-carb-accent/20 mb-4 animate-pulse">🔒</div>
              <h2 className="text-4xl font-black italic uppercase text-white tracking-tighter">COMMAND</h2>
              <p className="text-[10px] text-carb-accent font-black uppercase tracking-[0.5em] italic">Authorized Entry Only</p>
            </div>
            <div className="space-y-6 relative z-10">
              <input type="password" value={passInput} onChange={(e) => setPassInput(e.target.value)} placeholder="CODE" className="w-full bg-slate-950/40 border border-white/5 rounded-3xl py-6 text-center text-4xl font-black text-white outline-none focus:border-carb-accent/30 tracking-[0.5em] shadow-inner" onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
              <button onClick={handleLogin} className="w-full py-5 bg-gradient-to-b from-slate-100 to-slate-400 text-slate-900 font-black rounded-3xl uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-transform">ACCESS CONSOLE</button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-32">
      <div className="sticky top-20 z-50 px-4">
        <nav className="flex p-2 bg-slate-950/80 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl gap-2">
            {[
              { id: 'COMMAND', icon: COMMAND_ICONS.STATS },
              { id: 'CALENDAR', icon: COMMAND_ICONS.CALENDAR },
              { id: 'INTAKES', icon: COMMAND_ICONS.INTAKES },
              { id: 'CRM', icon: COMMAND_ICONS.CRM }
            ].map(tab => (
              <button key={tab.id} onClick={() => { triggerHaptic('light'); setAdminViewMode(tab.id as any); }} className={`flex-1 py-4 flex flex-col items-center justify-center rounded-[2rem] transition-all gap-1.5 ${adminViewMode === tab.id ? 'bg-carb-accent text-white shadow-xl scale-105' : 'text-slate-500 hover:text-slate-300'}`}>
                {tab.icon}
                <span className="text-[8px] font-black uppercase tracking-widest leading-none">{tab.id}</span>
              </button>
            ))}
        </nav>
      </div>

      <div className="px-4">
        {adminViewMode === 'COMMAND' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-2 gap-4">
                  <DashboardStat label="Revenue MTD" value="$18,450" colorClass="text-white" />
                  <DashboardStat label="Fleet Health" value="94%" colorClass="text-carb-green" />
                  <DashboardStat label="Active Jobs" value="12" colorClass="text-carb-accent" />
                  <DashboardStat label="Alerts" value="03" colorClass="text-carb-orange" />
              </div>
          </div>
        )}

        {adminViewMode === 'CALENDAR' && <CalendarGrid />}

        {adminViewMode === 'INTAKES' && (
            <div className="space-y-4 animate-in fade-in duration-500">
                {intakes.map((intake) => (
                    <div key={intake.id} className="glass-card p-8 rounded-[3rem] space-y-6 border border-white/5 hover:border-carb-accent/30 transition-all">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[8px] font-black text-carb-accent uppercase italic">{new Date(intake.timestamp).toLocaleString()}</p>
                                <h4 className="text-xl font-black text-white italic uppercase tracking-tighter leading-none mb-1">{intake.clientName}</h4>
                                <p className="text-[8px] font-bold text-slate-600 uppercase">ID: {intake.sessionId}</p>
                            </div>
                            <button 
                              onClick={() => onNavigateInvoice({
                                name: intake.clientName,
                                company: intake.clientName,
                                vin: (intake.extractedData as any)?.vin,
                                plate: (intake.extractedData as any)?.licensePlate
                              })} 
                              className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-xl hover:bg-carb-accent/20 active:scale-95 transition-all"
                            >📄</button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {adminViewMode === 'CRM' && (
            <div className="space-y-4 animate-in fade-in duration-500">
                {crmClients.map(client => (
                    <div key={client.id} className="glass-card p-8 rounded-[3rem] flex justify-between items-center border border-white/5 hover:bg-white/5 transition-colors active-haptic">
                        <div className="space-y-1">
                            <h4 className="font-black text-lg text-white italic uppercase tracking-tighter">{client.clientName}</h4>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">VIN: {client.vin ? `••••${client.vin.slice(-4)}` : 'MISSING'}</p>
                        </div>
                        <button 
                            onClick={() => onNavigateInvoice({
                                name: client.clientName,
                                company: client.clientName,
                                phone: client.phone,
                                email: client.email,
                                vin: client.vin,
                                plate: client.plate
                            })}
                            className="bg-carb-accent/10 text-carb-accent px-4 py-2 rounded-xl text-[9px] font-black uppercase italic border border-carb-accent/20"
                        >
                            Invoice
                        </button>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default AdminView;
