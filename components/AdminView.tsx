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
  },
  {
    id: '6',
    company: "Bauer's Intelligent Transp.",
    phone: "(415) 522-1212",
    email: "",
    address: "50 Pier, San Francisco, CA 94158",
    fleetSize: "200+ vehicles",
    status: 'HOT',
    zone: "Bay Area",
    source: "Yelp",
    smsTemplate: "🚛 BAUER'S IT - CARB ALERT: Fleet NOT COMPLIANT in CTC-VIS. DMV holds + CHP citations coming. Mobile testing $75 OBD / $250 smoke. Text YES - NorCal CARB 916-890-4427"
  },
  {
    id: '7',
    company: "Rockview Farms",
    phone: "(562) 927-5511",
    email: "info@rockviewfarms.com",
    address: "7011 Stewart and Gray Rd, Downey, CA",
    fleetSize: "75 reefer",
    status: 'WARM',
    zone: "SoCal",
    source: "Yelp",
    smsTemplate: "🚛 ROCKVIEW FARMS - CARB ALERT: Fleet NOT COMPLIANT in CTC-VIS. DMV holds + CHP citations coming. Mobile testing $75 OBD / $250 smoke. Text YES - NorCal CARB 916-890-4427"
  }
];

const AdminView: React.FC = () => {
  // Simple "OS" State
  const [currentApp, setCurrentApp] = useState<'HOME' | 'MAIL' | 'CALENDAR' | 'CONTACTS' | 'TASKS' | 'SCOUT' | 'ANALYTICS' | 'LEADS'>('HOME');
  
  // App Data State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [scouting, setScouting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- IPHONE HOME SCREEN COMPONENT ---
  const AppIcon = ({ label, icon, color, onClick, badge }: any) => (
      <button 
        onClick={onClick}
        className="flex flex-col items-center gap-2 transition-transform active:scale-90"
      >
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl text-white shadow-lg relative ${color}`}>
             {icon}
             {badge > 0 && (
                 <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
                     {badge}
                 </div>
             )}
          </div>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</span>
      </button>
  );

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScouting(true);
    setCurrentApp('SCOUT'); // Open Scout App view
    try {
        const lead = await scoutTruckLead(file);
        setLeads(prev => [lead, ...prev]);
    } catch (err) {
        alert('Scout analysis failed.');
    } finally {
        setScouting(false);
    }
  };

  // --- ANALYTICS CALCULATIONS ---
  const getAnalyticsData = () => {
      const subs = JSON.parse(localStorage.getItem('vin_diesel_submissions') || '[]');
      
      const locationMap: Record<string, number> = {};
      subs.forEach((s: any) => {
          if (s.coordinates) {
              const key = `${s.coordinates.lat.toFixed(1)},${s.coordinates.lng.toFixed(1)}`;
              locationMap[key] = (locationMap[key] || 0) + 1;
          } else {
              locationMap['Unknown'] = (locationMap['Unknown'] || 0) + 1;
          }
      });
      
      return { total: subs.length, locations: locationMap };
  };

  // --- RENDER CURRENT APP ---
  const renderApp = () => {
      // --- HOME SCREEN (GRID) ---
      if (currentApp === 'HOME') {
        const contactCount = JSON.parse(localStorage.getItem('vin_diesel_customers') || '[]').length;
        const taskCount = JSON.parse(localStorage.getItem('vin_diesel_submissions') || '[]').length;
        const leadCount = HOT_LEADS_DATA.length;

        return (
          <div className="min-h-[80vh] bg-gray-100 dark:bg-black p-6 relative overflow-hidden">
              {/* Wallpaper Blur Effect */}
              <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[url('https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=1000&auto=format&fit=crop')] bg-cover blur-xl opacity-20 pointer-events-none"></div>

              {/* Status Bar Shim */}
              <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400 mb-8 relative z-10">
                  <span>9:41</span>
                  <div className="flex gap-1">
                      <span>Signal</span>
                      <span>WiFi</span>
                      <span>Bat</span>
                  </div>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-4 gap-y-8 gap-x-4 relative z-10">
                  <AppIcon label="Mail" icon="✉️" color="bg-blue-500" onClick={() => setCurrentApp('MAIL')} badge={3} />
                  <AppIcon label="Leads" icon="🎯" color="bg-red-600" onClick={() => setCurrentApp('LEADS')} badge={leadCount} />
                  <AppIcon label="Photos" icon="📷" color="bg-white text-black" onClick={() => window.open('https://photos.google.com', '_blank')} />
                  <AppIcon label="Camera" icon="📸" color="bg-gray-300 text-black" onClick={() => fileInputRef.current?.click()} />
                  
                  <AppIcon label="Contacts" icon="👥" color="bg-gray-400" onClick={() => setCurrentApp('CONTACTS')} badge={contactCount} />
                  <AppIcon label="Analytics" icon="📈" color="bg-purple-600" onClick={() => setCurrentApp('ANALYTICS')} />
                  <AppIcon label="Tasks" icon="✓" color="bg-orange-500" onClick={() => setCurrentApp('TASKS')} badge={taskCount} />
                  <AppIcon label="Drive" icon="📂" color="bg-yellow-500" onClick={() => window.open('https://drive.google.com', '_blank')} />
                  
                  {/* Specific CARB Apps */}
                  <AppIcon label="CARB" icon="🌲" color="bg-[#003366]" onClick={() => window.open('https://cleantruckcheck.arb.ca.gov/', '_blank')} />
                  <AppIcon label="Scout" icon="🚛" color="bg-black border border-gray-700" onClick={() => fileInputRef.current?.click()} />
              </div>

              {/* Dock */}
              <div className="absolute bottom-4 left-4 right-4 bg-white/30 dark:bg-gray-800/30 backdrop-blur-xl rounded-[2rem] p-4 flex justify-around items-end z-10">
                  <AppIcon label="" icon="📞" color="bg-green-500" onClick={() => window.location.href = 'tel:6173596953'} />
                  <AppIcon label="" icon="🌐" color="bg-blue-400" onClick={() => window.open('https://carbcleantruckcheck.app', '_blank')} />
                  <AppIcon label="" icon="💬" color="bg-green-400" onClick={() => window.location.href = 'sms:6173596953'} />
                  <AppIcon label="" icon="🎵" color="bg-pink-500" onClick={() => alert("Radio dispatch coming soon!")} />
              </div>

              <input type="file" ref={fileInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleCapture} />
          </div>
        );
      }

      switch(currentApp) {
          case 'LEADS':
              return (
                  <div className="h-full bg-gray-100 dark:bg-gray-900 flex flex-col">
                      <div className="bg-white dark:bg-gray-800 p-4 shadow-sm flex justify-between items-center sticky top-0 z-20">
                          <button onClick={() => setCurrentApp('HOME')} className="text-blue-500 font-bold">‹ Home</button>
                          <h2 className="font-bold text-black dark:text-white">Hot Leads ({HOT_LEADS_DATA.length})</h2>
                          <div className="w-8"></div>
                      </div>
                      <div className="p-4 space-y-4 overflow-y-auto">
                          {HOT_LEADS_DATA.map((lead) => (
                              <div key={lead.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
                                  {lead.zone.includes('HOT') && (
                                      <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                                          HOT LEAD
                                      </div>
                                  )}
                                  
                                  <div className="mb-3">
                                      <h3 className="font-black text-lg text-[#003366] dark:text-white leading-tight">{lead.company}</h3>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">📍 {lead.address}</p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">🚛 {lead.fleetSize}</p>
                                  </div>

                                  <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded mb-3 border border-gray-100 dark:border-gray-600">
                                      <p className="text-[10px] font-bold text-gray-400 uppercase">Script Preview</p>
                                      <p className="text-xs text-gray-600 dark:text-gray-300 italic line-clamp-2">"{lead.smsTemplate}"</p>
                                  </div>

                                  <div className="flex gap-2">
                                      <a 
                                          href={`sms:${lead.phone.replace(/[^0-9]/g, '')}?body=${encodeURIComponent(lead.smsTemplate)}`}
                                          className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold text-center text-sm shadow-sm hover:bg-green-700 active:scale-95 transition-transform flex items-center justify-center gap-1"
                                      >
                                          <span>💬</span> TEXT ALERT
                                      </a>
                                      {lead.email && (
                                          <a 
                                              href={`mailto:${lead.email}?subject=CARB Compliance Alert&body=${encodeURIComponent(lead.smsTemplate)}`}
                                              className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold text-center text-sm shadow-sm hover:bg-blue-700 active:scale-95 transition-transform flex items-center justify-center gap-1"
                                          >
                                              <span>✉️</span> EMAIL
                                          </a>
                                      )}
                                      <a 
                                          href={`tel:${lead.phone.replace(/[^0-9]/g, '')}`}
                                          className="w-10 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg flex items-center justify-center text-sm hover:bg-gray-300"
                                      >
                                          📞
                                      </a>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              );

          case 'MAIL':
              return (
                  <div className="h-full bg-gray-100 dark:bg-gray-900 flex flex-col">
                      <div className="bg-white dark:bg-gray-800 p-4 shadow-sm flex justify-between items-center">
                          <button onClick={() => setCurrentApp('HOME')} className="text-blue-500 font-bold">‹ Home</button>
                          <h2 className="font-bold text-black dark:text-white">Inbox</h2>
                          <div className="w-8"></div>
                      </div>
                      <div className="p-4 space-y-2 overflow-y-auto">
                          <a href="https://mail.google.com" target="_blank" className="block bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                              <div className="flex justify-between mb-1">
                                  <span className="font-bold text-black dark:text-white">CARB Notifications</span>
                                  <span className="text-xs text-gray-500">10:42 AM</span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Open Gmail to check official compliance emails.</p>
                          </a>
                          {leads.map(lead => (
                              <div key={lead.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                   <div className="flex justify-between mb-1">
                                      <span className="font-bold text-black dark:text-white">Draft: {lead.companyName}</span>
                                      <span className="text-xs text-blue-500">Draft</span>
                                  </div>
                                  <p className="text-xs text-gray-500 mb-2 line-clamp-2">{lead.emailDraft}</p>
                                  <button onClick={() => navigator.clipboard.writeText(lead.emailDraft)} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded font-bold">Copy Body</button>
                              </div>
                          ))}
                      </div>
                  </div>
              );
          
          case 'CONTACTS':
              const contacts = JSON.parse(localStorage.getItem('vin_diesel_customers') || '[]');
              return (
                  <div className="h-full bg-white dark:bg-gray-900 flex flex-col">
                      <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md">
                          <button onClick={() => setCurrentApp('HOME')} className="text-blue-500 font-bold">‹ Home</button>
                          <h2 className="font-bold text-black dark:text-white">Contacts</h2>
                          <button className="text-blue-500 font-bold text-xl">+</button>
                      </div>
                      <div className="divide-y divide-gray-100 dark:divide-gray-800 overflow-y-auto">
                           {contacts.length === 0 && <div className="p-8 text-center text-gray-400">No contacts saved. Use the "Invite" tab in Profile to add.</div>}
                           {contacts.map((c: any, i: number) => (
                               <div key={i} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800">
                                   <div className="flex items-center gap-3">
                                       <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300">
                                           {c.name.charAt(0)}
                                       </div>
                                       <div>
                                           <p className="font-bold text-black dark:text-white">{c.name}</p>
                                           <p className="text-xs text-gray-500">{c.phone}</p>
                                       </div>
                                   </div>
                                   <div className="flex gap-2">
                                       <a href={`tel:${c.phone}`} className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">📞</a>
                                       <a href={`sms:${c.phone}`} className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">💬</a>
                                   </div>
                               </div>
                           ))}
                      </div>
                  </div>
              );
          
          case 'TASKS':
              const subs = JSON.parse(localStorage.getItem('vin_diesel_submissions') || '[]');
              return (
                  <div className="h-full bg-white dark:bg-gray-900 flex flex-col">
                      <div className="p-6">
                          <button onClick={() => setCurrentApp('HOME')} className="text-blue-500 font-bold mb-4">‹ Home</button>
                          <h1 className="text-3xl font-black text-black dark:text-white mb-2">Tasks</h1>
                          <p className="text-gray-500">Compliance Actions Required</p>
                      </div>
                      <div className="px-6 space-y-4 overflow-y-auto pb-20">
                          {subs.map((s: any) => (
                              <div key={s.id} className="flex items-start gap-3">
                                  <div className="mt-1 w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600"></div>
                                  <div>
                                      <p className="font-medium text-black dark:text-white">{s.summary}</p>
                                      <p className="text-xs text-gray-500">{s.dateStr}</p>
                                  </div>
                              </div>
                          ))}
                          {subs.length === 0 && <p className="text-gray-400 italic">No pending tasks.</p>}
                      </div>
                  </div>
              );

          case 'ANALYTICS':
              const analytics = getAnalyticsData();
              return (
                  <div className="h-full bg-gray-900 text-white flex flex-col">
                       <div className="p-6">
                          <button onClick={() => setCurrentApp('HOME')} className="text-blue-400 font-bold mb-4">‹ Home</button>
                          <h1 className="text-3xl font-black mb-1">Momentum</h1>
                          <p className="text-gray-400 text-sm">Live Activity Tracker</p>
                       </div>
                       
                       <div className="px-6 pb-20 overflow-y-auto space-y-6">
                           <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                               <p className="text-gray-400 text-xs font-bold uppercase mb-1">Total Pings</p>
                               <p className="text-5xl font-black text-green-400">{analytics.total}</p>
                           </div>

                           <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                               <p className="text-gray-400 text-xs font-bold uppercase mb-4">Top Locations (Hotspots)</p>
                               <div className="space-y-3">
                                   {Object.entries(analytics.locations).map(([loc, count]: any) => (
                                       <div key={loc} className="flex justify-between items-center border-b border-gray-700 pb-2">
                                           <div className="flex items-center gap-2">
                                               <span className="text-xl">📍</span>
                                               <span className="font-mono text-sm">{loc === 'Unknown' ? 'Web User' : `GPS: ${loc}`}</span>
                                           </div>
                                           <div className="bg-blue-600 text-white px-2 py-1 rounded font-bold text-xs">{count}</div>
                                       </div>
                                   ))}
                               </div>
                           </div>
                       </div>
                  </div>
              );
          
          case 'SCOUT':
              return (
                  <div className="h-full bg-black flex flex-col items-center justify-center p-6 relative">
                       <button onClick={() => setCurrentApp('HOME')} className="absolute top-6 left-6 text-white font-bold z-10">✕ Close</button>
                       <div className="w-full max-w-sm aspect-[3/4] bg-gray-900 rounded-3xl border border-gray-800 flex items-center justify-center overflow-hidden relative">
                           {scouting ? (
                               <div className="text-center">
                                   <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                   <p className="text-green-500 font-mono text-sm">ANALYZING FLEET...</p>
                               </div>
                           ) : (
                               <button onClick={() => fileInputRef.current?.click()} className="text-gray-500 flex flex-col items-center">
                                   <span className="text-4xl mb-2">📸</span>
                                   <span>Tap to Scout Truck</span>
                               </button>
                           )}
                       </div>
                       <div className="mt-6 w-full max-w-sm">
                           {leads.length > 0 && (
                               <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl text-white">
                                   <p className="font-bold text-green-400">LAST SCAN:</p>
                                   <p className="font-bold text-xl">{leads[0].companyName}</p>
                                   <p className="text-sm opacity-80">{leads[0].location}</p>
                               </div>
                           )}
                       </div>
                  </div>
              );

          default:
              return null;
      }
  };

  // Render the unified app container
  return renderApp();
};

export default AdminView;