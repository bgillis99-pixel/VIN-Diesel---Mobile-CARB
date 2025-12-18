import React, { useState, useRef } from 'react';
import { scoutTruckLead } from '../services/geminiService';
import { Lead, HotLead } from '../types';

// --- SEED DATA FROM CSV ---
const HOT_LEADS_DATA: HotLead[] = [
  {
    id: '1',
    company: "Lassen Forest Products Inc",
    phone: "(530) 527-7677",
    email: "alex@lassenforestproducts.com",
    address: "22829 Casale Rd, Red Bluff, CA 96080",
    fleetSize: "Unknown",
    status: 'HOT',
    zone: "NorCal",
    source: "BBB/Yelp",
    smsTemplate: "🚛 LASSEN FOREST - CARB ALERT: Fleet NOT COMPLIANT in CTC-VIS. DMV holds + CHP citations coming. Mobile testing $75 OBD / $250 smoke. Text YES - NorCal CARB 916-890-4427"
  },
  {
    id: '2',
    company: "Mendocino Forest Products",
    phone: "(707) 485-6882",
    email: "info@mendoco.com",
    address: "3700 Old Redwood Hwy Ste 200, Santa Rosa, CA",
    fleetSize: "51-200",
    status: 'HOT',
    zone: "✅ GOOD (50-100mi)",
    source: "ZoomInfo",
    smsTemplate: "🚛 MENDOCINO FOREST - CARB ALERT: Fleet NOT COMPLIANT in CTC-VIS. DMV holds + CHP citations coming. Mobile testing $75 OBD / $250 smoke. Text YES - NorCal CARB 916-890-4427"
  },
  {
    id: '3',
    company: "Yandell Truckaway Inc",
    phone: "(707) 748-0132",
    email: "tom.twyford@yandelltruckaway.com",
    address: "360 Industrial Ct, Benicia, CA 94510",
    fleetSize: "22 employees",
    status: 'HOT',
    zone: "🔥 HOT (<50mi)",
    source: "ZoomInfo",
    smsTemplate: "🚛 YANDELL TRUCKAWAY - CARB ALERT: Fleet NOT COMPLIANT in CTC-VIS. DMV holds + CHP citations coming. Mobile testing $75 OBD / $250 smoke. Text YES - NorCal CARB 916-890-4427"
  },
  {
    id: '4',
    company: "Sundance Stage Lines Inc",
    phone: "(619) 525-1570",
    email: "sales@sundancestage.com",
    address: "3762 Main St, San Diego, CA 92113",
    fleetSize: "11 motorcoaches",
    status: 'WARM',
    zone: "SoCal",
    source: "Website",
    smsTemplate: "🚛 SUNDANCE STAGE - CARB ALERT: Fleet NOT COMPLIANT in CTC-VIS. DMV holds + CHP citations coming. Mobile testing $75 OBD / $250 smoke. Text YES - NorCal CARB 916-890-4427"
  },
  {
    id: '5',
    company: "Steve Wills Trucking",
    phone: "(707) 768-3781",
    email: "",
    address: "1576 State Highway 36, Fortuna, CA 95540",
    fleetSize: "22 trucks",
    status: 'HOT',
    zone: "NorCal",
    source: "ZoomInfo",
    smsTemplate: "🚛 STEVE WILLS - CARB ALERT: Fleet NOT COMPLIANT in CTC-VIS. DMV holds + CHP citations coming. Mobile testing $75 OBD / $250 smoke. Text YES - NorCal CARB 916-890-4427"
  }
];

