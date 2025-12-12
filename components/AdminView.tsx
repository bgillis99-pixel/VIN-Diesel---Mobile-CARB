import React, { useState, useRef } from 'react';
import { scoutTruckLead } from '../services/geminiService';
import { Lead } from '../types';

const AdminView: React.FC = () => {
  // Simple "OS" State
  const [currentApp, setCurrentApp] = useState<'HOME' | 'MAIL' | 'CALENDAR' | 'CONTACTS' | 'TASKS' | 'SCOUT'>('HOME');
  
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

  // --- RENDER CURRENT APP ---
  const renderApp = () => {
      switch(currentApp) {
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

  // --- HOME SCREEN ---
  if (currentApp === 'HOME') {
      const contactCount = JSON.parse(localStorage.getItem('vin_diesel_customers') || '[]').length;
      const taskCount = JSON.parse(localStorage.getItem('vin_diesel_submissions') || '[]').length;

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

            {/* Fleet Manager Branding Widget */}
            {window.location.search.includes('fleet') && (
                 <div className="mb-8 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md p-4 rounded-2xl border border-white/20 relative z-10">
                     <p className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">FLEET MANAGER MODE</p>
                     <h2 className="text-xl font-black text-[#003366] dark:text-white">
                         {new URLSearchParams(window.location.search).get('fleet')}
                     </h2>
                 </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-4 gap-y-8 gap-x-4 relative z-10">
                <AppIcon label="Mail" icon="✉️" color="bg-blue-500" onClick={() => setCurrentApp('MAIL')} badge={3} />
                <AppIcon label="Calendar" icon="📅" color="bg-red-500" onClick={() => window.open('https://calendar.google.com', '_blank')} />
                <AppIcon label="Photos" icon="📷" color="bg-white text-black" onClick={() => window.open('https://photos.google.com', '_blank')} />
                <AppIcon label="Camera" icon="📸" color="bg-gray-300 text-black" onClick={() => fileInputRef.current?.click()} />
                
                <AppIcon label="Contacts" icon="👥" color="bg-gray-400" onClick={() => setCurrentApp('CONTACTS')} badge={contactCount} />
                <AppIcon label="Maps" icon="🗺️" color="bg-green-500" onClick={() => window.open('https://maps.google.com', '_blank')} />
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

  // Render sub-app
  return renderApp();
};

export default AdminView;