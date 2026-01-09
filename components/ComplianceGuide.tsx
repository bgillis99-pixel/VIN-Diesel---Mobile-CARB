import React from 'react';

const ComplianceGuide: React.FC = () => {
  const steps = [
    {
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
      ),
      title: "1. Register Entity",
      desc: "Create your CTC-VIS account on the official registry portal.",
      url: "https://cleantruckcheck.arb.ca.gov/Entity/EntityManagement/RegisterEntity"
    },
    {
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
      ),
      title: "2. List Vehicles",
      desc: "Input your VINs and pay the annual compliance fees.",
      url: "https://cleantruckcheck.arb.ca.gov/Fleet/Vehicle/VehicleManagement"
    },
    {
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
      ),
      title: "3. OBD Testing",
      desc: "Bi-annual emissions testing is now mandatory. Find a tester.",
      url: "#",
      internalAction: true
    }
  ];

  return (
    <div className="space-y-6 mt-8">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Compliance Path</h3>
        <span className="text-[8px] bg-slate-800/60 text-slate-400 font-bold px-3 py-1 rounded-full border border-white/5 uppercase italic">Step-By-Step</span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {steps.map((step, idx) => (
          <div 
            key={idx}
            className="bg-slate-800/30 p-6 rounded-[2rem] flex items-start gap-5 border border-white/5 hover:bg-slate-800/50 transition-all cursor-pointer group shadow-lg"
            onClick={() => step.internalAction ? document.getElementById('find-tester-trigger')?.click() : window.open(step.url, '_blank')}
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-900/60 flex items-center justify-center text-carb-accent group-hover:scale-105 transition-transform border border-white/5">
              {step.icon}
            </div>
            <div className="flex-1">
              <h4 className="text-slate-100 font-black text-[13px] tracking-tight uppercase italic">{step.title}</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed font-medium">{step.desc}</p>
            </div>
            <div className="text-slate-700 font-thin text-xl self-center group-hover:translate-x-1 transition-transform">›</div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-br from-slate-800/60 to-slate-950/60 border border-white/5 p-8 rounded-[3rem] space-y-3 shadow-xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute -top-4 -right-4 w-20 h-20 bg-carb-accent/5 rounded-full blur-3xl"></div>
        <div className="text-carb-accent text-[9px] font-black uppercase tracking-[0.3em] italic">Proactive Insight</div>
        <h4 className="text-lg font-black italic text-slate-100 tracking-tighter uppercase leading-none">Avoid Portal Crashes</h4>
        <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
          State portals often stall near deadlines. We recommend submitting OBD checks <span className="text-carb-accent font-bold">20 days early</span>. If your certificate fails to generate, manual reconciliation in 'Entity Management' is often required.
        </p>
      </div>

      <div className="bg-slate-800/20 border border-white/5 p-8 rounded-[3rem] flex flex-col items-center text-center space-y-2 shadow-lg">
        <div className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] italic">Next Major Deadline</div>
        <div className="text-2xl font-black italic tracking-tighter text-slate-100 uppercase">Jan 1, 2025</div>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-4 leading-relaxed mt-1 italic">Mandatory testing active for assets over 14,000 lbs.</p>
      </div>
    </div>
  );
};

export default ComplianceGuide;