
import React from 'react';
import { triggerHaptic } from '../services/haptics';

const ComplianceGuide: React.FC = () => {
  const steps = [
    {
      id: 'step-1',
      icon: "🏢",
      title: "Step 1: Entity Registration",
      subtitle: "The foundation of compliance.",
      tip: "The state won't remind you, but registration must match your DOT exactly.",
      url: "https://cleantruckcheck.arb.ca.gov/Entity/EntityManagement/RegisterEntity"
    },
    {
      id: 'step-2',
      icon: "🚛",
      title: "Step 2: Vehicle Inventory",
      subtitle: "Archive every truck in TRUCRS.",
      tip: "Include VIN, Plate, and Engine Family ID correctly or testing will be rejected.",
      url: "https://cleantruckcheck.arb.ca.gov/Fleet/Vehicle/VehicleManagement"
    },
    {
      id: 'step-3',
      icon: "⚡",
      title: "Step 3: Semi-Annual Testing",
      subtitle: "OBD or Smoke Opacity check.",
      tip: "Jan 1st and July 1st are critical windows. Do not wait for the deadline.",
      internalAction: true
    }
  ];

  const MetallicStyle = "bg-gradient-to-b from-slate-100 via-slate-300 to-slate-400 shadow-[0_4px_12px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-slate-200 relative overflow-hidden transition-all";
  const BrushedTexture = <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')] opacity-10 pointer-events-none"></div>;

  return (
    <div className="space-y-6 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col items-center gap-2">
        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-carb-accent italic">Proactive Compliance Roadmap</h3>
        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Essential Steps the State Misses</p>
      </div>

      <div className="space-y-4">
        {steps.map((step, idx) => (
          <div key={step.id} className="space-y-2">
             <button 
                onClick={() => {
                  triggerHaptic('light');
                  if (step.internalAction) {
                    document.getElementById('find-tester-trigger')?.click();
                  } else if (step.url) {
                    window.open(step.url, '_blank');
                  }
                }}
                className={`w-full py-5 px-8 rounded-3xl flex items-center justify-between group active-haptic ${MetallicStyle}`}
              >
                {BrushedTexture}
                <div className="flex items-center gap-4 relative z-10">
                  <span className="text-xl">{step.icon}</span>
                  <div className="text-left">
                    <span className="block text-xs font-black text-slate-900 uppercase tracking-widest italic">{step.title}</span>
                    <span className="block text-[8px] text-slate-600 font-bold uppercase tracking-tight">{step.subtitle}</span>
                  </div>
                </div>
                <span className="text-slate-800 font-thin text-xl relative z-10 group-hover:translate-x-1 transition-transform">›</span>
              </button>
              
              <div className="mx-6 p-3 bg-slate-900/40 rounded-2xl border border-white/5 flex gap-3 items-start">
                 <span className="text-[10px] grayscale">💡</span>
                 <p className="text-[9px] font-bold text-slate-400 leading-tight">
                    <span className="text-carb-accent uppercase italic font-black mr-1">Insider Tip:</span>
                    {step.tip}
                 </p>
              </div>
          </div>
        ))}
      </div>

      <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 text-center mt-6">
        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-relaxed">
          Need custom guidance? Ask the <span className="text-carb-accent">AI Assistant</span>.
        </p>
      </div>
    </div>
  );
};

export default ComplianceGuide;
