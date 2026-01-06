
import React, { useState } from 'react';

const ADMIN_CODE = '1225';

const AdminView: React.FC = () => {
  const [passInput, setPassInput] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);

  if (!isAuthorized) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm glass p-10 rounded-[3rem] border border-white/10 shadow-2xl space-y-8 text-center">
            <h2 className="text-xl font-black italic uppercase text-white tracking-tighter">Tester Dash</h2>
            <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest">PASSWORD PROTECTED</p>
            <input 
                type="password"
                value={passInput}
                onChange={(e) => setPassInput(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 text-center text-2xl font-black text-white outline-none focus:border-blue-500 tracking-widest"
                onKeyDown={(e) => e.key === 'Enter' && passInput === ADMIN_CODE && setIsAuthorized(true)}
            />
            <button 
              onClick={() => passInput === ADMIN_CODE ? setIsAuthorized(true) : alert("Invalid Code")}
              className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-lg active-haptic"
            >
              Access Dash
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center px-4">
          <div className="flex flex-col">
              <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter">ADMIN KPI</h2>
              <p className="text-[8px] font-black text-green-500 uppercase tracking-widest">Live Operations</p>
          </div>
          <button className="p-3 bg-white/5 rounded-2xl border border-white/10 text-xl active-haptic">📈</button>
      </div>

      <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-1">
              <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">LEADS</p>
              <p className="text-5xl font-black italic text-white tracking-tighter">24</p>
          </div>
          <div className="bg-blue-600 p-8 rounded-[2.5rem] space-y-1 shadow-xl">
              <p className="text-[8px] font-black text-white/60 uppercase tracking-widest">TODAY</p>
              <p className="text-5xl font-black italic text-white tracking-tighter">3</p>
          </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-[3rem] p-8 space-y-6">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] italic">Operator Tools</h3>
          <div className="grid grid-cols-2 gap-4">
              <button className="p-6 bg-white/5 rounded-3xl border border-white/10 text-center space-y-2 active-haptic">
                  <span className="text-2xl block">📧</span>
                  <span className="text-[8px] font-black uppercase text-white tracking-widest">EMAIL</span>
              </button>
              <button className="p-6 bg-white/5 rounded-3xl border border-white/10 text-center space-y-2 active-haptic">
                  <span className="text-2xl block">📸</span>
                  <span className="text-[8px] font-black uppercase text-white tracking-widest">PHOTOS</span>
              </button>
              <button className="p-6 bg-white/5 rounded-3xl border border-white/10 text-center space-y-2 active-haptic">
                  <span className="text-2xl block">📄</span>
                  <span className="text-[8px] font-black uppercase text-white tracking-widest">INVOICE</span>
              </button>
              <button className="p-6 bg-green-600/10 rounded-3xl border border-green-500/20 text-center space-y-2 active-haptic">
                  <span className="text-2xl block">💳</span>
                  <span className="text-[8px] font-black uppercase text-green-500 tracking-widest">PAYMENTS</span>
              </button>
          </div>
      </div>

      <div className="text-center">
          <p className="text-[8px] font-black text-gray-800 uppercase tracking-widest">Stripe/Paypal Plugin Integrated</p>
      </div>
    </div>
  );
};

export default AdminView;