const AdminView: React.FC = () => {
  const [currentApp, setCurrentApp] = useState<'HOME' | 'MAIL' | 'CALENDAR' | 'CONTACTS' | 'TASKS' | 'SCOUT' | 'ANALYTICS' | 'LEADS'>('HOME');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [scouting, setScouting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const AppIcon = ({ label, icon, color, onClick, badge }: any) => (
      <button 
        onClick={onClick}
        className="flex flex-col items-center gap-2 transition-transform active:scale-90"
      >
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl text-white shadow-xl relative ${color}`}>
             {icon}
             {badge > 0 && (
                 <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                     {badge}
                 </div>
             )}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-navy dark:text-gray-300 opacity-70">{label}</span>
      </button>
  );

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScouting(true);
    setCurrentApp('SCOUT');
    try {
        const lead = await scoutTruckLead(file);
        setLeads(prev => [lead, ...prev]);
    } catch (err) { alert('Scout analysis failed.'); } finally { setScouting(false); }
  };

  const getAnalyticsData = () => {
      const subs = JSON.parse(localStorage.getItem('vin_diesel_submissions') || '[]');
      const locationMap: Record<string, number> = {};
      subs.forEach((s: any) => {
          if (s.coordinates) {
              const key = `${s.coordinates.lat.toFixed(1)},${s.coordinates.lng.toFixed(1)}`;
              locationMap[key] = (locationMap[key] || 0) + 1;
          } else {
              locationMap['Web Traffic'] = (locationMap['Web Traffic'] || 0) + 1;
          }
      });
      return { total: subs.length + 42, locations: locationMap }; // +42 for seeding
  };

  const renderApp = () => {
      if (currentApp === 'HOME') {
        const leadCount = HOT_LEADS_DATA.length;
        return (
          <div className="min-h-[85vh] bg-slate-100 dark:bg-black p-8 relative overflow-hidden">
              <div className="flex justify-between text-xs font-black text-navy/40 dark:text-gray-400 mb-10 relative z-10 uppercase tracking-widest">
                  <span>Carrier Hub v3.1</span>
                  <div className="flex gap-2">
                      <span>4G LTE</span>
                      <span>100%</span>
                  </div>
              </div>
              <div className="grid grid-cols-4 gap-y-10 gap-x-6 relative z-10">
                  <AppIcon label="Mail" icon="✉️" color="bg-blue-500" onClick={() => setCurrentApp('MAIL')} badge={3} />
                  <AppIcon label="Hot Leads" icon="🎯" color="bg-red-600" onClick={() => setCurrentApp('LEADS')} badge={leadCount} />
                  <AppIcon label="Dispatch" icon="📞" color="bg-green-600" onClick={() => window.location.href = 'tel:6173596953'} />
                  <AppIcon label="Scout" icon="📸" color="bg-gray-800 text-white" onClick={() => fileInputRef.current?.click()} />
                  
                  <AppIcon label="Contacts" icon="👥" color="bg-gray-500" onClick={() => setCurrentApp('CONTACTS')} />
                  <AppIcon label="Momentum" icon="📈" color="bg-purple-600" onClick={() => setCurrentApp('ANALYTICS')} />
                  <AppIcon label="Cloud" icon="📂" color="bg-yellow-500" onClick={() => window.open('https://drive.google.com', '_blank')} />
                  <AppIcon label="CARB" icon="🌲" color="bg-[#003366]" onClick={() => window.open('https://cleantruckcheck.arb.ca.gov/', '_blank')} />
              </div>

              <div className="absolute bottom-6 left-6 right-6 bg-navy/10 dark:bg-gray-800/50 backdrop-blur-3xl rounded-[3rem] p-6 flex justify-around items-end z-10 shadow-2xl border border-white/20">
                  <AppIcon label="" icon="📞" color="bg-green-500 shadow-xl" onClick={() => window.location.href = 'tel:6173596953'} />
                  <AppIcon label="" icon="🌐" color="bg-blue-400 shadow-xl" onClick={() => window.open('https://carbcleantruckcheck.app', '_blank')} />
                  <AppIcon label="" icon="🤖" color="bg-navy shadow-xl" onClick={() => setCurrentApp('HOME')} />
                  <AppIcon label="" icon="✉️" color="bg-orange-500 shadow-xl" onClick={() => setCurrentApp('MAIL')} />
              </div>

              <input type="file" ref={fileInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleCapture} />
          </div>
        );
      }

      switch(currentApp) {
          case 'LEADS':
              return (
                  <div className="h-full bg-slate-50 dark:bg-gray-900 flex flex-col">
                      <div className="bg-white dark:bg-gray-800 p-6 shadow-xl flex justify-between items-center sticky top-0 z-20">
                          <button onClick={() => setCurrentApp('HOME')} className="text-navy font-black text-xs uppercase tracking-widest">‹ BACK</button>
                          <h2 className="font-black text-navy dark:text-white uppercase tracking-tighter text-xl">Hot Leads</h2>
                          <div className="w-10"></div>
                      </div>
                      <div className="p-6 space-y-6 overflow-y-auto pb-32">
                          {HOT_LEADS_DATA.map((lead) => (
                              <div key={lead.id} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border-2 border-navy/5 dark:border-gray-700 shadow-lg relative">
                                  {lead.status === 'HOT' && (
                                      <div className="absolute top-0 right-0 bg-red-600 text-white text-[9px] font-black px-4 py-1 rounded-bl-2xl uppercase tracking-widest">URGENT</div>
                                  )}
                                  <div className="mb-4">
                                      <h3 className="font-black text-xl text-navy dark:text-white leading-none mb-2">{lead.company}</h3>
                                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">📍 {lead.address}</p>
                                      <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mt-1">Zone: {lead.zone}</p>
                                  </div>
                                  <div className="flex gap-3">
                                      <a href={`tel:${lead.phone.replace(/[^0-9]/g, '')}`} className="flex-1 bg-navy text-white py-4 rounded-2xl font-black text-center text-xs tracking-widest uppercase shadow-md active:scale-95 transition-all">CALL</a>
                                      <a href={`sms:${lead.phone.replace(/[^0-9]/g, '')}?body=${encodeURIComponent(lead.smsTemplate)}`} className="flex-1 bg-green text-white py-4 rounded-2xl font-black text-center text-xs tracking-widest uppercase shadow-md active:scale-95 transition-all">TEXT</a>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              );

          case 'ANALYTICS':
              const analytics = getAnalyticsData();
              return (
                  <div className="h-full bg-navy text-white flex flex-col">
                       <div className="p-8">
                          <button onClick={() => setCurrentApp('HOME')} className="text-white/50 font-black mb-6 uppercase tracking-widest text-xs">‹ BACK</button>
                          <h1 className="text-4xl font-black mb-2 uppercase tracking-tighter">Live Pings</h1>
                          <p className="text-blue-300 font-bold uppercase tracking-widest text-[10px]">Real-time Network Activity</p>
                       </div>
                       
                       <div className="px-8 pb-32 overflow-y-auto space-y-8">
                           <div className="bg-white/10 backdrop-blur-3xl p-8 rounded-[3rem] border border-white/10 shadow-2xl">
                               <p className="text-blue-200 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Total Scans (7d)</p>
                               <p className="text-7xl font-black text-white">{analytics.total}</p>
                               <div className="mt-4 flex items-center gap-2 text-green-400 font-bold text-xs">
                                   <span className="text-xl">↑</span>
                                   <span>14% vs LAST WEEK</span>
                               </div>
                           </div>

                           <div className="bg-white/10 backdrop-blur-3xl p-8 rounded-[3rem] border border-white/10 shadow-2xl">
                               <p className="text-blue-200 text-[10px] font-black uppercase tracking-[0.2em] mb-6">Hotspot Distribution</p>
                               <div className="space-y-4">
                                   {Object.entries(analytics.locations).map(([loc, count]: any) => (
                                       <div key={loc} className="flex justify-between items-center border-b border-white/10 pb-4">
                                           <div className="flex items-center gap-3">
                                               <span className="text-2xl">📍</span>
                                               <span className="font-black text-sm uppercase tracking-tighter">{loc}</span>
                                           </div>
                                           <div className="bg-blue-500 text-white px-4 py-1.5 rounded-full font-black text-xs shadow-lg">{count}</div>
                                       </div>
                                   ))}
                                   <div className="flex justify-between items-center border-b border-white/10 pb-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">🌍</span>
                                            <span className="font-black text-sm uppercase tracking-tighter">Sacramento (Seed)</span>
                                        </div>
                                        <div className="bg-blue-500 text-white px-4 py-1.5 rounded-full font-black text-xs shadow-lg">12</div>
                                    </div>
                               </div>
                           </div>
                       </div>
                  </div>
              );

          default:
              return (
                  <div className="h-full flex items-center justify-center bg-slate-100 p-8">
                      <button onClick={() => setCurrentApp('HOME')} className="bg-navy text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest">RETURN HOME</button>
                  </div>
              );
      }
  };

  return renderApp();
};

export default AdminView;