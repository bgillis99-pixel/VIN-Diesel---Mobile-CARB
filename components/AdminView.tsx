
import React, { useState, useEffect, useMemo } from 'react';
import { getClientsFromCRM, subscribeToInboundIntakes } from '../services/firebase';
import { CrmClient, IntakeSubmission } from '../types';
import { triggerHaptic } from '../services/haptics';

interface Props {
  onNavigateInvoice: () => void;
}

const AdminView: React.FC<Props> = ({ onNavigateInvoice }) => {
  const [passInput, setPassInput] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminCode, setAdminCode] = useState('1225');
  const [adminViewMode, setAdminViewMode] = useState<'COMMAND' | 'INTAKES' | 'CRM'>('COMMAND');
  const [intakes, setIntakes] = useState<IntakeSubmission[]>([]);
  const [crmClients, setCrmClients] = useState<CrmClient[]>([]);

  useEffect(() => {
    if (isAuthorized) {
        const unsub = subscribeToInboundIntakes((data) => setIntakes(data));
        getClientsFromCRM().then(data => setCrmClients(data));
        return () => unsub();
    }
  }, [isAuthorized]);

  const handleLogin = () => {
    triggerHaptic('medium');
    if (passInput === adminCode) {
      setIsAuthorized(true);
      triggerHaptic('success');
    } else {
      triggerHaptic('error');
      alert("Invalid Code");
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6 animate-in fade-in duration-500">
        <div className="w-full max-w-sm glass-card p-12 rounded-[4rem] border border-white/5 shadow-2xl space-y-10 text-center relative overflow-hidden">
            <div className="space-y-3">
              <h2 className="text-4xl font-black italic uppercase text-white tracking-tighter">Command</h2>
              <p className="text-[10px] text-carb-accent font-black uppercase tracking-[0.5em] italic">Restricted Op Area</p>
            </div>
            <div className="space-y-6">
              <input 
                  type="password"
                  value={passInput}
                  onChange={(e) => setPassInput(e.target.value)}
                  placeholder="PIN"
                  className="w-full bg-slate-950/40 border border-white/5 rounded-3xl py-6 text-center text-4xl font-black text-white outline-none focus:border-carb-accent/30 tracking-[0.4em]"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
              <button 
                onClick={handleLogin}
                className="w-full py-5 metallic-btn text-slate-900 font-black rounded-3xl uppercase tracking-widest text-xs shadow-xl active-haptic"
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
      <nav className="flex p-1 bg-slate-900 rounded-2xl border border-white/5 mx-4 overflow-x-auto gap-1">
          {['COMMAND', 'INTAKES', 'CRM'].map(mode => (
            <button 
              key={mode}
              onClick={() => setAdminViewMode(mode as any)}
              className={`flex-1 min-w-[80px] py-3 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${adminViewMode === mode ? 'bg-carb-accent text-white shadow-lg' : 'text-slate-500'}`}
            >
              {mode}
            </button>
          ))}
      </nav>

      {adminViewMode === 'COMMAND' && (
        <div className="px-4 grid grid-cols-2 gap-4">
            <div className="glass-card p-8 rounded-[3rem] text-center space-y-1">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Revenue MTD</p>
                <p className="text-3xl font-black italic text-white tracking-tighter">$14,250</p>
            </div>
            <div className="glass-card p-8 rounded-[3rem] text-center space-y-1 border-carb-green/20">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Compliance Rate</p>
                <p className="text-3xl font-black italic text-carb-green tracking-tighter">92%</p>
            </div>
        </div>
      )}

      {adminViewMode === 'INTAKES' && (
          <div className="px-4 space-y-4">
              {intakes.map((intake) => {
                  const data = intake.extractedData as any;
                  const ai = intake.originalAiData as any;
                  const corrections = ai ? Object.keys(data).filter(k => data[k] !== ai[k]) : [];
                  return (
                      <div key={intake.id} className="glass-card p-6 rounded-[2.5rem] space-y-4 border border-white/5">
                          <div className="flex justify-between items-start">
                              <div>
                                  <p className="text-[8px] font-black text-carb-accent uppercase italic">{new Date(intake.timestamp).toLocaleDateString()}</p>
                                  <h4 className="text-lg font-black text-white italic uppercase tracking-tighter leading-none">{intake.clientName}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[8px] font-bold text-slate-600 uppercase">Session: {intake.sessionId}</span>
                                    {corrections.length > 0 && <span className="text-[7px] font-black text-carb-orange uppercase bg-carb-orange/10 px-1 rounded">{corrections.length} CORRECTIONS</span>}
                                  </div>
                              </div>
                              <button onClick={onNavigateInvoice} className="text-carb-accent text-xl active-haptic">📄</button>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[9px] font-bold">
                              {['vin', 'licensePlate', 'engineFamilyName', 'engineYear'].map(field => {
                                  const isCorrected = ai && data[field] !== ai[field];
                                  return (
                                      <div key={field} className="space-y-0.5">
                                          <p className="text-slate-600 uppercase tracking-widest">{field.replace(/([A-Z])/g, ' $1')}</p>
                                          <p className={`truncate italic ${isCorrected ? 'text-carb-orange' : 'text-slate-300'}`}>{data[field] || 'None'}</p>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  );
              })}
          </div>
      )}

      {adminViewMode === 'CRM' && (
          <div className="px-4 space-y-4">
              {crmClients.map(client => (
                  <div key={client.id} className="glass-card p-6 rounded-[2.5rem] flex justify-between items-center">
                      <div className="space-y-1">
                          <h4 className="font-black text-white italic uppercase">{client.clientName}</h4>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{client.vin || 'NO VIN'}</p>
                      </div>
                      <span className="bg-carb-accent/10 text-carb-accent px-3 py-1 rounded-full text-[8px] font-black uppercase">{client.status}</span>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};

export default AdminView;
