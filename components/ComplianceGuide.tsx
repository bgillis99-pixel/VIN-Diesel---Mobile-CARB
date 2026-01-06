
import React from 'react';

const ComplianceGuide: React.FC = () => {
  const steps = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
      ),
      title: "1. Register Entity",
      desc: "Create your CTC-VIS account on the official registry portal.",
      url: "https://cleantruckcheck.arb.ca.gov/Entity/EntityManagement/RegisterEntity"
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
      ),
      title: "2. List Vehicles",
      desc: "Input your VINs and pay the annual compliance fees.",
      url: "https://cleantruckcheck.arb.ca.gov/Fleet/Vehicle/VehicleManagement"
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
      ),
      title: "3. OBD Testing",
      desc: "Bi-annual emissions testing is now mandatory. Find a tester.",
      url: "#",
      internalAction: true
    }
  ];

  return (
    <div className="space-y-6 mt-10">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-500">Compliance Path</h3>
        <span className="text-[10px] bg-white/5 text-gray-500 font-bold px-3 py-1 rounded-full border border-white/5 uppercase">Step-By-Step</span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {steps.map((step, idx) => (
          <div 
            key={idx}
            className="glass p-8 rounded-[3rem] flex items-start gap-5 border border-white/5 hover:border-white/10 transition-all cursor-pointer group shadow-xl"
            onClick={() => step.internalAction ? document.getElementById('find-tester-trigger')?.click() : window.open(step.url, '_blank')}
          >
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-carb-accent group-hover:scale-110 transition-transform shadow-inner border border-white/5">
              {step.icon}
            </div>
            <div className="flex-1">
              <h4 className="text-white font-black text-sm tracking-tight uppercase italic">{step.title}</h4>
              <p className="text-[11px] text-gray-500 mt-2 leading-relaxed font-medium">{step.desc}</p>
            </div>
            <div className="text-gray-800 font-thin text-2xl self-center group-hover:translate-x-1 transition-transform">›</div>
          </div>
        ))}
      </div>

      <div className="bg-blue-600/5 border border-blue-600/10 p-10 rounded-[4rem] flex flex-col items-center text-center space-y-3 shadow-2xl">
        <div className="text-blue-500 text-[10px] font-black uppercase tracking-[0.4em] italic">Compliance Deadline</div>
        <div className="text-3xl font-black italic tracking-tighter text-white uppercase leading-none">Jan 1, 2025</div>
        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest px-8 leading-relaxed mt-2">Mandatory testing protocols active for all CA diesel assets over 14,000 lbs.</p>
      </div>
    </div>
  );
};

export default ComplianceGuide;
